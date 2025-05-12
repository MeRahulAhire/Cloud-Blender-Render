use crate::db::get_data;
use serde_json::{Value, json};
use socketioxide::extract::{Data, SocketRef};
use std::io::{BufRead, BufReader};
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::thread;

pub fn process_blend_file_handler(socket: &SocketRef) {
    let file_name = get_data("blend_file.file_name");


    socket.on("blend-engine", {
        println!("{:?}", file_name);
        let blend_path = PathBuf::from("blend-folder").join(file_name);
        let blender_bin = PathBuf::from("blender/blender");

        let blend_process_status = get_data("render_status.is_rendering");

        // println!("{}", blend_process_status);

        move |socket: SocketRef, Data::<Value>(data)| {
            // Clone the socket for the background thread
            let sock = socket.clone();

            if blend_process_status == "false".to_string() {
                if let Err(err) = sock.emit("blend-engine-error", "Blender is already running. Cannot run duplicate task") {
                    eprintln!("Emit error: {:?}", err);
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
                    if let Err(err) = sock.emit("blend-engine-error", "Warning ⚠️ - Engine format and its related details are not provided. Default settings will be applied") {
                        eprintln!("Emit error: {:?}", err);
                    };
                    "".to_string()
                    
                });

                render_task(&blender_bin, &blend_path, &blender_query, sock)

            // Spawn a thread so we don't block the socket handler
            // thread::spawn(move || {
            //     let mut child = Command::new(&blender_bin)
            //         .arg("-b")
            //         .arg(&blend_path)
            //         .arg("-o")
            //         .arg("./output/")
            //         .arg(blender_query)
            //         .stdout(Stdio::piped())
            //         .stderr(Stdio::piped())
            //         .spawn()
            //         .expect("Failed to start Blender process");

            //     // Read Blender's stdout and emit each line
            //     if let Some(out) = child.stdout.take() {
            //         let reader = BufReader::new(out);
            //         for line in reader.lines().flatten() {
            //             // println!("{}", line);
            //             let payload = json!({ "line": line });
            //             if let Err(err) = sock.emit("blend-process", &payload) {
            //                 eprintln!("Emit error: {:?}", err);
            //             }
            //         }
            //     }

            //     // Optionally read stderr as well
            //     if let Some(err_out) = child.stderr.take() {
            //         let reader = BufReader::new(err_out);
            //         for line in reader.lines().flatten() {
            //             eprintln!("BLENDER ERR: {}", line);
            //             let payload = json!({ "error": line });
            //             let _ = sock.emit("blend-process", &payload);
            //         }
            //     }

            //     // Wait for Blender to finish
            //     let status = child.wait().expect("Blender process failed");
            //     println!("Blender exited with status: {:?}", status);
            // });
        }
    });
}


pub fn render_task (blender_bin : &PathBuf, blend_path: &PathBuf, blender_query : &str, sock: SocketRef) {
    thread::spawn(move || {
        let mut child = Command::new(&blender_bin)
            .arg("-b")
            .arg(&blend_path)
            .arg("-o")
            .arg("./output/")
            .arg(blender_query)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .expect("Failed to start Blender process");

        // Read Blender's stdout and emit each line
        if let Some(out) = child.stdout.take() {
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
        if let Some(err_out) = child.stderr.take() {
            let reader = BufReader::new(err_out);
            for line in reader.lines().flatten() {
                eprintln!("BLENDER ERR: {}", line);
                let payload = json!({ "error": line });
                let _ = sock.emit("blend-process", &payload);
            }
        }

        // Wait for Blender to finish
        let status = child.wait().expect("Blender process failed");
        println!("Blender exited with status: {:?}", status);
    });
}