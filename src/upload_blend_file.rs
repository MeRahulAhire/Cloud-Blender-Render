use crate::db::update;

use axum::{http::StatusCode, response::IntoResponse};
use axum_typed_multipart::{FieldData, TryFromMultipart, TypedMultipart};
use regex::Regex;
use sanitize_filename::sanitize;
use serde_json::json;
use std::{fs, path::PathBuf};
use tempfile::NamedTempFile;

#[derive(TryFromMultipart)]
pub struct UploadForm {
    #[form_data(limit = "unlimited")]
    #[form_data(field_name = "file")]
    file: FieldData<NamedTempFile>,
}

pub async fn upload_handler(
    TypedMultipart(UploadForm { file }): TypedMultipart<UploadForm>,
    // mut multipart : Multipart
) -> impl IntoResponse {
    // 1. Check if blend-file exist. If not then create it.
    let upload_dir = PathBuf::from("blend-folder");
    if !upload_dir.exists() {
        if let Err(e) = fs::create_dir_all(&upload_dir) {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to create upload directory. Error : {}", e),
            );
        }
    }

    // 2. If a blend file already exist in blend-folder, return an error.
    if fs::read_dir(&upload_dir)
        .ok()
        .and_then(|mut entries| {
            entries.find_map(|entry| {
                entry
                    .ok()
                    .and_then(|e| e.file_type().ok().filter(|ft| ft.is_file()))
            })
        })
        .is_some()
    {
        return (
            StatusCode::BAD_REQUEST,
            "File already exists. Try deleting it before uploading.".to_string(),
        );
    }
    // 3. Check if the upload file is .blend and then only upload it.

    // Derive the original filename (fallback to "upload.blend")
    let original_name = file.metadata.file_name.as_deref().unwrap_or("upload.blend");
    let safe_name = sanitize(original_name);

    if !is_blend_file(&safe_name) {
        return (
            StatusCode::UNSUPPORTED_MEDIA_TYPE,
            format!("We only except .blend file. Please try again"),
        );
    }

    let target_path = upload_dir.join(&safe_name);

    // Persist temp file to our uploads directory
    if let Err(e) = file.contents.persist(&target_path) {
        return (
            StatusCode::EXPECTATION_FAILED,
            format!("Failed to persist file: {}", e),
        );
    }

    // Success
    {
        let data = json!({
          "blend_file" : {
          "is_present" : true,
          "display_name" : &original_name,
          "file_name" : &safe_name,
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
            "Blend file uploaded successfully".to_string(),
        );
    }
}

// A regex function to check if the file is .blend file
fn is_blend_file(file_name: &str) -> bool {
    let re = Regex::new(r"(?i)\.blend$").unwrap();
    re.is_match(file_name)
}
