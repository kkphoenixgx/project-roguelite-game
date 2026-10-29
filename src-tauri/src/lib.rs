mod state_manager;
mod ollama_manager;
mod panteao_manager;
mod settings_manager;
pub mod log_config;
pub mod crash_reporter;
pub mod platform_env;

fn cleanup_zombie_processes() {
    #[cfg(target_os = "windows")]
    {
        let _ = std::process::Command::new("taskkill").args(["/F", "/IM", "ollama.exe"]).output();
        let _ = std::process::Command::new("taskkill").args(["/F", "/IM", "panteao-engine.exe"]).output();
        let _ = std::process::Command::new("taskkill").args(["/F", "/IM", "node.exe"]).output(); // Pode matar outros nodes no windows, cuidado
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = std::process::Command::new("sh").arg("-c").arg("killall -9 ollama panteao-engine 2>/dev/null").output();
    }
}

#[tauri::command]
fn is_no_gpu() -> bool {
    std::env::args().any(|arg| arg == "--no-gpu" || arg == "--nogpu")
}

#[tauri::command]
fn exit_game(app: tauri::AppHandle) {
    cleanup_zombie_processes();
    #[cfg(target_os = "linux")]
    cleanup_linux_desktop_icon();
    app.exit(0);
}

#[cfg(target_os = "linux")]
fn ensure_linux_desktop_icon() {
    if let Some(home) = std::env::var_os("HOME") {
        let apps_dir = std::path::PathBuf::from(&home).join(".local/share/applications");
        let _ = std::fs::create_dir_all(&apps_dir);

        let mut candidates = vec![
            std::path::PathBuf::from("icons/icon.png"),
            std::path::PathBuf::from("src-tauri/icons/icon.png"),
        ];
        if let Ok(exe) = std::env::current_exe() {
            if let Some(parent) = exe.parent() {
                candidates.push(parent.join("icons/icon.png"));
                candidates.push(parent.join("../icons/icon.png"));
                candidates.push(parent.join("../../icons/icon.png"));
                candidates.push(parent.join("../../../icons/icon.png"));
                candidates.push(parent.join("../../../src-tauri/icons/icon.png"));
            }
        }

        let found_icon = candidates.into_iter().find(|p| p.exists());
        if let Some(icon_path) = found_icon {
            let abs_icon = std::fs::canonicalize(&icon_path).unwrap_or(icon_path);

            let pixmaps_dir = std::path::PathBuf::from(&home).join(".local/share/pixmaps");
            let _ = std::fs::create_dir_all(&pixmaps_dir);
            let canonical_icon_path = pixmaps_dir.join("com.kkphoenix.rpgroguelite.png");
            let _ = std::fs::copy(&abs_icon, &canonical_icon_path);

            // Instala o ícone no tema hicolor para ambos os identificadores para garantir compatibilidade
            for size in &["32x32", "64x64", "128x128", "256x256", "512x512"] {
                let hicolor_dir = std::path::PathBuf::from(&home).join(format!(".local/share/icons/hicolor/{}/apps", size));
                let _ = std::fs::create_dir_all(&hicolor_dir);
                let _ = std::fs::copy(&abs_icon, hicolor_dir.join("com.kkphoenix.rpgroguelite.png"));
                let _ = std::fs::copy(&abs_icon, hicolor_dir.join("rpg-roguelite-game.png"));
            }

            let _ = std::process::Command::new("gtk-update-icon-cache")
                .arg("-f")
                .arg("-t")
                .arg(std::path::PathBuf::from(&home).join(".local/share/icons/hicolor"))
                .output();

            let exe_path = std::env::current_exe()
                .map(|p| p.to_string_lossy().to_string())
                .unwrap_or_else(|_| "app".to_string());

            let icon_str = canonical_icon_path.to_string_lossy().to_string();

            let content = format!(
                "[Desktop Entry]\n\
                Type=Application\n\
                Name=rpg-roguelite-game\n\
                GenericName=RPG Roguelite\n\
                Comment=RPG Roguelite Game\n\
                Exec={}\n\
                Icon={}\n\
                Terminal=false\n\
                Categories=Game;RolePlaying;\n\
                StartupWMClass=com.kkphoenix.rpgroguelite\n\
                StartupNotify=true\n",
                exe_path,
                icon_str
            );

            // Remove entradas redundantes para que o GNOME tenha estritamente UM único ícone
            for legacy in &["app.desktop", "rpg-roguelite-game.desktop"] {
                let stale_file = apps_dir.join(legacy);
                if stale_file.exists() {
                    let _ = std::fs::remove_file(stale_file);
                }
            }

            let canonical_desktop = apps_dir.join("com.kkphoenix.rpgroguelite.desktop");
            let _ = std::fs::write(&canonical_desktop, &content);

            let _ = std::process::Command::new("update-desktop-database")
                .arg(&apps_dir)
                .output();
        }
    }
}

#[cfg(target_os = "linux")]
pub fn cleanup_linux_desktop_icon() {
    if let Some(home) = std::env::var_os("HOME") {
        let apps_dir = std::path::PathBuf::from(&home).join(".local/share/applications");
        for name in &["com.kkphoenix.rpgroguelite.desktop", "rpg-roguelite-game.desktop", "app.desktop"] {
            let stale_file = apps_dir.join(name);
            if stale_file.exists() {
                let _ = std::fs::remove_file(stale_file);
            }
        }
        for size in &["32x32", "64x64", "128x128", "256x256", "512x512"] {
            let hicolor_icon1 = std::path::PathBuf::from(&home).join(format!(".local/share/icons/hicolor/{}/apps/com.kkphoenix.rpgroguelite.png", size));
            if hicolor_icon1.exists() {
                let _ = std::fs::remove_file(hicolor_icon1);
            }
            let hicolor_icon2 = std::path::PathBuf::from(&home).join(format!(".local/share/icons/hicolor/{}/apps/rpg-roguelite-game.png", size));
            if hicolor_icon2.exists() {
                let _ = std::fs::remove_file(hicolor_icon2);
            }
        }
        let pixmap_icon = std::path::PathBuf::from(&home).join(".local/share/pixmaps/com.kkphoenix.rpgroguelite.png");
        if pixmap_icon.exists() {
            let _ = std::fs::remove_file(pixmap_icon);
        }
        let _ = std::process::Command::new("gtk-update-icon-cache")
            .arg("-f")
            .arg("-t")
            .arg(std::path::PathBuf::from(&home).join(".local/share/icons/hicolor"))
            .output();
        let _ = std::process::Command::new("update-desktop-database")
            .arg(&apps_dir)
            .output();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Garante que o GTK e Wayland usem o app_id oficial do desktop
    #[cfg(target_os = "linux")]
    {
        webkit2gtk::glib::set_prgname(Some("com.kkphoenix.rpgroguelite"));
        webkit2gtk::glib::set_application_name("rpg-roguelite-game");
    }

    // Aplica flags de depuração nativa no SO se configurado em log_config.json
    log_config::apply_system_environment_flags();

    // Configura o hook global de pânico do Rust para registrar em todos os lugares
    std::panic::set_hook(Box::new(|info| {
        let location = info.location()
            .map(|l| format!("{}:{}:{}", l.file(), l.line(), l.column()))
            .unwrap_or_else(|| "desconhecido".into());
        let message = if let Some(s) = info.payload().downcast_ref::<&str>() {
            s.to_string()
        } else if let Some(s) = info.payload().downcast_ref::<String>() {
            s.clone()
        } else {
            "Pânico sem mensagem explícita".to_string()
        };
        crash_reporter::log_crash_everywhere("Rust Core", &format!("Panic em {}", location), &message);
    }));

    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            cleanup_zombie_processes();
            log_config::start_memory_monitor();
            
            // Ollama Config
            let use_proxy = true;
            let proxy_script = "";
            let ollama_host_env = "127.0.0.1:11434"; // Default port
            ollama_manager::spawn_ollama_sidecar(app.handle(), use_proxy, proxy_script, ollama_host_env);
            ollama_manager::scan_and_register_mods_models(app.handle());
            
            // Panteão Config
            let jcm_file = "project.jcm";
            let panteao_port = 3271;
            let entities_fallback = "../typescript/domain/ObjectModule/Entities";
            panteao_manager::spawn_panteao_sidecar(app.handle(), jcm_file, panteao_port, entities_fallback);
            
            #[cfg(target_os = "linux")]
            {
                ensure_linux_desktop_icon();
                use tauri::Manager;
                use webkit2gtk::WebViewExt;
                if let Some(window) = app.get_webview_window("main") {
                    if let Some(icon) = app.default_window_icon().cloned() {
                        let _ = window.set_icon(icon);
                    }
                    let _ = window.with_webview(|webview| {
                        webview.inner().connect_web_process_terminated(|wv, reason| {
                            let reason_str = format!("{:?}", reason);
                            crash_reporter::log_crash_everywhere(
                                "WebKitWebProcess (Processo Gráfico)",
                                &reason_str,
                                "O processo da Webview sofreu terminação abrupta (SIGSEGV/OOM). Tentando recarregar a visualização..."
                            );
                            wv.reload();
                        });
                    });
                }
            }
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            is_no_gpu,
            exit_game,
            state_manager::save_game_state,
            state_manager::load_game_state,
            state_manager::save_game_slot,
            state_manager::load_game_slot,
            state_manager::delete_game_slot,
            panteao_manager::panteao_send,
            settings_manager::get_active_model,
            settings_manager::set_active_model,
            settings_manager::get_settings,
            settings_manager::save_llm_settings,
            ollama_manager::fetch_ollama_library,
            ollama_manager::search_ollama_models,
            ollama_manager::create_ollama_model,
            ollama_manager::open_mods_folder,
            log_config::log_browser,
            log_config::open_devtools
        ]);

    #[cfg(target_os = "linux")]
    unsafe {
        extern "C" {
            fn atexit(cb: extern "C" fn()) -> std::os::raw::c_int;
            fn signal(sig: std::os::raw::c_int, handler: extern "C" fn(std::os::raw::c_int)) -> usize;
        }
        extern "C" fn on_exit_handler() {
            cleanup_linux_desktop_icon();
        }
        extern "C" fn on_signal_handler(_: std::os::raw::c_int) {
            cleanup_linux_desktop_icon();
            std::process::exit(0);
        }
        let _ = atexit(on_exit_handler);
        let _ = signal(2, on_signal_handler);  // SIGINT (Ctrl+C)
        let _ = signal(15, on_signal_handler); // SIGTERM
    }

    builder
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|_app_handle, event| {
            #[cfg(target_os = "linux")]
            match event {
                tauri::RunEvent::ExitRequested { .. } | tauri::RunEvent::Exit => {
                    cleanup_linux_desktop_icon();
                }
                tauri::RunEvent::WindowEvent { event: tauri::WindowEvent::CloseRequested { .. } | tauri::WindowEvent::Destroyed, .. } => {
                    cleanup_linux_desktop_icon();
                }
                _ => {}
            }
        });
}