use std::path::PathBuf;
use crate::db::get_data;

pub fn delete_handler () {
    let output_folder = PathBuf::from("output");
    let file_name = get_data("blend_file.file_name");
    let blend_path = PathBuf::from("blend-folder").join(&file_name);

    let blend_file_exist = get_data("blend_file.is_present");
    let blend_process_status = get_data("render_status.is_rendering");

    if blend_process_status == "true" && blend_file_exist ==  "true" {
        eprintln!("Please stop the process to delete the file")
    }

    if blend_process_status == "false" && blend_file_exist ==  "true" {
        println!("file deleted sucessfully")
    }

    if blend_process_status == "false" && blend_file_exist ==  "false" {
        println!("No file exist");
    }
    
    

}