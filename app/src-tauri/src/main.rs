// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod database;

use database::init_database;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // Initialize database on app start
            let app_handle = app.handle();
            if let Err(e) = init_database(&app_handle) {
                eprintln!("Failed to initialize database: {}", e);
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Todo commands
            commands::get_todos,
            commands::create_todo,
            commands::update_todo,
            commands::delete_todo,
            // Project commands
            commands::get_projects,
            commands::create_project,
            commands::update_project,
            commands::delete_project,
            // Event commands
            commands::get_events,
            commands::get_events_by_date,
            commands::create_event,
            commands::update_event,
            commands::delete_event,
            // Personal task commands
            commands::get_personal_tasks,
            commands::create_personal_task,
            commands::update_personal_task,
            commands::delete_personal_task,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
