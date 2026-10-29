use std::fs::OpenOptions;
use std::io::Write;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

pub fn get_timestamp_string() -> String {
    let duration = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default();
    let secs = duration.as_secs();
    
    // Formato aproximado UTC: YYYY-MM-DD HH:MM:SS
    let days = secs / 86400;
    let rem_secs = secs % 86400;
    let hours = rem_secs / 3600;
    let minutes = (rem_secs % 3600) / 60;
    let seconds = rem_secs % 60;

    // Cálculo simplificado de ano/mês a partir de 1970
    let mut year = 1970;
    let mut d = days;
    loop {
        let leap = if (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0) { 1 } else { 0 };
        let days_in_year = 365 + leap;
        if d < days_in_year {
            break;
        }
        d -= days_in_year;
        year += 1;
    }

    let leap = if (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0) { 1 } else { 0 };
    let month_days = [31, 28 + leap, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let mut month = 1;
    for &md in &month_days {
        if d < md {
            break;
        }
        d -= md;
        month += 1;
    }
    let day = d + 1;

    format!("{:04}-{:02}-{:02} {:02}:{:02}:{:02} UTC", year, month, day, hours, minutes, seconds)
}

pub fn log_crash_everywhere(source: &str, reason: &str, details: &str) {
    let timestamp = get_timestamp_string();
    let os_name = std::env::consts::OS;

    let banner = format!(
        "\n================================================================================\n\
         💥💥💥 [CRASH DETECTADO EM TODOS OS LUGARES] 💥💥💥\n\
         --------------------------------------------------------------------------------\n\
         • Sistema Operacional: {}\n\
         • Origem do Erro:      {}\n\
         • Motivo / Código:     {}\n\
         • Data e Horário:      {}\n\
         --------------------------------------------------------------------------------\n\
         • Detalhes / Stack Trace:\n\
         {}\n\
         ================================================================================\n",
        os_name, source, reason, timestamp, details.trim()
    );

    // 1. Terminal com destaque (Stderr sem buffer)
    eprintln!("\x1b[1;31m{}\x1b[0m", banner);

    // 2. Logger padrão do Tauri (para rpg-roguelite-game.log)
    log::error!("{}", banner);

    // 3. Grava no arquivo crash.log (raiz do projeto e src-tauri)
    let candidates = vec![
        PathBuf::from("crash.log"),
        PathBuf::from("../crash.log"),
        PathBuf::from("src-tauri/crash.log"),
    ];

    for path in candidates {
        if let Ok(mut f) = OpenOptions::new().create(true).append(true).open(&path) {
            let _ = writeln!(f, "{}", banner);
            let _ = f.flush();
        }
    }

    // 4. Notificação nativa no Desktop do Sistema Operacional
    #[cfg(target_os = "linux")]
    {
        let summary = format!("💥 RPG Roguelite Crash ({})", source);
        let body = format!("Motivo: {}\nVeja o arquivo crash.log", reason);
        let _ = std::process::Command::new("notify-send")
            .args(["-u", "critical", "-t", "10000", &summary, &body])
            .spawn();
    }

    #[cfg(target_os = "windows")]
    {
        let msg = format!("RPG Roguelite encontrou um erro crítico!\n\nOrigem: {}\nMotivo: {}\n\nVerifique o arquivo crash.log para detalhes.", source, reason);
        let _ = std::process::Command::new("cmd")
            .args(["/C", &format!("mshta vbscript:msgbox(\"{}\",16,\"💥 Crash Detectado\")(window.close)", msg.replace('"', "'"))])
            .spawn();
    }

    #[cfg(target_os = "macos")]
    {
        let script = format!("display notification \"Motivo: {}\" with title \"💥 RPG Roguelite Crash\" subtitle \"{}\"", reason, source);
        let _ = std::process::Command::new("osascript")
            .args(["-e", &script])
            .spawn();
    }
}
