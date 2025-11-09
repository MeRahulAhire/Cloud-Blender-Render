use axum::{http::StatusCode, response::IntoResponse};
use axum_typed_multipart::{FieldData, TryFromMultipart, TypedMultipart};
use sanitize_filename::sanitize;
use serde_json::json;
use std::{fs::{self, File, OpenOptions}, io::{Read, Write}, path::PathBuf};
use tempfile::NamedTempFile;

#[derive(TryFromMultipart)]
pub struct UploadExtensionForm {
    #[form_data(limit = "unlimited")]
    #[form_data(field_name = "file")]
    file: FieldData<NamedTempFile>,
    
    #[form_data(field_name = "chunk_index")]
    chunk_index: u32,
    
    #[form_data(field_name = "total_chunks")]
    total_chunks: u32,
    
    #[form_data(field_name = "file_name")]
    file_name: String,
    
    #[form_data(field_name = "file_id")]
    file_id: String,
}

pub async fn upload_extension_handler(
    TypedMultipart(UploadExtensionForm { 
        file, 
        chunk_index, 
        total_chunks, 
        file_name, 
        file_id 
    }): TypedMultipart<UploadExtensionForm>,
) -> impl IntoResponse {
    // 1. Check if extension folder exists. If not, create it.
    let upload_dir = PathBuf::from("extension");
    if !upload_dir.exists() {
        if let Err(e) = fs::create_dir_all(&upload_dir) {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to create extension directory. Error: {}", e),
            );
        }
    }

    // Create temp chunks directory
    let chunks_dir = upload_dir.join("temp_chunks");
    if !chunks_dir.exists() {
        if let Err(e) = fs::create_dir_all(&chunks_dir) {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to create chunks directory. Error: {}", e),
            );
        }
    }

    let safe_name = sanitize(&file_name);

    // 2. If this is the first chunk, handle existing files and cleanup old uploads
    if chunk_index == 0 {
        // First, cleanup any existing chunks for this file_id (handles page reload/restart)
        cleanup_chunks(&chunks_dir, &file_id);
        
        // Check if the same file exists and delete it (override behavior)
        let existing_file_path = upload_dir.join(&safe_name);
        if existing_file_path.exists() && existing_file_path.is_file() {
            if let Err(e) = fs::remove_file(&existing_file_path) {
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    format!("Failed to delete existing file: {}", e),
                );
            }
        }
        
        // Create upload session metadata file
        if let Err(e) = create_upload_session(&chunks_dir, &file_id, &safe_name, total_chunks) {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to create upload session: {}", e),
            );
        }
    } else {
        // For subsequent chunks, validate the session
        match validate_upload_session(&chunks_dir, &file_id, &safe_name, total_chunks) {
            Ok(false) => {
                return (
                    StatusCode::BAD_REQUEST,
                    "Upload session not found or invalid. Please restart upload.".to_string(),
                );
            }
            Err(e) => {
                cleanup_chunks(&chunks_dir, &file_id);
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    format!("Failed to validate upload session: {}", e),
                );
            }
            Ok(true) => {} // Session is valid, continue
        }
    }

    // 3. Save the current chunk
    let chunk_file_name = format!("{}_{}", file_id, chunk_index);
    let chunk_path = chunks_dir.join(&chunk_file_name);

    // Read chunk data from temp file and write to chunk file
    let mut temp_file = match File::open(file.contents.path()) {
        Ok(f) => f,
        Err(e) => {
            cleanup_chunks(&chunks_dir, &file_id);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to read chunk data: {}", e),
            );
        }
    };

    let mut chunk_data = Vec::new();
    if let Err(e) = temp_file.read_to_end(&mut chunk_data) {
        cleanup_chunks(&chunks_dir, &file_id);
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to read chunk data: {}", e),
        );
    }

    // Write chunk data and ensure it's flushed to disk
    let mut chunk_file = match OpenOptions::new()
        .create(true)
        .write(true)
        .truncate(true)
        .open(&chunk_path)
    {
        Ok(f) => f,
        Err(e) => {
            cleanup_chunks(&chunks_dir, &file_id);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to create chunk file: {}", e),
            );
        }
    };

    if let Err(e) = chunk_file.write_all(&chunk_data) {
        cleanup_chunks(&chunks_dir, &file_id);
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to write chunk data: {}", e),
        );
    }

    if let Err(e) = chunk_file.flush() {
        cleanup_chunks(&chunks_dir, &file_id);
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to flush chunk data: {}", e),
        );
    }

    // Explicitly drop the file handle to ensure it's closed
    drop(chunk_file);

    // 4. Check if all chunks have been received
    let received_chunks = count_chunks_for_file(&chunks_dir, &file_id);
    
    if received_chunks == total_chunks {
        // All chunks received, assemble the file
        let target_path = upload_dir.join(&safe_name);
        
        match assemble_chunks(&chunks_dir, &file_id, &target_path, total_chunks).await {
            Ok(_) => {
                // Clean up chunk files and session
                cleanup_upload_session(&chunks_dir, &file_id);

                return (
                    StatusCode::OK,
                    format!("Extension file '{}' uploaded successfully", safe_name),
                );
            }
            Err(e) => {
                cleanup_upload_session(&chunks_dir, &file_id);
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    format!("Failed to assemble chunks: {}", e),
                );
            }
        }
    } else {
        // More chunks expected
        return (
            StatusCode::ACCEPTED,
            format!("Chunk {} of {} received", chunk_index + 1, total_chunks),
        );
    }
}

// Function to count chunks for a specific file_id
fn count_chunks_for_file(chunks_dir: &PathBuf, file_id: &str) -> u32 {
    if let Ok(entries) = fs::read_dir(chunks_dir) {
        entries
            .filter_map(|entry| entry.ok())
            .filter(|entry| {
                let binding = entry.file_name();
                let file_name = binding.to_string_lossy();
                // Only count files that match pattern: {file_id}_{chunk_index}
                // Exclude session files that match pattern: {file_id}_session.json
                file_name.starts_with(&format!("{}_", file_id)) && 
                !file_name.ends_with("_session.json") &&
                file_name.chars().skip(file_id.len() + 1).all(|c| c.is_ascii_digit())
            })
            .count() as u32
    } else {
        0
    }
}

// Function to assemble chunks into final file
async fn assemble_chunks(
    chunks_dir: &PathBuf,
    file_id: &str,
    target_path: &PathBuf,
    total_chunks: u32,
) -> Result<(), Box<dyn std::error::Error>> {
    // Verify all chunks exist before assembling
    for chunk_index in 0..total_chunks {
        let chunk_file_name = format!("{}_{}", file_id, chunk_index);
        let chunk_path = chunks_dir.join(&chunk_file_name);
        
        if !chunk_path.exists() {
            return Err(format!("Chunk {} is missing", chunk_index).into());
        }
    }

    let mut output_file = OpenOptions::new()
        .create(true)
        .write(true)
        .truncate(true)
        .open(target_path)?;

    // Assemble chunks in order
    for chunk_index in 0..total_chunks {
        let chunk_file_name = format!("{}_{}", file_id, chunk_index);
        let chunk_path = chunks_dir.join(&chunk_file_name);
        
        let chunk_data = fs::read(&chunk_path)?;
        output_file.write_all(&chunk_data)?;
    }

    output_file.flush()?;
    
    // Ensure file is fully written before returning
    output_file.sync_all()?;
    
    Ok(())
}

// Function to create upload session metadata
fn create_upload_session(
    chunks_dir: &PathBuf,
    file_id: &str,
    file_name: &str,
    total_chunks: u32,
) -> Result<(), Box<dyn std::error::Error>> {
    let session_data = json!({
        "file_name": file_name,
        "total_chunks": total_chunks,
        "created_at": std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)?
            .as_secs()
    });
    
    let session_file = chunks_dir.join(format!("{}_session.json", file_id));
    fs::write(&session_file, session_data.to_string())?;
    Ok(())
}

// Function to validate upload session
fn validate_upload_session(
    chunks_dir: &PathBuf,
    file_id: &str,
    expected_file_name: &str,
    expected_total_chunks: u32,
) -> Result<bool, Box<dyn std::error::Error>> {
    let session_file = chunks_dir.join(format!("{}_session.json", file_id));
    
    if !session_file.exists() {
        return Ok(false);
    }
    
    let session_data = fs::read_to_string(&session_file)?;
    let session: serde_json::Value = serde_json::from_str(&session_data)?;
    
    let file_name_match = session["file_name"].as_str() == Some(expected_file_name);
    let total_chunks_match = session["total_chunks"].as_u64() == Some(expected_total_chunks as u64);
    
    Ok(file_name_match && total_chunks_match)
}

// Function to cleanup upload session and chunks
fn cleanup_upload_session(chunks_dir: &PathBuf, file_id: &str) {
    // Remove session file
    let session_file = chunks_dir.join(format!("{}_session.json", file_id));
    let _ = fs::remove_file(&session_file);
    
    // Remove all chunks
    cleanup_chunks(chunks_dir, file_id);
    
    // Remove temp_chunks directory if it's empty
    if let Ok(mut entries) = fs::read_dir(chunks_dir) {
        if entries.next().is_none() {
            let _ = fs::remove_dir(chunks_dir);
        }
    }
}

// Function to cleanup chunks for a specific file_id
fn cleanup_chunks(chunks_dir: &PathBuf, file_id: &str) {
    if let Ok(entries) = fs::read_dir(chunks_dir) {
        for entry in entries.filter_map(|e| e.ok()) {
            if entry
                .file_name()
                .to_string_lossy()
                .starts_with(&format!("{}_", file_id))
            {
                let _ = fs::remove_file(entry.path());
            }
        }
    }
}