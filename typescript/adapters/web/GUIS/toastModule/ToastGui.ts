import BaseGuiTemplate from "../../templates/BaseGuiTemplate";
import html from "./toast.html?raw";
import css from "./toast.css?raw";

export type ToastVariant = 'error' | 'warning' | 'info' | 'success';

export interface ToastItem {
    id: number;
    element: HTMLElement;
    timeoutId: ReturnType<typeof setTimeout> | null;
}

const VARIANT_ICONS: Record<ToastVariant, string> = {
    error: `<svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
    </svg>`,
    warning: `<svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
        <line x1="12" y1="9" x2="12" y2="13"></line>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
    </svg>`,
    info: `<svg viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="16" x2="12" y2="12"></line>
        <line x1="12" y1="8" x2="12.01" y2="8"></line>
    </svg>`,
    success: `<svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>`
};

/**
 * ToastGui
 * Componente canônico de notificações flutuantes (Glassmorphism).
 * Exibe mensagens transitórias e alertas de erro do domínio com auto-dismiss.
 */
export default class ToastGui extends BaseGuiTemplate {
    private static singletonInstance: ToastGui | null = null;
    private nextId: number = 1;
    private activeToasts: Map<number, ToastItem> = new Map();
    private readonly maxConcurrentToasts: number = 5;

    constructor() {
        super('toast-notifications-container', html, css);
        ToastGui.singletonInstance = this;
    }

    public static getInstance(): ToastGui {
        if (!ToastGui.singletonInstance) {
            ToastGui.singletonInstance = new ToastGui();
        }
        return ToastGui.singletonInstance;
    }

    protected setupElements(): void {
        if (!this.container) return;
        this.container.style.display = 'flex';
    }

    protected bindEvents(): void {}

    /**
     * Exibe o container e cria uma notificação toast flutuante na tela.
     * @param message Conteúdo da mensagem
     * @param variant Tipo do toast ('error' | 'warning' | 'info' | 'success')
     * @param durationMs Tempo de exibição em milissegundos antes do auto-dismiss (padrão: 4000ms)
     */
    public override show(message: string = '', variant: ToastVariant = 'error', durationMs: number = 4000): void {
        super.show();
        if (message) {
            this.createToast(message, variant, durationMs);
        }
    }

    /**
     * Cria e adiciona um toast flutuante, retornando seu ID numérico.
     */
    public createToast(message: string, variant: ToastVariant = 'error', durationMs: number = 4000): number {
        if (!this.container) {
            this.setupElements();
        }

        //? Descarta o toast mais antigo (FIFO) quando o limite simultâneo é atingido
        if (this.activeToasts.size >= this.maxConcurrentToasts) {
            const oldestId = this.activeToasts.keys().next().value;
            if (oldestId !== undefined) {
                const oldest = this.activeToasts.get(oldestId);
                if (oldest) {
                    if (oldest.timeoutId !== null) {
                        clearTimeout(oldest.timeoutId);
                    }
                    if (oldest.element.parentElement) {
                        oldest.element.parentElement.removeChild(oldest.element);
                    }
                    this.activeToasts.delete(oldestId);
                }
            }
        }

        const id = this.nextId++;
        const toastEl = document.createElement('div');
        toastEl.className = `toast-item variant-${variant}`;
        toastEl.setAttribute('role', 'alert');

        const iconEl = document.createElement('div');
        iconEl.className = 'toast-icon';
        iconEl.innerHTML = VARIANT_ICONS[variant] || VARIANT_ICONS.error;

        const messageEl = document.createElement('div');
        messageEl.className = 'toast-message';
        messageEl.textContent = message;

        const closeBtn = document.createElement('button');
        closeBtn.className = 'toast-close-btn';
        closeBtn.setAttribute('aria-label', 'Fechar notificação');
        closeBtn.innerHTML = '&times;';
        closeBtn.onclick = (e) => {
            e.stopPropagation();
            this.dismiss(id);
        };

        toastEl.appendChild(iconEl);
        toastEl.appendChild(messageEl);
        toastEl.appendChild(closeBtn);

        this.container.appendChild(toastEl);

        //? Agenda transição CSS para o próximo frame de renderização
        if (typeof requestAnimationFrame === 'function') {
            requestAnimationFrame(() => {
                toastEl.classList.add('toast-visible');
            });
        } else {
            toastEl.classList.add('toast-visible');
        }

        let timeoutId: ReturnType<typeof setTimeout> | null = null;
        if (durationMs > 0) {
            timeoutId = setTimeout(() => {
                this.dismiss(id);
            }, durationMs);
        }

        this.activeToasts.set(id, {
            id,
            element: toastEl,
            timeoutId
        });

        return id;
    }

    /**
     * Remove um toast específico com animação de saída.
     */
    public dismiss(id: number): void {
        const item = this.activeToasts.get(id);
        if (!item) return;

        if (item.timeoutId !== null) {
            clearTimeout(item.timeoutId);
            item.timeoutId = null;
        }

        this.activeToasts.delete(id);

        const el = item.element;
        el.classList.remove('toast-visible');
        el.classList.add('toast-hiding');

        setTimeout(() => {
            if (el.parentElement) {
                el.parentElement.removeChild(el);
            }
        }, 300);
    }

    /**
     * Limpa imediatamente todos os toasts ativos.
     */
    public clearAll(): void {
        for (const item of this.activeToasts.values()) {
            if (item.timeoutId !== null) {
                clearTimeout(item.timeoutId);
            }
        }
        this.activeToasts.clear();
        if (this.container) {
            this.container.innerHTML = '';
        }
    }

    /**
     * Quantidade de toasts atualmente visíveis ou em transição.
     */
    public get activeCount(): number {
        return this.activeToasts.size;
    }

    public override destroy(): void {
        this.clearAll();
        super.destroy();
        if (ToastGui.singletonInstance === this) {
            ToastGui.singletonInstance = null;
        }
    }
}
