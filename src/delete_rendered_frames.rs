use crate::db::get_data;
use axum::{http::StatusCode, response::IntoResponse};
use std::{fs, path::PathBuf};

pub async fn delete_rendered_frames_handler() -> impl IntoResponse {
    let output_folder = PathBuf::from("output");

    let blend_process_status = get_data("render_status.is_rendering");

    if blend_process_status == "true" {
        return (
            StatusCode::CONFLICT,
            "Rendering in progress. Cancel the task to delete file.".to_string(),
        );
    }

    match fs::read_dir(&output_folder) {
        Ok(entries) => {
            for entry in entries.flatten() {
                let path = entry.path();
                let result = if path.is_dir() {
                    fs::remove_dir_all(&path)
                } else {
                    fs::remove_file(&path)
                };

                if let Err(err) = result {
                    return (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        format!("Failed to delete {}: {}", path.display(), err),
                    );
                }
            }

            (StatusCode::OK, "All rendered frames deleted successfully.".to_string())
        }
        Err(err) => (
            StatusCode::BAD_REQUEST,
            format!("Failed to read output folder: {}", err),
        ),
    }
}