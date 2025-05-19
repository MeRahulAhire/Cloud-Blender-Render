use crate::db::{get_data, update};
use axum::{http::StatusCode, response::IntoResponse};
use serde_json::json;
use std::{fs, path::PathBuf};

pub async fn delete_handler() -> impl IntoResponse {
    let file_name = get_data("blend_file.file_name");
    let blend_path = PathBuf::from("blend-folder").join(&file_name);

    let blend_file_exist = get_data("blend_file.is_present");
    let blend_process_status = get_data("render_status.is_rendering");

    if blend_process_status == "true" {
        return (
            StatusCode::CONFLICT,
            "Rendering in progress. Cancel the task to delete file.".to_string(),
        );
    }

    if blend_file_exist == "true" {
        match fs::remove_file(&blend_path) {
            Ok(_) => {
                let data = json!({
                  "blend_file" : {
                  "is_present" : false,
                  "display_name" : "",
                  "file_name" : "",
                },

                  });
                if let Err(e) = update(data) {
                    return (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        format!("Failed to update Redis: {}", e),
                    );
                }

                return (
                    StatusCode::OK,
                    "Blend file deleted successfully.".to_string(),
                );
            }
            Err(err) => {
                let error_message = format!("Failed to delete blend file error message - {}", err);
                return (StatusCode::INTERNAL_SERVER_ERROR, error_message);
            }
        }
    }

    if blend_file_exist == "false" {
        return (
            StatusCode::NOT_FOUND,
            "No blend file exists for deletion.".to_string(),
        );
    }

    // Fallback in case of unexpected values
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        "Unexpected state while handling deletion.".to_string(),
    )
}
