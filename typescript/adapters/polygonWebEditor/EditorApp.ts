import type { HitboxModel } from "./Models/HitboxModel";
import type { ITool } from "./Tools/ITool";
import { PolygonTool } from "./Tools/PolygonTool";
import { SelectTool } from "./Tools/SelectTool";
import { CircleTool } from "./Tools/CircleTool";
import { RectangleTool } from "./Tools/RectangleTool";
import { ConfirmationModal } from "../web/GUIS/confirmationModalModule/ConfirmationModalGui";

export class PolygonEditorApp {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    
    private spriteImage: HTMLImageElement | null = null;
    private hitboxes: HitboxModel[] = [];
    public currentTool: 'select' | 'rectangle' | 'polygon' | 'circle' = 'select';

    private panX: number = 0;
    private panY: number = 0;
    private zoom: number = 1;

    private history: HitboxModel[][] = [];
    private historyIndex: number = -1;

    private tools: Record<string, ITool> = {};
    
    private activeAssetId: string | null = null;
    private assetTargetWidth: number = 0;
    private assetTargetHeight: number = 0;

    constructor() {
        this.canvas = document.getElementById('editor-canvas') as HTMLCanvasElement;
        this.ctx = this.canvas.getContext('2d')!;
        
        this.setupUI();
        this.setupTools();
        this.saveState();
        this.setupEvents();
        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        this.checkUrlParametersAndInitialize();
        this.render();
    }

    private saveState() {
        //? Deep copy para desatrelar a referência de memória do histórico
        const state = JSON.parse(JSON.stringify(this.hitboxes));
        if (this.historyIndex < this.history.length - 1) {
            //? Trunca o histórico caso novas ações sejam disparadas após undo
            this.history = this.history.slice(0, this.historyIndex + 1);
        }
        this.history.push(state);
        this.historyIndex++;
    }

    private undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.hitboxes = JSON.parse(JSON.stringify(this.history[this.historyIndex]));
            this.setupTools();
            this.render();
        }
    }

    private redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.hitboxes = JSON.parse(JSON.stringify(this.history[this.historyIndex]));
            this.setupTools();
            this.render();
        }
    }

    /** Inicializa os botões e os inputs de arquivo do navegador */
    private setupUI() {
        const btnLoad = document.getElementById('btn-load-image')!;
        const fileInput = document.getElementById('file-input') as HTMLInputElement;
        
        btnLoad.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => this.handleImageLoad(e));

        const btnExport = document.getElementById('btn-export')!;
        btnExport.addEventListener('click', () => this.exportJSON());

        const btnImport = document.getElementById('btn-import')!;
        const fileImportInput = document.getElementById('file-import-input') as HTMLInputElement;
        btnImport.addEventListener('click', () => fileImportInput.click());
        fileImportInput.addEventListener('change', (e) => this.importJSON(e));

        const btnSaveCode = document.getElementById('btn-save-code');
        btnSaveCode?.addEventListener('click', () => this.saveHitboxesToCode());

        const btnClear = document.getElementById('btn-clear')!;
        btnClear.addEventListener('click', () => {
            this.hitboxes = [];
            this.setupTools();
            this.saveState();
            this.render();
        });

        const btnDeleteSelected = document.getElementById('btn-delete-selected');
        btnDeleteSelected?.addEventListener('click', () => {
            const selectTool = this.tools['select'] as SelectTool;
            if (selectTool && selectTool.deleteSelected()) {
                this.render();
            }
        });

        const container = document.getElementById('canvas-container')!;
        container.addEventListener('dragover', (e) => {
            e.preventDefault();
            container.style.boxShadow = 'inset 0 0 20px #55aaff';
        });
        container.addEventListener('dragleave', (e) => {
            e.preventDefault();
            container.style.boxShadow = 'none';
        });
        container.addEventListener('drop', (e) => {
            e.preventDefault();
            container.style.boxShadow = 'none';
            const files = e.dataTransfer?.files;
            if (files && files.length > 0) this.loadImageFile(files[0]!);
        });

        const helpHeader = document.getElementById('controls-help-header')!;
        const helpPanel = document.getElementById('controls-help')!;
        const btnToggleHelp = document.getElementById('btn-toggle-help')!;

        const toggleHelp = (e: Event) => {
            e.stopPropagation();
            helpPanel.classList.toggle('closed');
        };

        helpHeader.addEventListener('click', toggleHelp);
        btnToggleHelp.addEventListener('click', toggleHelp);

        const tools = ['select', 'rectangle', 'polygon', 'circle'] as const;
        tools.forEach(tool => {
            const btn = document.getElementById(`btn-tool-${tool}`);
            if (!btn) return;
            btn.addEventListener('click', () => {
                this.tools[this.currentTool]?.reset();
                tools.forEach(t => document.getElementById(`btn-tool-${t}`)?.classList.remove('active'));
                btn.classList.add('active');
                this.currentTool = tool;

                const delBtn = document.getElementById('btn-delete-selected');
                if (delBtn && tool !== 'select') {
                    delBtn.style.display = 'none';
                }

                this.render();
            });
        });
    }

    private setupTools() {
        const btnDeleteSelected = document.getElementById('btn-delete-selected');
        this.tools['rectangle'] = new RectangleTool((hitbox) => {
            this.hitboxes.push(hitbox);
            this.saveState();
            this.render();
        });
        this.tools['polygon'] = new PolygonTool((hitbox) => {
            this.hitboxes.push(hitbox);
            this.saveState();
            this.render();
        });
        this.tools['circle'] = new CircleTool((hitbox) => {
            this.hitboxes.push(hitbox);
            this.saveState();
            this.render();
        });
        this.tools['select'] = new SelectTool(
            this.hitboxes,
            () => {
                this.saveState();
                this.render();
            },
            (selected) => {
                if (btnDeleteSelected) {
                    btnDeleteSelected.style.display = (selected && this.currentTool === 'select') ? 'block' : 'none';
                }
                this.render();
            }
        );
    }

    private setupEvents() {
        const getWorldPos = (e: MouseEvent) => {
            return {
                x: (e.offsetX - this.panX) / this.zoom,
                y: (e.offsetY - this.panY) / this.zoom
            };
        };

        this.canvas.addEventListener('mousedown', (e) => {
            this.tools[this.currentTool]?.onMouseDown(e, getWorldPos(e), this.zoom);
            this.render();
        });
        this.canvas.addEventListener('mousemove', (e) => {
            this.tools[this.currentTool]?.onMouseMove(e, getWorldPos(e), this.zoom);
            this.render();
        });
        this.canvas.addEventListener('mouseup', (e) => {
            this.tools[this.currentTool]?.onMouseUp(e, getWorldPos(e), this.zoom);
            this.render();
        });
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        
        window.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key.toLowerCase() === 'z') {
                    e.preventDefault();
                    const tool = this.tools[this.currentTool];
                    if (tool?.onUndo && tool.onUndo()) {
                        this.render();
                    } else {
                        this.undo();
                    }
                    return;
                }
                if (e.key.toLowerCase() === 'y') {
                    e.preventDefault();
                    const tool = this.tools[this.currentTool];
                    if (tool?.onRedo && tool.onRedo()) {
                        this.render();
                    } else {
                        this.redo();
                    }
                    return;
                }
            }
            
            if (e.shiftKey && e.key === 'Delete') {
                e.preventDefault();
                this.hitboxes = [];
                this.setupTools();
                this.saveState();
                this.render();
                return;
            }

            if ((e.key === 'Delete' || e.key === 'Backspace') && !e.shiftKey) {
                const selectTool = this.tools['select'] as SelectTool;
                if (this.currentTool === 'select' && selectTool && (selectTool.selectedHitbox || selectTool.selectedVertex)) {
                    e.preventDefault();
                    if (selectTool.deleteSelected()) {
                        this.render();
                        return;
                    }
                }
            }

            const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
            if (targetTag !== 'input' && targetTag !== 'textarea' && !e.ctrlKey && !e.metaKey && !e.altKey) {
                if (e.key === 'r' || e.key === 'R') {
                    document.getElementById('btn-tool-rectangle')?.click();
                    return;
                } else if (e.key === 'p' || e.key === 'P') {
                    document.getElementById('btn-tool-polygon')?.click();
                    return;
                } else if (e.key === 'c' || e.key === 'C') {
                    document.getElementById('btn-tool-circle')?.click();
                    return;
                } else if (e.key === 's' || e.key === 'S' || e.key === 'v' || e.key === 'V') {
                    document.getElementById('btn-tool-select')?.click();
                    return;
                }
            }

            this.tools[this.currentTool]?.onKeyDown(e);
            this.render();
        });

        const container = document.getElementById('canvas-container')!;
        container.addEventListener('wheel', (e) => {
            e.preventDefault();
            
            const mouseX = e.offsetX;
            const mouseY = e.offsetY;

            if (e.ctrlKey || e.metaKey) {
                const zoomSensitivity = 0.002;
                const delta = -e.deltaY * zoomSensitivity;
                const prevZoom = this.zoom;
                this.zoom = Math.min(Math.max(0.1, this.zoom + delta), 50);
                
                //? Corrige o offset do Pan para manter o pixel sob o cursor inalterado
                const worldX = (mouseX - this.panX) / prevZoom;
                const worldY = (mouseY - this.panY) / prevZoom;
                this.panX = mouseX - worldX * this.zoom;
                this.panY = mouseY - worldY * this.zoom;
            } else if (e.shiftKey) {
                this.panX -= e.deltaY;
            } else {
                this.panY -= e.deltaY;
            }
            
            this.updateCanvasTransform();
        }, { passive: false });
    }

    private updateCanvasTransform() {
        this.render();
    }

    /** RF01: Carregar Sprite via File Reader API nativo do Browser */
    private handleImageLoad(e: Event) {
        const target = e.target as HTMLInputElement;
        if (!target.files || target.files.length === 0) return;
        this.loadImageFile(target.files[0]!);
    }

    private loadImageFile(file: File) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                this.spriteImage = img;
                
                const container = document.getElementById('canvas-container')!;
                this.panX = (container.clientWidth - img.width) / 2;
                this.panY = (container.clientHeight - img.height) / 2;
                this.zoom = 1;
                this.updateCanvasTransform();

                this.render();
            };
            img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
    }

    private resize() {
        const container = document.getElementById('canvas-container')!;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
        
        if (!this.spriteImage) {
            this.panX = (container.clientWidth - 400) / 2;
            this.panY = (container.clientHeight - 400) / 2;
        }
        this.render();
    }

    private exportJSON() {
        const data = JSON.stringify({ hitboxes: this.hitboxes }, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'sprite_hitboxes.json';
        a.click();
        
        URL.revokeObjectURL(url);
    }

    private importJSON(e: Event) {
        const target = e.target as HTMLInputElement;
        if (!target.files || target.files.length === 0) return;
        
        const file = target.files[0]!;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target?.result as string);
                if (data && Array.isArray(data.hitboxes)) {
                    this.hitboxes = data.hitboxes;
                    this.setupTools();
                    this.saveState();
                    this.render();
                    ConfirmationModal.alert('Hitboxes importadas com sucesso!');
                } else { ConfirmationModal.alert('Formato de JSON inválido.'); }
            } catch (err) { ConfirmationModal.alert('Erro ao ler o arquivo JSON.'); }
            target.value = '';
        };
        reader.readAsText(file);
    }

    public render() {
        this.ctx.resetTransform();
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.translate(this.panX, this.panY);
        this.ctx.scale(this.zoom, this.zoom);
        this.ctx.imageSmoothingEnabled = false;

        if (this.spriteImage) {
            this.ctx.drawImage(this.spriteImage, 0, 0);
            
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            this.ctx.lineWidth = 1 / this.zoom;
            this.ctx.strokeRect(0, 0, this.spriteImage.width, this.spriteImage.height);
        }

        this.ctx.resetTransform();

        const pX = (x: number) => x * this.zoom + this.panX;
        const pY = (y: number) => y * this.zoom + this.panY;

        this.ctx.lineWidth = 2;
        for (const hb of this.hitboxes) {
            if (hb.type === 'polygon' && hb.points) {
                this.ctx.strokeStyle = '#55aaff';
                this.ctx.beginPath();
                this.ctx.moveTo(pX(hb.points[0]!.x), pY(hb.points[0]!.y));
                for (let i = 1; i < hb.points.length; i++) this.ctx.lineTo(pX(hb.points[i]!.x), pY(hb.points[i]!.y));
                this.ctx.closePath();
                this.ctx.stroke();
                this.ctx.fillStyle = 'rgba(85, 170, 255, 0.3)'; this.ctx.fill();
            } else if (hb.type === 'circle' && hb.radius !== undefined) {
                this.ctx.strokeStyle = '#ffaa55';
                this.ctx.beginPath();
                this.ctx.arc(pX(hb.coordinates.x), pY(hb.coordinates.y), hb.radius * this.zoom, 0, Math.PI * 2);
                this.ctx.stroke();
                this.ctx.fillStyle = 'rgba(255, 170, 85, 0.3)'; this.ctx.fill();
                
                this.ctx.fillStyle = '#ff0000'; this.ctx.beginPath();
                this.ctx.arc(pX(hb.coordinates.x), pY(hb.coordinates.y), 4, 0, Math.PI * 2); this.ctx.fill();
            }
        }

        this.tools[this.currentTool]?.draw(this.ctx, this.panX, this.panY, this.zoom);
    }

    /**
     * Verifica se o editor foi aberto com parâmetros de query string (ex: via double click no Assets Editor).
     */
    public async checkUrlParametersAndInitialize(): Promise<void> {
        if (typeof window === 'undefined' || !window.location || !window.location.search) return;

        const params = new URLSearchParams(window.location.search);
        const assetId = params.get('assetId');
        const imageSrc = params.get('imageSrc');
        const width = params.get('width');
        const height = params.get('height');

        if (assetId) {
            this.activeAssetId = assetId;
            if (width) this.assetTargetWidth = parseInt(width, 10);
            if (height) this.assetTargetHeight = parseInt(height, 10);

            const banner = document.getElementById('active-asset-banner');
            const assetNameEl = document.getElementById('active-asset-id');
            const btnSaveCode = document.getElementById('btn-save-code');

            if (banner) banner.style.display = 'flex';
            if (assetNameEl) assetNameEl.textContent = assetId;
            if (btnSaveCode) btnSaveCode.style.display = 'block';

            if (imageSrc) {
                this.loadAssetImageFromUrl(imageSrc);
            }

            await this.loadHitboxesFromApi(assetId);
        }
    }

    /**
     * Carrega a imagem do asset a partir de uma URL ou data URL.
     */
    public loadAssetImageFromUrl(url: string): void {
        const img = new Image();
        img.onload = () => {
            this.spriteImage = img;
            const container = document.getElementById('canvas-container');
            if (container) {
                this.panX = (container.clientWidth - img.width) / 2;
                this.panY = (container.clientHeight - img.height) / 2;
                this.zoom = 1;
                this.updateCanvasTransform();
            }
            this.render();
        };
        img.src = url;
    }

    /**
     * Busca as hitboxes existentes do asset via API do Vite /api/assets-adapter?target=hitboxes.
     */
    public async loadHitboxesFromApi(assetId: string): Promise<void> {
        try {
            const cleanAssetId = assetId.replace(/_clean$|_anim$/, '');
            const response = await fetch(`/api/assets-adapter?target=hitboxes&assetId=${encodeURIComponent(cleanAssetId)}`);
            if (response.ok) {
                const data = await response.json();
                if (data.success && Array.isArray(data.hitboxes)) {
                    this.hitboxes = data.hitboxes;
                    this.setupTools();
                    this.saveState();
                    this.render();
                }
            }
        } catch (err) {
            //? Em testes ou ambientes offline, mantém as hitboxes atuais como fallback
        }
    }

    /**
     * Salva as alterações de hitboxes diretamente no código via POST /api/assets-adapter?target=hitboxes.
     */
    public async saveHitboxesToCode(): Promise<boolean> {
        if (!this.activeAssetId) {
            await ConfirmationModal.alert('Nenhum asset ativo selecionado para salvar no código.');
            return false;
        }

        try {
            const cleanAssetId = this.activeAssetId.replace(/_clean$|_anim$/, '');
            const baseWidth = this.spriteImage?.width || this.assetTargetWidth || 64;
            const baseHeight = this.spriteImage?.height || this.assetTargetHeight || 64;

            const payload = {
                assetId: cleanAssetId,
                hitboxes: this.hitboxes,
                baseWidth,
                baseHeight
            };

            const response = await fetch('/api/assets-adapter?target=hitboxes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const resData = await response.json();
                if (resData.success) {
                    await ConfirmationModal.alert(`Hitbox de "${cleanAssetId}" salva no código com sucesso! (${this.hitboxes.length} forma(s))`);
                    return true;
                }
            }
            await ConfirmationModal.alert('Falha ao salvar hitbox no código.');
            return false;
        } catch (err: any) {
            await ConfirmationModal.alert(`Erro de conexão ao salvar hitbox: ${err.message}`);
            return false;
        }
    }
}

window.onload = () => new PolygonEditorApp();
export default PolygonEditorApp;