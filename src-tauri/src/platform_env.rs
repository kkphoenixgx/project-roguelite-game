use crate::log_config::LogConfig;

/// Representa o perfil de ambiente gráfico e de plataforma detectado em tempo de execução.
#[derive(Debug, Clone)]
pub struct PlatformGraphicsProfile {
    pub os: &'static str,
    pub arch: &'static str,
    pub display_protocol: String,
    pub has_nvidia_driver: bool,
    pub has_hybrid_multi_gpu: bool,
    pub display_connected_to_nvidia: bool,
}

impl PlatformGraphicsProfile {
    /// Detecta de forma determinística e sem dependências externas a arquitetura, SO,
    /// servidor gráfico (Wayland/X11/Win32/Quartz) e topologia de GPUs.
    pub fn detect() -> Self {
        let os = std::env::consts::OS;
        let arch = std::env::consts::ARCH;

        #[cfg(target_os = "linux")]
        {
            let is_wayland = std::env::var_os("WAYLAND_DISPLAY").is_some()
                || std::env::var("XDG_SESSION_TYPE")
                    .map(|v| v.eq_ignore_ascii_case("wayland"))
                    .unwrap_or(false);

            let display_protocol = if is_wayland {
                "wayland".to_string()
            } else if std::env::var_os("DISPLAY").is_some() {
                "x11".to_string()
            } else {
                "headless".to_string()
            };

            let (has_nvidia_driver, has_hybrid_multi_gpu, display_connected_to_nvidia) =
                detect_linux_gpu_topology();

            Self {
                os,
                arch,
                display_protocol,
                has_nvidia_driver,
                has_hybrid_multi_gpu,
                display_connected_to_nvidia,
            }
        }

        #[cfg(target_os = "windows")]
        {
            Self {
                os,
                arch,
                display_protocol: "win32-webview2".to_string(),
                has_nvidia_driver: false,
                has_hybrid_multi_gpu: false,
                display_connected_to_nvidia: false,
            }
        }

        #[cfg(target_os = "macos")]
        {
            Self {
                os,
                arch,
                display_protocol: "quartz-wkwebview".to_string(),
                has_nvidia_driver: false,
                has_hybrid_multi_gpu: false,
                display_connected_to_nvidia: false,
            }
        }

        #[cfg(not(any(target_os = "linux", target_os = "windows", target_os = "macos")))]
        {
            Self {
                os,
                arch,
                display_protocol: "unknown".to_string(),
                has_nvidia_driver: false,
                has_hybrid_multi_gpu: false,
                display_connected_to_nvidia: false,
            }
        }
    }

    /// Aplica as configurações específicas da plataforma e arquitetura de forma isolada.
    pub fn apply_environment_policy(&self, config: &LogConfig) {
        #[cfg(target_os = "linux")]
        self.apply_linux_graphics_policy(config);

        #[cfg(target_os = "windows")]
        self.apply_windows_graphics_policy(config);

        #[cfg(target_os = "macos")]
        self.apply_macos_graphics_policy(config);

        self.apply_debug_policy(config);
    }

    #[cfg(target_os = "linux")]
    fn apply_linux_graphics_policy(&self, config: &LogConfig) {
        if config.disable_webkit_dmabuf_renderer {
            std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
            eprintln!(
                "\x1b[1;33m[Platform/{}-{}] WEBKIT_DISABLE_DMABUF_RENDERER=1 ativo via log_config.json.\x1b[0m",
                self.os, self.arch
            );
            return;
        }

        // Habilita o Compositing Mode acelerado por GPU em todos os ambientes Linux
        std::env::set_var("WEBKIT_FORCE_COMPOSITING_MODE", "1");

        // Caso 1: Driver proprietário NVIDIA ativo sob Wayland (ou com display conectado à NVIDIA / PRIME Offload)
        // O WebKitGTK 2.42+ possui incompatibilidade conhecida entre seu protocolo DMABUF Explicit Sync / GBM
        // e o driver proprietário NVIDIA no Wayland, resultando em:
        // - "Gdk-Message: Error 71 (Protocol error) dispatching to Wayland display" (quando DMABUF está ativo no Wayland)
        // - Tela cinza / "AcceleratedSurfaceDMABuf was unable to construct a complete framebuffer" (em XWayland)
        // Solução recomendada pela documentação oficial do Tauri v2 para NVIDIA+Wayland:
        // Desativar apenas o transporte DMABUF (`WEBKIT_DISABLE_DMABUF_RENDERER=1`) mantendo o Compositing Mode (`WEBKIT_FORCE_COMPOSITING_MODE=1`)
        // e a GPU NVIDIA nativa ativos.
        let is_nvidia_rendering = self.has_nvidia_driver
            && (self.display_connected_to_nvidia
                || !self.has_hybrid_multi_gpu
                || std::env::var_os("__NV_PRIME_RENDER_OFFLOAD").is_some());

        if is_nvidia_rendering && self.display_protocol == "wayland" {
            std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
            std::env::set_var("__NV_DISABLE_EXPLICIT_SYNC", "1");
            eprintln!(
                "\x1b[1;32m[Platform/{}-{}] Topologia NVIDIA + Wayland detectada: WEBKIT_DISABLE_DMABUF_RENDERER=1 & WEBKIT_FORCE_COMPOSITING_MODE=1 aplicados (previne Wayland Error 71 e tela cinza).\x1b[0m",
                self.os, self.arch
            );
        } else {
            // Caso 2: GPUs AMD/Intel (Mesa) ou X11 nativo — DMABUF zero-copy 100% compatível
            std::env::remove_var("WEBKIT_DISABLE_DMABUF_RENDERER");
            eprintln!(
                "\x1b[1;32m[Platform/{}-{}] GPU Hardware Acceleration ativa (DMABUF & Compositing Mode nativos em {}).\x1b[0m",
                self.os, self.arch, self.display_protocol
            );
        }
    }

    #[cfg(target_os = "windows")]
    fn apply_windows_graphics_policy(&self, _config: &LogConfig) {
        eprintln!(
            "\x1b[1;32m[Platform/{}-{}] Ambiente WebView2 DirectComposition ativo.\x1b[0m",
            self.os, self.arch
        );
    }

    #[cfg(target_os = "macos")]
    fn apply_macos_graphics_policy(&self, _config: &LogConfig) {
        eprintln!(
            "\x1b[1;32m[Platform/{}-{}] Ambiente WKWebView Metal ativo.\x1b[0m",
            self.os, self.arch
        );
    }

    fn apply_debug_policy(&self, config: &LogConfig) {
        if config.enable_native_system_debug {
            #[cfg(target_os = "linux")]
            {
                std::env::set_var("LIBGL_DEBUG", "verbose");
                std::env::set_var("MESA_DEBUG", "1");
                std::env::set_var("WEBKIT_FORCE_SANDBOX", "0");
            }
            eprintln!(
                "\x1b[1;36m[Platform/{}-{}] Variáveis de depuração nativa ativadas via log_config.json\x1b[0m",
                self.os, self.arch
            );
        } else {
            #[cfg(target_os = "linux")]
            {
                std::env::remove_var("LIBGL_DEBUG");
                std::env::remove_var("MESA_DEBUG");
                std::env::remove_var("WEBKIT_FORCE_SANDBOX");
            }
        }
    }
}

/// Inspeciona `/sys/class/drm/card*` para identificar:
/// 1. Se há driver NVIDIA presente (`0x10de`).
/// 2. Se há topologia Multi-GPU híbrida.
/// 3. Se os monitores físicos ativos (`status == "connected"`) estão ligados diretamente na GPU NVIDIA.
#[cfg(target_os = "linux")]
fn detect_linux_gpu_topology() -> (bool, bool, bool) {
    let mut has_nvidia = std::path::Path::new("/proc/driver/nvidia/version").exists()
        || std::path::Path::new("/dev/nvidiactl").exists()
        || std::path::Path::new("/sys/module/nvidia").exists();

    let mut gpu_vendors = Vec::new();
    let mut nvidia_cards = Vec::new();
    let mut display_connected_to_nvidia = false;

    if let Ok(entries) = std::fs::read_dir("/sys/class/drm") {
        let all_entries: Vec<_> = entries.flatten().collect();

        // Passo 1: Identifica os vendors de cada card base (card0, card1, card2...)
        for entry in &all_entries {
            let name_str = entry.file_name().to_string_lossy().to_string();
            if name_str.starts_with("card") && !name_str.contains('-') {
                let vendor_path = entry.path().join("device/vendor");
                if let Ok(vendor_raw) = std::fs::read_to_string(vendor_path) {
                    let vendor = vendor_raw.trim().to_lowercase();
                    if vendor == "0x10de" {
                        has_nvidia = true;
                        nvidia_cards.push(name_str.clone());
                    }
                    if !vendor.is_empty() && !gpu_vendors.contains(&vendor) {
                        gpu_vendors.push(vendor);
                    }
                }
            }
        }

        // Passo 2: Verifica se algum conector físico (ex: card2-eDP-2, card2-HDMI-A-1) ligado na NVIDIA está "connected"
        for entry in &all_entries {
            let name_str = entry.file_name().to_string_lossy().to_string();
            for nv_card in &nvidia_cards {
                let prefix = format!("{}-", nv_card);
                if name_str.starts_with(&prefix) {
                    if let Ok(status) = std::fs::read_to_string(entry.path().join("status")) {
                        if status.trim().eq_ignore_ascii_case("connected") {
                            display_connected_to_nvidia = true;
                        }
                    }
                }
            }
        }
    }

    let has_hybrid_multi_gpu = gpu_vendors.len() > 1;
    (has_nvidia, has_hybrid_multi_gpu, display_connected_to_nvidia)
}
