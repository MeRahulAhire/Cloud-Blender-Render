// schema_handler.rs
use redis::{Client, RedisResult};
use serde_json::json;

pub fn schema_handler() -> RedisResult<()> {
    // sync connection
    let client = Client::open("redis://127.0.0.1/")?;
    let mut con = client.get_connection()?;

    // build JSON with serde_json::json! 
    let data = json!({
        "blend_file": {
            "is_present": false,
            "display_name": "",
            "file_name": ""
        },
        "blender_settings": {
            "engine": "",
            "animation_sequence": {
                "entire": false,
                "range": {
                    "status": false,
                    "start_frame": 0,
                    "end_frame": 0
                },
                "single_frame": {
                    "status": false,
                    "frame_value": 0
                }
            },
            "cycle-device": ""
        },
        "render_status": {
            "is_rendering": false
        },
        "rendered_images": [],
        "latest_preview_image": ""
    });

    // serialize to string
    let json_str = data.to_string();

    // == CHANGE HERE == use `.execute` instead of `.query`
    redis::cmd("JSON.SET")
        .arg("items")
        .arg("$")
        .arg(&json_str)
        .exec(&mut con).unwrap();  // returns RedisResult<()>

    Ok(())
}
