
use socketioxide::extract::{Data, SocketRef};
use serde_json::Value;
pub fn render_stats (socket: SocketRef) {

    socket.on("blend_process", {
        move |socket: SocketRef, Data::<Value>(data)| {

            println!("{data}")
            
    }}
);
}