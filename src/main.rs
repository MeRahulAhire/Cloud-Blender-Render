mod db;
mod live_image_preview;
mod process_blend_file;
mod upload_blend_file;

use axum::{
    Router,
    extract::DefaultBodyLimit,
    routing::{get, post},
    serve,
};
use socketioxide::{SocketIoBuilder, extract::SocketRef};


async fn hello_world() -> &'static str {
    "hello world"
}

async fn socket_handler(socket: SocketRef) {
    //Run your blend file
    process_blend_file::start_render(&socket);

    // Live Image Preview
    live_image_preview::live_image_preview_handler(socket.clone());
}

#[tokio::main]
async fn main() {
    println!("🌐  Server running on Port : 3000");

    let (socket_layer, io) = SocketIoBuilder::new()
        .max_payload(20_000_000)
        .build_layer();

    io.ns("/", socket_handler);

    let app = Router::new()
        .route("/", get(hello_world))
        .route(
            "/upload_blend_file",
            post(upload_blend_file::upload_blend_file_handler),
        )
        .route("/stop-render", post(process_blend_file::stop_render))
        .layer(DefaultBodyLimit::max(20 * 1024 * 1024 * 1024))
        .layer(socket_layer)
        .layer(db::db_handler());

    let listner = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    serve(listner, app).await.unwrap();
}
