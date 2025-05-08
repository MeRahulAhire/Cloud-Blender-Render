// schema_handler.rs
use redis::{Client, JsonCommands, RedisResult};
use serde_json::json;

// use crate::db::db_connection

pub fn schema_handler() -> RedisResult<()> {
    // sync connection
    let client = Client::open("redis://127.0.0.1:6379/")?;
    let mut con = client.get_connection()?;

    // build JSON with serde_json::json!
    let data = json!({
      "password" : {
        "is_protected" : false,
        "Key" : ""
      },
      "blend_file" : {
        "is_present" : false,
        "display_name" : "",
        "file_name" : ""
      },
      "blender_settings" : {
        "engine" : "",
        "animation_sequence": {
          "entire" : false,
          "range" : {
            "status" : false,
            "start_frame" : 0,
            "end_frame" : 0
          },
          "single_frame" : {
            "status" : false,
            "frame_value" : 0
          }

        },
        "cycle-device" : ""
      },
      "render_status" : {
        "is_rendering" : false
      },
      "rendered_images" : [],
      "latest_preview_image" :""
    });

    let _: () = con.json_set("items", "$", &data)?;

    Ok(())
}

