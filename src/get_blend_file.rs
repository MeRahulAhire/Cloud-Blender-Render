use std::fs;
use std::path::Path;
use axum::{
    http::StatusCode,
    response::{IntoResponse, Json},
};
use serde_json::json;
use crate::db::update;

pub async fn blend_file_exist() -> impl IntoResponse {
    let path = Path::new("./blend-folder");
    let mut blend_file_exist: bool = false;

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

    // Get first file name (if any)
    let first_file = names.get(0).cloned(); // Option<String>

    // Update the bool if a valid first file exists
    if let Some(ref name) = first_file {
        if !name.is_empty() {
            blend_file_exist = true;
        }
    }

    // Prepare response data
    let data = json!({
        "data": first_file
    });

    // Store in database
    let db_field = json!({
        "blend_file": {
            "is_present": blend_file_exist,
            "file_name": first_file
        }
    });

    update(db_field).unwrap();

    (StatusCode::OK, Json(data))
}
