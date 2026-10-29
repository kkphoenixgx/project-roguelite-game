import BaseGuiTemplate from "../../templates/BaseGuiTemplate";
import html from './confirmationModal.html?raw';
import css from './confirmationModal.css?raw';

export type ModalVariant = 'danger' | 'warning' | 'info' | 'success';

export interface ModalOptions {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: ModalVariant;
    showCancel?: boolean;
}

const VARIANT_ICONS: Record<ModalVariant, string> = {
    danger: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="24" cy="24" r="20" stroke="#e74c3c" stroke-width="2.5" fill="rgba(192, 57, 43, 0.2)"/>
        <path d="M16 16 L32 32 M32 16 L16 32" stroke="#e74c3c" stroke-width="3" stroke-linecap="round"/>
    </svg>`,
    warning: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <polygon points="24,6 44,40 4,40" stroke="#f39c12" stroke-width="2.5" fill="rgba(243, 156, 18, 0.2)" stroke-linejoin="round"/>
        <line x1="24" y1="18" x2="24" y2="28" stroke="#f1c40f" stroke-width="3" stroke-linecap="round"/>
        <circle cx="24" cy="34" r="2" fill="#f1c40f"/>
    </svg>`,
    info: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="24" cy="24" r="20" stroke="#38bdf8" stroke-width="2.5" fill="rgba(56, 189, 248, 0.2)"/>
        <line x1="24" y1="22" x2="24" y2="34" stroke="#38bdf8" stroke-width="3" stroke-linecap="round"/>
        <circle cx="24" cy="15" r="2.5" fill="#38bdf8"/>
    </svg>`,
    success: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="24" cy="24" r="20" stroke="#2ecc71" stroke-width="2.5" fill="rgba(46, 204, 113, 0.2)"/>
        <path d="M14 24 L21 31 L34 17" stroke="#2ecc71" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`
};

export default class ConfirmationModalGui extends BaseGuiTemplate {
    private static singletonInstance: ConfirmationModalGui | null = null;

    private dialogEl!: HTMLElement;
    private iconContainerEl!: HTMLElement;
    private titleEl!: HTMLElement;
    private messageEl!: HTMLElement;
    private btnCancel!: HTMLButtonElement;
    private btnConfirm!: HTMLButtonElement;

    private activeResolve: ((value: boolean) => void) | null = null;

    constructor() {
        super('confirmation-modal-overlay', html, css);
        this.setupElements();
        ConfirmationModalGui.singletonInstance = this;
    }

    public static getInstance(): ConfirmationModalGui {
        if (!ConfirmationModalGui.singletonInstance) {
            ConfirmationModalGui.singletonInstance = new ConfirmationModalGui();
        }
        return ConfirmationModalGui.singletonInstance;
    }

    protected override setupElements(): void {
        this.dialogEl = this.query<HTMLElement>('.cm-dialog');
        this.iconContainerEl = this.query<HTMLElement>('#cm-icon-container');
        this.titleEl = this.query<HTMLElement>('#cm-title');
        this.messageEl = this.query<HTMLElement>('#cm-message');
        this.btnCancel = this.query<HTMLButtonElement>('#cm-btn-cancel');
        this.btnConfirm = this.query<HTMLButtonElement>('#cm-btn-confirm');
    }

    protected override bindEvents(): void {
        this.addManagedListener(this.btnCancel, 'click', () => {
            this.handleResolution(false);
        });

        this.addManagedListener(this.btnConfirm, 'click', () => {
            this.handleResolution(true);
        });

        this.addManagedListener(window, 'keydown', (e: Event) => {
            if (!this.isOpen) return;
            const keyEvent = e as KeyboardEvent;
            if (keyEvent.key === 'Escape') {
                keyEvent.preventDefault();
                keyEvent.stopPropagation();
                this.handleResolution(false);
            } else if (keyEvent.key === 'Enter') {
                keyEvent.preventDefault();
                keyEvent.stopPropagation();
                this.handleResolution(true);
            }
        });
    }

    private handleResolution(result: boolean): void {
        if (this.activeResolve) {
            const resolveFn = this.activeResolve;
            this.activeResolve = null;
            this.hide();
            resolveFn(result);
        } else {
            this.hide();
        }
    }

    /**
     * Cancela o modal ativo rejeitando a acao atual com false.
     */
    public cancel(): void {
        this.handleResolution(false);
    }

    /**
     * Exibe um diálogo de confirmação com opções customizadas, retornando Promise com a resposta do usuário.
     */
    public confirm(options: ModalOptions): Promise<boolean> {
        return new Promise<boolean>((resolve) => {
            this.activeResolve = resolve;

            if (!this.titleEl || !this.messageEl || !this.btnConfirm || !this.btnCancel) {
                this.setupElements();
            }

            const variant = options.variant || 'warning';
            if (this.titleEl) this.titleEl.textContent = options.title;
            if (this.messageEl) this.messageEl.textContent = options.message;
            if (this.iconContainerEl) this.iconContainerEl.innerHTML = VARIANT_ICONS[variant] || VARIANT_ICONS.warning;

            if (this.btnConfirm) {
                this.btnConfirm.textContent = options.confirmText || 'Confirmar';
                this.btnConfirm.className = 'cm-btn';
                if (variant === 'danger') {
                    this.btnConfirm.classList.add('cm-btn-danger');
                } else {
                    this.btnConfirm.classList.add('cm-btn-primary');
                }
            }

            if (this.btnCancel) {
                this.btnCancel.textContent = options.cancelText || 'Cancelar';
                this.btnCancel.style.display = options.showCancel === false ? 'none' : 'inline-block';
            }

            if (this.dialogEl) {
                this.dialogEl.classList.remove('variant-danger', 'variant-warning', 'variant-info', 'variant-success');
                this.dialogEl.classList.add(`variant-${variant}`);
            }

            this.show();
            //? Em variantes de perigo ('danger'), focaliza 'Cancelar' por segurança ergonômica
            if (options.variant === 'danger') {
                this.btnCancel?.focus();
            } else {
                this.btnConfirm?.focus();
            }
        });
    }

    /**
     * Exibe uma notificação ou alerta com botão único de reconhecimento.
     */
    public alert(optionsOrMessage: ModalOptions | string): Promise<void> {
        const options: ModalOptions = typeof optionsOrMessage === 'string'
            ? { title: 'Aviso', message: optionsOrMessage, confirmText: 'Entendido', variant: 'info', showCancel: false }
            : { ...optionsOrMessage, showCancel: false, confirmText: optionsOrMessage.confirmText || 'Entendido' };

        return this.confirm(options).then(() => {});
    }

    public override show(): void {
        this.container.style.display = 'flex';
        //? Força reflow no DOM para disparar transição CSS de abertura sem salto de renderização
        void this.container.offsetWidth;
        this.container.classList.remove('is-hidden');
        this.container.classList.add('is-open');
        this.container.setAttribute('aria-hidden', 'false');
        this._isOpen = true;
    }

    public override hide(): void {
        this.container.style.display = 'none';
        this.container.classList.remove('is-open');
        this.container.classList.add('is-hidden');
        this.container.setAttribute('aria-hidden', 'true');
        this._isOpen = false;
    }
}

/**
 * Fachada global para acesso direto e reutilização em todo o frontend/adaptadores.
 */
export class ConfirmationModal {
    public static confirm(options: ModalOptions): Promise<boolean> {
        return ConfirmationModalGui.getInstance().confirm(options);
    }

    public static alert(optionsOrMessage: ModalOptions | string): Promise<void> {
        return ConfirmationModalGui.getInstance().alert(optionsOrMessage);
    }
}
