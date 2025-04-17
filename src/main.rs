use axum::{extract::DefaultBodyLimit, routing::{get, post}, serve, Router};
mod upload_blend_file;


async fn hello_world() -> &'static str {
    "hello_world"
}

#[tokio::main]
async fn main() {
    let app = Router::new()
    .route("/", get(hello_world))
    .route("/upload_blend_file", post(upload_blend_file::upload_blend_file_handler))
    .layer(DefaultBodyLimit::max(20 * 1024 * 1024 *1024));



    
    let listner = tokio::net::TcpListener::bind("localhost:3000")
        .await
        .unwrap();
    serve(listner, app).await.unwrap();
}
