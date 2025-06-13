mod app_state_schema;
use redis::{ Client, Commands, JsonCommands, PubSubCommands, RedisError, RedisResult };
use serde_json::Value;
pub mod get_app_state;

pub fn db_handler() {
    //Defines the Schema of the App
    if let Err(e) = app_state_schema::schema_handler() {
        println!("⚠️  Failed to initialize Redis schema: {}", e);
    }
}

pub fn update(data: Value) -> RedisResult<()> {
    let client = Client::open("redis://127.0.0.1:6379/")?;
    let mut con = client.get_connection()?;

    if let Value::Object(map) = data {
        for (key, value) in map {
            let path = format!("$.{}", key);
            let _: () = con.json_set("items", &path, &value)?;

            if key == "render_stats"{
                let payload = serde_json::to_string(&value)?;
                let _: () = con.publish("render_stats", payload)?;
            }
        }
    } else {
        return Err(
            RedisError::from((redis::ErrorKind::TypeError, "Expected JSON object at top level"))
        );
    }

    Ok(())
}

pub fn get_data(path: &str) -> String {
    let client = Client::open("redis://127.0.0.1:6379/").unwrap();
    let mut con = client.get_connection().unwrap();

    let item_path = format!("$.{}", path);

    let raw: String = con.json_get("items", item_path).unwrap();

    // Parse into serde_json::Value
    let v: Value = serde_json::from_str(&raw).unwrap();

    // Extract the first value (assuming it's an array of one value as per your JSONPath usage)
    let first_val = &v[0];

    match first_val {
        Value::String(s) => s.clone(),
        Value::Bool(b) => b.to_string(),
        Value::Number(n) => n.to_string(),
        Value::Null => "null".to_string(),
        _ => panic!("Unsupported type encountered"),
    }
}
