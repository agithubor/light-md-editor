#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::Mutex;
use tauri::{Emitter, Manager, State};

struct StartupState(pub Mutex<Option<String>>);

#[tauri::command]
fn read_markdown(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| format!("读取文件失败: {}", e))
}

#[tauri::command]
fn write_markdown(path: String, content: String) -> Result<(), String> {
    std::fs::write(&path, content).map_err(|e| format!("写入文件失败: {}", e))
}

#[tauri::command]
fn get_startup_file_path(state: State<StartupState>) -> Option<String> {
    state.0.lock().unwrap().clone()
}

#[tauri::command]
fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

fn is_markdown_arg(a: &str) -> bool {
    let x = a.to_lowercase();
    x.ends_with(".md") || x.ends_with(".markdown")
}

fn normalize_path(a: &str) -> String {
    a.trim_start_matches("file:///").replace('/', "\\")
}

fn emit_open_file(app: &tauri::AppHandle, path: String) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.emit("open-file", serde_json::json!({ "path": path }));
    }
}

fn main() {
    let startup_path = std::env::args()
        .skip(1)
        .find(|a| is_markdown_arg(a))
        .map(|a| normalize_path(&a));

    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            if let Some(p) = args.iter().find(|a| is_markdown_arg(a)) {
                emit_open_file(app, normalize_path(p));
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.show();
                    let _ = w.unminimize();
                    let _ = w.set_focus();
                }
            }
        }))
        .plugin(tauri_plugin_deep_link::init())
        .manage(StartupState(Mutex::new(startup_path)))
        .invoke_handler(tauri::generate_handler![
            read_markdown,
            write_markdown,
            get_startup_file_path,
            get_app_version
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
