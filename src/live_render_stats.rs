use redis;
use socketioxide::extract:: SocketRef;
use serde_json::{json, Value, from_str};
use std::thread;


pub fn render_stats_watcher (socket: SocketRef) {

    let sock = socket.clone();

    thread::spawn(move || {
        let client = redis::Client::open("redis://127.0.0.1:6379").unwrap();
        let mut con = client.get_connection().unwrap();
        let mut pubsub = con.as_pubsub();
        pubsub.subscribe("render_stats").unwrap();

        loop{
            let message = pubsub.get_message().unwrap();
            let payload: String = message.get_payload().unwrap();
            let parsed:Value = from_str(&payload).unwrap();
            let data = json!({"render_stats" : parsed});

            if let Err(err) = sock.emit("render_stats", &data){
                eprintln!("render stats error: {:?}", err);
                break;
            }
        }
    });
}