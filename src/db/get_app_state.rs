use crate::db::update;
use axum::{Json, http::StatusCode, response::IntoResponse};
use redis::{Client, JsonCommands};
use serde_json::Value;
use serde_json::json;
use std::fs;
use std::path::Path;
use std::process::Command;
// use std::io;

pub async fn get_db() -> impl IntoResponse {
    check_blend_file();
    blender_version();

    // Try to connect to Redis
    let client = match Client::open("redis://127.0.0.1:6379/") {
        Ok(c) => c,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"message" : "Redis connection error. Please try again"})),
            );
        }
    };

    let mut con = match client.get_connection() {
        Ok(c) => c,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"message" : "Redis connection error. Please try again"})),
            );
        }
    };

    // Fetch and parse JSON
    let raw: String = match con.json_get("items", ".") {
        Ok(r) => r,
        Err(_) => {
            return (
                StatusCode::NOT_FOUND,
                Json(json!({"message" : "Key not found or Redis error"})),
            );
        }
    };

    let json_val: Value = match serde_json::from_str(&raw) {
        Ok(v) => v,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"message" : "JSON parse error"})),
            );
        }
    };

    (StatusCode::OK, Json(json_val))
}

fn check_blend_file() -> Option<impl IntoResponse> {
    // Checking Blend file is foremost primary aim
    let path = Path::new("./blend-folder");
    let mut blend_file_exist: bool = false;

    // Read and collect file names as Strings
    let mut names: Vec<String> = match fs::read_dir(path) {
        Ok(entries) => entries
            .filter_map(|entry| entry.ok()?.file_name().into_string().ok())
            .collect(),
        Err(_) => {
            return Some((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Failed to read ./blend-folder directory" })),
            ));
        }
    };

    // Sort alphabetically
    names.sort();

    // Get first file name (if any)
    let first_file = names.get(0).cloned(); // Option<String>

    // Update the bool if a valid first file exists
    if let Some(ref name) = first_file {
        if !name.is_empty() {
            blend_file_exist = true;
        }
    }

    // Store in database
    let db_field = json!({
        "blend_file": {
            "is_present": blend_file_exist,
            "file_name": first_file
        }
    });

    if let Err(_) = update(db_field) {
        return Some((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": "Failed to update database" })),
        ));
    }

    None
}


fn blender_version() {
    let output = Command::new("./blender/blender")
        .arg("--version")
        .output()
        .expect("Failed to execute blender");

    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout);
        if let Some(first_line) = stdout.lines().next() {

            let data = json!({"blender_version" : first_line});

            update(data).unwrap();
        } else {
            panic!("No output from blender");
        }
    } else {
        panic!("Blender exited with an error");
    }
}