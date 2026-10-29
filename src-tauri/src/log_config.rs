use std::fs;
use serde::Deserialize;
use std::path::PathBuf;

fn default_true() -> bool {
    true
}

fn default_false() -> bool {
    false
}

#[derive(Deserialize, Clone)]
pub struct LogConfig {
    pub show_ipc_sends: bool,
    pub show_ipc_receives: bool,
    pub ipc_ignored_agents: Vec<String>,
    pub ipc_ignored_contents: Vec<String>,
    pub show_ollama_requests: bool,
    pub show_ollama_responses: bool,
    #[serde(default = "default_true")]
    pub ollama_compact_logs: bool,
    #[serde(default = "default_false")]
    pub show_ollama_process_logs: bool,
    #[serde(default = "default_false")]
    pub show_ollama_stdout: bool,
    #[serde(default = "default_false")]
    pub show_ollama_stderr: bool,
    pub show_panteao_stdout: bool,
    pub show_panteao_stderr: bool,
    pub browser_ignored_channels: Vec<String>,
    #[serde(default = "default_true")]
    pub show_performance_logs: bool,
    #[serde(default = "default_false")]
    pub enable_native_system_debug: bool,
    #[serde(default = "default_false")]
    pub monitor_process_memory: bool,
    #[serde(default = "default_false")]
    pub disable_webkit_dmabuf_renderer: bool,
}

impl LogConfig {
    pub fn should_show_ollama_stdout(&self) -> bool {
        self.show_ollama_stdout || self.show_ollama_process_logs
    }

    pub fn should_show_ollama_stderr(&self) -> bool {
        self.show_ollama_stderr || self.show_ollama_process_logs
    }
}

impl Default for LogConfig {
    fn default() -> Self {
        Self {
            show_ipc_sends: true,
            show_ipc_receives: true,
            ipc_ignored_agents: vec![],
            ipc_ignored_contents: vec![],
            show_ollama_requests: true,
            show_ollama_responses: true,
            ollama_compact_logs: true,
            show_ollama_process_logs: false,
            show_ollama_stdout: false,
            show_ollama_stderr: false,
            show_panteao_stdout: true,
            show_panteao_stderr: true,
            browser_ignored_channels: vec![],
            show_performance_logs: true,
            enable_native_system_debug: false,
            monitor_process_memory: false,
            disable_webkit_dmabuf_renderer: false,
        }
    }
}

pub fn get_config() -> LogConfig {
    // Tenta ler do diretório atual ou subir um nível dependendo de onde o tauri tá rodando
    let paths = vec!["log_config.json", "../log_config.json"];
    
    for p in paths {
        let path = PathBuf::from(p);
        if path.exists() {
            if let Ok(content) = fs::read_to_string(&path) {
                if let Ok(config) = serde_json::from_str::<LogConfig>(&content) {
                    return config;
                }
            }
        }
    }
    
    LogConfig::default()
}

#[tauri::command]
pub fn log_browser(channel: String, level: String, message: String) {
    let config = get_config();
    let is_error = level.eq_ignore_ascii_case("error")
        || channel.to_lowercase().contains("error")
        || channel.to_lowercase().contains("crash")
        || channel.to_lowercase().contains("fatal");

    if !is_error && config.browser_ignored_channels.iter().any(|c| c == &channel) {
        return;
    }
    
    let is_crash = channel.eq_ignore_ascii_case("crash")
        || message.contains("BROWSER CRASH")
        || message.contains("Game Loop Panic");

    if is_crash {
        crate::crash_reporter::log_crash_everywhere("Browser Frontend", &channel, &message);
    }

    let is_perf = channel.eq_ignore_ascii_case("performance") || channel.eq_ignore_ascii_case("perf");

    if is_perf {
        if config.show_performance_logs {
            use std::io::Write;
            let mut buffer = String::with_capacity(message.len() + 1024);
            buffer.push_str("\n\x1b[1;36m=== [Tauri Performance] ===\x1b[0m\n");
            for line in message.lines() {
                if line.contains("DOMÍNIO") {
                    buffer.push_str("\x1b[1;35m");
                    buffer.push_str(line);
                    buffer.push_str("\x1b[0m\n");
                } else if line.contains("ADAPTADORES") {
                    buffer.push_str("\x1b[1;36m");
                    buffer.push_str(line);
                    buffer.push_str("\x1b[0m\n");
                } else if line.contains("FPS:") || line.contains("TOP") {
                    buffer.push_str("\x1b[1;33m");
                    buffer.push_str(line);
                    buffer.push_str("\x1b[0m\n");
                } else if line.starts_with('│') || line.starts_with('┌') || line.starts_with('├') || line.starts_with('└') {
                    buffer.push_str("\x1b[1;32m");
                    buffer.push_str(line);
                    buffer.push_str("\x1b[0m\n");
                } else {
                    buffer.push_str(line);
                    buffer.push('\n');
                }
            }
            buffer.push_str("\x1b[1;36m=============================\x1b[0m\n\n");
            let mut stderr = std::io::stderr().lock();
            let _ = stderr.write_all(buffer.as_bytes());
            let _ = stderr.flush();
        }
        return;
    }

    let formatted = format!("[Browser | {}] {}", channel, message);
    match level.to_lowercase().as_str() {
        "error" => log::error!("{}", formatted),
        "warn" => log::warn!("{}", formatted),
        "debug" => log::debug!("{}", formatted),
        _ => log::info!("{}", formatted),
    }
}

#[tauri::command]
pub fn open_devtools(window: tauri::WebviewWindow) {
    window.open_devtools();
}

pub fn apply_system_environment_flags() {
    let config = get_config();
    let profile = crate::platform_env::PlatformGraphicsProfile::detect();
    profile.apply_environment_policy(&config);
}

pub fn start_memory_monitor() {
    let config = get_config();
    if !config.monitor_process_memory {
        return;
    }

    std::thread::spawn(|| {
        let pid = std::process::id();
        loop {
            std::thread::sleep(std::time::Duration::from_secs(30));
            #[cfg(target_os = "linux")]
            {
                if let Ok(output) = std::process::Command::new("sh")
                    .arg("-c")
                    .arg(format!("ps -o pid,comm,rss -p {} --ppid {} 2>/dev/null", pid, pid))
                    .output()
                {
                    let text = String::from_utf8_lossy(&output.stdout);
                    let mut lines = text.lines();
                    let _header = lines.next();
                    let mut report = Vec::new();
                    for line in lines {
                        let parts: Vec<&str> = line.split_whitespace().collect();
                        if parts.len() >= 3 {
                            if let Ok(rss_kb) = parts[2].parse::<u64>() {
                                let mb = rss_kb / 1024;
                                report.push(format!("{}: {} MB", parts[1], mb));
                            }
                        }
                    }
                    if !report.is_empty() {
                        log::info!("[Monitor de Memória RAM] {}", report.join(" | "));
                    }
                }
            }
        }
    });
}
