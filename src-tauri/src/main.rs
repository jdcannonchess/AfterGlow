// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};
use chrono::Local;

const MAX_BACKUPS: usize = 5;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TaskData {
    pub tasks: Vec<serde_json::Value>,
    pub labels: Vec<String>,
    pub stakeholders: Vec<String>,
}

impl Default for TaskData {
    fn default() -> Self {
        Self {
            tasks: Vec::new(),
            labels: Vec::new(),
            stakeholders: Vec::new(),
        }
    }
}

fn get_data_path(app: &AppHandle) -> PathBuf {
    let app_data = app.path().app_data_dir().expect("Failed to get app data dir");
    fs::create_dir_all(&app_data).ok();
    app_data.join("tasks.json")
}

fn get_backups_dir(app: &AppHandle) -> PathBuf {
    let app_data = app.path().app_data_dir().expect("Failed to get app data dir");
    let backups_dir = app_data.join("backups");
    fs::create_dir_all(&backups_dir).ok();
    backups_dir
}

fn create_backup(app: &AppHandle) -> Result<(), String> {
    let data_path = get_data_path(app);
    
    // Only backup if the data file exists
    if !data_path.exists() {
        return Ok(());
    }
    
    let backups_dir = get_backups_dir(app);
    let timestamp = Local::now().format("%Y%m%d_%H%M%S");
    let backup_path = backups_dir.join(format!("tasks_backup_{}.json", timestamp));
    
    fs::copy(&data_path, &backup_path)
        .map_err(|e| format!("Failed to create backup: {}", e))?;
    
    // Clean up old backups, keeping only the most recent MAX_BACKUPS
    cleanup_old_backups(&backups_dir);
    
    Ok(())
}

fn cleanup_old_backups(backups_dir: &PathBuf) {
    let mut backups: Vec<_> = fs::read_dir(backups_dir)
        .into_iter()
        .flatten()
        .filter_map(|entry| entry.ok())
        .filter(|entry| {
            entry.file_name()
                .to_string_lossy()
                .starts_with("tasks_backup_")
        })
        .collect();
    
    // Sort by modification time (newest first)
    backups.sort_by(|a, b| {
        let a_time = a.metadata().and_then(|m| m.modified()).ok();
        let b_time = b.metadata().and_then(|m| m.modified()).ok();
        b_time.cmp(&a_time)
    });
    
    // Remove old backups beyond MAX_BACKUPS
    for backup in backups.into_iter().skip(MAX_BACKUPS) {
        fs::remove_file(backup.path()).ok();
    }
}

#[tauri::command]
fn load_tasks(app: AppHandle) -> Result<TaskData, String> {
    let path = get_data_path(&app);
    
    if !path.exists() {
        return Ok(TaskData::default());
    }
    
    let content = fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read tasks file: {}", e))?;
    
    serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse tasks: {}", e))
}

#[tauri::command]
fn save_tasks(app: AppHandle, data: TaskData) -> Result<(), String> {
    // Create backup before saving
    create_backup(&app)?;
    
    let path = get_data_path(&app);
    
    let content = serde_json::to_string_pretty(&data)
        .map_err(|e| format!("Failed to serialize tasks: {}", e))?;
    
    fs::write(&path, content)
        .map_err(|e| format!("Failed to write tasks file: {}", e))?;
    
    Ok(())
}

#[tauri::command]
fn export_tasks(app: AppHandle, export_path: String) -> Result<(), String> {
    let data_path = get_data_path(&app);
    
    if !data_path.exists() {
        return Err("No data file to export".to_string());
    }
    
    fs::copy(&data_path, &export_path)
        .map_err(|e| format!("Failed to export tasks: {}", e))?;
    
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![load_tasks, save_tasks, export_tasks])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
