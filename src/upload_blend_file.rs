use axum::{
    body::Body, extract::FromRequest, http::{Request, StatusCode}, middleware::Next, response::{IntoResponse, Response}
};
use axum_typed_multipart::{FieldData, TryFromMultipart, TypedMultipart};
use file_format::FileFormat;
use sanitize_filename::sanitize;
use std::{fs, io::Read, path::PathBuf};
use tempfile::NamedTempFile;

#[derive(TryFromMultipart)]
pub struct UploadForm {
    #[form_data(limit = "unlimited")]
    #[form_data(field_name = "file")]
    file: FieldData<NamedTempFile>,
}


pub async fn upload_middleware(
    req: Request<Body>,
    next: Next,
    // TypedMultipart(UploadForm { file }): TypedMultipart<UploadForm>,
) -> Response {
    // 1. Check if blend-file exist. If not then create it.
    let upload_dir = PathBuf::from("blend-folder");
    if !upload_dir.exists() {
        if let Err(e) = fs::create_dir_all(&upload_dir) {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to create upload directory. Error : {}", e),
            )
                .into_response();
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
        )
            .into_response();
    }

    // 3. Check if user is indeed trying to upload .blend file
    // let original_name = file.metadata.file_name.as_deref().unwrap_or("upload.blend");
    // let safe_name = sanitize(original_name);

    // let (mut parts, body) = req.into_parts();

    // 2. Run the TypedMultipart extractor on the parts (this will buffer the multipart
    //    and write streams to a NamedTempFile for you).
    let TypedMultipart(UploadForm { file }) =
        match TypedMultipart::<UploadForm>::from_request(req, &()).await
        {
            Ok(mp) => mp,
            Err(err) => return err.into_response(),
        };

    let mut temp = match file.contents.reopen() {
        Ok(f) => f,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                "Cannot reopen temp file".to_string(),
            )
                .into_response();
        }
    };

    let mut header = [0u8; 16];
    if let Err(_) = temp.read_exact(&mut header) {
        return (
            StatusCode::BAD_REQUEST,
            "Failed to read file header".to_string(),
        )
            .into_response();
    }

    let format = FileFormat::from_bytes(&header);
    if format.extension() != "blend" {
        return (
            StatusCode::UNSUPPORTED_MEDIA_TYPE,
            format!(
                "Unsupported file type: expected .blend, got .{}",
                format.extension()
            ),
        )
            .into_response();
    }

    next.run(req).await
}

pub async fn upload_blend_file_handler(
    TypedMultipart(UploadForm { file }): TypedMultipart<UploadForm>,
) -> impl IntoResponse {
    let upload_dir = PathBuf::from("blend-folder");

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
