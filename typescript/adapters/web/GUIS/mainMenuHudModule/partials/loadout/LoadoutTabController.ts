import type { IGameDomain } from "../../../../../../domain/ports/domain-contracts";
import { SlotSvgAssets } from "../../../../shared/SlotSvgAssets";
import { SkillIcons } from "../../../../shared/VisualConfigMap";
import { GlobalBroochPool } from "../../../../../../domain/facadeComponents/MetaProgressionMap";

export default class LoadoutTabController {
    private container: HTMLElement;
    private domain: IGameDomain;
    
    // Armazena as seleções no front-end para despachar quando o jogo iniciar
    public selectedActiveLoadout: (string | null)[] = [null, null, null, null];
    public selectedPassiveLoadout: (string | null)[] = [null, null, null, null];
    
    private currentTab: 'todos' | 'ativo' | 'passivo' = 'todos';
    private currentTagFilter: string = 'todos'; 
    private draggedBrooch: string | null = null;

    constructor(container: HTMLElement, domain: IGameDomain) {
        this.container = container;
        this.domain = domain;
        this.injectStructure();
        this.renderLoadout();
        
        // Listen to tab activation (fallback)
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'class' && this.container.classList.contains('active')) {
                    this.renderLoadout();
                }
            });
        });
        observer.observe(this.container, { attributes: true });
    }

    public syncFromDomain(): void {
        const player = (this.domain as any).player;
        if (player) {
            const hasGlobalActive = (Array.isArray(player.classes?.globalActiveLoadout) && player.classes.globalActiveLoadout.some((x: any) => Boolean(x)))
                || (Array.isArray(player.globalActiveLoadout) && player.globalActiveLoadout.some((x: any) => Boolean(x)));

            const active = hasGlobalActive
                ? (player.classes?.globalActiveLoadout || player.globalActiveLoadout)
                : (player.activeLoadout || player.classes?.globalActiveLoadout || player.globalActiveLoadout);

            if (Array.isArray(active)) {
                this.selectedActiveLoadout = [
                    active[0] ?? null,
                    active[1] ?? null,
                    active[2] ?? null,
                    active[3] ?? null
                ];
            } else {
                this.selectedActiveLoadout = [null, null, null, null];
            }

            const hasPassive = (Array.isArray(player.classes?.passiveLoadout) && player.classes.passiveLoadout.some((x: any) => Boolean(x)))
                || (Array.isArray(player.globalPassiveLoadout) && player.globalPassiveLoadout.some((x: any) => Boolean(x)));

            const passive = hasPassive
                ? (player.classes?.passiveLoadout || player.globalPassiveLoadout)
                : (player.passiveLoadout || player.classes?.passiveLoadout || player.globalPassiveLoadout);

            if (Array.isArray(passive)) {
                this.selectedPassiveLoadout = [
                    passive[0] ?? null,
                    passive[1] ?? null,
                    passive[2] ?? null,
                    passive[3] ?? null
                ];
            } else {
                this.selectedPassiveLoadout = [null, null, null, null];
            }
        } else {
            this.selectedActiveLoadout = [null, null, null, null];
            this.selectedPassiveLoadout = [null, null, null, null];
        }
    }

    public syncFromSlotData(slotData: any): void {
        if (!slotData) {
            this.selectedActiveLoadout = [null, null, null, null];
            this.selectedPassiveLoadout = [null, null, null, null];
            this.renderLoadout();
            return;
        }

        const pState = slotData.activeCheckpoint?.playerState || 
                       slotData.checkpoint?.playerState || 
                       slotData.activeCheckpoint?.player || 
                       slotData.checkpoint?.player || 
                       slotData.playerState || 
                       slotData.player;

        const hasGlobalActive = (Array.isArray(pState?.classes?.globalActiveLoadout) && pState.classes.globalActiveLoadout.some((x: any) => Boolean(x)))
            || (Array.isArray(pState?.globalActiveLoadout) && pState.globalActiveLoadout.some((x: any) => Boolean(x)))
            || (Array.isArray(slotData?.globalActiveLoadout) && slotData.globalActiveLoadout.some((x: any) => Boolean(x)));

        const active = hasGlobalActive
            ? (pState?.classes?.globalActiveLoadout || pState?.globalActiveLoadout || slotData?.globalActiveLoadout)
            : (pState?.classes?.globalActiveLoadout || pState?.globalActiveLoadout || slotData?.globalActiveLoadout || pState?.activeLoadout || pState?.classes?.activeLoadout || slotData?.activeLoadout);

        if (Array.isArray(active)) {
            this.selectedActiveLoadout = [
                active[0] ?? null,
                active[1] ?? null,
                active[2] ?? null,
                active[3] ?? null
            ];
        } else {
            this.selectedActiveLoadout = [null, null, null, null];
        }

        const hasPassive = (Array.isArray(pState?.classes?.passiveLoadout) && pState.classes.passiveLoadout.some((x: any) => Boolean(x)))
            || (Array.isArray(pState?.globalPassiveLoadout) && pState.globalPassiveLoadout.some((x: any) => Boolean(x)))
            || (Array.isArray(slotData?.globalPassiveLoadout) && slotData.globalPassiveLoadout.some((x: any) => Boolean(x)));

        const passive = hasPassive
            ? (pState?.classes?.passiveLoadout || pState?.globalPassiveLoadout || slotData?.globalPassiveLoadout)
            : (pState?.classes?.passiveLoadout || pState?.globalPassiveLoadout || pState?.passiveLoadout || slotData?.globalPassiveLoadout || slotData?.passiveLoadout || slotData?.classes?.passiveLoadout);

        if (Array.isArray(passive)) {
            this.selectedPassiveLoadout = [
                passive[0] ?? null,
                passive[1] ?? null,
                passive[2] ?? null,
                passive[3] ?? null
            ];
        } else {
            this.selectedPassiveLoadout = [null, null, null, null];
        }

        this.renderLoadout();
    }

    public refresh(): void {
        this.syncFromDomain();
        this.renderLoadout();
    }

    private injectStructure(): void {
        this.container.innerHTML = `
            <div id="loadout-layout" style="display: flex; flex-direction: column; width: 100%; height: 100%; box-sizing: border-box; background: rgba(10, 10, 15, 0.9);">
                
                <!-- ROW 1: 1/3 Height - Passive Slots -->
                <div id="loadout-row-top" style="height: 33.33%; display: flex; justify-content: center; align-items: center; border-bottom: 2px solid rgba(255,255,255,0.1); position: relative;">
                    <!-- Espaço para a arte dos 4 pedestais do usuário (será o background depois) -->
                    <div id="passive-slots-container" style="display: flex; gap: 40px; z-index: 2;">
                        <!-- Passive slots injetados aqui -->
                    </div>
                </div>

                <!-- ROW 2: 2/3 Height - Active Slots and Inventory -->
                <div id="loadout-row-bottom" style="height: 66.66%; display: flex;">
                    
                    <!-- Coluna Esquerda: 30% Width - Active Slots -->
                    <div id="loadout-col-left" style="width: 30%; display: flex; flex-direction: column; justify-content: center; align-items: flex-start; border-right: 2px solid rgba(255,255,255,0.1);">
                        <h3 style="color: var(--accent-gold); font-family: 'PixelArtFont', monospace; font-size: 18px; margin-bottom: 30px; margin-left: 20px;">ATIVOS (1-4)</h3>
                        <div id="active-slots-container" style="display: flex; flex-direction: column; gap: 20px; width: 90%; align-items: flex-start;">
                            <!-- Active slots injetados aqui -->
                        </div>
                    </div>

                    <!-- Coluna Direita: 70% Width - Inventory & Filters -->
                    <div id="loadout-col-right" style="width: 70%; position: relative; display: flex; flex-direction: column; padding: 20px;">
                        
                        <!-- Top Header: Tabs and Filter Button -->
                        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid rgba(255,255,255,0.1); padding-bottom: 10px; margin-bottom: 15px;">
                            <!-- Tabs: Todos, Ativas e Passivas -->
                            <div style="display: flex; gap: 20px;" id="inventory-tabs">
                                <button class="inv-tab-btn active" data-tab="todos" style="background: none; border: none; color: var(--accent-gold); font-family: 'PixelArtFont', monospace; font-size: 18px; cursor: pointer; text-transform: uppercase;">TODOS</button>
                                <button class="inv-tab-btn" data-tab="ativo" style="background: none; border: none; color: #888; font-family: 'PixelArtFont', monospace; font-size: 18px; cursor: pointer; text-transform: uppercase;">ATIVAS</button>
                                <button class="inv-tab-btn" data-tab="passivo" style="background: none; border: none; color: #888; font-family: 'PixelArtFont', monospace; font-size: 18px; cursor: pointer; text-transform: uppercase;">PASSIVAS</button>
                            </div>

                            <!-- Botão de Filtro -->
                            <div style="position: absolute; top: 20px; right: 20px; z-index: 10;">
                                <button id="filter-dropdown-btn" style="background: rgba(255,255,255,0.1); border: 1px solid var(--accent-gold); color: #fff; font-family: 'PixelArtFont', monospace; padding: 5px 15px; cursor: pointer; border-radius: 4px;">FILTRAR ▼</button>
                                <div id="filter-dropdown-menu" style="display: none; position: absolute; top: 100%; right: 0; background: rgba(20,20,25,0.95); border: 1px solid var(--accent-gold); border-radius: 4px; padding: 10px; width: max-content; margin-top: 5px; flex-direction: column; gap: 8px;">
                                    <!-- Options injected dynamically -->
                                </div>
                            </div>
                        </div>

                        <!-- Inventory Grid -->
                        <div id="brooch-inventory" style="display: flex; flex-wrap: wrap; gap: 15px; overflow-y: auto; align-content: flex-start; height: 100%; padding: 5px;">
                            <!-- Inventory injected dynamically -->
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Tooltip para Hover -->
            <div id="brooch-tooltip" style="position: fixed; display: none; background: rgba(0,0,0,0.9); border: 2px solid var(--accent-gold); padding: 10px; border-radius: 8px; z-index: 1000; pointer-events: none; min-width: 200px;">
                <h4 id="tt-name" style="color: var(--accent-gold); margin: 0 0 5px 0; font-family: 'PixelArtFont', monospace;">Nome</h4>
                <div id="tt-type" style="font-size: 12px; color: #888; margin-bottom: 5px;"></div>
                <p id="tt-desc" style="color: #ccc; margin: 0; font-size: 14px;"></p>
            </div>
        `;

        // Bind tab switching
        const tabs = this.container.querySelectorAll('.inv-tab-btn');
        tabs.forEach(tab => {
            (tab as HTMLElement).onclick = () => {
                tabs.forEach(t => {
                    (t as HTMLElement).style.color = '#888';
                    t.classList.remove('active');
                });
                (tab as HTMLElement).style.color = 'var(--accent-gold)';
                tab.classList.add('active');
                
                // Set new tab
                this.currentTab = (tab as HTMLElement).dataset.tab as 'todos' | 'ativo' | 'passivo';
                // Reset tag filter on tab change
                this.currentTagFilter = 'todos';
                
                this.renderLoadout();
            };
        });

        // Bind filter dropdown
        const filterBtn = this.container.querySelector('#filter-dropdown-btn') as HTMLElement;
        const filterMenu = this.container.querySelector('#filter-dropdown-menu') as HTMLElement;
        filterBtn.onclick = () => {
            filterMenu.style.display = filterMenu.style.display === 'none' ? 'flex' : 'none';
        };
    }

    public getConsolidatedBrooches(): any[] {
        const domainBrooches = (this.domain.globalMetaSummary as any)?.brooches || [];
        const broochMap = new Map<string, any>();

        // Registra os do domínio (broches legitimamente desbloqueados)
        domainBrooches.forEach((b: any) => {
            const id = typeof b === 'string' ? b : b?.id;
            if (id && typeof id === 'string' && id.startsWith('brooch_')) {
                const fullObj = (typeof b === 'object' && b.name) ? b : GlobalBroochPool.find(p => p.id === id);
                broochMap.set(id, fullObj || b);
            }
        });

        // Garante que qualquer broche equipado no loadout atual esteja presente
        [...this.selectedActiveLoadout, ...this.selectedPassiveLoadout].forEach(id => {
            if (id && typeof id === 'string' && id.startsWith('brooch_') && !broochMap.has(id)) {
                const found = GlobalBroochPool.find(b => b.id === id);
                if (found) broochMap.set(id, found);
            }
        });

        return Array.from(broochMap.values());
    }

    private renderLoadout(): void {
        const unlockedBrooches = this.getConsolidatedBrooches();
        this.renderFilters(unlockedBrooches);
        this.renderInventory(unlockedBrooches);
        this.renderSlots();
    }

    private renderFilters(brooches: any[]): void {
        const filterMenu = this.container.querySelector('#filter-dropdown-menu') as HTMLElement;
        const filterBtn = this.container.querySelector('#filter-dropdown-btn') as HTMLElement;
        
        filterMenu.innerHTML = '';
        
        // Coletar tags únicas para a tab atual
        const allTags = new Set<string>();
        brooches.forEach(b => {
            const matchTab = this.currentTab === 'todos' || b.type === this.currentTab;
            if (matchTab && b.tags) {
                b.tags.forEach((t: string) => allTags.add(t));
            }
        });

        // Update button text to reflect selected filter
        filterBtn.textContent = this.currentTagFilter === 'todos' ? 'FILTRAR ▼' : `#${this.currentTagFilter.toUpperCase()} ▼`;

        const createOption = (label: string, filterVal: string) => {
            const btn = document.createElement('button');
            btn.textContent = label;
            btn.style.cssText = `background: ${this.currentTagFilter === filterVal ? 'rgba(255,255,255,0.2)' : 'transparent'}; color: ${this.currentTagFilter === filterVal ? 'var(--accent-gold)' : '#fff'}; border: none; padding: 5px 10px; font-family: 'PixelArtFont', monospace; cursor: pointer; text-align: left; width: 100%; border-radius: 4px;`;
            btn.onmouseenter = () => btn.style.background = 'rgba(255,255,255,0.2)';
            btn.onmouseleave = () => btn.style.background = this.currentTagFilter === filterVal ? 'rgba(255,255,255,0.2)' : 'transparent';
            
            btn.onclick = () => {
                this.currentTagFilter = filterVal;
                filterMenu.style.display = 'none';
                this.renderLoadout();
            };
            return btn;
        };

        filterMenu.appendChild(createOption('Todos', 'todos'));
        
        allTags.forEach(tag => {
            filterMenu.appendChild(createOption(`#${tag.toUpperCase()}`, tag));
        });
    }

    private renderInventory(brooches: any[]): void {
        const inventory = this.container.querySelector('#brooch-inventory') as HTMLElement;
        inventory.innerHTML = '';
        
        // Aplicar filtro
        const filtered = brooches.filter(b => {
            if (this.currentTab !== 'todos' && b.type !== this.currentTab) return false;
            if (this.currentTagFilter === 'todos') return true;
            return b.tags && b.tags.includes(this.currentTagFilter);
        });

        if (filtered.length === 0) {
            const emptyEl = document.createElement('div');
            emptyEl.style.cssText = `
                width: 100%; height: 100%;
                display: flex; flex-direction: column;
                justify-content: center; align-items: center;
                color: #666; font-family: 'PixelArtFont', monospace;
                font-size: 13px; text-align: center; line-height: 1.6;
                padding: 20px; box-sizing: border-box;
            `;
            emptyEl.innerHTML = `
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 10px; opacity: 0.5;">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 8v4M12 16h.01"/>
                </svg>
                <span>Nenhum broche relicário desbloqueado nesta jornada.<br>Conquiste novos broches completando ramos da árvore cósmica!</span>
            `;
            inventory.appendChild(emptyEl);
            return;
        }

        filtered.forEach(brooch => {
            const el = this.createBroochElement(brooch);

            if (this.isBroochEquipped(brooch.id)) {
                // Broche já equipado: estado "disabled" em escala de cinza, sem arraste
                el.draggable = false;
                el.classList.add('brooch-equipped-disabled');
                el.style.filter = 'grayscale(100%) brightness(0.6)';
                el.style.opacity = '0.55';
                el.style.cursor = 'not-allowed';
                el.title = `${brooch.name} (já equipado)`;
            } else {
                el.draggable = true;
                el.ondragstart = (e) => {
                    this.draggedBrooch = brooch.id;
                    if (e.dataTransfer) e.dataTransfer.setData('text/plain', brooch.id);
                };
            }
            inventory.appendChild(el);
        });
    }

    /** Verifica se o broche já ocupa algum slot (ativo ou passivo) do loadout atual. */
    private isBroochEquipped(broochId: string): boolean {
        return this.selectedActiveLoadout.includes(broochId) || this.selectedPassiveLoadout.includes(broochId);
    }

    private renderSlots(): void {
        const activeContainer = this.container.querySelector('#active-slots-container') as HTMLElement;
        const passiveContainer = this.container.querySelector('#passive-slots-container') as HTMLElement;
        
        activeContainer.innerHTML = '';
        passiveContainer.innerHTML = '';

        const allBrooches = this.getConsolidatedBrooches();
        const getBrooch = (id: string | null) => allBrooches.find((b: any) => b.id === id) || (id ? GlobalBroochPool.find(b => b.id === id) : null);

        for (let i = 0; i < 4; i++) {
            // Active Slots: Half-Pill glued to the left
            activeContainer.appendChild(this.createSlotElement(i, 'ativo', getBrooch(this.selectedActiveLoadout[i] || null), `
                width: 100%; height: 70px;
                border: 2px dashed rgba(255,255,255,0.2);
                border-left: none;
                border-radius: 0 35px 35px 0;
                display: flex; align-items: center; justify-content: flex-end;
                padding-right: 20px; box-sizing: border-box;
                background: rgba(0,0,0,0.3);
            `));
            
            // Passive Slots: Pedestals in the top row
            passiveContainer.appendChild(this.createSlotElement(i, 'passivo', getBrooch(this.selectedPassiveLoadout[i] || null), `
                width: 80px; height: 80px;
                border: 2px dashed rgba(255,255,255,0.2);
                border-radius: 8px; /* Quadrado/Pedestal */
                display: flex; flex-direction: column; align-items: center; justify-content: center;
                box-sizing: border-box;
                background: rgba(255,255,255,0.05);
            `));
        }
    }

    private createBroochElement(brooch: any): HTMLElement {
        const div = document.createElement('div');
        // Define as classes para estilização via CSS do jogo
        div.className = `brooch-inventory-item ${brooch.type === 'ativo' ? 'sun-brooch-slot' : 'triangle-passive-slot'} filled`;
        div.style.cssText = `
            width: 72px; height: 72px; 
            display: flex; justify-content: center; align-items: center;
            cursor: grab; position: relative;
            background: transparent;
            border: none;
        `;
        
        // Use standard svgs
        if (brooch.type === 'ativo') {
            div.innerHTML = SlotSvgAssets.sunBrooch;
        } else {
            div.innerHTML = SlotSvgAssets.trianglePassive;
        }

        // Prioriza o ícone em alta resolução (x2) para nitidez no tamanho ampliado
        const iconEntry = (SkillIcons as any)[brooch.id];
        const broochIcon: string | undefined = iconEntry?.icon80Url || iconEntry?.icon40Url;

        // Ajusta o SVG: com ícone, vira apenas moldura de raios atrás do medalhão
        const svgEl = div.querySelector('svg');
        if (svgEl) {
            svgEl.setAttribute('width', '72');
            svgEl.setAttribute('height', '72');
            if (broochIcon) {
                svgEl.style.position = 'absolute';
                svgEl.style.inset = '0';
                svgEl.style.zIndex = '1';
                svgEl.style.opacity = '0.55';
            }
        }

        if (broochIcon) {
            const iconImg = document.createElement('img');
            iconImg.src = broochIcon;
            iconImg.alt = brooch.name;
            iconImg.draggable = false;
            iconImg.style.cssText = `
                position: relative;
                width: 54px;
                height: 54px;
                object-fit: contain;
                pointer-events: none;
                z-index: 2;
                filter: brightness(1.35) contrast(1.15) drop-shadow(0 0 4px rgba(255, 200, 60, 0.75));
            `;
            div.appendChild(iconImg);
        }

        // Tooltip logic
        const tooltip = document.getElementById('brooch-tooltip') as HTMLElement;
        div.onmouseenter = (e) => {
            tooltip.style.display = 'block';
            tooltip.style.left = `${e.clientX + 15}px`;
            tooltip.style.top = `${e.clientY + 15}px`;
            (document.getElementById('tt-name') as HTMLElement).textContent = brooch.name;
            (document.getElementById('tt-type') as HTMLElement).textContent = `${brooch.type.toUpperCase()} | ${brooch.tags?.join(', ') || ''}`;
            (document.getElementById('tt-desc') as HTMLElement).textContent = brooch.description;
        };
        div.onmouseleave = () => tooltip.style.display = 'none';
        div.onmousemove = (e) => {
            tooltip.style.left = `${e.clientX + 15}px`;
            tooltip.style.top = `${e.clientY + 15}px`;
        };

        return div;
    }

    private createSlotElement(index: number, type: 'ativo' | 'passivo', brooch: any, customStyle: string): HTMLElement {
        const slot = document.createElement('div');
        slot.style.cssText = customStyle;

        const reqLevel = [1, 5, 10, 15][index];
        const isLocked = false; // Substitua pela lógica real do nível do personagem global no meta, se houver
        
        if (brooch) {
            const bEl = this.createBroochElement(brooch);
            bEl.style.transform = 'scale(0.8)';
            bEl.style.position = 'relative';
            
            // Allow removing
            bEl.onclick = () => {
                if (type === 'ativo') this.selectedActiveLoadout[index] = null;
                else this.selectedPassiveLoadout[index] = null;
                this.renderLoadout(); // Atualiza inventário (remove o estado cinza) e slots
            };
            
            slot.appendChild(bEl);
        } else {
            // Desenha o Empty State do Wireframe (Sinal de + ou Cadeado)
            const iconSpan = document.createElement('span');
            iconSpan.style.fontSize = '24px';
            iconSpan.style.color = '#555';
            
            if (isLocked) {
                iconSpan.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg> <span style="font-size:12px;display:block;">L${reqLevel}</span>`;
            } else {
                iconSpan.innerHTML = `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>`;
            }
            slot.appendChild(iconSpan);
        }

        // Drop logic
        slot.ondragover = (e) => e.preventDefault();
        slot.ondrop = (e) => {
            e.preventDefault();
            if (this.draggedBrooch) {
                const allBrooches = this.getConsolidatedBrooches();
                const draggedObj = allBrooches.find((b: any) => b.id === this.draggedBrooch) || GlobalBroochPool.find(b => b.id === this.draggedBrooch);
                
                // Cada broche só pode ocupar um único slot
                if (draggedObj && draggedObj.type === type && !this.isBroochEquipped(this.draggedBrooch)) {
                    if (type === 'ativo') this.selectedActiveLoadout[index] = this.draggedBrooch;
                    else this.selectedPassiveLoadout[index] = this.draggedBrooch;
                    this.renderLoadout(); // Atualiza inventário (aplica o estado cinza) e slots
                }
                this.draggedBrooch = null;
            }
        };

        return slot;
    }
}
