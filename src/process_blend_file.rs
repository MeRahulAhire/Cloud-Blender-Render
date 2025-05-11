use redis::{Client, JsonCommands};
use serde_json::{Value, json};
use socketioxide::extract::{Data, SocketRef};
use std::io::{BufRead, BufReader};
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::thread;
use crate::db::get_data;



pub fn process_blend_file_handler(socket: &SocketRef) {
    // Pre-compute PathBufs so they can be cloned into the closure
    let client = Client::open("redis://127.0.0.1:6379/").unwrap();
    let mut con = client.get_connection().unwrap();

    // let raw: String = con.json_get("items", "$.blend_file.file_name").unwrap();

    // // 2. Parse into serde_json::Value
    // let v: Value = serde_json::from_str(&raw).unwrap();

    // // 3. Navigate the array/object
    // let file_name = v[0].as_str().unwrap();

    
    socket.on("post-json", {
        println!("{}", file_name);
        let blend_path = PathBuf::from("blend-folder").join(&file_name);
        let blender_bin = PathBuf::from("blender/blender");
        
        // let blend_process_status: String = con.json_get("items", "$.render_status").unwrap();


        move |socket: SocketRef, Data::<serde_json::Value>(_data)| {
            // Clone the socket for the background thread
            let sock = socket.clone();

            // Spawn a thread so we don't block the socket handler
            thread::spawn(move || {
                let mut child = Command::new(&blender_bin)
                    .arg("-b")
                    .arg(&blend_path)
                    .arg("-o")
                    .arg("./output/")
                    .arg("-a")
                    // .arg("1")
                    .arg("--")
                    .arg("--cycles-device")
                    .arg("OPTIX")
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
    });
}
