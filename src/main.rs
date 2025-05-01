mod db;
mod process_blend_file;
mod upload_blend_file;


use axum::{
    extract::DefaultBodyLimit, routing::{get, post}, serve, Router
};
use socketioxide::{SocketIo, extract::SocketRef};

async fn hello_world() -> &'static str {
    "hello world"
}

async fn socket_handler(socket: SocketRef) {
    //Run your blend file
    process_blend_file::process_blend_file_handler(&socket);
}

#[tokio::main]
async fn main() {
    println!("🌐  Server running on Port : 3000");

    let (socket_layer, io) = SocketIo::new_layer();

    io.ns("/", socket_handler);

    let app = Router::new()
        .route("/", get(hello_world))
        .route(
            "/upload_blend_file",
            post(upload_blend_file::upload_blend_file_handler),
        )
        .layer(DefaultBodyLimit::max(20 * 1024 * 1024 * 1024))
        .layer(socket_layer) 
        .layer(db::db_handler());

    
    let listner = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    serve(listner, app).await.unwrap();
}
