use axum::{
    response::IntoResponse,
    http::StatusCode,
    Json,
};
use redis::{Client, JsonCommands};
use serde_json::Value;

pub async fn get_db() -> impl IntoResponse {
    // Try to connect to Redis
    let client = match Client::open("redis://127.0.0.1:6379/") {
        Ok(c) => c,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, "Redis client error").into_response(),
    };

    let mut con = match client.get_connection() {
        Ok(c) => c,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, "Redis connection error").into_response(),
    };

    // Fetch and parse JSON
    let raw: String = match con.json_get("items", ".") {
        Ok(r) => r,
        Err(_) => return (StatusCode::NOT_FOUND, "Key not found or Redis error").into_response(),
    };

    let json_val: Value = match serde_json::from_str(&raw) {
        Ok(v) => v,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, "JSON parse error").into_response(),
    };

    (StatusCode::OK, Json(json_val)).into_response()
}
