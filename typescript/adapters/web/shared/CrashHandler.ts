/**
 * @file CrashHandler.ts
 * Captura qualquer erro não tratado (window.onerror), Promise rejeitada (unhandledrejection),
 * console.error e falhas do Game Loop.
 * 
 * 1. Envia imediatamente para o terminal do Tauri via Rust invoke('log_browser')
 * 2. Exibe um Crash Overlay visual e interativo no topo da tela (evitando a tela cinza misteriosa)
 * 3. Permite abrir o DevTools via F12 ou botão no overlay
 * 4. Salva o último crash no localStorage para inspeção posterior
 */

let isCrashOverlayVisible = false;
let lastReportedMessage = '';
let repeatCount = 0;

async function sendToTauri(channel: string, level: string, message: string) {
    try {
        if ((window as any).__TAURI_INTERNALS__ || (window as any).__TAURI__) {
            const { invoke } = await import('@tauri-apps/api/core');
            await invoke('log_browser', { channel, level, message });
        }
    } catch {}
}

export function openDevTools() {
    try {
        if ((window as any).__TAURI_INTERNALS__ || (window as any).__TAURI__) {
            import('@tauri-apps/api/core').then(({ invoke }) => {
                invoke('open_devtools').catch(() => {});
            });
        }
    } catch {}
}

export function reportFatalCrash(context: string, error: any) {
    let errorMsg = '';
    let errorStack = '';

    if (error instanceof Error) {
        errorMsg = error.message;
        errorStack = error.stack || '';
    } else if (typeof error === 'string') {
        errorMsg = error;
    } else {
        try {
            errorMsg = JSON.stringify(error);
        } catch {
            errorMsg = String(error);
        }
    }

    //? Throttling de logs para evitar saturação do terminal a 60fps dentro do requestAnimationFrame
    if (errorMsg === lastReportedMessage) {
        repeatCount++;
        if (repeatCount % 60 !== 0) {
            return;
        }
    } else {
        lastReportedMessage = errorMsg;
        repeatCount = 1;
    }

    const formattedLog = `\n================== [💥 BROWSER CRASH DETECTED] ==================\n` +
        `Contexto: ${context}\n` +
        `Erro: ${errorMsg}\n` +
        (repeatCount > 1 ? `(Repetiu ${repeatCount}x no game loop)\n` : '') +
        (errorStack ? `Stack Trace:\n${errorStack}\n` : '') +
        `================================================================`;

    sendToTauri('CRASH', 'error', formattedLog);

    try {
        localStorage.setItem('LAST_GAME_CRASH', JSON.stringify({
            time: new Date().toISOString(),
            context,
            message: errorMsg,
            stack: errorStack
        }));
    } catch {}

    showCrashOverlay(context, errorMsg, errorStack);
}

function showCrashOverlay(context: string, message: string, stack: string) {
    let overlay = document.getElementById('game-crash-overlay');
    
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'game-crash-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(10, 10, 15, 0.95);
            color: #ff5555;
            font-family: 'Consolas', 'Fira Code', 'Courier New', monospace;
            z-index: 9999999;
            display: flex;
            flex-direction: column;
            padding: 30px;
            box-sizing: border-box;
            backdrop-filter: blur(8px);
            overflow-y: auto;
        `;
        document.body.appendChild(overlay);
    }

    overlay.innerHTML = `
        <div style="max-width: 900px; margin: 0 auto; width: 100%;">
            <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #ff4444; padding-bottom: 12px; margin-bottom: 20px;">
                <h1 style="color: #ff4444; margin: 0; font-size: 22px; display: flex; align-items: center; gap: 10px;">
                    <span>💥</span> ERRO CRÍTICO / CRASH DETECTADO
                </h1>
                <span style="color: #888; font-size: 13px;">${new Date().toLocaleTimeString()}</span>
            </div>

            <div style="background: #1c1114; border-left: 4px solid #ff4444; padding: 12px 16px; margin-bottom: 20px; border-radius: 4px;">
                <strong style="color: #ffaaaa; display: block; margin-bottom: 4px;">Contexto: ${context}</strong>
                <span style="color: #fff; font-size: 16px; word-break: break-word;">${escapeHtml(message)}</span>
            </div>

            ${stack ? `
            <div style="margin-bottom: 20px;">
                <div style="color: #aaa; font-size: 13px; margin-bottom: 6px;">Pilha de Chamadas (Stack Trace):</div>
                <pre style="background: #0d0d12; color: #f8f8f2; padding: 16px; border-radius: 6px; font-size: 12px; line-height: 1.5; overflow-x: auto; border: 1px solid #333; max-height: 350px;">${escapeHtml(stack)}</pre>
            </div>
            ` : ''}

            <div style="display: flex; gap: 12px; flex-wrap: wrap; margin-top: 25px;">
                <button id="btn-copy-crash" style="background: #2a2a38; color: #fff; border: 1px solid #444; padding: 10px 18px; border-radius: 6px; cursor: pointer; font-family: inherit; font-size: 14px; display: flex; align-items: center; gap: 8px;">
                    📋 Copiar Erro
                </button>
                <button id="btn-devtools-crash" style="background: #3b2847; color: #e0b0ff; border: 1px solid #6b4085; padding: 10px 18px; border-radius: 6px; cursor: pointer; font-family: inherit; font-size: 14px; display: flex; align-items: center; gap: 8px;">
                    🛠️ Abrir DevTools (F12)
                </button>
                <button id="btn-reload-crash" style="background: #ff4444; color: #fff; border: none; padding: 10px 18px; border-radius: 6px; cursor: pointer; font-family: inherit; font-size: 14px; font-weight: bold; display: flex; align-items: center; gap: 8px;">
                    🔄 Recarregar Jogo
                </button>
                <button id="btn-close-crash" style="background: transparent; color: #888; border: 1px solid #333; padding: 10px 18px; border-radius: 6px; cursor: pointer; font-family: inherit; font-size: 14px; margin-left: auto;">
                    Fechar Aviso
                </button>
            </div>
            
            <p style="color: #666; font-size: 12px; margin-top: 20px; text-align: center;">
                Dica: O log completo também foi registrado no console do terminal Tauri e salvo em arquivo.
            </p>
        </div>
    `;

    document.getElementById('btn-copy-crash')?.addEventListener('click', () => {
        const fullText = `[CRASH REPORT]\nContext: ${context}\nMessage: ${message}\nStack:\n${stack}`;
        navigator.clipboard.writeText(fullText).then(() => {
            const btn = document.getElementById('btn-copy-crash');
            if (btn) btn.innerText = '✅ Copiado!';
            setTimeout(() => {
                if (btn) btn.innerText = '📋 Copiar Erro';
            }, 2000);
        });
    });

    document.getElementById('btn-devtools-crash')?.addEventListener('click', () => {
        openDevTools();
    });

    document.getElementById('btn-reload-crash')?.addEventListener('click', () => {
        window.location.reload();
    });

    document.getElementById('btn-close-crash')?.addEventListener('click', () => {
        if (overlay) overlay.style.display = 'none';
        isCrashOverlayVisible = false;
    });

    overlay.style.display = 'flex';
    isCrashOverlayVisible = true;
}

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/* ================= GLOBAL LISTENERS ================= */

/* 1. Uncaught Javascript Errors */
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('error', (event) => {
        reportFatalCrash('Uncaught Error (window.onerror)', event.error || event.message);
    });

    /* 2. Unhandled Promise Rejections */
    window.addEventListener('unhandledrejection', (event) => {
        reportFatalCrash('Unhandled Promise Rejection', event.reason);
    });
}

/* 3. Intercept console.error to notify Tauri terminal */
const originalConsoleError = console.error;
console.error = function(...args: any[]) {
    originalConsoleError.apply(console, args);
    const message = args.map(a => {
        if (a instanceof Error) return `${a.message}\n${a.stack}`;
        if (typeof a === 'object') {
            try { return JSON.stringify(a); } catch { return String(a); }
        }
        return String(a);
    }).join(' ');

    sendToTauri('ConsoleError', 'error', message);

    //? Se o erro indicar pânico crítico, exibe o overlay visual de fatal crash
    if (message.includes('Panic') || message.includes('Falha ao inicializar') || message.includes('CRITICAL')) {
        reportFatalCrash('console.error', message);
    }
};

/* 4. Tecla F12 para abrir DevTools */
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('keydown', (e) => {
        if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) {
            e.preventDefault();
            openDevTools();
        }
    });
}

