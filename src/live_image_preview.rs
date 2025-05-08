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
                Err(e) => eprintln!("watch error: {:?}", e),
            }
        }
    });
}

pub fn image_resize_and_stream(name: &str, sock: &SocketRef) {
    let image_path = PathBuf::from("output").join(&name);
    let image = Image::<f32, Rgba>::open(&image_path).unwrap();

    let image_format = FileFormat::from_file(&image_path).unwrap();
    let image_kind = image_format.kind();
    // println!("image kind is - {:?}", image_kind);

    if image_kind != Kind::Image {
        if let Err(err) = sock.emit("live-base64-error", "Live render preview only supported on image. Select render output type to image format") {
            eprintln!("Emit error: {:?}", err);
        }
    }

    let size = image.size();
    let original_width = size.width;
    let original_height = size.height;

    let new_height = 720;
    let new_width =
        (original_width as f64 / original_height as f64 * new_height as f64).round() as usize;

    let resized_image = image.resize((new_width, new_height));
    resized_image.save("./temp/sample.png").unwrap();

    let sample_image_path = Path::new("./temp/sample.png");
    let sample_image_data = fs::read(sample_image_path).unwrap();

    let base64_string = general_purpose::STANDARD.encode(sample_image_data);

    // println!("Base64 = {}", base64_string);
    let live_image_data = json!({
        "imageName" : &name,
        "imagePrefix" : "data:image/png;base64",
        "base64String" : base64_string
    });

    if let Err(err) = sock.emit("live-base64", &live_image_data) {
        eprintln!("Emit error: {:?}", err);
    }
}
