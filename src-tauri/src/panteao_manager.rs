use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::CommandEvent;
use std::sync::Arc;
use log::{info, error};
use panteao_client::Panteao;
use crate::log_config;

static PANTEAO_CLIENT: std::sync::OnceLock<Arc<Panteao>> = std::sync::OnceLock::new();

#[tauri::command]
pub async fn panteao_send(agent: String, ilf: String, content: String) -> Result<String, String> {
    let is_perception = ilf == "percept";
    let is_broadcast = agent.is_empty() || agent == "broadcast" || agent == "*" || agent == "all";
    
    let config = log_config::get_config();
    if config.show_ipc_sends {
        let should_ignore_agent = config.ipc_ignored_agents.iter().any(|a| a == &agent);
        let should_ignore_content = config.ipc_ignored_contents.iter().any(|c| content.contains(c));
        
        if !should_ignore_agent && !should_ignore_content {
            info!("[Rust IPC Debug] Enviando para Panteão (Agent: {}, ILF: {}, Content: {})", agent, ilf, content);
        }
    }
    
    if let Some(client) = PANTEAO_CLIENT.get() {
        let result = if is_perception {
            client.send_perception("add", &content)
        } else {
            let receiver = if is_broadcast { "all" } else { &agent };
            client.send_msg(&ilf, "god", receiver, &content)
        };
        
        match result {
            Ok(_) => Ok("Enviado!".to_string()),
            Err(e) => Err(format!("Erro ao enviar: {}", e))
        }
    } else {
        error!("[Rust IPC] Cliente BDI ainda não está disponível!");
        Err("Conexão com a engine não estabelecida".to_string())
    }
}

fn get_panteao_entities_path(app: &AppHandle, fallback_path: &str) -> std::path::PathBuf {
    let entities_dir = app.path()
        .resource_dir()
        .unwrap_or_else(|_| std::path::PathBuf::from("."))
        .join("..").join("typescript").join("domain").join("ObjectModule").join("Entities");

    if entities_dir.exists() {
        entities_dir
    } else {
        std::path::PathBuf::from(fallback_path)
    }
}

pub fn spawn_panteao_sidecar(app: &AppHandle, jcm_file: &str, port: u16, entities_fallback: &str) {
    let shell = app.shell();
    let app_handle = app.clone();
    let entities_path = get_panteao_entities_path(app, entities_fallback);

    info!("[Panteão] Diretório de agentes: {:?}", entities_path);

    match shell.sidecar("panteao-engine") {
        Ok(command) => {
            match command.args([jcm_file, "--port", &port.to_string()]).current_dir(entities_path).spawn() {
                Ok((mut rx, _child)) => {
                    tauri::async_runtime::spawn(async move {
                        while let Some(event) = rx.recv().await {
                            let config = log_config::get_config();
                            match event {
                                CommandEvent::Stdout(line) => {
                                    let text = String::from_utf8_lossy(&line);
                                    let t = text.trim_end();
                                    if config.show_panteao_stdout {
                                        if t.contains("CRITICAL") || t.contains("ERROR") || t.contains("Exception") {
                                            error!("[Panteão] {}", t);
                                        } else {
                                            info!("[Panteão] {}", t);
                                        }
                                    }
                                    if t.contains("Listening") || t.contains("ready") || t.contains("Waiting") {
                                        let _ = app_handle.emit("panteao-ready", ());
                                    }
                                    if t.contains("CRITICAL FAILURE") || t.contains("Exception") {
                                        let _ = app_handle.emit("panteao-error", serde_json::json!({ "type": "error", "message": t }).to_string());
                                    }
                                },
                                CommandEvent::Stderr(line) => {
                                    let text = String::from_utf8_lossy(&line);
                                    let t = text.trim_end();
                                    
                                    if config.show_panteao_stderr {
                                        error!("[Panteão Stderr] {}", t);
                                    }
                                    
                                    if t.contains("ERROR") || t.contains("Exception") || t.contains("CRITICAL") {
                                        let _ = app_handle.emit("panteao-error", serde_json::json!({ "type": "error", "message": t }).to_string());
                                    }
                                    if t.contains("address already in use") || t.contains("Waiting") || t.contains("IPC Environment Server started") {
                                        let _ = app_handle.emit("panteao-ready", ());
                                    }
                                },
                                CommandEvent::Terminated(payload) => {
                                    info!("[Panteão] Processo encerrado (Código: {:?}).", payload.code);
                                    let _ = app_handle.emit("panteao-error", serde_json::json!({ "type": "error", "message": format!("Motor do Panteão abortou (Code: {:?})", payload.code) }).to_string());
                                },
                                CommandEvent::Error(err) => {
                                    error!("[Panteão Internal Error] {}", err);
                                    let _ = app_handle.emit("panteao-error", serde_json::json!({ "type": "error", "message": err.to_string() }).to_string());
                                    let _ = app_handle.emit("panteao-ready", ());
                                }
                                _ => {}
                            }
                        }
                    });
                    
                    start_panteao_tcp_proxy(app, port);
                }
                Err(e) => error!("[Erro] Falha ao spawnar o Panteão: {}", e),
            }
        }
        Err(e) => error!("[Aviso Crítico] Sidecar 'panteao-engine' não encontrado: {}", e),
    }
}

fn start_panteao_tcp_proxy(app: &AppHandle, port: u16) {
    let app_handle_proxy = app.clone();
    std::thread::spawn(move || {
        let mut attempts = 0;
        let mut client_opt = None;
        let address = format!("127.0.0.1:{}", port);
        
        while attempts < 15 {
            std::thread::sleep(std::time::Duration::from_secs(1));
            if let Ok(client) = Panteao::connect(&address) {
                client_opt = Some(client);
                break;
            }
            attempts += 1;
        }
        
        if let Some(client) = client_opt {
            info!("[Tauri Proxy] Conectado ao Panteão (Panteao) na porta {}!", port);
            
            client.on_any_action(move |agent, action_name, args, respond| {
                let args_joined = args.iter()
                    .map(|a| if a.parse::<f64>().is_ok() || a.starts_with('[') || a == "true" || a == "false" { 
                        a.to_string() 
                    } else { 
                        format!("\"{}\"", a) 
                    })
                    .collect::<Vec<String>>()
                    .join(", ");
                    
                let action_raw = format!("{}({})", action_name, args_joined);
                
                let json = serde_json::json!({
                    "type": "action",
                    "agent": agent,
                    "action": action_raw
                });

                let config = log_config::get_config();
                if config.show_ipc_receives {
                    let should_ignore_agent = config.ipc_ignored_agents.iter().any(|a| a == agent);
                    let should_ignore_content = config.ipc_ignored_contents.iter().any(|c| action_raw.contains(c));
                    
                    if !should_ignore_agent && !should_ignore_content {
                        info!("[Rust IPC Debug] Ação Recebida via Panteao: {}", json.to_string());
                    }
                }
                
                let _ = app_handle_proxy.emit("panteao-event", &json);
                respond(true);
            });
            
            if PANTEAO_CLIENT.set(Arc::new(client)).is_err() {
                error!("[Tauri Proxy] Falha ao registrar cliente Panteão no OnceLock!");
            }
        } else {
            error!("[Tauri Proxy] Não foi possível conectar via Panteao na porta {}.", port);
        }
    });
}
