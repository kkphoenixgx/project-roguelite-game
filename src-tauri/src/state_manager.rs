use tauri::{AppHandle, Manager};
use log::info;
use std::io::{Read, Write};
use std::path::PathBuf;

const SECRET_KEY: &str = "Axiomante2026"; // Chave de Ofuscação

fn xor_cipher(data: &[u8], key: &str) -> Vec<u8> {
    let key_bytes = key.as_bytes();
    if key_bytes.is_empty() { return data.to_vec(); }
    data.iter().enumerate().map(|(i, b)| b ^ key_bytes[i % key_bytes.len()]).collect()
}

fn get_slot_path(app: &AppHandle, slot: u32) -> Result<PathBuf, String> {
    let local_dir = app.path().app_local_data_dir().map_err(|e| e.to_string())?;
    let json_name = format!("savegame_{}.json", slot);
    let json_path = local_dir.join(&json_name);
    if json_path.exists() {
        return Ok(json_path);
    }

    // Fallback retrocompatível para saves antigos (.sav)
    let sav_name = if slot <= 1 {
        let s1 = local_dir.join("savegame_1.sav");
        if s1.exists() { "savegame_1.sav".to_string() } else { "savegame.sav".to_string() }
    } else {
        format!("savegame_{}.sav", slot)
    };
    let sav_path = local_dir.join(&sav_name);
    if sav_path.exists() {
        return Ok(sav_path);
    }

    Ok(json_path)
}

#[tauri::command]
pub async fn save_game_state(app: AppHandle, payload: String) -> Result<String, String> {
    save_game_slot(app, 1, payload).await
}

#[tauri::command]
pub async fn load_game_state(app: AppHandle) -> Result<Option<String>, String> {
    load_game_slot(app, 1).await
}

#[tauri::command]
pub async fn save_game_slot(app: AppHandle, slot: u32, payload: String) -> Result<String, String> {
    let start = std::time::Instant::now();
    info!("[Rust IPC] Gravando Save Slot {} em JSON com {} bytes.", slot, payload.len());
    
    let local_dir = app.path().app_local_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&local_dir).map_err(|e| e.to_string())?;
    
    let path = local_dir.join(format!("savegame_{}.json", slot));
    let mut file = std::fs::File::create(&path).map_err(|e| e.to_string())?;
    file.write_all(payload.as_bytes()).map_err(|e| e.to_string())?;
    
    // Mantém cópia savegame.json caso seja slot 1 para compatibilidade
    if slot <= 1 {
        let legacy_json = local_dir.join("savegame.json");
        let _ = std::fs::copy(&path, legacy_json);
    }
    
    info!("[Rust IPC] Slot {} gravado com sucesso em JSON em {:?}", slot, start.elapsed());
    Ok(format!("Slot {} gravado com sucesso em JSON!", slot))
}

#[tauri::command]
pub async fn load_game_slot(app: AppHandle, slot: u32) -> Result<Option<String>, String> {
    let path = get_slot_path(&app, slot)?;
    if !path.exists() { return Ok(None); }
    
    let mut file = std::fs::File::open(&path).map_err(|e| e.to_string())?;
    let mut raw_bytes = Vec::new();
    file.read_to_end(&mut raw_bytes).map_err(|e| e.to_string())?;
    
    // Se o arquivo tiver extensão .sav, descriptografa com XOR (retrocompatibilidade)
    if path.extension().and_then(|s| s.to_str()) == Some("sav") {
        let decrypted = xor_cipher(&raw_bytes, SECRET_KEY);
        let json = String::from_utf8(decrypted).map_err(|e| e.to_string())?;
        return Ok(Some(json));
    }

    let json = String::from_utf8(raw_bytes).map_err(|e| e.to_string())?;
    Ok(Some(json))
}

#[tauri::command]
pub async fn delete_game_slot(app: AppHandle, slot: u32) -> Result<String, String> {
    let local_dir = app.path().app_local_data_dir().map_err(|e| e.to_string())?;
    let _ = std::fs::remove_file(local_dir.join(format!("savegame_{}.json", slot)));
    let _ = std::fs::remove_file(local_dir.join(format!("savegame_{}.sav", slot)));
    if slot <= 1 {
        let _ = std::fs::remove_file(local_dir.join("savegame.json"));
        let _ = std::fs::remove_file(local_dir.join("savegame.sav"));
    }
    info!("[Rust IPC] Slot {} apagado com sucesso do disco.", slot);
    Ok(format!("Slot {} apagado com sucesso!", slot))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_xor_cipher_symmetry() {
        let original_text = "{\"saveId\":\"run-123\",\"playerState\":{\"coins\":100}}";
        let encrypted = xor_cipher(original_text.as_bytes(), SECRET_KEY);
        assert_ne!(encrypted, original_text.as_bytes());

        let decrypted = xor_cipher(&encrypted, SECRET_KEY);
        let decrypted_text = String::from_utf8(decrypted).expect("UTF-8 válido");
        assert_eq!(decrypted_text, original_text);
    }

    #[test]
    fn test_xor_cipher_empty_key() {
        let data = b"plain_payload";
        let result = xor_cipher(data, "");
        assert_eq!(result, data);
    }

    #[test]
    fn test_json_payload_validity() {
        let json_sample = r#"{"saveId":"run-alpha","slot":1,"timestamp":1700000000,"playerState":{"coins":50}}"#;
        let parsed: serde_json::Value = serde_json::from_str(json_sample).expect("JSON deve ser válido");
        assert_eq!(parsed["saveId"], "run-alpha");
        assert_eq!(parsed["slot"], 1);
        assert_eq!(parsed["playerState"]["coins"], 50);
    }
}
