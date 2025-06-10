use redis::{Client, JsonCommands, RedisResult};
use serde_json::json;

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
        "file_name" : ""
      },
      "blender_settings" : {
        "engine" : "",
        "animation_sequence": {
          "entire" : false,
          "range" : {
            "status" : false,
            "start_frame" : 1,
            "end_frame" : 1
          },
          "single_frame" : {
            "status" : false,
            "frame_value" : 1
          }

        },
        "cycle_device" : ""
      },
      "render_status" : {
        "is_rendering" : false
      },
      "latest_preview_image" :"",
      "rendered_images" : [],
      "anime_query" : "",
      "engine_query" : ""
    });

    let _: () = con.json_set("items", "$", &data)?;

    Ok(())
}

