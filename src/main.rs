mod auth;
mod db;
mod delete_blend_file;
mod live_image_preview;
mod live_render_stats;
mod machine_lookup;
mod process_blend_file;
mod render_image_list;
mod upload_blend_file;
mod upload_extension_file;

use axum::{
    Router,
    extract::DefaultBodyLimit,
    extract::Path,
    http::{HeaderValue, Method, StatusCode, header},
    middleware,
    response::Response,
    routing::{get, get_service, post},
    serve,
};
use include_dir::{Dir, include_dir};
use socketioxide::{SocketIoBuilder, extract::SocketRef};
use tower_http::cors::CorsLayer;
use tower_http::services::ServeDir;
use tower_http::set_header::SetResponseHeaderLayer;

// Include the dist directory at compile time
static DIST_DIR: Dir<'_> = include_dir!("$CARGO_MANIFEST_DIR/frontend/dist");

async fn serve_frontend(path: Option<Path<String>>) -> Response {
    let path = path
        .map(|Path(p)| p)
        .unwrap_or_else(|| "index.html".to_string());

    // Handle root path
    let file_path = if path.is_empty() || path == "/" {
        "index.html"
    } else {
        &path
    };

    // Try to get the file from the included directory
    if let Some(file) = DIST_DIR.get_file(file_path) {
        let content = file.contents();
        let content_type = get_content_type(file_path);

        Response::builder()
            .status(StatusCode::OK)
            .header(header::CONTENT_TYPE, content_type)
            .body(content.into())
            .unwrap()
    } else if file_path != "index.html" {
        // For SPA routing, fall back to index.html for non-existent routes
        if let Some(index_file) = DIST_DIR.get_file("index.html") {
            Response::builder()
                .status(StatusCode::OK)
                .header(header::CONTENT_TYPE, "text/html")
                .body(index_file.contents().into())
                .unwrap()
        } else {
            Response::builder()
                .status(StatusCode::NOT_FOUND)
                .body("404 Not Found".into())
                .unwrap()
        }
    } else {
        Response::builder()
            .status(StatusCode::NOT_FOUND)
            .body("Frontend not found".into())
            .unwrap()
    }
}

fn get_content_type(path: &str) -> &'static str {
    match path.split('.').last().unwrap_or("") {
        "html" => "text/html",
        "css" => "text/css",
        "js" => "application/javascript",
        "json" => "application/json",
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "webp" => "image/webp",
        "gif" => "image/gif",
        "svg" => "image/svg+xml",
        "ico" => "image/x-icon",
        "woff" => "font/woff",
        "woff2" => "font/woff2",
        "ttf" => "font/ttf",
        "eot" => "application/vnd.ms-fontobject",
        _ => "application/octet-stream",
    }
}

async fn socket_handler(socket: SocketRef) {
    //Run your blend file
    process_blend_file::start_render(&socket);

    // Live Image Preview
    live_image_preview::live_image_preview_handler(socket.clone());

    // Blender Render Stats
    live_render_stats::render_stats_watcher(socket.clone());

    // Network Stats
    machine_lookup::network_stats(socket.clone());

    // CPU Stats
    machine_lookup::cpu_stats(socket.clone());

    // RAM stats
    machine_lookup::ram_stats(socket.clone());

    // GPU utilisation stats
    machine_lookup::gpu_util_stats(socket.clone());

    // GPU memory usage.
    machine_lookup::gpu_mem_stats(socket.clone());
}

#[tokio::main]
async fn main() {
    println!("🌐  Server running on Port : 4000");

    let origin = HeaderValue::from_static("http://localhost:5173");

    let cors = CorsLayer::new()
        .allow_origin(origin)
        .allow_methods([Method::GET, Method::POST, Method::OPTIONS])
        .allow_headers([http::header::CONTENT_TYPE])
        .allow_credentials(true);

    let (socket_layer, io) = SocketIoBuilder::new().max_payload(20_000_000).build_layer();

    io.ns("/", socket_handler);

    let app = Router::new()
        // Serve frontend on root and catch-all routes
        // Protected routes - auth middleware applied
        .route("/", get(|| serve_frontend(None)))
        .route("/{*path}", get(serve_frontend))
        .route(
            "/upload_blend_file",
            post(upload_blend_file::upload_handler),
        )
        .route(
            "/upload_extension_file",
            post(upload_extension_file::extension_upload_handler),
        )
        .route(
            "/delete_blend_file",
            post(delete_blend_file::delete_handler),
        )
        .route("/get_db", post(db::get_app_state::get_db))
        .route("/stop_render", post(process_blend_file::stop_render))
        .route("/render_list", post(render_image_list::get_images_list))
        .route("/create_auth", post(auth::set_auth))
        .route("/delete_auth", post(auth::delete_auth))
        .nest_service(
            "/images",
            get_service(ServeDir::new("./output")).layer(SetResponseHeaderLayer::if_not_present(
                header::CACHE_CONTROL,
                HeaderValue::from_static("no-cache, no-store, must-revalidate"),
            )),
        )
        .layer(DefaultBodyLimit::max(20 * 1024 * 1024 * 1024))
        .layer(socket_layer)
        .layer(cors)
        .layer(middleware::from_fn(auth::middleware_auth))
        .layer(db::db_handler())
        .route("/share", get(auth::share_auth));

    let listner = tokio::net::TcpListener::bind("[::]:4000").await.unwrap();
    serve(listner, app).await.unwrap();
}
