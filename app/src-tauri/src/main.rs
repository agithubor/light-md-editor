#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::Mutex;
use tauri::{Emitter, Manager, State};

struct StartupState(pub Mutex<Option<String>>);

#[tauri::command]
fn read_markdown(path: String) -> Result<String, String> {
    use std::fs;
    // 先检查文件是否存在且可读，给出更明确的错误信息
    let metadata = fs::metadata(&path)
        .map_err(|e| format!("文件不存在或无法访问 '{}': {}", path, e))?;
    if !metadata.is_file() {
        return Err(format!("'{}' 不是普通文件", path));
    }
    let content = fs::read_to_string(&path)
        .map_err(|e| format!("读取文件失败 '{}': {} (请检查文件编码是否为 UTF-8)", path, e))?;
    Ok(content)
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
    let args: Vec<String> = std::env::args().collect();
    eprintln!("[md-editor] 原始命令行参数: {:?}", args);

    let startup_path = args
        .iter()
        .skip(1)
        .find(|a| is_markdown_arg(a))
        .map(|a| {
            let normalized = normalize_path(a);
            eprintln!("[md-editor] 检测到启动文件参数: '{}' -> 标准化后: '{}'", a, normalized);
            normalized
        });

    if startup_path.is_none() {
        eprintln!("[md-editor] 未检测到 .md/.markdown 启动参数");
    }

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
