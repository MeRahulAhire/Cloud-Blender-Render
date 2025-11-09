use crate::db::{get_data, update};
use axum::{http::StatusCode, response::IntoResponse};
use nix::sys::signal::{Signal::SIGTERM, kill};
use nix::unistd::Pid;
use serde_json::{Value, json};
use socketioxide::extract::{Data, SocketRef};
use std::io::{BufRead, BufReader};
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::sync::atomic::{AtomicU32, Ordering};
use std::thread;
use crate::web_push_notification;

static CHILD_PID: AtomicU32 = AtomicU32::new(0);

pub fn start_render(socket: &SocketRef) {
    socket.on("blend_engine", {
        move |socket: SocketRef, Data::<Value>(data)| {
            let file_name = get_data("blend_file.file_name");
            let blend_path = PathBuf::from("blend-folder").join(&file_name);
            let blender_bin = PathBuf::from("blender/blender");

            let blend_process_status = get_data("render_status.is_rendering");
            let blend_file_exist = get_data("blend_file.is_present");

            // Clone the socket for the background thread
            let sock = socket.clone();

            if blend_process_status == "true" {
                if let Err(err) = sock.emit(
                    "blend-engine-error",
                    "Blender is already running. Cannot run duplicate task",
                ) {
                    eprintln!("Emit error: {:?}", err);
                    eprintln!("Blend_process_status - {}", err);
                };
            }

            if blend_file_exist == "false" {
                if let Err(err) = sock.emit(
                    "blend-engine-error",
                    "Blend file not exist. Please upload it first",
                ) {
                    eprintln!("Emit error: {:?}", err);
                    eprintln!("Blend_process_status - {}", err);
                };
            }

            if !data.is_object() || data.as_object().unwrap().is_empty() {
                if let Err(err) =
                    sock.emit("blend-engine-error", "Input data field cannot be empty")
                {
                    eprintln!("Emit error: {:?}", err);
                };
            }

            // Case 2: "blender-query" key must be present
            if !data.get("data_sync").is_some() {
                println!("key 'data_sync' is required");
                if let Err(err) = sock.emit(
                    "blend-engine-error",
                    "Non valid schema. Enter your blend command with a key `data_sync`",
                ) {
                    eprintln!("Emit error: {:?}", err);
                };
            }

            let data_sync = data.get("data_sync").unwrap();

            update(json!(data_sync)).unwrap();

            let data_sync_confirm = json!({
                "status" : true
            });
            sock.emit("data_sync_confirm", &data_sync_confirm).unwrap();

            let anime_query = get_data("anime_query");
            let engine_query = get_data("engine_query");

            let blender_query = format!("{anime_query} {engine_query}");

            if blend_file_exist == "true" && blend_process_status == "false" {
                render_task(&blender_bin, &blend_path, &blender_query, sock.clone());
            }
        }
    });
}

pub fn render_task(
    blender_bin: &PathBuf,
    blend_path: &PathBuf,
    blender_query: &str,
    sock: SocketRef,
) {
    let blender_bin = blender_bin.clone();
    let blend_path = blend_path.clone();
    let blender_query = blender_query.to_string();

    let set_render_true = json!({
        "render_status" : {
        "is_rendering" : true
      }
    });

    update(set_render_true).unwrap();

    thread::spawn(move || {
        let mut child = Command::new(&blender_bin)
            .arg("-b")
            .arg(&blend_path)
            .arg("-o")
            .arg("./output/")
            .arg("-P")
            .arg("cycles_optix_denoise_logic.py")
            .args(blender_query.split_whitespace())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .expect("Failed to start Blender process");

        CHILD_PID.store(child.id(), Ordering::Relaxed);

        // Read Blender's stdout and emit each line
        if let Some(out) = child.stdout.take() {
            let reader = BufReader::new(out);
            for line in reader.lines().flatten() {
                // println!("{}", line);
                let payload = json!({ "render_stats": line });
                update(payload).unwrap();
                // if let Err(err) = sock.emit("blend_process", &payload) {
                //     eprintln!("Emit error: {:?}", err);
                // }
            }
        }

        // Optionally read stderr as well
        if let Some(err_out) = child.stderr.take() {
            let reader = BufReader::new(err_out);
            for line in reader.lines().flatten() {
                eprintln!("BLENDER ERR: {}", line);
                // let payload = json!({ "line": line });
                // let _ = sock.emit("blend_process", &payload);
                let payload = json!({ "render_stats": line });
                update(payload).unwrap();
            }
        }

        // Wait for Blender to finish
        let set_render_false = json!({
            "render_status" : {
                "is_rendering" : false
            }
        });

        update(set_render_false).unwrap();

        // Wait for Blender to finish
        let exit_status = child.wait().expect("Blender process failed");
        let exit_message = json!({ "line": "Blender exited successfully", "finished" : true });

        update(exit_message.clone()).unwrap();

        if let Err(err) = sock.emit("blend_process", &exit_message) {
            eprintln!("Emit error: {:?}", err);
        }
        println!("Blender exited with status: {:?}", exit_status);

        tokio::spawn(async {
            web_push_notification::notify_render_complete().await;
        });
    });
}

pub async fn stop_render() -> impl IntoResponse {
    let pid = CHILD_PID.load(Ordering::Relaxed);

    // If no PID has been set yet, return 400 Bad Request with a JSON error
    if pid == 0 {
        return (
            StatusCode::BAD_REQUEST,
            "No render task are active".to_string(),
        );
    }

    // Attempt to send SIGTERM
    let target = Pid::from_raw(pid as i32);
    let (data, status) = match kill(target, SIGTERM) {
        Ok(()) => ("Blender exited successfully".to_string(), StatusCode::OK),
        Err(err) => (
            format!(
                "Failed to cancel render. Please try again. Error message : {}",
                err
            ),
            StatusCode::INTERNAL_SERVER_ERROR,
        ),
    };

    (status, data)
}
