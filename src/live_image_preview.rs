use crate::db::update;
use base64::{Engine as _, engine::general_purpose};
use file_format::{FileFormat, Kind};
use image2::{Image, Rgba};
use notify::{
    Config, EventKind, RecommendedWatcher, RecursiveMode, Watcher,
    event::{AccessKind, AccessMode},
};
use serde_json::json;
use socketioxide::extract::SocketRef;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::mpsc::channel;
use std::thread;
use std::time::{Duration, Instant};
use std::fs::metadata;

pub fn live_image_preview_handler(socket: SocketRef) {
    thread::spawn(move || {
        let sock = socket;
        let (tx, rx) = channel();

        let mut watcher = RecommendedWatcher::new(tx, Config::default()).unwrap();
        watcher
            .watch(Path::new("./output"), RecursiveMode::NonRecursive)
            .unwrap();

        for res in rx {
            match res {
                Ok(event) => {
                    if event.kind == EventKind::Access(AccessKind::Close(AccessMode::Write)) {
                        for path in event.paths {
                            if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                                // println!("File written and closed: {}", &name);

                                image_resize_and_stream(&name, &sock);
                            }
                        }
                    }
                }
                Err(e) => {
                    eprintln!("watch error: {:?}", e);
                    break;
                }
            }
        }
    });
}

pub fn image_resize_and_stream(name: &str, sock: &SocketRef) {
    let image_path = PathBuf::from("output").join(&name);

    if !wait_for_file_stability(&image_path, Duration::from_secs(5)) {
        eprintln!("File {} did not stabilize in time", name);
        return;
    }

    let image = Image::<f32, Rgba>::open(&image_path).unwrap();

    let image_format = FileFormat::from_file(&image_path).unwrap();
    let image_kind = image_format.kind();
    // println!("image kind is - {:?}", image_kind);

    if image_kind != Kind::Image {
        if let Err(err) = sock.emit(
                "live-base64-error",
                "Live render preview only supported on image. Select render output type to image format"
            )
        {
            eprintln!("Emit error: {:?}", err);
        }
        return;
    }

    let size = image.size();
    let original_width = size.width;
    let original_height = size.height;

    let new_height = 720;
    let new_width = (((original_width as f64) / (original_height as f64)) * (new_height as f64))
        .round() as usize;

    let resized_image = image.resize((new_width, new_height));
    resized_image.save("./temp/sample.webp").unwrap();

    let sample_image_path = Path::new("./temp/sample.webp");
    let sample_image_data = fs::read(sample_image_path).unwrap();

    let png_mime = "data:image/webp;base64";
    let base64_string = general_purpose::STANDARD.encode(sample_image_data);
    let image_string = format!("{},{}", png_mime, base64_string);

    // println!("Base64 = {}", base64_string);
    let live_image_data = json!({
        "image_name" : &name,
        "image_string" : &image_string
    });

    let set_live_image = json!({
       "latest_preview_image" :&image_string
    });

    update(set_live_image).unwrap();

    if let Err(_err) = sock.emit("live_base64", &live_image_data) {
        // eprintln!("live image error: {:?}", err);
    }
}





fn wait_for_file_stability(path: &PathBuf, timeout: Duration) -> bool {
    let start = Instant::now();
    let mut last_size = 0;
    let stable_duration = Duration::from_millis(500); // File must be stable for 500ms
    let mut stable_since = None::<Instant>;
    
    while start.elapsed() < timeout {
        match metadata(path) {
            Ok(meta) => {
                let current_size = meta.len();
                
                if current_size == last_size && last_size > 0 {
                    // Size hasn't changed
                    if let Some(stable_time) = stable_since {
                        if stable_time.elapsed() >= stable_duration {
                            return true; // File is stable!
                        }
                    } else {
                        stable_since = Some(Instant::now());
                    }
                } else {
                    // Size changed, reset stability timer
                    stable_since = None;
                    last_size = current_size;
                }
            }
            Err(_) => {
                // File doesn't exist or can't be read yet
                stable_since = None;
            }
        }
        
        thread::sleep(Duration::from_millis(100));
    }
    
    false
}