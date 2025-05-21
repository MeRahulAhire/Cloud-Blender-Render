use std::fs;
use std::path::Path;
use axum::{
    http::StatusCode,
    response::{IntoResponse, Json},
};
use serde_json::{json, Value};

pub async fn get_images_list() -> impl IntoResponse {
    let path = Path::new("./output");
    let mut file_names = Vec::new();

    // Read and collect file names as Strings
    let mut names: Vec<String> = match fs::read_dir(path) {
        Ok(entries) => entries
            .filter_map(|entry| entry.ok()?.file_name().into_string().ok())
            .collect(),
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Failed to read ./output directory" })),
            );
        }
    };

    // Sort alphabetically
    names.sort();

    // Fill vector and return JSON
    file_names.extend(names);
    let data: Value = json!({ "data": file_names });

    (StatusCode::OK, Json(data))
}
