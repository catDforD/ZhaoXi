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
            // Daily info center commands
            commands::get_info_sources,
            commands::upsert_info_source,
            commands::delete_info_source,
            commands::get_info_settings,
            commands::update_info_settings,
            commands::get_today_info_items,
            commands::refresh_info_now,
            commands::get_info_refresh_status,
            commands::open_external_link,
            // Agent commands
            commands::agent_chat,
            commands::agent_execute_action,
            commands::agent_execute_actions_atomic,
            commands::agent_list_capabilities,
            commands::agent_reload_skills,
            commands::agent_list_mcp_servers,
            commands::agent_get_tooling_config,
            commands::agent_reload_tooling,
            commands::agent_upsert_mcp_server,
            commands::agent_delete_mcp_server,
            commands::agent_import_skill,
            commands::agent_toggle_skill,
            commands::agent_delete_skill,
            commands::agent_list_commands,
            commands::agent_upsert_command,
            commands::agent_import_command_markdown,
            commands::agent_delete_command,
            commands::agent_codex_health,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
