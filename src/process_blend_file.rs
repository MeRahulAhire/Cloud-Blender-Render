use serde_json::Value;
use socketioxide::extract::{Data, SocketRef};
use std::io::{BufRead, BufReader};
use std::path::Path;
use std::process::{Command, Stdio};

pub fn process_blend_file_handler(socket: &SocketRef) {
    let blend_folder = Path::new("blend-folder");
    let blend_file = "sample.blend";
    let blend_file_path = blend_folder.join(blend_file);
    let blender_program = Path::new("blender/blender");

    socket.on(
        "post-json",
        move |socket: SocketRef, Data::<Value>(_data)| {
            //    println!("{}", blend_folder.display());
            // println!("Recieved Data - {}", blend_file_path.display());

            let mut child = Command::new(blender_program)
                .arg("-b")
                .arg(blend_file_path)
                .arg("-o")
                .arg("./output/")
                .arg("-f")
                .arg("1")
                .arg("--")
                .arg("-- cycles-device")
                .arg("OPTIX")
                .stdout(Stdio::piped())
                .stderr(Stdio::piped())
                .spawn()
                .expect("Failed to start Blender process");

                if let Some(stdout) = child.stdout.take() {
                    let reader = BufReader::new(stdout);
                    for line in reader.lines() {
                        if let Ok(line) = line {
                            println!("{}", line);  // Print Blender output in real-time
                            socket.emit("post-json", &line).ok();
                        }
                    }
                }

            let status = child.wait().expect("Blender process failed");
            println!("Blender exited with status: {:?}", status);

            // socket.emit("post-json", &data).ok();
        },
    );
}