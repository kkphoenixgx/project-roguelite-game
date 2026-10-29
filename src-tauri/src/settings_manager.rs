use tauri::{AppHandle, Emitter, Manager};
use std::fs;
use std::path::PathBuf;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct LlmSettings {
    pub llm_model: String,
    pub num_ctx: u32,
    pub timeout: u64,
    pub temperature: f32,
    pub max_tokens: u32,
    pub stateless: bool,
}

// Mantém AppSettings como alias de tipo para retrocompatibilidade sem quebrar importações existentes
pub type AppSettings = LlmSettings;

impl Default for LlmSettings {
    fn default() -> Self {
        Self {
            llm_model: "qwen2.5:0.5b".to_string(),
            num_ctx: 2048,
            timeout: 600,
            temperature: 0.7,
            max_tokens: 128,
            stateless: true,
        }
    }
}

fn get_settings_path(app: &AppHandle) -> PathBuf {
    app.path().app_data_dir().unwrap().join("settings.json")
}

#[tauri::command]
pub fn get_settings(app: AppHandle) -> AppSettings {
    let path = get_settings_path(&app);
    if path.exists() {
        if let Ok(content) = fs::read_to_string(&path) {
            if let Ok(settings) = serde_json::from_str::<AppSettings>(&content) {
                return settings;
            }
        }
    }
    AppSettings::default()
}

#[tauri::command]
pub fn get_active_model(app: AppHandle) -> String {
    get_settings(app).llm_model
}

#[tauri::command]
pub fn set_active_model(app: AppHandle, model: String) -> Result<(), String> {
    let mut settings = get_settings(app.clone());
    settings.llm_model = model.clone();
    save_settings(app, settings)
}

#[tauri::command]
pub fn save_llm_settings(app: AppHandle, settings: AppSettings) -> Result<(), String> {
    save_settings(app, settings)
}

fn save_settings(app: AppHandle, settings: AppSettings) -> Result<(), String> {
    let path = get_settings_path(&app);
    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    
    if let Ok(json) = serde_json::to_string(&settings) {
        if fs::write(&path, json).is_ok() {
            let _ = app.emit("llm-model-changed", settings.llm_model.clone());
            let _ = app.emit("llm-settings-changed", settings);
            return Ok(());
        }
    }
    Err("Failed to save settings".into())
}
