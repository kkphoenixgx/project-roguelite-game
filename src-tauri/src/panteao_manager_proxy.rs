fn start_panteao_tcp_proxy(app: &AppHandle, port: u16) {
    let app_handle_proxy = app.clone();
    std::thread::spawn(move || {
        let mut attempts = 0;
        let mut client_opt = None;
        let address = format!("127.0.0.1:{}", port);
        
        while attempts < 15 {
            std::thread::sleep(std::time::Duration::from_secs(1));
            // Conecta usando o SDK nativo!
            if let Ok(client) = Panteao::connect(&address) {
                client_opt = Some(client);
                break;
            }
            attempts += 1;
        }
