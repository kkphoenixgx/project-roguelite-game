import type { IGameDomain } from "../../../../../../domain/ports/domain-contracts";

export default class ProgressionTabController {
    private container: HTMLElement;
    private domain: IGameDomain;
    private nodesLayer!: HTMLElement;
    private svgLayer!: SVGSVGElement;
    private visualEssence: number = -1;
    private isAnimatingXP: boolean = false;
    private hoverTimer: any = null;
    private layoutCache: Map<string, { x: number, y: number }> = new Map();

    // Removed hardcoded layout in favor of procedural distribution

    constructor(container: HTMLElement, domain: IGameDomain, private onProgressionChanged?: () => void) {
        this.container = container;
        this.domain = domain;
        this.injectStructure();
        this.renderTree();
        
        // Listen to tab activation to trigger animations
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'class' && this.container.classList.contains('active')) {
                    this.triggerAnimations();
                    this.animateXPBar();
                }
            });
        });
        observer.observe(this.container, { attributes: true });
    }

    private injectStructure(): void {
        this.container.innerHTML = `
            <div class="tier-line" style="top: 25%;"></div>
            <div class="tier-line" style="top: 50%;"></div>
            <div class="tier-line" style="top: 75%;"></div>
            
            <svg id="progression-svg-layer" viewBox="0 0 100 100" preserveAspectRatio="none" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 1; pointer-events: none;"></svg>
            <div id="progression-nodes-layer" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 2;"></div>
            <div id="particles-layer" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 100; pointer-events: none; overflow: hidden;"></div>
            
            <div id="skill-details-panel" style="display: none; opacity: 0; pointer-events: none;">
                <div style="display: flex; flex-direction: column; gap: 4px; margin-bottom: 10px;">
                    <h3 id="skill-name" style="color: var(--accent-gold); margin: 0; font-family: 'PixelArtFont', monospace; font-size: 20px; text-transform: uppercase;">Nome</h3>
                    <span id="skill-rarity" style="font-size: 13px; font-weight: bold; font-family: 'PixelArtFont', monospace;">(raridade)</span>
                </div>
                <p id="skill-desc" style="color: #ddd; margin: 0 0 12px 0; font-size: 14px; font-family: 'PixelArtFont', monospace; line-height: 1.4;">Desc</p>
                <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 10px;">
                    <span id="skill-cost" style="color: #fff; font-weight: bold; font-family: 'PixelArtFont', monospace; font-size: 15px;">Custo: 1 Ponto(s)</span>
                    <span id="skill-buy-hint" style="color: #1eff00; font-family: 'PixelArtFont', monospace; font-size: 13px; animation: pulse-available 1.5s infinite;">Duplo clique p/ comprar</span>
                </div>
            </div>
            
            <!-- Barra de XP (Essência) -->
            <div id="xp-bar-container" style="position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); width: 80%; height: 30px; background: rgba(0,0,0,0.8); border: 3px solid var(--accent-gold); border-radius: 15px; overflow: hidden; box-shadow: 0 0 15px rgba(255, 215, 0, 0.3); z-index: 20;">
                <div id="xp-bar-fill" style="width: 0%; height: 100%; background: linear-gradient(90deg, #ff8000, #ffea00); transition: width 1.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); position: relative;">
                    <div style="position: absolute; top: 0; left: 0; width: 100%; height: 50%; background: rgba(255,255,255,0.3);"></div>
                </div>
                <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; pointer-events: none;">
                    <span id="essence-display" style="color: #fff; font-family: 'PixelArtFont', monospace; font-size: 18px; text-shadow: 2px 2px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;">XP: 0 / 1000</span>
                </div>
            </div>
        `;
        
        this.svgLayer = this.container.querySelector('#progression-svg-layer') as SVGSVGElement;
        this.nodesLayer = this.container.querySelector('#progression-nodes-layer') as HTMLElement;
    }

    private renderTree(): void {
        this.hideNodeDetails();
        this.svgLayer.innerHTML = '';
        this.nodesLayer.innerHTML = '';
        
        // This comes from the Domain's MetaProgressionManager
        let globalNodesMap = this.domain.globalNodesMap;
        if (!globalNodesMap || (Array.isArray(globalNodesMap) && globalNodesMap.length === 0) || (typeof globalNodesMap === 'object' && Object.keys(globalNodesMap).length === 0)) {
            globalNodesMap = (this.domain as any).metaProgressionManager?.getAvailableNodesMap?.() || [];
        }
        const unlockedArray = (this.domain && this.domain.unlockedGlobalNodes) ? this.domain.unlockedGlobalNodes : ((this.domain as any).metaProgressionManager?.getUnlockedNodes?.() || []);
        const unlockedIds = new Set(unlockedArray);
        const xpState = (this.domain as any).metaProgressionManager?.getXPState() || { currentXP: 0, xpToNext: 100, level: 1, availablePoints: 0 };
        
        const essenceDisplay = this.container.querySelector('#essence-display');
        const xpBarFill = this.container.querySelector('#xp-bar-fill') as HTMLElement;
        
        if (essenceDisplay && xpBarFill && !this.isAnimatingXP) {
            this.updateXPBarUI(xpState.currentXP, xpState.xpToNext, xpState.level, xpState.availablePoints);
        }

        const nodesList = Object.values(globalNodesMap) as any[];
        
        // Computa posições perfeitamente alinhadas (nó pai no meio dos nós filhos)
        this.computeTreeLayout(nodesList);

        const nodeElements = new Map<string, HTMLElement>();

        // 1. Draw Paths
        nodesList.forEach(node => {
            if (node.dependencies && node.dependencies.length > 0) {
                node.dependencies.forEach((parentId: string) => {
                    const parent = nodesList.find(n => n.id === parentId);
                    if (parent) {
                        const layoutNode = this.getLayoutPos(node);
                        const layoutParent = this.getLayoutPos(parent);
                        
                        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                        const isUnlocked = unlockedIds.has(node.id) && unlockedIds.has(parent.id);
                        
                        // Cubic bezier from bottom up (coordenadas 0-100 mapeadas pelo viewBox do SVG)
                        const d = `M ${layoutParent.x} ${layoutParent.y} C ${layoutParent.x} ${layoutParent.y - 10}, ${layoutNode.x} ${layoutNode.y + 10}, ${layoutNode.x} ${layoutNode.y}`;
                        
                        path.setAttribute('d', d);
                        path.setAttribute('fill', 'none');
                        path.setAttribute('stroke', isUnlocked ? 'var(--accent-gold)' : '#555');
                        path.setAttribute('stroke-width', '3');
                        path.setAttribute('stroke-dasharray', '8,8');
                        path.setAttribute('vector-effect', 'non-scaling-stroke');
                        path.classList.add('path-line', 'animate');
                        
                        this.svgLayer.appendChild(path);
                    }
                });
            }
        });

        // 2. Draw Nodes
        nodesList.forEach(node => {
            const layout = this.getLayoutPos(node);
            const isUnlocked = unlockedIds.has(node.id);
            
            let parentUnlocked = false;
            let isSiblingSelected = false;
            
            if (node.level === 4) {
                // Brooch Level: Any level 3 node unlocked allows choosing a brooch
                parentUnlocked = node.dependencies.some((id: string) => unlockedIds.has(id));
                // Brooches are also exclusive to each other
                const siblings = nodesList.filter(n => n.level === 4 && n.id !== node.id);
                if (siblings.some(sib => unlockedIds.has(sib.id))) {
                    isSiblingSelected = true;
                }
            } else if (node.dependencies.length === 0) {
                parentUnlocked = true;
                const level1Siblings = nodesList.filter(n => n.dependencies.length === 0 && n.id !== node.id);
                if (level1Siblings.some(sib => unlockedIds.has(sib.id))) {
                    isSiblingSelected = true;
                }
            } else {
                const parentId = node.dependencies[0];
                parentUnlocked = unlockedIds.has(parentId);
                const siblings = nodesList.filter(n => n.level === node.level && n.dependencies.includes(parentId) && n.id !== node.id);
                if (siblings.some(sib => unlockedIds.has(sib.id))) {
                    isSiblingSelected = true;
                }
            }
            
            const canUnlock = parentUnlocked && !isSiblingSelected;
            
            const div = document.createElement('div');
            div.className = `node-circle animate ${node.rarity || 'comum'} ${isUnlocked ? 'unlocked' : (canUnlock ? 'available' : 'locked')}`;
            div.style.left = `calc(${layout.x}% - 30px)`; // Center the 60x60 node
            div.style.top = `calc(${layout.y}% - 30px)`;
            
            const iconStr = this.getIconForNode(node.level, node.statType || '');
            div.innerHTML = `<span style="display: flex; align-items: center; justify-content: center; color: var(--ui-text-primary);">${iconStr}</span>`;
            
            if (isUnlocked) {
                div.innerHTML += `<div class="node-text" style="right: -30px; bottom: -10px; color: var(--accent-gold);">✓</div>`;
            }

            let isHovered = false;

            // Floating widget: aparece após meio segundo (500ms) com o mouse em cima do nó
            div.addEventListener('mouseenter', () => {
                isHovered = true;
                if (this.hoverTimer) clearTimeout(this.hoverTimer);
                this.hoverTimer = setTimeout(() => {
                    if (isHovered) {
                        this.showNodeDetails(node, isUnlocked, canUnlock, layout);
                    }
                }, 500);
            });

            div.addEventListener('mouseleave', () => {
                isHovered = false;
                this.hideNodeDetails();
            });

            // Double Click to Buy
            div.addEventListener('dblclick', () => {
                this.hideNodeDetails();
                if (isUnlocked) return;
                const mpm = (this.domain as any).metaProgressionManager;
                if (mpm && canUnlock) {
                    const canAfford = mpm.spendEssence(node.cost);
                    if (canAfford) {
                        mpm.unlockNode(node.id);
                        this.spawnParticles(layout.x, layout.y);
                        this.renderTree(); // Re-render tree
                        if (this.onProgressionChanged) {
                            this.onProgressionChanged();
                        }
                    } else {
                        // Tratar falta de essência (shake no botão e no node)
                        div.style.animation = 'shake 0.3s ease';
                        setTimeout(() => div.style.animation = '', 300);
                        const hint = this.container.querySelector('#skill-buy-hint') as HTMLElement;
                        if (hint) {
                            hint.style.color = '#ff0000';
                            hint.textContent = 'FALTA XP!';
                            setTimeout(() => {
                                hint.style.color = '#1eff00';
                                hint.textContent = 'Duplo clique p/ comprar';
                            }, 1000);
                        }
                    }
                }
            });
            
            this.nodesLayer.appendChild(div);
            nodeElements.set(node.id, div);
        });
    }
    
    private computeTreeLayout(nodesList: any[]): void {
        this.layoutCache.clear();

        const levelNodes: Record<number, any[]> = { 1: [], 2: [], 3: [], 4: [] };
        nodesList.forEach(n => { if (levelNodes[n.level]) levelNodes[n.level]!.push(n); });

        // Vertical tiers: Nível 1 na base (80%), Nível 4 broches no topo (18%)
        const yMap: Record<number, number> = { 1: 80, 2: 60, 3: 40, 4: 18 };

        const l1 = levelNodes[1] || [];
        const l2 = levelNodes[2] || [];
        const l3 = levelNodes[3] || [];
        const l4 = levelNodes[4] || [];

        // Centros para as 3 bases de Nível 1
        const baseCenters = l1.length === 3 ? [21, 50, 79] : l1.map((_, idx) => ((idx + 1) / (l1.length + 1)) * 100);

        l1.forEach((node, i) => {
            const centerX = baseCenters[i] || 50;
            this.layoutCache.set(node.id, { x: centerX, y: yMap[1]! });

            // Filhos no Nível 2 que dependem desta base
            const childrenL2 = l2.filter(child => child.dependencies?.includes(node.id));
            const numL2 = childrenL2.length;
            const deltaL2 = 6;

            childrenL2.forEach((c2, j) => {
                // O nó pai (Level 1) fica perfeitamente no meio dos filhos (Level 2)
                const c2X = numL2 === 1 
                    ? centerX 
                    : centerX + (j - (numL2 - 1) / 2) * (deltaL2 * 2);
                
                this.layoutCache.set(c2.id, { x: c2X, y: yMap[2]! });

                // Filhos no Nível 3 que dependem deste ramo de Nível 2
                const childrenL3 = l3.filter(child => child.dependencies?.includes(c2.id));
                const numL3 = childrenL3.length;
                const deltaL3 = 3;

                childrenL3.forEach((c3, k) => {
                    // O nó pai (Level 2) fica perfeitamente no meio dos seus filhos (Level 3)
                    const c3X = numL3 === 1
                        ? c2X
                        : c2X + (k - (numL3 - 1) / 2) * (deltaL3 * 2);

                    this.layoutCache.set(c3.id, { x: c3X, y: yMap[3]! });
                });
            });
        });

        // Fallbacks para nós órfãos caso ocorram
        l2.forEach((n, idx) => {
            if (!this.layoutCache.has(n.id)) {
                this.layoutCache.set(n.id, { x: ((idx + 1) / (l2.length + 1)) * 100, y: yMap[2]! });
            }
        });
        l3.forEach((n, idx) => {
            if (!this.layoutCache.has(n.id)) {
                this.layoutCache.set(n.id, { x: ((idx + 1) / (l3.length + 1)) * 100, y: yMap[3]! });
            }
        });

        // Nível 4 (Broches): posicionados simetricamente no topo
        if (l4.length === 2) {
            this.layoutCache.set(l4[0]!.id, { x: 36, y: yMap[4]! });
            this.layoutCache.set(l4[1]!.id, { x: 64, y: yMap[4]! });
        } else {
            l4.forEach((n, idx) => {
                this.layoutCache.set(n.id, { x: ((idx + 1) / (l4.length + 1)) * 100, y: yMap[4]! });
            });
        }
    }

    private getLayoutPos(node: any): { x: number, y: number } {
        return this.layoutCache.get(node.id) || { x: 50, y: 50 };
    }

    private getIconForNode(level: number, statType: string): string {
        const color = "currentColor";
    
        if (level === 4) {
            // Triangle with lightning (Brooch)
            return `<svg width="30" height="30" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <polygon points="50,10 90,90 10,90" stroke="${color}" stroke-width="6" fill="transparent" stroke-linejoin="round"/>
                <path d="M 55,25 L 35,60 L 50,60 L 45,85 L 65,50 L 50,50 Z" fill="${color}"/>
            </svg>`;
        }

        // Roubo de Vida / Vampirismo: Gota de sangue / presa afiada
        if (statType === 'lifesteal') {
            return `<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" fill="${color}" fill-opacity="0.3"/>
                <path d="M12 7v5"/>
                <path d="M10 10l4 4"/>
            </svg>`;
        }

        // Área de Efeito / Splash: Ondas circulares expansivas
        if (statType === 'area' || statType === 'splash') {
            return `<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10" stroke-dasharray="3 3"/>
                <circle cx="12" cy="12" r="6"/>
                <circle cx="12" cy="12" r="2" fill="${color}"/>
            </svg>`;
        }
        
        // Vida, Cura, Vigor
        if (statType === 'hp' || statType === 'maxHp' || statType === 'vigor' || statType === 'hpRegen') {
            return `<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" fill="${color}" fill-opacity="0.3"/>
            </svg>`;
        }

        // Defesa, Constituição, Tenacidade: Escudo
        if (statType === 'defence' || statType === 'con' || statType === 'tenacity') {
            return `<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="${color}" fill-opacity="0.2"/>
            </svg>`;
        }

        // Força, Dano Crítico, Chance Crítica: Espadas / Lâmina
        if (statType === 'str' || statType === 'crit' || statType === 'crit_dmg' || statType === 'piercing') {
            return `<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
                <circle cx="12" cy="13" r="3" fill="${color}" fill-opacity="0.3"/>
            </svg>`;
        }
    
        // Velocidade, Esquiva, Dash, Destreza: Asas / Agilidade
        if (statType === 'speed' || statType === 'dodge' || statType === 'dash' || statType === 'dex') {
            return `<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m13 2-2 7h5l-6 13 2-8h-5l6-12z" fill="${color}" fill-opacity="0.3"/>
            </svg>`;
        }

        // Inteligência, Sabedoria, Mana, Recarga, Percepção: Orbe Mágico
        if (statType === 'int' || statType === 'wis' || statType === 'mana' || statType === 'recharge' || statType === 'insight' || statType === 'accuracy') {
            return `<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="m4.93 4.93 4.24 4.24"/>
                <path d="m14.83 14.83 4.24 4.24"/>
                <circle cx="12" cy="12" r="3" fill="${color}"/>
            </svg>`;
        }

        // Sorte, Carisma: Estrela / Trevo
        if (statType === 'lucky' || statType === 'cha') {
            return `<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="${color}" fill-opacity="0.3"/>
            </svg>`;
        }

        // Afinidades Elementais (Fogo, Água, Terra, Luz, etc.): Chama Elemental
        if (statType.endsWith('_dmg')) {
            return `<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" fill="${color}" fill-opacity="0.3"/>
            </svg>`;
        }
    
        // Default spark (4-pointed star)
        return `<svg width="30" height="30" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M 50,10 Q 50,50 90,50 Q 50,50 50,90 Q 50,50 10,50 Q 50,50 50,10 Z" fill="${color}"/>
        </svg>`;
    }

    private showNodeDetails(node: any, isUnlocked: boolean, canUnlock: boolean, layout?: { x: number, y: number }): void {
        const panel = this.container.querySelector('#skill-details-panel') as HTMLElement;
        if (!panel) return;

        const nameEl = panel.querySelector('#skill-name') as HTMLElement;
        const rarityEl = panel.querySelector('#skill-rarity') as HTMLElement;
        const descEl = panel.querySelector('#skill-desc') as HTMLElement;
        const costEl = panel.querySelector('#skill-cost') as HTMLElement;
        const hintEl = panel.querySelector('#skill-buy-hint') as HTMLElement;
        
        const rarity = node.rarity || 'comum';
        const cleanName = node.name.replace(` (${rarity})`, '');
        
        nameEl.textContent = cleanName;
        rarityEl.textContent = rarity.toUpperCase();
        
        // Define rarity colors
        const colors: any = { comum: '#a0a0a0', incomum: '#1eff00', raro: '#0070dd', epico: '#a335ee', lendario: '#ff8000' };
        rarityEl.style.color = colors[rarity] || colors['comum'];
        
        descEl.textContent = node.description;
        costEl.textContent = `Custo: ${node.cost} Ponto(s)`;
        
        if (isUnlocked) {
            hintEl.textContent = 'JÁ COMPRADO';
            hintEl.style.color = '#777';
            hintEl.style.animation = 'none';
        } else if (!canUnlock) {
            hintEl.textContent = 'TRANCADO (REQUER ANTERIOR)';
            hintEl.style.color = '#ff4444';
            hintEl.style.animation = 'none';
        } else {
            hintEl.textContent = 'Duplo clique p/ comprar';
            hintEl.style.color = '#1eff00';
            hintEl.style.animation = 'pulse-available 1.5s infinite';
        }

        if (layout) {
            // Posicionamento inteligente baseado na coordenada do nó:
            // Nível 4 (topo, y=15%): posiciona o widget flutuando ABAIXO do nó
            if (layout.y <= 30) {
                panel.style.top = `calc(${layout.y}% + 45px)`;
                panel.style.bottom = 'auto';
            } else {
                // Níveis 1, 2 e 3: posiciona o widget flutuando ACIMA do nó
                panel.style.bottom = `calc(${100 - layout.y}% + 45px)`;
                panel.style.top = 'auto';
            }

            // Posicionamento horizontal centralizado com clamp para não cortar nas bordas
            if (layout.x < 22) {
                panel.style.left = `calc(${layout.x}% - 10px)`;
                panel.style.right = 'auto';
                panel.style.transform = 'none';
            } else if (layout.x > 78) {
                panel.style.right = `calc(${100 - layout.x}% - 10px)`;
                panel.style.left = 'auto';
                panel.style.transform = 'none';
            } else {
                panel.style.left = `${layout.x}%`;
                panel.style.right = 'auto';
                panel.style.transform = 'translateX(-50%)';
            }
        }

        panel.style.display = 'block';
        panel.style.opacity = '1';
    }

    private hideNodeDetails(): void {
        if (this.hoverTimer) {
            clearTimeout(this.hoverTimer);
            this.hoverTimer = null;
        }
        const panel = this.container.querySelector('#skill-details-panel') as HTMLElement;
        if (panel) {
            panel.style.display = 'none';
            panel.style.opacity = '0';
        }
    }

    private spawnParticles(xPercent: number, yPercent: number): void {
        const layer = this.container.querySelector('#particles-layer') as HTMLElement;
        if (!layer) return;

        const colors = ['#ffea00', '#ff8000', '#1eff00', '#00d0ff', '#a335ee', '#fff'];
        
        for (let i = 0; i < 30; i++) {
            const p = document.createElement('div');
            const size = Math.random() * 8 + 4;
            const color = colors[Math.floor(Math.random() * colors.length)];
            
            p.style.cssText = `
                position: absolute;
                width: ${size}px; height: ${size}px;
                background: ${color};
                border-radius: ${Math.random() > 0.5 ? '50%' : '0'};
                left: ${xPercent}%; top: ${yPercent}%;
                pointer-events: none;
                box-shadow: 0 0 10px ${color};
                z-index: 100;
            `;
            
            layer.appendChild(p);
            
            // Random direction
            const angle = Math.random() * Math.PI * 2;
            const velocity = Math.random() * 150 + 50; // px
            const tx = Math.cos(angle) * velocity;
            const ty = Math.sin(angle) * velocity - 50; // little upward bias
            
            const animation = p.animate([
                { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
                { transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(0)`, opacity: 0 }
            ], {
                duration: Math.random() * 600 + 400,
                easing: 'cubic-bezier(0.25, 1, 0.5, 1)'
            });
            
            animation.onfinish = () => p.remove();
        }
    }

    private triggerAnimations(): void {
        // Paths animation
        const paths = this.svgLayer.querySelectorAll('.path-line');
        paths.forEach((p, idx) => {
            p.classList.remove('animate');
            setTimeout(() => p.classList.add('animate'), 50); // Small delay to trigger CSS transition
        });

        // Nodes animation (staggered by level)
        const globalNodesMap = this.domain.globalNodesMap;
        const nodesList = Object.values(globalNodesMap) as any[];
        
        const nodesDom = this.nodesLayer.querySelectorAll('.node-circle');
        nodesDom.forEach((nodeEl, i) => {
            nodeEl.classList.remove('animate');
            // Mock staggered animation based on level (bottom to top)
            const nodeData = nodesList[i];
            const delay = nodeData ? (nodeData.level * 200) : 0;
            setTimeout(() => nodeEl.classList.add('animate'), delay);
        });
    }

    private updateXPBarUI(currentXP: number, xpToNext: number, level: number, availablePoints: number) {
        const essenceDisplay = this.container.querySelector('#essence-display');
        const xpBarFill = this.container.querySelector('#xp-bar-fill') as HTMLElement;
        if (!essenceDisplay || !xpBarFill) return;
        
        essenceDisplay.textContent = `Nv ${level} (XP: ${Math.floor(currentXP)} / ${xpToNext}) - ${availablePoints} PONTOS LIVRES`;
        xpBarFill.style.transition = 'none';
        xpBarFill.style.width = `${Math.min((currentXP / xpToNext) * 100, 100)}%`;
        
        if (availablePoints > 0) {
            xpBarFill.style.boxShadow = '0 0 20px #1eff00, inset 0 0 20px #1eff00';
        } else {
            xpBarFill.style.boxShadow = 'none';
        }
    }

    private getMathXPState(totalEssence: number) {
        const BASE_XP = 100;
        let level = 1;
        let xpNeeded = BASE_XP;
        let remainingXp = totalEssence;
        
        while (remainingXp >= xpNeeded) {
            remainingXp -= xpNeeded;
            level++;
            xpNeeded = BASE_XP * level;
        }
        
        const mpm = (this.domain as any).metaProgressionManager;
        const spent = mpm ? (mpm as any).spentSkillPoints || 0 : 0;
        const availablePoints = (level - 1) - spent;
        
        return { currentXP: remainingXp, xpToNext: xpNeeded, level, availablePoints };
    }

    private animateXPBar() {
        if (this.isAnimatingXP) return;
        
        const mpm = (this.domain as any).metaProgressionManager;
        if (!mpm) return;
        
        const targetEssence = mpm.globalEssence;
        
        if (this.visualEssence === -1) {
            this.visualEssence = 0; // Always start at 0 if no previous state (like first load)
            if (mpm.lastRunSummary && mpm.lastRunSummary.totalReward > 0) {
                this.visualEssence = Math.max(0, targetEssence - mpm.lastRunSummary.totalReward);
                mpm.lastRunSummary.totalReward = 0; // Consume
            }
        }
        
        if (this.visualEssence >= targetEssence) {
            const finalState = this.getMathXPState(targetEssence);
            this.updateXPBarUI(finalState.currentXP, finalState.xpToNext, finalState.level, finalState.availablePoints);
            return;
        }

        this.isAnimatingXP = true;
        let currentLevel = this.getMathXPState(this.visualEssence).level;
        
        const duration = 2000; // 2 seconds total animation
        const startEssence = this.visualEssence;
        const diff = targetEssence - startEssence;
        const startTime = performance.now();
        
        const step = (timestamp: number) => {
            const elapsed = timestamp - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // ease-out cubic
            const easeOut = 1 - Math.pow(1 - progress, 3);
            this.visualEssence = startEssence + (diff * easeOut);
            
            const state = this.getMathXPState(this.visualEssence);
            this.updateXPBarUI(state.currentXP, state.xpToNext, state.level, state.availablePoints);
            
            if (state.level > currentLevel) {
                currentLevel = state.level;
                // Level Up Effect!
                const xpBarFill = this.container.querySelector('#xp-bar-fill') as HTMLElement;
                if (xpBarFill) {
                    const rect = xpBarFill.getBoundingClientRect();
                    const x = rect.left + rect.width;
                    const y = rect.top + rect.height / 2;
                    this.spawnParticles((x / window.innerWidth) * 100, (y / window.innerHeight) * 100);
                    
                    
                    // Ultimate Dopamine Glow Effect!
                    xpBarFill.animate([
                        { filter: 'brightness(1) contrast(1)', boxShadow: '0 0 0px rgba(255,255,255,0)' },
                        { filter: 'brightness(2) contrast(1.5)', boxShadow: '0 0 50px #fff, 0 0 100px #ff00ff, 0 0 150px #00ffff, inset 0 0 50px #fff' },
                        { filter: 'brightness(1) contrast(1)', boxShadow: '0 0 20px #1eff00, inset 0 0 20px #1eff00' }
                    ], { duration: 1000, easing: 'cubic-bezier(0.25, 1, 0.5, 1)' });
                    
                    // Extra particle explosion (Ultimate style)
                    for (let i = 0; i < 15; i++) {
                        const p = document.createElement('div');
                        const size = Math.random() * 15 + 5;
                        const colors = ['#ffea00', '#ff00ff', '#00ffff', '#1eff00', '#ff3333'];
                        const color = colors[Math.floor(Math.random() * colors.length)];
                        p.style.cssText = `
                            position: absolute; width: ${size}px; height: ${size}px;
                            background: ${color}; border-radius: 50%;
                            left: ${x / window.innerWidth * 100}%; top: ${y / window.innerHeight * 100}%;
                            pointer-events: none; box-shadow: 0 0 20px ${color}; z-index: 150; mix-blend-mode: screen;
                        `;
                        const layer = this.container.querySelector('#particles-layer');
                        if (layer) layer.appendChild(p);
                        
                        const angle = Math.random() * Math.PI * 2;
                        const velocity = Math.random() * 400 + 100;
                        const tx = Math.cos(angle) * velocity;
                        const ty = Math.sin(angle) * velocity;
                        
                        const pAnim = p.animate([
                            { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
                            { transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(0)`, opacity: 0 }
                        ], { duration: Math.random() * 800 + 600, easing: 'ease-out' });
                        pAnim.onfinish = () => p.remove();
                    }
                }
            }
            
            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                this.visualEssence = targetEssence;
                const finalState = this.getMathXPState(targetEssence);
                this.updateXPBarUI(finalState.currentXP, finalState.xpToNext, finalState.level, finalState.availablePoints);
                this.isAnimatingXP = false;
            }
        };
        
        requestAnimationFrame(step);
    }

    public syncFromSlotData(slotData: any): void {
        if (!slotData) {
            this.visualEssence = -1;
            this.renderTree();
            return;
        }
        const metaState = slotData.metaProgressionState || 
                          slotData.activeCheckpoint?.metaProgressionState || 
                          slotData.checkpoint?.metaProgressionState ||
                          slotData.globalMetaSummary?.metaProgressionState ||
                          (slotData.globalMetaSummary?.unlockedNodes ? slotData.globalMetaSummary : undefined);
        if (metaState && typeof (this.domain as any).metaProgressionManager?.loadGlobalState === 'function') {
            (this.domain as any).metaProgressionManager.loadGlobalState(metaState);
        }
        this.visualEssence = -1;
        this.renderTree();
    }

    public refresh(): void {
        this.renderTree();
    }
}
