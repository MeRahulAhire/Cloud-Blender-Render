use serde_json::json;
use socketioxide::extract::{Data, SocketRef};
use std::io::{BufRead, BufReader};
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::thread;

pub fn process_blend_file_handler(socket: &SocketRef) {
    // Pre-compute PathBufs so they can be cloned into the closure
    let blend_path = PathBuf::from("blend-folder").join("sample.blend");
    let blender_bin = PathBuf::from("blender/blender");

    socket.on("post-json", {
        let blend_path = blend_path.clone();
        let blender_bin = blender_bin.clone();
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
                        println!("{}", line);
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