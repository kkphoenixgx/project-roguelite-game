//! Teste Blackbox de Inicialização e Integridade do Ícone do Jogo
//! Simula a experiência do usuário final ("Abri o jogo, tá com o ícone?"):
//! 1. Verifica se o runtime do Tauri embute o ícone padrão da janela compilado no binário.
//! 2. Valida as dimensões, canais RGBA e integridade visual (não-transparente / não-vazio).
//! 3. Verifica se o `tauri.conf.json` declara os ícones do bundle corretamente.
//! 4. Valida a integridade binária dos arquivos nos formatos PNG, ICO (Windows) e ICNS (macOS).
//! 5. Verifica se o frontend/webview possui o favicon do jogo sincronizado no HTML e na pasta pública.

use std::fs;
use std::path::PathBuf;

/// Helper para obter o caminho raiz do projeto `src-tauri`
fn get_src_tauri_dir() -> PathBuf {
    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    manifest_dir
}

/// Helper para obter a raiz do repositório
fn get_project_root_dir() -> PathBuf {
    let mut dir = get_src_tauri_dir();
    dir.pop(); // sobe de src-tauri para a raiz do repositório
    dir
}

#[test]
fn test_tauri_runtime_window_icon_is_embedded_and_valid() {
    // 1. Simula a abertura do jogo gerando o contexto do Tauri
    let context: tauri::Context<tauri::Wry> = tauri::generate_context!();

    // 2. O usuário abre a janela: o Tauri precisa ter o ícone padrão de janela registrado
    let window_icon = context.default_window_icon();
    assert!(
        window_icon.is_some(),
        "[FALHA BLACKBOX] O contexto do Tauri não possui um default_window_icon embutido! Ao abrir o jogo, a janela ficaria sem ícone."
    );

    let icon = window_icon.unwrap();
    let width = icon.width();
    let height = icon.height();
    let rgba = icon.rgba();

    println!(
        "[BLACKBOX QA] Ícone embutido no binário do jogo: {}x{}px | Buffer RGBA: {} bytes",
        width,
        height,
        rgba.len()
    );

    // 3. Validação de dimensões do ícone do jogo
    assert!(
        width >= 32 && height >= 32,
        "[FALHA BLACKBOX] Dimensões do ícone ({width}x{height}) são inferiores ao mínimo aceitável (32x32)."
    );
    assert_eq!(
        rgba.len(),
        (width * height * 4) as usize,
        "[FALHA BLACKBOX] O buffer RGBA do ícone não possui o tamanho exato de (width * height * 4)."
    );

    // 4. Verificação de conteúdo real da imagem (não pode ser uma imagem 100% transparente ou vazia)
    let total_pixels = (width * height) as usize;
    let mut visible_pixels = 0usize;
    let mut non_black_pixels = 0usize;

    for chunk in rgba.chunks_exact(4) {
        let r = chunk[0];
        let g = chunk[1];
        let b = chunk[2];
        let a = chunk[3];

        if a > 30 {
            visible_pixels += 1;
            if r > 10 || g > 10 || b > 10 {
                non_black_pixels += 1;
            }
        }
    }

    let visible_ratio = (visible_pixels as f64) / (total_pixels as f64);
    println!(
        "[BLACKBOX QA] Pixels visíveis (Alpha > 30): {}/{} ({:.1}%) | Pixels com cor: {}",
        visible_pixels, total_pixels, visible_ratio * 100.0, non_black_pixels
    );

    assert!(
        visible_pixels > 0 && visible_ratio >= 0.05,
        "[FALHA BLACKBOX] O ícone da janela está vazio ou quase totalmente transparente ({:.1}% visível).",
        visible_ratio * 100.0
    );
    assert!(
        non_black_pixels > 0,
        "[FALHA BLACKBOX] O ícone é puramente preto transparente, sem arte ou elementos visíveis."
    );
}

#[test]
fn test_tauri_conf_declares_bundle_icons_and_files_exist() {
    let tauri_dir = get_src_tauri_dir();
    let conf_path = tauri_dir.join("tauri.conf.json");

    assert!(
        conf_path.exists(),
        "[FALHA BLACKBOX] Arquivo tauri.conf.json não encontrado em {:?}",
        conf_path
    );

    let conf_content = fs::read_to_string(&conf_path)
        .expect("[FALHA BLACKBOX] Falha ao ler tauri.conf.json");
    let json: serde_json::Value = serde_json::from_str(&conf_content)
        .expect("[FALHA BLACKBOX] tauri.conf.json não é um JSON válido");

    // bundle.icon deve estar configurado
    let bundle_icon = json
        .get("bundle")
        .and_then(|b| b.get("icon"))
        .and_then(|i| i.as_array());

    assert!(
        bundle_icon.is_some(),
        "[FALHA BLACKBOX] A chave 'bundle.icon' não está configurada no tauri.conf.json!"
    );

    let icon_list = bundle_icon.unwrap();
    assert!(
        !icon_list.is_empty(),
        "[FALHA BLACKBOX] A lista de ícones em 'bundle.icon' está vazia!"
    );

    for item in icon_list {
        let relative_path = item.as_str().expect("Caminho do ícone deve ser string");
        let full_path = tauri_dir.join(relative_path);

        assert!(
            full_path.exists(),
            "[FALHA BLACKBOX] Arquivo de ícone configurado '{relative_path}' NÃO EXISTE no disco em {:?}",
            full_path
        );

        let metadata = fs::metadata(&full_path).unwrap();
        assert!(
            metadata.len() > 0,
            "[FALHA BLACKBOX] O arquivo de ícone '{relative_path}' está vazio (0 bytes)!"
        );

        println!(
            "[BLACKBOX QA] Ícone do bundle verificado: {} ({} bytes)",
            relative_path,
            metadata.len()
        );
    }
}

#[test]
fn test_icon_files_binary_integrity() {
    let tauri_dir = get_src_tauri_dir();

    // 1. Validar PNG principal (icons/icon.png)
    let png_path = tauri_dir.join("icons/icon.png");
    assert!(png_path.exists(), "icons/icon.png deve existir");
    let png_bytes = fs::read(&png_path).expect("Falha ao ler icon.png");

    // Assinatura PNG padrão: 89 50 4E 47 0D 0A 1A 0A
    let png_magic = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
    assert!(
        png_bytes.starts_with(&png_magic),
        "[FALHA BLACKBOX] icons/icon.png não possui a assinatura mágica válida de um arquivo PNG!"
    );

    // Validar cabeçalho IHDR (offsets 12..16 == "IHDR")
    assert_eq!(
        &png_bytes[12..16],
        b"IHDR",
        "[FALHA BLACKBOX] Chunk IHDR ausente no início de icons/icon.png"
    );
    let width = u32::from_be_bytes(png_bytes[16..20].try_into().unwrap());
    let height = u32::from_be_bytes(png_bytes[20..24].try_into().unwrap());
    println!("[BLACKBOX QA] icons/icon.png validado com sucesso: {}x{}px", width, height);
    assert_eq!(width, 512, "icon.png padrão de alta resolução deve ser 512x512");
    assert_eq!(height, 512, "icon.png padrão de alta resolução deve ser 512x512");

    // 2. Validar ICO para Windows (icons/icon.ico)
    let ico_path = tauri_dir.join("icons/icon.ico");
    assert!(ico_path.exists(), "icons/icon.ico deve existir");
    let ico_bytes = fs::read(&ico_path).expect("Falha ao ler icon.ico");

    // Assinatura ICO: 00 00 01 00 (Tipo 1 = Icon)
    assert!(
        ico_bytes.starts_with(&[0x00, 0x00, 0x01, 0x00]),
        "[FALHA BLACKBOX] icons/icon.ico não possui a assinatura mágica válida de arquivo de ícone Windows (.ico)!"
    );
    let img_count = u16::from_le_bytes(ico_bytes[4..6].try_into().unwrap());
    println!("[BLACKBOX QA] icons/icon.ico contém {} resoluções empacotadas para o Windows", img_count);
    assert!(
        img_count >= 1,
        "[FALHA BLACKBOX] icons/icon.ico não contém nenhuma sub-imagem empacotada!"
    );

    // 3. Validar ICNS para macOS (icons/icon.icns)
    let icns_path = tauri_dir.join("icons/icon.icns");
    assert!(icns_path.exists(), "icons/icon.icns deve existir");
    let icns_bytes = fs::read(&icns_path).expect("Falha ao ler icon.icns");

    // Assinatura ICNS: "icns"
    assert!(
        icns_bytes.starts_with(b"icns"),
        "[FALHA BLACKBOX] icons/icon.icns não possui o magic header 'icns' da Apple!"
    );
    let icns_len = u32::from_be_bytes(icns_bytes[4..8].try_into().unwrap()) as usize;
    println!("[BLACKBOX QA] icons/icon.icns validado: tamanho no header = {} bytes, tamanho lido = {} bytes", icns_len, icns_bytes.len());
    assert_eq!(
        icns_len,
        icns_bytes.len(),
        "[FALHA BLACKBOX] Tamanho declarado no header ICNS difere do tamanho real do arquivo"
    );

    // 4. Validar ícones auxiliares de desktop Linux (32x32 e 128x128)
    for res in ["32x32", "128x128", "64x64"] {
        let path = tauri_dir.join(format!("icons/{}.png", res));
        if path.exists() {
            let bytes = fs::read(&path).unwrap();
            assert!(
                bytes.starts_with(&png_magic),
                "icons/{}.png deve ser um PNG válido",
                res
            );
            println!("[BLACKBOX QA] icons/{}.png verificado com sucesso", res);
        }
    }
}

#[test]
fn test_frontend_web_favicon_and_game_icon_sync() {
    let project_root = get_project_root_dir();

    // 1. Checa favicon público
    let public_icon = project_root.join("public/game-icon.png");
    assert!(
        public_icon.exists(),
        "[FALHA BLACKBOX] public/game-icon.png não existe para o carregamento do frontend web/webview!"
    );
    let icon_bytes = fs::read(&public_icon).unwrap();
    assert!(
        icon_bytes.starts_with(&[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
        "[FALHA BLACKBOX] public/game-icon.png não é um arquivo PNG válido!"
    );

    // 2. Checa index.html contendo a tag <link rel="icon" ...>
    let index_html = project_root.join("index.html");
    assert!(index_html.exists(), "index.html deve existir");
    let html_content = fs::read_to_string(&index_html).unwrap();

    assert!(
        html_content.contains(r#"rel="icon""#) && html_content.contains("game-icon.png"),
        "[FALHA BLACKBOX] index.html não referencia o game-icon.png na tag <link rel=\"icon\">"
    );

    println!("[BLACKBOX QA] Frontend index.html e public/game-icon.png devidamente vinculados e sincronizados");
}

#[test]
fn test_blackbox_game_opening_experience_window_and_title() {
    let context: tauri::Context<tauri::Wry> = tauri::generate_context!();
    let config = context.config();

    // 1. Nome do produto
    let product_name = config.product_name.as_deref().unwrap_or("");
    assert_eq!(
        product_name, "rpg-roguelite-game",
        "[FALHA BLACKBOX] Nome do produto diverge do esperado"
    );

    // 2. Janela principal
    assert!(
        !config.app.windows.is_empty(),
        "[FALHA BLACKBOX] Nenhuma janela de jogo configurada no aplicativo!"
    );
    let main_window = &config.app.windows[0];
    assert_eq!(
        main_window.label, "main",
        "[FALHA BLACKBOX] A janela principal do jogo deve ter label 'main'"
    );
    assert_eq!(
        main_window.title, "rpg-roguelite-game",
        "[FALHA BLACKBOX] Título da janela diverge de 'rpg-roguelite-game'"
    );

    // 3. Ícone disponível para o Window Manager
    assert!(
        context.default_window_icon().is_some(),
        "[FALHA BLACKBOX] Ao abrir a janela principal 'main', o Window Manager não encontrará o ícone padrão."
    );

    println!(
        "[BLACKBOX QA] Janela '{}' configurada e pronta para exibição com título '{}' e ícone ativo.",
        main_window.label, main_window.title
    );
}

#[test]
#[cfg(target_os = "linux")]
fn test_linux_desktop_environment_icon_association() {
    let tauri_dir = get_src_tauri_dir();
    let conf_path = tauri_dir.join("tauri.conf.json");
    let conf_content = fs::read_to_string(&conf_path).expect("Falha ao ler tauri.conf.json");
    let json: serde_json::Value = serde_json::from_str(&conf_content).expect("JSON inválido");

    // 1. A janela principal deve declarar windowClassname para permitir ao compositor do Linux (GNOME/KDE/Wayland)
    // fazer o match da janela com a entrada .desktop instalada.
    let window_classname = json
        .get("app")
        .and_then(|a| a.get("windows"))
        .and_then(|w| w.get(0))
        .and_then(|win| win.get("windowClassname"))
        .and_then(|wc| wc.as_str());

    assert_eq!(
        window_classname,
        Some("rpg-roguelite-game"),
        "[FALHA BLACKBOX LINUX] A janela precisa de 'windowClassname': 'rpg-roguelite-game' no tauri.conf.json \
        para que o GNOME Shell e Wayland saibam qual ícone associar à janela no Dash e Alt+Tab!"
    );

    // 2. No Linux (especialmente Wayland/GNOME Shell), verificar se existe ao menos um arquivo .desktop
    // em ~/.local/share/applications ou /usr/share/applications com o ícone apontando para um asset existente.
    let home = std::env::var("HOME").unwrap_or_default();
    let local_apps = PathBuf::from(&home).join(".local/share/applications");
    let candidates = [
        local_apps.join("rpg-roguelite-game.desktop"),
        local_apps.join("com.kkphoenix.rpgroguelite.desktop"),
        PathBuf::from("/usr/share/applications/rpg-roguelite-game.desktop"),
        PathBuf::from("/usr/share/applications/com.kkphoenix.rpgroguelite.desktop"),
    ];

    let found_desktop = candidates.iter().find(|p| p.exists());
    assert!(
        found_desktop.is_some(),
        "[FALHA BLACKBOX LINUX] Nenhum arquivo .desktop encontrado em ~/.local/share/applications para rpg-roguelite-game. \
        No Wayland/GNOME Shell, o compositor NÃO lê pixels da janela: ele exige um .desktop registrado. \
        Sem ele, o GNOME exibe a engrenagem azul padrão de fallback!"
    );

    let desktop_file = found_desktop.unwrap();
    let content = fs::read_to_string(desktop_file).expect("Falha ao ler arquivo .desktop");

    // Valida que o .desktop contém a chave Icon apontando para um arquivo existente
    let icon_line = content
        .lines()
        .find(|l| l.starts_with("Icon="))
        .expect("[FALHA BLACKBOX LINUX] Arquivo .desktop não possui a diretiva 'Icon='");

    let icon_path_str = &icon_line["Icon=".len()..];
    let icon_path = PathBuf::from(icon_path_str);
    assert!(
        icon_path.exists(),
        "[FALHA BLACKBOX LINUX] O caminho de ícone declarado no .desktop ('{}') não existe no disco!",
        icon_path_str
    );

    // Valida que StartupWMClass está presente e alinhado com windowClassname
    let wm_class_line = content
        .lines()
        .find(|l| l.starts_with("StartupWMClass="))
        .expect("[FALHA BLACKBOX LINUX] Arquivo .desktop deve conter 'StartupWMClass=' para pareamento Wayland");

    let wm_class_val = &wm_class_line["StartupWMClass=".len()..];
    assert_eq!(
        wm_class_val, "rpg-roguelite-game",
        "[FALHA BLACKBOX LINUX] StartupWMClass no .desktop deve bater com o windowClassname da janela ('rpg-roguelite-game')"
    );

    println!(
        "[BLACKBOX QA] Integração com Linux Desktop (GNOME/Wayland) aprovada: {:?} apontando para {:?}",
        desktop_file, icon_path
    );
}

