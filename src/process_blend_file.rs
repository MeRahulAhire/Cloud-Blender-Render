use crate::db::{update, get_data};
use serde_json::{Value, json};
use socketioxide::extract::{Data, SocketRef};
use std::io::{BufRead, BufReader};
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::thread;
use std::sync::Mutex;
use std::process::Child;
use once_cell::sync::Lazy;
use axum::{http::StatusCode, response::{IntoResponse, Json}};

static BLENDER_PROCESS: Lazy<Mutex<Option<Child>>> = Lazy::new(|| Mutex::new(None));


pub fn start_render(socket: &SocketRef) {
    
    
    socket.on("blend-engine", {
        
        move |socket: SocketRef, Data::<Value>(data)| {
            let file_name = get_data("blend_file.file_name");
            let blend_path = PathBuf::from("blend-folder").join(&file_name);
            let blender_bin = PathBuf::from("blender/blender");
            
            let blend_process_status = get_data("render_status.is_rendering");
            let blend_file_exist = get_data("blend_file.is_present");
            
            // println!("{:?}", &file_name);
            // println!("{}", blend_file_exist);
            // Clone the socket for the background thread
            let sock = socket.clone();

            if blend_process_status == "true" {
                if let Err(err) = sock.emit("blend-engine-error", "Blender is already running. Cannot run duplicate task") {
                    eprintln!("Emit error: {:?}", err);
                    eprintln!("Blend_process_status - {}", err);
                };
            }

            if blend_file_exist == "false" {
                if let Err(err) = sock.emit("blend-engine-error", "Blend file not exist. Please upload it first") {
                    eprintln!("Emit error: {:?}", err);
                    eprintln!("Blend_process_status - {}", err);
                };
            }

            if !data.is_object() || data.as_object().unwrap().is_empty() {
                if let Err(err) = sock.emit("blend-engine-error", "Input data field cannot be empty") {
                    eprintln!("Emit error: {:?}", err);
                };
            }
        
            // Case 2: "blender-query" key must be present
            if !data.get("blender-query").is_some() {
                println!("key 'blender-query' is required");
                if let Err(err) = sock.emit("blend-engine-error", "Non valid schema. Enter your blend command with a key `blender-query`") {
                    eprintln!("Emit error: {:?}", err);
                };
            }


            let blender_query = data
                .get("blender-query")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
                .unwrap_or_else(|| {
                    println!("blender-query' key not found or not a string");
                    if let Err(err) = sock.emit("blend-engine-error", "Warning ⚠️ - Engine format and its related details are not provided. Default settings will be applied. Error Message - {err}") {
                        eprintln!("Emit error: {:?}", err);
                    };
                    "".to_string()
                    
                });

            if blend_file_exist == "true" && blend_process_status == "false" {

                render_task(&blender_bin, &blend_path, &blender_query, sock.clone());
            }


                
        }
    });
}


pub fn render_task (blender_bin : &PathBuf, blend_path: &PathBuf, blender_query : &str, sock : SocketRef) {

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
        let child = Command::new(&blender_bin)
            .arg("-b")
            .arg(&blend_path)
            .arg("-o")
            .arg("./output/")
            .args(blender_query.split_whitespace())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .expect("Failed to start Blender process");

            {
                let mut proc_guard = BLENDER_PROCESS.lock().unwrap();
                *proc_guard = Some(child);
            }

        // Read Blender's stdout and emit each line
        if let Some(out) = BLENDER_PROCESS.lock().unwrap().as_mut().and_then(|c| c.stdout.take()) {
            let reader = BufReader::new(out);
            for line in reader.lines().flatten() {
                // println!("{}", line);
                let payload = json!({ "line": line });
                if let Err(err) = sock.emit("blend-process", &payload) {
                    eprintln!("Emit error: {:?}", err);
                }
            }
        }

        // Optionally read stderr as well
        if let Some(err_out) = BLENDER_PROCESS.lock().unwrap().as_mut().and_then(|c| c.stderr.take()){
            let reader = BufReader::new(err_out);
            for line in reader.lines().flatten() {
                eprintln!("BLENDER ERR: {}", line);
                let payload = json!({ "error": line });
                let _ = sock.emit("blend-process", &payload);
            }
        }

        // Wait for Blender to finish
        let set_render_false = json!({
            "render_status" : {
            "is_rendering" : false
          }
        });
    
        update(set_render_false).unwrap();
        

        // let status = child.wait().expect("Blender process failed");
        // Wait for completion
        let exit_status = {
            let mut proc_guard = BLENDER_PROCESS.lock().unwrap();
            if let Some(child) = proc_guard.as_mut() {
                child.wait().ok()
            } else {
                None
            }
        };

        println!("Blender exited with status: {:?}", exit_status);
    });
}


pub async fn stop_render() -> impl IntoResponse {
    let mut proc_guard = BLENDER_PROCESS.lock().unwrap();

    let (status, message) = if let Some(child) = proc_guard.as_mut() {
        match child.kill() {
            Ok(_) => (StatusCode::OK, "Blender process killed."),
            Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, &*format!("Failed to kill Blender process: {}", e)),
        }
    } else {
        (StatusCode::BAD_REQUEST, "No Blender process is currently running.")
    };

    *proc_guard = None;

    let body = Json(json!({
        "status": status.as_u16(),
        "message": message,
    }));

    (status, body)
}