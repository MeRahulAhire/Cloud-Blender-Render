mod app_state_schema;
use redis::{Client, JsonCommands, RedisResult};
use serde_json::Value;

pub fn db_handler() {
    //Defines the Schema of the App
    if let Err(e) = app_state_schema::schema_handler() {
        println!("⚠️  Failed to initialize Redis schema: {}", e);
    }
}

pub fn update(data: Value) -> RedisResult<()>{
    let client = Client::open("redis://127.0.0.1:6379/")?;
    let mut con = client.get_connection()?;

    let _: () = con.json_set("items", "$", &data)?;

    Ok(())
}


pub fn get_data (path: &str) {

    let client = Client::open("redis://127.0.0.1:6379/").unwrap();
    let mut con = client.get_connection().unwrap();

    let item_path = format!("$.{}", path);

    let raw: String = con.json_get("items", item_path).unwrap();

    // 2. Parse into serde_json::Value
    let v: Value = serde_json::from_str(&raw).unwrap();

    // 3. Navigate the array/object
    let file_name = v[0].as_str().unwrap();

    file_name.to_string();

}
