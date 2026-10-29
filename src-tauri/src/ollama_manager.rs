use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::CommandEvent;
use log::{info, error};
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};

fn start_native_rust_proxy(proxy_port: u16, target_port: u16) {
    std::thread::spawn(move || {
        let bind_addr = format!("127.0.0.1:{}", proxy_port);
        let target_addr = format!("127.0.0.1:{}", target_port);
        
        let listener = match TcpListener::bind(&bind_addr) {
            Ok(l) => l,
            Err(e) => {
                error!("[Ollama Proxy] Falha ao iniciar proxy na porta {}: {}", proxy_port, e);
                return;
            }
        };
        
        info!("[Ollama Proxy] Proxy Nativo em Rust iniciado em {} redirecionando para {}", bind_addr, target_addr);

        for stream in listener.incoming() {
            if let Ok(mut client) = stream {
                let target = target_addr.clone();
                std::thread::spawn(move || {
                    if let Ok(mut server) = TcpStream::connect(&target) {
                        let mut client_clone = client.try_clone().unwrap();
                        let mut server_clone = server.try_clone().unwrap();
                        
                        // Thread para Request (Panteão -> Ollama)
                        std::thread::spawn(move || {
                            let mut buf = [0; 65536];
                            while let Ok(n) = client_clone.read(&mut buf) {
                                if n == 0 { break; }
                                let data = &buf[..n];
                                
                                let mut text = String::from_utf8_lossy(data).into_owned();
                                
                                // Bloqueia HTTP/2
                                if text.contains("Upgrade: h2c") {
                                    text = text.replace("Upgrade: h2c", "X-Disabled-Upgrade: h2c");
                                }
                                
                                let config = crate::log_config::get_config();
                                
                                if config.show_ollama_requests {
                                    if let Some(idx) = text.find("{") {
                                        let raw_json = text[idx..].trim();
                                        if config.ollama_compact_logs {
                                            if let Ok(val) = serde_json::from_str::<serde_json::Value>(raw_json) {
                                                let model = val.get("model").and_then(|m| m.as_str()).unwrap_or("unknown");
                                                let prompt = val.get("prompt").and_then(|p| p.as_str())
                                                    .or_else(|| val.get("messages").and_then(|m| m.get(0)).and_then(|msg| msg.get("content")).and_then(|c| c.as_str()))
                                                    .unwrap_or("");
                                                let clean_prompt = prompt.replace('\n', " ").replace('\r', "");
                                                let prompt_preview = if clean_prompt.len() > 140 {
                                                    format!("{}...", &clean_prompt[..140])
                                                } else {
                                                    clean_prompt
                                                };
                                                info!("[Ollama Request] Model: {} | Prompt: \"{}\"", model, prompt_preview);
                                            } else {
                                                info!("[Ollama Request] {}", raw_json);
                                            }
                                        } else {
                                            info!("[Ollama Request] {}", raw_json);
                                        }
                                    } else if !config.ollama_compact_logs {
                                        log::debug!("[Ollama Request Chunk] {}", text.trim());
                                    }
                                }
                                
                                if text.len() == data.len() {
                                    if server.write_all(data).is_err() { break; }
                                } else {
                                    if server.write_all(text.as_bytes()).is_err() { break; }
                                }
                            }
                        });
                        
                        // Thread para Response (Ollama -> Panteão)
                        let mut buf = [0; 65536];
                        while let Ok(n) = server_clone.read(&mut buf) {
                            if n == 0 { break; }
                            let data = &buf[..n];
                            
                            let text = String::from_utf8_lossy(data);
                            let config = crate::log_config::get_config();
                            
                            if config.show_ollama_responses {
                                for line in text.lines() {
                                    let t = line.trim();
                                    if t.starts_with('{') && t.ends_with('}') {
                                        if config.ollama_compact_logs {
                                            if let Ok(val) = serde_json::from_str::<serde_json::Value>(t) {
                                                let response_text = val.get("response").and_then(|r| r.as_str())
                                                    .or_else(|| val.get("message").and_then(|m| m.get("content")).and_then(|c| c.as_str()))
                                                    .unwrap_or("");
                                                let done = val.get("done").and_then(|d| d.as_bool()).unwrap_or(false);
                                                
                                                if !response_text.is_empty() {
                                                    let clean_resp = response_text.replace('\n', " ").replace('\r', "");
                                                    info!("[Ollama Response] \"{}\"", clean_resp);
                                                } else if done {
                                                    let eval_count = val.get("eval_count").and_then(|c| c.as_u64()).unwrap_or(0);
                                                    info!("[Ollama Response] [Done] (tokens gerados: {})", eval_count);
                                                }
                                            } else {
                                                info!("[Ollama Response] {}", t);
                                            }
                                        } else {
                                            info!("[Ollama Response] {}", t);
                                        }
                                    }
                                }
                            }
                            
                            if client.write_all(data).is_err() { break; }
                        }
                    }
                });
            }
        }
    });
}

pub fn spawn_ollama_sidecar(app: &AppHandle, use_proxy: bool, _proxy_script: &str, _proxy_target: &str) {
    let shell = app.shell();
    let app_handle = app.clone();
    
    match shell.sidecar("ollama") {
        Ok(command) => {
            let mut ollama_cmd = command.args(["serve"]);

            if use_proxy {
                // A engine (Athena) espera o Ollama na 11434
                // Vamos iniciar o proxy na 11434 e o Ollama real na 11435
                start_native_rust_proxy(11434, 11435);
                ollama_cmd = ollama_cmd.env("OLLAMA_HOST", "127.0.0.1:11435");
            } else {
                // Se o proxy estiver desligado, o Ollama usa a porta padrão 11434
                ollama_cmd = ollama_cmd.env("OLLAMA_HOST", "127.0.0.1:11434");
            }

            // Garante descoberta de bibliotecas CUDA/GPU mesmo em sandbox/sidecar
            let home_dir = std::env::var("HOME").unwrap_or_default();
            let candidate_lib_paths = [
                format!("{}/.local/lib/ollama", home_dir),
                format!("{}/.local/share/ollama_bundle/lib/ollama", home_dir),
            ];
            for lib_path in &candidate_lib_paths {
                if std::path::Path::new(lib_path).exists() {
                    ollama_cmd = ollama_cmd.env("OLLAMA_LIBRARY_PATH", lib_path);
                    info!("[Ollama] OLLAMA_LIBRARY_PATH configurado para: {}", lib_path);
                    break;
                }
            }

            // Otimizações de GPU para aceleração por hardware
            ollama_cmd = ollama_cmd
                .env("CUDA_VISIBLE_DEVICES", "0")
                .env("OLLAMA_KEEP_ALIVE", "-1")
                .env("OLLAMA_FLASH_ATTENTION", "1");

            match ollama_cmd.spawn() {
                Ok((mut rx, _child)) => {
                    tauri::async_runtime::spawn(async move {
                        while let Some(event) = rx.recv().await {
                            let config = crate::log_config::get_config();
                            match event {
                                CommandEvent::Stdout(line) => {
                                    let text = String::from_utf8_lossy(&line);
                                    if config.should_show_ollama_stdout() {
                                        info!("[Ollama] {}", text.trim_end());
                                    }
                                    if text.contains("Listening on") {
                                        let _ = app_handle.emit("ollama-ready", ());
                                    }
                                },
                                CommandEvent::Stderr(line) => {
                                    let text = String::from_utf8_lossy(&line);
                                    let t = text.trim_end();
                                    if config.should_show_ollama_stderr() {
                                        if t.contains("level=ERROR") || t.contains("level=FATAL") {
                                            error!("[Ollama] {}", t);
                                        } else if t.contains("level=WARN") {
                                            log::warn!("[Ollama] {}", t);
                                        } else {
                                            log::debug!("[Ollama] {}", t);
                                        }
                                    } else if t.contains("level=FATAL") {
                                        error!("[Ollama] {}", t);
                                    }
                                    
                                    if t.contains("address already in use") || t.contains("Listening on") {
                                        let _ = app_handle.emit("ollama-ready", ());
                                    }
                                },
                                CommandEvent::Terminated(payload) => {
                                    info!("[Ollama] Processo sidecar encerrado (Código: {:?}).", payload.code);
                                    let _ = app_handle.emit("panteao-error", serde_json::json!({ "type": "error", "message": format!("Motor da Ollama abortou (Code: {:?})", payload.code) }).to_string());
                                    let _ = app_handle.emit("ollama-ready", ());
                                },
                                CommandEvent::Error(err) => {
                                    error!("[Ollama Daemon Internal Error] {}", err);
                                    let _ = app_handle.emit("ollama-ready", ());
                                }
                                _ => {}
                            }
                        }
                    });
                }
                Err(e) => {
                    error!("[Erro] Falha ao spawnar o processo do Ollama: {}", e);
                    let _ = app_handle.emit("ollama-ready", ());
                }
            }
        }
        Err(e) => {
            error!("[Aviso Crítico] Tauri bloqueou/não encontrou o Sidecar 'ollama'. Motivo interno: {}", e);
            let _ = app_handle.emit("ollama-ready", ());
        }
    }
}

pub fn get_mods_models_dir(app: &AppHandle) -> std::path::PathBuf {
    let local_dir = app.path()
        .app_local_data_dir()
        .unwrap_or_else(|_| std::path::PathBuf::from("."));
    let mods_dir = local_dir.join("mods").join("models");
    let _ = std::fs::create_dir_all(&mods_dir);
    mods_dir
}

pub fn scan_and_register_mods_models(app: &AppHandle) {
    let mods_dir = get_mods_models_dir(app);
    let _app_handle = app.clone();

    tauri::async_runtime::spawn(async move {
        // Aguarda estabilização do daemon do Ollama
        let _ = tauri::async_runtime::spawn_blocking(|| {
            std::thread::sleep(std::time::Duration::from_secs(3));
        }).await;

        if let Ok(entries) = std::fs::read_dir(&mods_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_file() {
                    let is_gguf = path.extension().and_then(|e| e.to_str()).map(|ext| ext.eq_ignore_ascii_case("gguf")).unwrap_or(false);
                    if is_gguf {
                        if let Some(stem) = path.file_stem().and_then(|s| s.to_str()) {
                            let model_name = format!("mod-{}", stem.to_lowercase().replace(' ', "-"));
                            let path_str = path.to_string_lossy();
                            let modelfile = format!("FROM \"{}\"\n", path_str);
                            
                            info!("[Mods Watcher] Registrando modelo GGUF local: {} de {:?}", model_name, path);
                            let _ = create_ollama_model(model_name, modelfile).await;
                        }
                    }
                }
            }
        }
    });
}

#[tauri::command]
pub async fn create_ollama_model(name: String, modelfile: String) -> Result<String, String> {
    info!("[Ollama Modelfile] Criando modelo '{}' via /api/create", name);

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(300))
        .build()
        .map_err(|e| e.to_string())?;

    // O daemon local responde na 11434 (via proxy) ou 11435 direto
    let url = "http://127.0.0.1:11435/api/create";
    let payload = serde_json::json!({
        "name": name,
        "modelfile": modelfile,
        "stream": false
    });

    let res = client.post(url)
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Falha de conexão com Ollama: {}", e))?;

    if res.status().is_success() {
        info!("[Ollama Modelfile] Modelo '{}' compilado com sucesso!", name);
        Ok(format!("Modelo '{}' criado com sucesso.", name))
    } else {
        let err_text = res.text().await.unwrap_or_else(|_| "Erro desconhecido".into());
        error!("[Ollama Modelfile] Erro do Ollama ao criar modelo '{}': {}", name, err_text);
        Err(format!("Erro ao compilar modelo: {}", err_text))
    }
}

#[tauri::command]
pub fn open_mods_folder(app: AppHandle) -> Result<String, String> {
    let mods_dir = get_mods_models_dir(&app);
    let path_str = mods_dir.to_string_lossy().to_string();

    #[cfg(target_os = "windows")]
    {
        let _ = std::process::Command::new("explorer").arg(&mods_dir).spawn();
    }

    #[cfg(target_os = "macos")]
    {
        let _ = std::process::Command::new("open").arg(&mods_dir).spawn();
    }

    #[cfg(target_os = "linux")]
    {
        let _ = std::process::Command::new("xdg-open").arg(&mods_dir).spawn();
    }

    info!("[Mods Folder] Aberta pasta de mods: {:?}", mods_dir);
    Ok(path_str)
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct OllamaCatalogModel {
    pub id: String,
    pub name: String,
    pub description: String,
    pub tags: Vec<String>,
    pub pulls: String,
}

#[tauri::command]
pub async fn fetch_ollama_library() -> Result<Vec<OllamaCatalogModel>, String> {
    tauri::async_runtime::spawn_blocking(|| {
        fetch_ollama_library_blocking(None)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn search_ollama_models(query: String) -> Result<Vec<OllamaCatalogModel>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let q = query.trim();
        let q_param = if q.is_empty() { None } else { Some(q) };
        fetch_ollama_library_blocking(q_param)
    })
    .await
    .map_err(|e| e.to_string())?
}

fn fetch_url_html(url: &str) -> Result<String, String> {
    if let Ok(output) = std::process::Command::new("curl")
        .args(["-4", "-sL", "-A", "Mozilla/5.0 (X11; Linux x86_64)", "--connect-timeout", "6", url])
        .output()
    {
        if output.status.success() && !output.stdout.is_empty() {
            return Ok(String::from_utf8_lossy(&output.stdout).to_string());
        }
    }

    let client = reqwest::blocking::Client::builder()
        .user_agent("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko)")
        .timeout(std::time::Duration::from_secs(8))
        .build()
        .map_err(|e| e.to_string())?;

    let res = client.get(url)
        .send()
        .map_err(|e| e.to_string())?;

    res.text().map_err(|e| e.to_string())
}

fn parse_ollama_cards(html: &str, models: &mut Vec<OllamaCatalogModel>) {
    let parts = html.split("href=\"/library/");
    for (i, part) in parts.enumerate() {
        if i == 0 { continue; }
        let end_quote = match part.find('\"') {
            Some(idx) => idx,
            None => continue,
        };
        let model_id = &part[..end_quote];
        if model_id.is_empty() || model_id.contains('/') || model_id.starts_with('?') {
            continue;
        }

        // Avoid duplicates
        if models.iter().any(|m| m.id == model_id) {
            continue;
        }

        // Slice up to 3000 chars for this card
        let card_slice = if part.len() > 3000 { &part[..3000] } else { part };

        // Description
        let mut desc = String::new();
        if let Some(p_start) = card_slice.find("<p class=\"max-w-lg break-words text-neutral-800") {
            if let Some(content_start) = card_slice[p_start..].find('>') {
                let text_start = p_start + content_start + 1;
                if let Some(p_end) = card_slice[text_start..].find("</p>") {
                    desc = card_slice[text_start..text_start + p_end]
                        .replace("&#39;", "'")
                        .replace("&quot;", "\"")
                        .trim()
                        .to_string();
                }
            }
        } else if let Some(p_start) = card_slice.find("<p ") {
            if let Some(content_start) = card_slice[p_start..].find('>') {
                let text_start = p_start + content_start + 1;
                if let Some(p_end) = card_slice[text_start..].find("</p>") {
                    let raw = card_slice[text_start..text_start + p_end]
                        .replace("&#39;", "'")
                        .replace("&quot;", "\"");
                    let d = raw.trim();
                    if !d.is_empty() && !d.contains('<') {
                        desc = d.to_string();
                    }
                }
            }
        }

        // Tags
        let mut tags = Vec::new();
        let mut search_from = 0;
        while let Some(span_pos) = card_slice[search_from..].find("rounded-md") {
            let actual_pos = search_from + span_pos;
            if let Some(tag_content_start) = card_slice[actual_pos..].find('>') {
                let start_idx = actual_pos + tag_content_start + 1;
                if let Some(tag_end) = card_slice[start_idx..].find("</span>") {
                    let tag_val = card_slice[start_idx..start_idx + tag_end].trim();
                    if !tag_val.is_empty() && !tag_val.contains('<') && tag_val.len() < 30 {
                        tags.push(tag_val.to_string());
                    }
                    search_from = start_idx + tag_end;
                    continue;
                }
            }
            search_from = actual_pos + 10;
        }

        // Pulls
        let mut pulls = String::new();
        if let Some(pull_icon_pos) = card_slice.find("M3 16.5") {
            if let Some(span_start) = card_slice[pull_icon_pos..].find("<span>") {
                let text_start = pull_icon_pos + span_start + 6;
                if let Some(span_end) = card_slice[text_start..].find("</span>") {
                    let p = card_slice[text_start..text_start + span_end].trim();
                    if !p.is_empty() && p.len() < 15 {
                        pulls = p.to_string();
                    }
                }
            }
        }

        models.push(OllamaCatalogModel {
            id: model_id.to_string(),
            name: model_id.to_string(),
            description: desc,
            tags,
            pulls,
        });
    }
}

fn fetch_ollama_library_blocking(query: Option<&str>) -> Result<Vec<OllamaCatalogModel>, String> {
    let mut models = Vec::new();

    // Se tiver termo de busca específico, consulta diretamente a página de busca do ollama.com
    if let Some(q) = query {
        let search_url = format!("https://ollama.com/search?q={}", urlencoding_simple(q));
        if let Ok(html) = fetch_url_html(&search_url) {
            parse_ollama_cards(&html, &mut models);
        }
        return Ok(models);
    }

    // 1. Página principal de listagem de modelos do Ollama: https://ollama.com/search
    if let Ok(search_html) = fetch_url_html("https://ollama.com/search") {
        parse_ollama_cards(&search_html, &mut models);
    }

    // 2. Complementa com os modelos da biblioteca clássica: https://ollama.com/library
    if let Ok(lib_html) = fetch_url_html("https://ollama.com/library") {
        parse_ollama_cards(&lib_html, &mut models);
    }

    if models.is_empty() {
        return Err("No models parsed from Ollama site".into());
    }

    Ok(models)
}

fn urlencoding_simple(input: &str) -> String {
    let mut result = String::new();
    for b in input.bytes() {
        match b {
            b'a'..=b'z' | b'A'..=b'Z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                result.push(b as char);
            }
            b' ' => result.push('+'),
            _ => {
                result.push_str(&format!("%{:02X}", b));
            }
        }
    }
    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_fetch_ollama_library() {
        let models = fetch_ollama_library_blocking(None);
        println!("Rust fetch_ollama_library_blocking returned: {:?}", models.as_ref().map(|m| m.len()));
        if let Ok(ref list) = models {
            for m in list.iter().take(5) {
                println!("- {} ({} pulls, tags: {:?}): {}", m.id, m.pulls, m.tags, m.description);
            }
        }
        assert!(models.is_ok());
        assert!(!models.unwrap().is_empty());
    }

    #[test]
    fn test_search_ollama_models() {
        let models = fetch_ollama_library_blocking(Some("qwen"));
        println!("Rust search 'qwen' returned: {:?}", models.as_ref().map(|m| m.len()));
        assert!(models.is_ok());
        assert!(!models.unwrap().is_empty());
    }
}

