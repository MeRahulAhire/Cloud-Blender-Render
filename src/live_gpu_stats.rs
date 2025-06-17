// // src/live_gpu_stats.rs

// use socketioxide::extract::SocketRef;
// use serde_json::json;
// use std::{
//     io::{BufRead, BufReader},
//     process::{Command, Stdio},
//     thread,
// };

// /// Spawn a background thread that runs `nvitop` and streams its stdout
// /// to the client over Socket.IO under the "gpu_stats" event.
// pub fn live_gpu_stats_handler(socket: SocketRef) {
//     // Clone the socket so the thread owns its own handle
//     let sock = socket.clone();

//     thread::spawn(move || {
//         // Launch nvitop with --no-interactive (so it just writes updates)
//         // Adjust flags as needed to disable any curses-based UI.
//         let mut child = match Command::new("nvitop")
//             .arg("--colorful")
//             .stdout(Stdio::piped())
//             .stderr(Stdio::null())
//             .spawn()
//         {
//             Ok(ch) => ch,
//             Err(e) => {
//                 let _ = sock.emit("gpu_stats_error", &json!({
//                     "error": format!("Failed to spawn nvitop: {}", e)
//                 }));
//                 return;
//             }
//         };

//         // Read its stdout and forward every line (or ANSI-chunk) to the frontend.
//         if let Some(stdout) = child.stdout.take() {
//             let reader = BufReader::new(stdout);
//             for line in reader.lines().flatten() {
//                 // Each line may contain ANSI escape codes; front-end xterm.js will render them.
//                 println!("{line}");
//                 let payload = json!({ "line": line });
//                 if let Err(err) = sock.emit("gpu_stats", &payload) {
//                     eprintln!("Failed to emit gpu_stats: {:?}", err);
//                     break;
//                 }
//             }
//         }

//         // Clean up
//         let _ = child.wait();
//     });
// }


use socketioxide::extract::SocketRef;
use serde_json::json;
use std::{
    process::{Command, Stdio},
    thread,
    time::Duration,
};

/// Repeatedly run `nvidia-smi` every 500ms and stream the result over Socket.IO
pub fn live_gpu_stats_handler(socket: SocketRef) {
    let sock = socket.clone();

    thread::spawn(move || {
        loop {
            // Run nvidia-smi with brief summary output
            let output = match Command::new("nvitop")
                // .arg("--query-gpu=utilization.gpu,utilization.memory,memory.used,memory.total,temperature.gpu")
                // .arg("--format=csv,noheader,nounits")
                .stdout(Stdio::piped())
                .stderr(Stdio::null())
                .spawn()
                .and_then(|child| {
                    let output = child.wait_with_output()?;
                    Ok(output)
                }) {
                Ok(output) => output,
                Err(e) => {
                    let _ = sock.emit("gpu_stats_error", &json!({
                        "error": format!("Failed to run nvidia-smi: {}", e)
                    }));
                    break;
                }
            };

            if let Ok(text) = String::from_utf8(output.stdout) {
                for line in text.lines() {
                    let payload = json!({ "line": line });
                    if let Err(err) = sock.emit("gpu_stats", &payload) {
                        eprintln!("Failed to emit gpu_stats: {:?}", err);
                        return;
                    }
                }
            }

            thread::sleep(Duration::from_millis(1000));
        }
    });
}
