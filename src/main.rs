mod db;
mod delete_blend_file;
mod live_image_preview;
mod process_blend_file;
mod render_image_list;
mod upload_blend_file;
mod live_render_stats;
mod live_gpu_stats;

use axum::{
    Router,
    extract::DefaultBodyLimit,
    http::{HeaderValue, Method},
    routing::{get, get_service, post},
    serve,
};
// use http::{Method, header};
use socketioxide::{SocketIoBuilder, extract::SocketRef};
use tower_http::cors::CorsLayer;
use tower_http::services::ServeDir;

async fn hello_world() -> &'static str {
    "hello world"
}

async fn socket_handler(socket: SocketRef) {
    //Run your blend file
    process_blend_file::start_render(&socket);

    // Live Image Preview
    live_image_preview::live_image_preview_handler(socket.clone());

    // Blender Render Stats 
    live_render_stats::render_stats_watcher(socket.clone());

    // GPU and CPU stats
    live_gpu_stats::live_gpu_stats_handler(socket.clone());
}

#[tokio::main]
async fn main() {
    println!("🌐  Server running on Port : 4000");

    let origin = HeaderValue::from_static("http://localhost:5173");

    let cors = CorsLayer::new()
        .allow_origin(origin)
        .allow_methods([Method::GET, Method::POST, Method::OPTIONS])
        .allow_headers([http::header::CONTENT_TYPE]);

    let (socket_layer, io) = SocketIoBuilder::new().max_payload(20_000_000).build_layer();

    io.ns("/", socket_handler);

    let app = Router::new()
        .route("/", get(hello_world))
        .route(
            "/upload_blend_file",
            post(upload_blend_file::upload_handler),
        )
        .route(
            "/delete_blend_file",
            post(delete_blend_file::delete_handler),
        )
        .route("/get_db", post(db::get_app_state::get_db))
        .route("/stop_render", post(process_blend_file::stop_render))
        .route("/render_list", post(render_image_list::get_images_list))
        .nest_service("/images", get_service(ServeDir::new("./output")))
        .layer(DefaultBodyLimit::max(20 * 1024 * 1024 * 1024))
        .layer(socket_layer)
        .layer(cors)
        .layer(db::db_handler());

    let listner = tokio::net::TcpListener::bind("0.0.0.0:4000").await.unwrap();
    serve(listner, app).await.unwrap();
}
