use axum::{http::StatusCode, response::IntoResponse};
use axum_typed_multipart::{FieldData, TryFromMultipart, TypedMultipart};
use sanitize_filename::sanitize;
use std::{fs, path::PathBuf};
use tempfile::NamedTempFile;

#[derive(TryFromMultipart)]
pub struct UploadForm {
    #[form_data(limit = "unlimited")]
    #[form_data(field_name = "file")]
    file: FieldData<NamedTempFile>,
}


pub async fn upload_blend_file_handler(
    TypedMultipart(UploadForm { file }): TypedMultipart<UploadForm>,
) -> impl IntoResponse {
    let upload_dir = PathBuf::from("blend-folder");

    // Create target directory, or return 500 on failure
    if !upload_dir.exists() {
        if let Err(e) = fs::create_dir_all(&upload_dir) {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!(
                    "Failed to create upload directory for your blend file. Please try again. Error Message - {}",
                    e
                ),
            );
        }
    }

    if fs::read_dir(&upload_dir)
        .ok()
        .and_then(|mut entries| {
            entries.find_map(|entry| {
                entry
                    .ok()
                    .and_then(|e| e.file_type().ok().filter(|ft| ft.is_file()))
            })
        })
        .is_some(){
        return (
            StatusCode::BAD_REQUEST,
            "File already exists. Try deleting it before uploading.".to_string(),
        );
    }

    // Derive the original filename (fallback to "upload.blend")
    let original_name = file.metadata.file_name.as_deref().unwrap_or("upload.blend");
    let safe_name = sanitize(original_name);

    let target_path = upload_dir.join(safe_name);

    // Persist temp file to our uploads directory
    if let Err(e) = file.contents.persist(&target_path) {
        return (
            StatusCode::EXPECTATION_FAILED,
            format!("Failed to persist file: {}", e),
        );
    }

    // Success
    (
        StatusCode::OK,
        "Blend file uploaded successfully".to_string(),
    )
}
