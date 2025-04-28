mod app_state_schema;

pub fn db_handler() {
    //Defines the Schema of the App
    if let Err(e) = app_state_schema::schema_handler() {
        println!("⚠️  Failed to initialize Redis schema: {}", e);
    }
}
