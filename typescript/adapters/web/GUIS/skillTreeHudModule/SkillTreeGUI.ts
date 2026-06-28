import { logger } from "../../shared/Logger";
import html from './skillTree.html?raw';
import css from './skillTree.css?raw';
import type { EntityRenderableState } from "../../../../domain/ports/domain-contracts";
import { VisualConfigMap, type ItemVisualConfig } from "../../shared/VisualConfigMap";

/** @class SkillTreeGui Controla a interface da árvore de habilidades isolada. */
export default class SkillTreeGui {
    private container!: HTMLElement;
    private isVisible: boolean = false;
    private lastTreeHash: string = '';
    private lastLoadoutHash: string = '';
    private togglePauseCallback: () => void;
    
    // Variáveis de estado do Pan & Zoom
    private isDragging: boolean = false;
    private startX: number = 0;
    private startY: number = 0;
    private translateX: number = 0;
    private translateY: number = 0;
    private scale: number = 1;

    private draggedSkillId: string | null = null;
    private customDragGhost: HTMLElement | null = null;

    constructor(
        private readonly togglePauseCallback: () => void, private skillActionCallback: (action: 'unlock' | 'changeClass' | 'equip', payload: any) => void) {
        this.togglePauseCallback = togglePauseCallback;
        this.injectUI();
        this.setupViewportEvents();
        this.hide();
        logger.log('init', 'SkillTreeGui instantiated and UI injected.');
    }

    private injectUI(): void {
        const style = document.createElement('style'); 
        style.textContent = css; 
        document.head.appendChild(style);
        
        const div = document.createElement('div'); 
        div.innerHTML = html;
        this.container = div.firstElementChild as HTMLElement;
        // Garante que a árvore de skills fique por cima de outras UIs como o HUD da janela
        this.container.style.zIndex = '1000';
        document.body.appendChild(this.container);
    }
    
    private setupViewportEvents(): void {
        const viewport = this.container.querySelector('.skill-tree-viewport') as HTMLElement;
        const canvas = this.container.querySelector('.skill-tree-canvas') as HTMLElement;
        if (!viewport || !canvas) return;

        viewport.addEventListener('mousedown', (e) => {
            // Impede que a movimentação do mapa (Pan) roube o Drag & Drop da habilidade
            if ((e.target as HTMLElement).closest('.skill-node')) return;
            
            this.isDragging = true;
            this.startX = e.clientX - this.translateX;
            this.startY = e.clientY - this.translateY;
        });

        window.addEventListener('mousemove', (e) => {
            if (this.customDragGhost) {
                this.customDragGhost.style.left = `${e.clientX - 24}px`;
                this.customDragGhost.style.top = `${e.clientY - 24}px`;
                
                // Visual de hover nos slots
                const hoverTarget = document.elementFromPoint(e.clientX, e.clientY);
                const slotEl = hoverTarget?.closest('.loadout-slot:not(.locked)');
                
                const allSlots = Array.from(this.container.querySelectorAll('.loadout-slot'));
                allSlots.forEach(s => (s as HTMLElement).style.borderColor = '');
                
                if (slotEl) {
                    (slotEl as HTMLElement).style.borderColor = '#00ffff';
                }
                return;
            }
            if (!this.isDragging) return;
            this.translateX = e.clientX - this.startX;
            this.translateY = e.clientY - this.startY;
            canvas.style.transform = `translate(${this.translateX}px, ${this.translateY}px) scale(${this.scale})`;
        });

        window.addEventListener('mouseup', (e) => {
            if (this.customDragGhost && this.draggedSkillId) {
                this.customDragGhost.remove();
                this.customDragGhost = null;
                
                const dropTarget = document.elementFromPoint(e.clientX, e.clientY);
                const slotEl = dropTarget?.closest('.loadout-slot:not(.locked)');
                
                if (slotEl) {
                    const allSlots = Array.from(this.container.querySelectorAll('.loadout-slot'));
                    const index = allSlots.indexOf(slotEl as HTMLElement);
                    if (index !== -1) {
                        this.skillActionCallback('equip', { skillId: this.draggedSkillId, slotIndex: index });
                    }
                }
                
                // Limpa bordas
                const allSlots = Array.from(this.container.querySelectorAll('.loadout-slot'));
                allSlots.forEach(s => (s as HTMLElement).style.borderColor = '');
                
                this.draggedSkillId = null;
            }
            this.isDragging = false; 
        });

        viewport.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.scale += e.deltaY * -0.001;
            this.scale = Math.min(Math.max(0.4, this.scale), 2.5); // Limita o Zoom entre 0.4x e 2.5x
            canvas.style.transform = `translate(${this.translateX}px, ${this.translateY}px) scale(${this.scale})`;
        });
        
        // Lógica do botão de abrir/fechar o painel lateral
        const toggleBtn = this.container.querySelector('#st-toggle-loadout') as HTMLElement;
        const loadoutPanel = this.container.querySelector('.loadout-panel') as HTMLElement;
        if (toggleBtn && loadoutPanel) {
            toggleBtn.onclick = () => { loadoutPanel.classList.toggle('collapsed'); };
        }

        // Permite o arraste visual em toda a tela para evitar o cursor 🚫
        this.container.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
        });
    }

    public get isOpen(): boolean { return this.isVisible; }

    public toggle(): void {
        this.isVisible = !this.isVisible;
        this.container.style.display = this.isVisible ? 'flex' : 'none';
        
        // Centraliza a visão na primeira vez que abre (olhando mais para a base da árvore)
        if (this.isVisible) {
            const canvas = this.container.querySelector('.skill-tree-canvas') as HTMLElement;
            // Deslocamos mais o Y para que o foco inicial não fique tão no topo.
            this.translateX = 0; 
            this.translateY = -300; 
            this.scale = 0.8;
            if (canvas) canvas.style.transform = `translate(${this.translateX}px, ${this.translateY}px) scale(${this.scale})`;
        }
        
        this.togglePauseCallback();
    }

    public hide(): void { if (this.isVisible) { this.isVisible = false; this.container.style.display = 'none'; this.togglePauseCallback(); } }

    public update(data: EntityRenderableState): void {
        if (!this.isVisible || !data.classes) return;
        
        // 1. Atualiza os pontos disponíveis independentemente de Hash complexo
        const pointsEl = this.container.querySelector('#st-available-points');
        if (pointsEl && data.attributes) {
            pointsEl.textContent = data.attributes.availablePoints.toString();
        }

        // 2. Renderização dos Painéis de Loadout e Eventos de Soltar (Drop)
        // Usa um hash isolado para o Loadout para não engatilhar recriação pesada na árvore central
        const level = data.level || 1;
        const loadoutHash = JSON.stringify(data.activeLoadout) + level;
        
        if (this.lastLoadoutHash !== loadoutHash) {
            this.lastLoadoutHash = loadoutHash;

            const loadoutSlots = this.container.querySelectorAll('.loadout-slot');
            const slotRequirements = [1, 5, 10, 15]; // Níveis estritos para liberar cada slot (reduzidos para facilitar progressão inicial)

            if (loadoutSlots.length > 0 && data.activeLoadout) {
                loadoutSlots.forEach((slotEl, index) => {
                    const el = slotEl as HTMLElement;
                    const reqLevel = slotRequirements[index]!;
                    const isUnlocked = level >= reqLevel;

                    // Gerencia o visual de trancado/destrancado com base no Nível
                    if (isUnlocked) {
                        el.classList.remove('locked');
                        const reqSpan = el.querySelector('.slot-req');
                        if (reqSpan) reqSpan.remove();
                        
                        // Drag and Drop (mantém eventos HTML5 limpos para não dar conflito, mas a lógica agora é manual)
                        el.ondragover = null; 
                        el.ondrop = null;
                        el.ondragenter = null;
                        el.ondragleave = null;
                    } else {
                        el.classList.add('locked');
                        let reqSpan = el.querySelector('.slot-req');
                        if (!reqSpan) {
                            reqSpan = document.createElement('span');
                            reqSpan.className = 'slot-req';
                            reqSpan.textContent = `L${reqLevel}`;
                            el.appendChild(reqSpan);
                        }
                    }

                    // Renderiza o visual do item atualmente equipado
                    const equippedId = data.activeLoadout![index];
                    const existingImg = el.querySelector('.equipped-skill-indicator');
                    if (existingImg) existingImg.remove();
                    el.removeAttribute('title');

                    if (equippedId && isUnlocked) {
                        const skillInfo = data.unlockedActiveSkills?.find(sk => sk.id === equippedId);
                        if (skillInfo) {
                            el.title = skillInfo.name;
                            const img = document.createElement('div');
                            img.className = 'equipped-skill-indicator';
                            
                            // Verifica se a skill pertence à classe atual (Árvore atual)
                            const isFromActiveClass = data.skillTree?.some(s => s.id === equippedId);
                            if (!isFromActiveClass) {
                                img.style.filter = 'grayscale(100%) opacity(0.4)';
                                img.style.borderColor = '#555';
                                img.style.color = '#777';
                                el.title = `${skillInfo.name}\n(Bloqueada: Requer arma apropriada)`;
                            }
                            
                            img.textContent = skillInfo.name.charAt(0).toUpperCase();
                            el.appendChild(img);
                        }
                    }
                });
            }
        }

        // 3. Atualiza a árvore visual (Pesada) - Uso estrito do Hash aqui!
        const treeHash = JSON.stringify(data.classes) + JSON.stringify(data.skillTree);
        if (this.lastTreeHash === treeHash) return; 
        this.lastTreeHash = treeHash;

        const header = this.container.querySelector('.skill-header') as HTMLElement;
        const classes = data.classes;
        if (header && classes && classes.length > 0) {
            header.innerHTML = '';
            
            const activeIndex = classes.findIndex(c => c.isActive);
            if (activeIndex !== -1) {
                const len = classes.length;
                const prevIndex = (activeIndex - 1 + len) % len;
                const nextIndex = (activeIndex + 1) % len;

                const classWeaponMap: Record<string, string> = { 'Mago': 'staff', 'Guerreiro': 'simple-sword', 'Necromante': 'scythe', 'Gunslinger': 'gun', 'Pescador': 'fishing-rod' };

                const createIconBtn = (cls: any, role: 'prev' | 'active' | 'next') => {
                    const className = cls?.name || '';
                    const configKey = classWeaponMap[className];
                    const config = configKey ? VisualConfigMap[configKey] as ItemVisualConfig | undefined : undefined;
                    const imgUrl = config?.uiIconUrl || '';

                    const btn = document.createElement('button');
                    btn.className = `class-icon ${role === 'active' ? 'active' : 'secondary'} ${cls?.isUnlocked ? 'unlocked' : 'locked'}`;
                    btn.title = className;
                    if (role !== 'active') btn.onclick = () => this.skillActionCallback('changeClass', { className: className });
                    
                    if (imgUrl) {
                        const img = document.createElement('img');
                        img.src = imgUrl;
                        btn.appendChild(img);
                    } else {
                        btn.textContent = '?';
                    }
                    return btn;
                };

                const prevClass = classes[prevIndex];
                const activeClass = classes[activeIndex];
                const nextClass = classes[nextIndex];
                
                if (len > 1) header.appendChild(createIconBtn(prevClass, 'prev'));
                
                if (len > 1) {
                    const btnPrev = document.createElement('button');
                    btnPrev.className = 'nav-btn'; btnPrev.innerHTML = '&lt;';
                    if (prevClass) {
                        btnPrev.onclick = () => this.skillActionCallback('changeClass', { className: prevClass.name });
                    }
                    header.appendChild(btnPrev);
                }

                header.appendChild(createIconBtn(activeClass, 'active'));

                if (len > 1) {
                    const btnNext = document.createElement('button');
                    btnNext.className = 'nav-btn'; btnNext.innerHTML = '&gt;';
                    if (nextClass) {
                        btnNext.onclick = () => this.skillActionCallback('changeClass', { className: nextClass.name });
                    }
                    header.appendChild(btnNext);
                }

                if (len > 1) header.appendChild(createIconBtn(nextClass, 'next'));
            }
        }

        const treeArea = this.container.querySelector('.skill-tree-canvas') as HTMLElement;
        if (treeArea && data.skillTree && data.skillTree.length > 0) {
            // Se estiver arrastando a árvore (pan) ou arrastando uma skill (drag \u0026 drop), não recria o DOM
            // para evitar que o navegador cancele os eventos de mouse
            if (!this.isDragging && !this.draggedSkillId) {
                treeArea.innerHTML = '';
                const maxTier = Math.max(0, ...data.skillTree.map(s => s.tier));

            for (let tier = maxTier; tier >= 1; tier--) {
                const skillsInTier = data.skillTree.filter(s => s.tier === tier);
                if (skillsInTier.length === 0) continue;

                const tierDiv = document.createElement('div');
                tierDiv.className = 'skill-tier';

                const label = document.createElement('div');
                label.className = 'tier-label';
                label.textContent = `T${tier}`;
                tierDiv.appendChild(label);

                const nodesDiv = document.createElement('div');
                nodesDiv.className = 'skill-nodes';

                skillsInTier.forEach(skill => {
                    const btn = document.createElement('button');

                    // Define a forma do nó com base no tipo de habilidade
                    let shapeClass = 'node-active'; // Padrão: Retângulo
                    if (skill.type === 'passive') shapeClass = 'node-passive'; // Triângulo
                    if (skill.type === 'rare') shapeClass = 'node-rare';       // Losango
                    if (skill.type === 'essential') shapeClass = 'node-essential'; // Estrela
                    if (skill.type === 'attribute') shapeClass = 'node-attribute'; // Círculo
                    
                    // Define o estado visual (trancado, liberável, liberado)
                    let stateClass = 'locked';
                    if (skill.unlocked) {
                        stateClass = 'unlocked';
                    } else if (skill.canUnlock && data.attributes && data.attributes.availablePoints > 0) {
                        stateClass = 'can-unlock';
                    }

                    btn.className = `skill-node ${shapeClass} ${stateClass}`;
                    btn.title = `${skill.name}\n\n${skill.description}`; // Tooltip com Descrição

                    // Apenas habilidades liberáveis podem ser clicadas para desbloquear
                    if (stateClass === 'can-unlock') {
                        btn.onclick = () => this.skillActionCallback('unlock', { skillId: skill.id });
                    }

                    // Apenas habilidades ativas/essenciais e já desbloqueadas podem ser arrastadas
                    if (stateClass === 'unlocked' && (skill.type === 'active' || skill.type === 'essential')) {
                        btn.onmousedown = (e) => {
                            e.preventDefault(); // Impede seleção de texto e comportamentos nativos
                            e.stopPropagation(); // Impede o Pan do canvas
                            
                            this.draggedSkillId = skill.id;
                            
                            // Cria um fantasma manual livre do DOM restrito
                            this.customDragGhost = btn.cloneNode(true) as HTMLElement;
                            this.customDragGhost.style.position = 'fixed';
                            this.customDragGhost.style.pointerEvents = 'none'; // Vital para o elementFromPoint funcionar no mouseup!
                            this.customDragGhost.style.zIndex = '999999';
                            this.customDragGhost.style.left = `${e.clientX - 24}px`;
                            this.customDragGhost.style.top = `${e.clientY - 24}px`;
                            this.customDragGhost.style.transform = 'none'; 
                            this.customDragGhost.style.boxShadow = '0 0 20px #00ffff';
                            document.body.appendChild(this.customDragGhost);
                        };
                        btn.style.cursor = 'grab';
                    }

                    nodesDiv.appendChild(btn);
                });
                tierDiv.appendChild(nodesDiv);
                treeArea.appendChild(tierDiv);

                if (tier > 1) { // A linha agora é desenhada "abaixo" de cada tier, indo até o tier 1.
                    const line = document.createElement('div');
                    // A linha brilha se qualquer skill do tier ATUAL (o mais alto sendo processado) estiver desbloqueada
                    const hasUnlocked = skillsInTier.some(s => s.unlocked);
                    line.className = `skill-path-line ${hasUnlocked ? 'unlocked' : ''}`;
                    line.style.visibility = hasUnlocked ? 'visible' : 'hidden'; 
                    treeArea.appendChild(line);
                }
            }
            } // Fechamento do if (!this.isDragging && !this.draggedSkillId)
        } else if (treeArea) { treeArea.innerHTML = '<p style="color: #666;">Nenhuma classe selecionada</p>'; }
    }
}