/**
 * @file PanelResizer.ts
 * Gerencia o redimensionamento dinâmico dos painéis laterais (Gaveta de Assets e Painel de Propriedades),
 * permitindo aumentar e diminuir a largura via arrasto do mouse (splitter/resizer), persistindo no localStorage.
 */

export interface PanelResizerOptions {
    drawerId?: string;
    drawerResizerId?: string;
    propsPanelId?: string;
    propsResizerId?: string;
    minDrawerWidth?: number;
    maxDrawerWidth?: number;
    defaultDrawerWidth?: number;
    minPropsWidth?: number;
    maxPropsWidth?: number;
    defaultPropsWidth?: number;
    onResize?: () => void;
}

export class PanelResizer {
    private drawerEl: HTMLElement | null;
    private drawerResizerEl: HTMLElement | null;
    private propsEl: HTMLElement | null;
    private propsResizerEl: HTMLElement | null;

    private minDrawerWidth: number;
    private maxDrawerWidth: number;
    private defaultDrawerWidth: number;

    private minPropsWidth: number;
    private maxPropsWidth: number;
    private defaultPropsWidth: number;

    private onResizeCallback?: (() => void) | undefined;

    private isDraggingDrawer: boolean = false;
    private isDraggingProps: boolean = false;
    private startX: number = 0;
    private startWidth: number = 0;

    constructor(options: PanelResizerOptions = {}) {
        this.drawerEl = document.getElementById(options.drawerId || 'asset-drawer');
        this.drawerResizerEl = document.getElementById(options.drawerResizerId || 'drawer-resizer');
        this.propsEl = document.getElementById(options.propsPanelId || 'properties-panel');
        this.propsResizerEl = document.getElementById(options.propsResizerId || 'props-resizer');

        this.minDrawerWidth = options.minDrawerWidth || 180;
        this.maxDrawerWidth = options.maxDrawerWidth || 700;
        this.defaultDrawerWidth = options.defaultDrawerWidth || 320;

        this.minPropsWidth = options.minPropsWidth || 220;
        this.maxPropsWidth = options.maxPropsWidth || 700;
        this.defaultPropsWidth = options.defaultPropsWidth || 300;

        this.onResizeCallback = options.onResize;

        this.loadSavedWidths();
        this.bindEvents();
    }

    private loadSavedWidths(): void {
        try {
            const savedDrawer = localStorage.getItem('assets_adapter_drawer_width');
            if (savedDrawer && this.drawerEl) {
                const w = Math.max(this.minDrawerWidth, Math.min(this.maxDrawerWidth, parseInt(savedDrawer, 10)));
                if (!isNaN(w)) {
                    this.setDrawerWidth(w);
                }
            }

            const savedProps = localStorage.getItem('assets_adapter_props_width');
            if (savedProps && this.propsEl) {
                const w = Math.max(this.minPropsWidth, Math.min(this.maxPropsWidth, parseInt(savedProps, 10)));
                if (!isNaN(w)) {
                    this.setPropsWidth(w);
                }
            }
        } catch {}
    }

    private bindEvents(): void {
        /* 1. Resizer da Gaveta Esquerda */
        if (this.drawerResizerEl && this.drawerEl) {
            this.drawerResizerEl.addEventListener('mousedown', (e) => {
                e.preventDefault();
                this.isDraggingDrawer = true;
                this.startX = e.clientX;
                this.startWidth = this.drawerEl ? this.drawerEl.getBoundingClientRect().width : this.defaultDrawerWidth;
                document.body.classList.add('is-resizing');
                this.drawerResizerEl?.classList.add('is-active');

                //? Se estava colapsado, descolapsa ao iniciar o arraste manual
                if (this.drawerEl?.classList.contains('is-collapsed')) {
                    this.drawerEl.classList.remove('is-collapsed');
                    this.drawerEl.style.display = 'flex';
                    const btnReopen = document.getElementById('btn-reopen-drawer');
                    if (btnReopen) btnReopen.style.display = 'none';
                    this.startWidth = this.minDrawerWidth;
                }
            });

            this.drawerResizerEl.addEventListener('dblclick', () => {
                this.setDrawerWidth(this.defaultDrawerWidth);
                this.saveWidth('assets_adapter_drawer_width', this.defaultDrawerWidth);
                this.onResizeCallback?.();
            });
        }

        /* 2. Resizer do Painel de Propriedades Direito */
        if (this.propsResizerEl && this.propsEl) {
            this.propsResizerEl.addEventListener('mousedown', (e) => {
                e.preventDefault();
                this.isDraggingProps = true;
                this.startX = e.clientX;
                this.startWidth = this.propsEl ? this.propsEl.getBoundingClientRect().width : this.defaultPropsWidth;
                document.body.classList.add('is-resizing');
                this.propsResizerEl?.classList.add('is-active');
            });

            this.propsResizerEl.addEventListener('dblclick', () => {
                this.setPropsWidth(this.defaultPropsWidth);
                this.saveWidth('assets_adapter_props_width', this.defaultPropsWidth);
                this.onResizeCallback?.();
            });
        }

        /* 3. Listeners Globais de Mouse (Move e Up) */
        window.addEventListener('mousemove', (e) => {
            if (this.isDraggingDrawer && this.drawerEl) {
                const delta = e.clientX - this.startX;
                const newWidth = Math.max(this.minDrawerWidth, Math.min(this.maxDrawerWidth, this.startWidth + delta));
                this.setDrawerWidth(newWidth);
                this.onResizeCallback?.();
            } else if (this.isDraggingProps && this.propsEl) {
                const delta = this.startX - e.clientX;
                const newWidth = Math.max(this.minPropsWidth, Math.min(this.maxPropsWidth, this.startWidth + delta));
                this.setPropsWidth(newWidth);
                this.onResizeCallback?.();
            }
        });

        window.addEventListener('mouseup', () => {
            if (this.isDraggingDrawer) {
                this.isDraggingDrawer = false;
                document.body.classList.remove('is-resizing');
                this.drawerResizerEl?.classList.remove('is-active');
                if (this.drawerEl) {
                    this.saveWidth('assets_adapter_drawer_width', this.drawerEl.getBoundingClientRect().width);
                }
            }
            if (this.isDraggingProps) {
                this.isDraggingProps = false;
                document.body.classList.remove('is-resizing');
                this.propsResizerEl?.classList.remove('is-active');
                if (this.propsEl) {
                    this.saveWidth('assets_adapter_props_width', this.propsEl.getBoundingClientRect().width);
                }
            }
        });
    }

    public setDrawerWidth(widthPx: number): void {
        if (!this.drawerEl) return;
        const clamped = Math.max(this.minDrawerWidth, Math.min(this.maxDrawerWidth, Math.round(widthPx)));
        if (!this.drawerEl.classList.contains('is-collapsed')) {
            this.drawerEl.style.width = `${clamped}px`;
        }
        document.documentElement.style.setProperty('--drawer-width', `${clamped}px`);
    }

    public setPropsWidth(widthPx: number): void {
        if (!this.propsEl) return;
        const clamped = Math.max(this.minPropsWidth, Math.min(this.maxPropsWidth, Math.round(widthPx)));
        this.propsEl.style.width = `${clamped}px`;
        document.documentElement.style.setProperty('--props-width', `${clamped}px`);
    }

    private saveWidth(key: string, width: number): void {
        try {
            localStorage.setItem(key, Math.round(width).toString());
        } catch {}
    }
}
