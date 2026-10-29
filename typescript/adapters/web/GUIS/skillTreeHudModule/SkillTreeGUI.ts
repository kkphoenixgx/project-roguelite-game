import { logger } from "../../shared/Logger";
import html from './skillTree.html?raw';
import css from './skillTree.css?raw';
import type { EntityRenderableState } from "../../../../domain/ports/domain-contracts";
import { VisualConfigMap, ElementalEffectIcons, SkillIcons, type ItemVisualConfig } from "../../shared/VisualConfigMap";

/** @class SkillTreeGui Controla a interface da árvore de habilidades isolada. */
export default class SkillTreeGui {
    private container!: HTMLElement;
    private isVisible: boolean = false;
    private lastTreeHash: string = '';
    private lastLoadoutHash: string = '';
    private lastClassesHash: string = '';
    private lastStructureKey: string = '';

    private pointsEl: HTMLElement | null = null;
    private headerEl: HTMLElement | null = null;
    private svgLayer: SVGSVGElement | null = null;
    private nodesLayer: HTMLElement | null = null;
    private loadoutSlots!: NodeListOf<HTMLElement>;

    private nodeElements = new Map<string, HTMLButtonElement>();
    private pathElements = new Map<string, { path: SVGPathElement; parentId: string }>();
        
    private isDragging: boolean = false;
    private startX: number = 0;
    private startY: number = 0;
    private translateX: number = 0;
    private translateY: number = 0;
    private scale: number = 1;

    private draggedSkillId: string | null = null;
    private customDragGhost: HTMLElement | null = null;
    private hoverTimer: any = null;

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
        this.container.style.zIndex = '1000';
        document.body.appendChild(this.container);

        this.pointsEl = this.container.querySelector('#st-available-points');
        this.headerEl = this.container.querySelector('.skill-header') as HTMLElement;
        this.svgLayer = this.container.querySelector('.skill-tree-svg-layer') as SVGSVGElement;
        this.nodesLayer = this.container.querySelector('.skill-tree-nodes-layer') as HTMLElement;
        this.loadoutSlots = this.container.querySelectorAll('.loadout-slot') as NodeListOf<HTMLElement>;
    }
    
    private setupViewportEvents(): void {
        const viewport = this.container.querySelector('.skill-tree-viewport') as HTMLElement;
        const canvas = this.container.querySelector('.skill-tree-canvas') as HTMLElement;
        if (!viewport || !canvas) return;

        const updateCanvasTransform = () => {
            canvas.style.transform = `translate3d(${this.translateX.toFixed(2)}px, ${this.translateY.toFixed(2)}px, 0px) scale(${this.scale.toFixed(3)})`;
        };

        let rafId: number | null = null;
        const requestFrame = typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function'
            ? window.requestAnimationFrame.bind(window)
            : (cb: FrameRequestCallback) => setTimeout(cb, 16) as unknown as number;

        const scheduleTransform = () => {
            if (rafId !== null) return;
            rafId = requestFrame(() => {
                rafId = null;
                updateCanvasTransform();
            });
        };

        viewport.addEventListener('mousedown', (e) => {
    //? Impede que a navegação por pan intercepte o drag-and-drop de habilidades
            if ((e.target as HTMLElement).closest('.skill-node')) return;
            
            this.isDragging = true;
            this.startX = e.clientX - this.translateX;
            this.startY = e.clientY - this.translateY;
        });

        window.addEventListener('mousemove', (e) => {
            if (this.customDragGhost) {
                this.customDragGhost.style.left = `${e.clientX - 24}px`;
                this.customDragGhost.style.top = `${e.clientY - 24}px`;
                
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
            scheduleTransform();
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
                
                const allSlots = Array.from(this.container.querySelectorAll('.loadout-slot'));
                allSlots.forEach(s => (s as HTMLElement).style.borderColor = '');
                
                this.draggedSkillId = null;
            }
            this.isDragging = false;
            updateCanvasTransform();
        });

        viewport.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.scale += e.deltaY * -0.001;
            this.scale = Math.min(Math.max(0.4, this.scale), 2.5); //? Limite de zoom da árvore entre 0.4x e 2.5x
            scheduleTransform();
        }, { passive: false });
        
        const toggleBtn = this.container.querySelector('#st-toggle-loadout') as HTMLElement;
        const loadoutPanel = this.container.querySelector('.loadout-panel') as HTMLElement;
        if (toggleBtn && loadoutPanel) {
            toggleBtn.onclick = () => { loadoutPanel.classList.toggle('collapsed'); };
        }

        this.container.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
        });
    }

    public get isOpen(): boolean { return this.isVisible; }

    public toggle(): void {
        this.isVisible = !this.isVisible;
        this.container.style.display = this.isVisible ? 'flex' : 'none';
        
        if (this.isVisible) {
            const canvas = this.container.querySelector('.skill-tree-canvas') as HTMLElement;
            const viewport = this.container.querySelector('.skill-tree-viewport') as HTMLElement;
            if (canvas && viewport) {
                const viewportWidth = viewport.clientWidth;
                const viewportHeight = viewport.clientHeight;
                const canvasWidth = 960;
                const canvasHeight = 1050;
                
                this.scale = 0.85;
                this.translateX = (viewportWidth - (canvasWidth * this.scale)) / 2; 
                this.translateY = Math.max(10, (viewportHeight - (canvasHeight * this.scale)) / 2); 
                canvas.style.transform = `translate3d(${this.translateX.toFixed(2)}px, ${this.translateY.toFixed(2)}px, 0px) scale(${this.scale.toFixed(3)})`;
            }
        }
        
        this.togglePauseCallback();
    }

    public hide(): void { if (this.isVisible) { this.isVisible = false; this.container.style.display = 'none'; this.togglePauseCallback(); } }

    public update(data: EntityRenderableState): void {
        if (!this.isVisible || !data.classes) return;
        
        const pointsEl = this.pointsEl;
        if (pointsEl && data.attributes) {
            const ptsStr = (data.attributes.availablePoints ?? 0).toString();
            if (pointsEl.textContent !== ptsStr) {
                pointsEl.textContent = ptsStr;
            }
        }

    //! Hash isolado de loadout para evitar renderização desnecessária da árvore de nós
        const level = data.level || 1;
        const loadoutHash = JSON.stringify(data.activeLoadout) + level;
        
        if (this.lastLoadoutHash !== loadoutHash) {
            this.lastLoadoutHash = loadoutHash;

            const loadoutSlots = this.loadoutSlots;
            const slotRequirements = [1, 5, 10, 15];

            if (loadoutSlots.length > 0 && data.activeLoadout) {
                loadoutSlots.forEach((slotEl, index) => {
                    const el = slotEl as HTMLElement;
                    const reqLevel = slotRequirements[index]!;
                    const isUnlocked = level >= reqLevel;

                    if (isUnlocked) {
                        el.classList.remove('locked');
                        const reqSpan = el.querySelector('.slot-req');
                        if (reqSpan) reqSpan.remove();
                        
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
                            
                            const isFromActiveClass = data.skillTree?.some(s => s.id === equippedId);
                            if (!isFromActiveClass) {
                                img.style.filter = 'grayscale(100%) opacity(0.4)';
                                img.style.borderColor = '#555';
                                img.style.color = '#777';
                                el.title = `${skillInfo.name}\n(Bloqueada: Requer arma apropriada)`;
                            }
                            
                            const skillIconUrl = (SkillIcons as any)[equippedId]?.icon40Url || (ElementalEffectIcons as any)[equippedId]?.icon32Url;
                            if (skillIconUrl) {
                                const iconEl = document.createElement('img');
                                iconEl.src = skillIconUrl;
                                iconEl.style.width = '100%';
                                iconEl.style.height = '100%';
                                iconEl.style.objectFit = 'contain';
                                iconEl.style.pointerEvents = 'none';
                                img.appendChild(iconEl);
                            } else {
                                img.textContent = skillInfo.name.charAt(0).toUpperCase();
                            }
                            el.appendChild(img);
                        }
                    }
                });
            }
        }

        const activeClass = data.classes.find(c => c.isActive);
        const hasPoints = (data.attributes?.availablePoints ?? 0) > 0 ? 1 : 0;
        let skillsStateSignature = '';
        if (data.skillTree) {
            for (let i = 0; i < data.skillTree.length; i++) {
                const s = data.skillTree[i]!;
                skillsStateSignature += `${s.id}:${s.unlocked ? 1 : 0}:${s.canUnlock ? 1 : 0}:${s.isBranchBlocked ? 1 : 0},`;
            }
        }
        const treeHash = `${activeClass?.name || ''}|${hasPoints}|${skillsStateSignature}`;
        if (this.lastTreeHash === treeHash) return; 
        this.lastTreeHash = treeHash;

        const header = this.headerEl;
        const classes = data.classes;
        if (header && classes && classes.length > 0) {
            const classesHash = classes.map(c => `${c.name}:${c.isActive ? 1 : 0}:${c.isUnlocked ? 1 : 0}`).join('|');
            if (this.lastClassesHash !== classesHash) {
                this.lastClassesHash = classesHash;
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
                    const activeClassItem = classes[activeIndex];
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

                    header.appendChild(createIconBtn(activeClassItem, 'active'));

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
        }

        this.renderTreeArea(data);
    }

    private updateNodeElementState(btn: HTMLButtonElement, skill: any, hasAvailablePoints: boolean): void {
        let stateClass = 'locked';
        if (skill.unlocked) {
            stateClass = 'unlocked';
        } else if (skill.isBranchBlocked) {
            stateClass = 'locked branch-blocked';
        } else if (skill.canUnlock && hasAvailablePoints) {
            stateClass = 'can-unlock';
        }

        const targetClassName = `skill-node ${stateClass}`;
        if (btn.className !== targetClassName) {
            btn.className = targetClassName;
        }

        const existingCheck = btn.querySelector('.skill-check-badge');
        const existingIndicator = btn.querySelector('.skill-unlock-indicator');

        if (skill.unlocked) {
            if (existingIndicator) existingIndicator.remove();
            if (!existingCheck) {
                const check = document.createElement('span');
                check.className = 'skill-check-badge';
                check.textContent = '✓';
                btn.appendChild(check);
            }
        } else if (stateClass === 'can-unlock') {
            if (existingCheck) existingCheck.remove();
            if (!existingIndicator) {
                const indicator = document.createElement('span');
                indicator.className = 'skill-unlock-indicator';
                indicator.textContent = '▲';
                btn.appendChild(indicator);
            }
        } else {
            if (existingCheck) existingCheck.remove();
            if (existingIndicator) existingIndicator.remove();
        }

        if (stateClass === 'can-unlock') {
            btn.onclick = () => this.skillActionCallback('unlock', { skillId: skill.id });
        } else {
            btn.onclick = null;
        }

        //? Apenas habilidades ativas ou essenciais desbloqueadas podem ser arrastadas
        if (stateClass === 'unlocked' && (skill.type === 'active' || skill.type === 'essential' || skill.type === 'rare')) {
            btn.onmousedown = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.draggedSkillId = skill.id;

                this.customDragGhost = btn.cloneNode(true) as HTMLElement;
                this.customDragGhost.style.position = 'fixed';
                this.customDragGhost.style.pointerEvents = 'none';
                this.customDragGhost.style.zIndex = '999999';
                this.customDragGhost.style.left = `${e.clientX - 30}px`;
                this.customDragGhost.style.top = `${e.clientY - 30}px`;
                this.customDragGhost.style.transform = 'none';
                this.customDragGhost.style.filter = 'drop-shadow(0 0 16px #00ffff)';
                document.body.appendChild(this.customDragGhost);
            };
            btn.style.cursor = 'grab';
        } else {
            btn.onmousedown = null;
            btn.style.cursor = '';
        }

        (btn as any).__currentSkill = skill;
        (btn as any).__currentStateClass = stateClass;
    }

    private renderTreeArea(data: EntityRenderableState): void {
        const svgLayer = this.svgLayer;
        const nodesLayer = this.nodesLayer;
        if (!svgLayer || !nodesLayer) return;

        if (this.isDragging || this.draggedSkillId) return;

        this.hideNodeDetails();

        if (!data.skillTree || data.skillTree.length === 0) {
            this.lastStructureKey = '';
            this.nodeElements.clear();
            this.pathElements.clear();
            svgLayer.innerHTML = '';
            nodesLayer.innerHTML = '<p style="color: #666; position: absolute; left: 400px; top: 300px;">Nenhuma classe selecionada</p>';
            return;
        }

        const activeClass = data.classes?.find(c => c.isActive);
        const structureKey = `${activeClass?.name || ''}|${data.skillTree.map(s => s.id).join(',')}`;
        const skillsMap = new Map<string, any>(data.skillTree.map(s => [s.id, s]));
        const hasAvailablePoints = !!(data.attributes && data.attributes.availablePoints > 0);

    //! Atualização in-place de nós sem recriar elementos DOM caso a topologia não tenha mudado
        if (this.lastStructureKey === structureKey && this.nodeElements.size === data.skillTree.length) {
            for (let i = 0; i < data.skillTree.length; i++) {
                const skill = data.skillTree[i]!;
                const btn = this.nodeElements.get(skill.id);
                if (btn) {
                    this.updateNodeElementState(btn, skill, hasAvailablePoints);
                }
                const pathInfo = this.pathElements.get(skill.id);
                if (pathInfo) {
                    const isParentUnlocked = skillsMap.get(pathInfo.parentId)?.unlocked ?? false;
                    const isUnlocked = skill.unlocked && isParentUnlocked;
                    const canUnlock = skill.canUnlock && !skill.unlocked;
                    let statusClass = 'path-locked';
                    if (isUnlocked) statusClass = 'path-unlocked';
                    else if (canUnlock) statusClass = 'path-available';
                    const targetClass = `skill-connection-path ${statusClass}`;
                    if (pathInfo.path.getAttribute('class') !== targetClass) {
                        pathInfo.path.setAttribute('class', targetClass);
                    }
                }
            }
            return;
        }

        this.lastStructureKey = structureKey;
        this.nodeElements.clear();
        this.pathElements.clear();
        svgLayer.innerHTML = '';
        nodesLayer.innerHTML = '';

        const layout = this.computeTreeLayout(data.skillTree, activeClass?.name);

        const tierGuides = [
            { label: 'T4 / ÁPICE', y: 120 },
            { label: 'T3', y: 380 },
            { label: 'T2', y: 640 },
            { label: 'T1 - FUNDAÇÃO', y: 850 }
        ];

        tierGuides.forEach(g => {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', '60');
            line.setAttribute('y1', g.y.toString());
            line.setAttribute('x2', '900');
            line.setAttribute('y2', g.y.toString());
            line.setAttribute('stroke', 'rgba(90, 74, 56, 0.22)');
            line.setAttribute('stroke-width', '1.5');
            line.setAttribute('stroke-dasharray', '6,8');
            svgLayer.appendChild(line);

            const label = document.createElement('div');
            label.className = 'tier-guide-label';
            label.style.top = `${g.y}px`;
            label.textContent = g.label;
            nodesLayer.appendChild(label);
        });

        if (layout.branches?.titleA && layout.branches.xA !== undefined) {
            const headerA = document.createElement('div');
            headerA.className = 'branch-header';
            headerA.style.left = `${layout.branches.xA}px`;
            headerA.style.top = '40px';
            headerA.textContent = layout.branches.titleA;
            nodesLayer.appendChild(headerA);
        }
        if (layout.branches?.titleB && layout.branches.xB !== undefined) {
            const headerB = document.createElement('div');
            headerB.className = 'branch-header';
            headerB.style.left = `${layout.branches.xB}px`;
            headerB.style.top = '40px';
            headerB.textContent = layout.branches.titleB;
            nodesLayer.appendChild(headerB);
        }

        data.skillTree.forEach(skill => {
            const parentId = skill.dependencies?.[0] || skill.requiredSkillId;
            if (parentId && layout.positions.has(parentId) && layout.positions.has(skill.id)) {
                const posParent = layout.positions.get(parentId)!;
                const posChild = layout.positions.get(skill.id)!;

                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                const isParentUnlocked = skillsMap.get(parentId)?.unlocked ?? false;
                const isUnlocked = skill.unlocked && isParentUnlocked;
                const canUnlock = skill.canUnlock && !skill.unlocked;

                let statusClass = 'path-locked';
                if (isUnlocked) statusClass = 'path-unlocked';
                else if (canUnlock) statusClass = 'path-available';

                path.setAttribute('class', `skill-connection-path ${statusClass}`);

                const deltaY = Math.abs(posParent.y - posChild.y);
                let d = '';
                if (Math.abs(posParent.x - posChild.x) < 5) {
                    d = `M ${posParent.x} ${posParent.y} L ${posChild.x} ${posChild.y}`;
                } else {
                    const ctrlY = posParent.y - (deltaY * 0.5);
                    d = `M ${posParent.x} ${posParent.y} C ${posParent.x} ${ctrlY}, ${posChild.x} ${ctrlY}, ${posChild.x} ${posChild.y}`;
                }

                path.setAttribute('d', d);
                svgLayer.appendChild(path);
                this.pathElements.set(skill.id, { path, parentId });
            }
        });

        data.skillTree.forEach(skill => {
            const pos = layout.positions.get(skill.id);
            if (!pos) return;

            const btn = document.createElement('button');
            btn.style.left = `calc(${pos.x}px - 30px)`;
            btn.style.top = `calc(${pos.y}px - 30px)`;

            const skillIcon = (SkillIcons as any)[skill.id]?.icon80Url 
                || (SkillIcons as any)[skill.id]?.icon40Url 
                || (ElementalEffectIcons as any)[skill.id]?.icon32Url;

            if (skillIcon) {
                const iconImg = document.createElement('img');
                iconImg.src = skillIcon;
                iconImg.className = 'skill-icon-img';
                iconImg.alt = skill.name;
                btn.appendChild(iconImg);
            } else {
                btn.textContent = skill.name.charAt(0).toUpperCase();
            }

            this.updateNodeElementState(btn, skill, hasAvailablePoints);

            btn.addEventListener('mouseenter', (e) => {
                const currentSkill = (btn as any).__currentSkill || skill;
                const currentStateClass = (btn as any).__currentStateClass || 'locked';
                this.showNodeDetails(currentSkill, currentStateClass, e.clientX, e.clientY);
            });
            btn.addEventListener('mouseleave', () => {
                this.hideNodeDetails();
            });

            nodesLayer.appendChild(btn);
            this.nodeElements.set(skill.id, btn);
        });
    }

    private computeTreeLayout(skills: any[], activeClassName?: string): { 
        positions: Map<string, { x: number, y: number }>;
        branches?: { titleA?: string; xA?: number; titleB?: string; xB?: number };
    } {
        const positions = new Map<string, { x: number, y: number }>();
        if (!skills || skills.length === 0) return { positions };

        const skillsMap = new Map<string, any>(skills.map(s => [s.id, s]));
        const childrenMap = new Map<string, string[]>();
        const parentMap = new Map<string, string>();

        skills.forEach(s => childrenMap.set(s.id, []));

        skills.forEach(s => {
            const parentId = s.dependencies?.[0] || s.requiredSkillId;
            if (parentId && skillsMap.has(parentId)) {
                childrenMap.get(parentId)!.push(s.id);
                parentMap.set(s.id, parentId);
            }
        });

        const roots = skills.filter(s => !parentMap.has(s.id));
        const rootId = roots[0]?.id;

    //? Rastreia o tronco base (Stem) da árvore até o ponto de bifurcação de ramos
        const stem: string[] = [];
        let forkNodeId: string | null = null;
        let currId: string | null = rootId;

        while (currId) {
            stem.push(currId);
            const children = childrenMap.get(currId) || [];
            if (children.length > 1) {
                forkNodeId = currId;
                break;
            } else if (children.length === 1) {
                currId = children[0]!;
            } else {
                break;
            }
        }

        const centerX = 480;

    //? Posiciona bifurcação em dois ramos independentes (Ramo A à esquerda e Ramo B à direita)
        if (forkNodeId && (childrenMap.get(forkNodeId)?.length || 0) >= 2) {
            const forkChildren = childrenMap.get(forkNodeId)!;
            const branchAChild = forkChildren[0]!;
            const branchBChild = forkChildren[1]!;

            const collectBranch = (startId: string): string[] => {
                const list: string[] = [];
                let nId: string | null = startId;
                while (nId) {
                    list.push(nId);
                    const nextKids: string[] = childrenMap.get(nId) || [];
                    nId = nextKids.length > 0 ? (nextKids[0] as string) : null;
                }
                return list;
            };

            const branchA = collectBranch(branchAChild);
            const branchB = collectBranch(branchBChild);

            if (stem.length === 1) {
                positions.set(stem[0]!, { x: centerX, y: 840 });
            } else if (stem.length >= 2) {
                const stemStartY = 920;
                const stemForkY = 780;
                stem.forEach((sId, idx) => {
                    const y = stemStartY - (idx * (stemStartY - stemForkY) / (stem.length - 1));
                    positions.set(sId, { x: centerX, y });
                });
            }

            const leftX = 260;
            const rightX = 700;
            const branchStartY = 640;
            const branchTopY = 120;

            const layoutBranch = (branchNodes: string[], x: number) => {
                const count = branchNodes.length;
                if (count === 1) {
                    positions.set(branchNodes[0]!, { x, y: 400 });
                    return;
                }
                const stepY = (branchStartY - branchTopY) / Math.max(1, count - 1);
                branchNodes.forEach((sId, idx) => {
                    const y = branchStartY - (idx * stepY);
                    positions.set(sId, { x, y });
                });
            };

            layoutBranch(branchA, leftX);
            layoutBranch(branchB, rightX);

            let titleA = 'ESPECIALIZAÇÃO I';
            let titleB = 'ESPECIALIZAÇÃO II';
            if (activeClassName === 'Guerreiro') {
                titleA = 'RAMO: O COLOSSO';
                titleB = 'RAMO: O TITÃ';
            } else if (activeClassName === 'Necromante') {
                titleA = 'RAMO: SENHOR DOS OSSOS';
                titleB = 'RAMO: ESPECTRO ABISSAL';
            }

            return {
                positions,
                branches: { titleA, xA: leftX, titleB, xB: rightX }
            };
        }

    //? Disposição linear para classes sem ramificação (Mago, Gunslinger, Pescador)
        const allOrdered: string[] = [];
        let traceId: string | null = rootId;
        while (traceId) {
            allOrdered.push(traceId);
            const kids = childrenMap.get(traceId) || [];
            traceId = kids.length > 0 ? kids[0]! : null;
        }
        skills.forEach(s => {
            if (!allOrdered.includes(s.id)) allOrdered.push(s.id);
        });

        const total = allOrdered.length;
        const startY = 880;
        const endY = 140;
        const step = total > 1 ? (startY - endY) / (total - 1) : 0;

        allOrdered.forEach((sId, idx) => {
            const y = total > 1 ? startY - (idx * step) : 500;
            positions.set(sId, { x: centerX, y });
        });

        return { positions };
    }

    private showNodeDetails(skill: any, stateClass: string, clientX: number, clientY: number): void {
        const panel = this.container.querySelector('#st-skill-details-panel') as HTMLElement;
        if (!panel) return;

        const nameEl = panel.querySelector('#st-skill-name');
        const typeEl = panel.querySelector('#st-skill-type');
        const descEl = panel.querySelector('#st-skill-desc');
        const tierEl = panel.querySelector('#st-skill-tier');
        const hintEl = panel.querySelector('#st-skill-hint');

        const typeNames: Record<string, string> = {
            'active': 'Habilidade Ativa (Slot)',
            'passive': 'Habilidade Passiva',
            'essential': 'Habilidade Essencial de Classe',
            'rare': 'Especialização / Rara',
            'attribute': 'Incremento de Atributo'
        };

        if (nameEl) nameEl.textContent = skill.name;
        if (typeEl) typeEl.textContent = typeNames[skill.type] || skill.type.toUpperCase();
        if (descEl) descEl.textContent = skill.description || 'Nenhuma descrição disponível.';
        if (tierEl) tierEl.textContent = `TIER ${skill.tier || 1}`;

        if (hintEl) {
            hintEl.className = '';
            if (stateClass === 'unlocked') {
                hintEl.className = 'st-hint-unlocked';
                hintEl.textContent = '✓ Desbloqueado';
            } else if (skill.isBranchBlocked || stateClass.includes('branch-blocked')) {
                hintEl.className = 'st-hint-locked';
                hintEl.textContent = 'Bloqueado (Ramo Concorrente Escolhido)';
            } else if (stateClass === 'can-unlock') {
                hintEl.className = 'st-hint-available';
                hintEl.textContent = 'Clique para Desbloquear';
            } else {
                hintEl.className = 'st-hint-locked';
                hintEl.textContent = 'Bloqueado (Requer Pré-Requisito)';
            }
        }

        const viewport = this.container.querySelector('.skill-tree-viewport') as HTMLElement;
        const vpRect = viewport?.getBoundingClientRect() || { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };

        let left = clientX - vpRect.left + 24;
        let top = clientY - vpRect.top + 24;

        if (left + 320 > vpRect.width) {
            left = clientX - vpRect.left - 330;
        }
        if (top + 180 > vpRect.height) {
            top = clientY - vpRect.top - 180;
        }

        panel.style.left = `${Math.max(10, left)}px`;
        panel.style.top = `${Math.max(10, top)}px`;
        panel.style.display = 'block';
        panel.style.opacity = '1';
    }

    private hideNodeDetails(): void {
        const panel = this.container.querySelector('#st-skill-details-panel') as HTMLElement;
        if (panel) {
            panel.style.opacity = '0';
            panel.style.display = 'none';
        }
    }
}