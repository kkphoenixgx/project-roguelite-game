import { logger } from "../../shared/Logger";
import html from './mainMenu.html?raw';

// Imports dos sub-módulos CSS com o loader em string pura do Vite (?raw)
import cssGlobalLayout from './styles/global-layout.css?raw';
import cssGameplayTabs from './styles/gameplay-tabs.css?raw';
import cssWorldMap from './styles/world-map.css?raw';

import { safeInvoke } from '../../shared/TauriIPC';
import { listen } from '@tauri-apps/api/event';

export interface WorldConfig {
    id: string;
    name: string;
    cx: number;
    cy: number;
    scale: number;
    path: string;
}

export default class MainMenuGui {
    private container!: HTMLElement;

    // Estado da câmera do mapa
    private translateX: number = 0;
    private translateY: number = 0;
    private scale: number = 1;
    private isDragging: boolean = false;
    private startX: number = 0;
    private startY: number = 0;

    constructor(private onStartGameCallback: (mapId: string) => void, private worlds: WorldConfig[]) {
        this.injectUI();
        this.setupTabs();
        this.setupMapSelection();
        this.setupSaveSystem();
        logger.log('init', 'MainMenuGui instantiated and partitioned CSS injected.');
    }

    /** Injeta a marcação estrutural e concatena as strings CSS para montagem do escopo */
    private injectUI(): void {
        const style = document.createElement('style');
        // Concatenação linear sem quebras de regras
        style.textContent = [cssGlobalLayout, cssGameplayTabs, cssWorldMap].join('\n');
        document.head.appendChild(style);
        
        const div = document.createElement('div');
        div.innerHTML = html;

        this.container = div.firstElementChild as HTMLElement;
        document.body.appendChild(this.container);
    }

    private setupTabs(): void {
        const navBtns = this.container.querySelectorAll('.mm-nav-btn');
        const tabContents = this.container.querySelectorAll('.mm-tab-content');

        navBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                navBtns.forEach(b => b.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));
                
                const targetId = (e.currentTarget as HTMLElement).getAttribute('data-target')!;
                
                (e.currentTarget as HTMLElement).classList.add('active');
                this.container.querySelector(`#${targetId}`)!.classList.add('active');
            });
        });
    }

    private setupMapSelection(): void {
        const mapContainer = this.container.querySelector('#map-layer') as HTMLElement;
        const viewport = this.container.querySelector('#map-viewport') as HTMLElement;
        const sonharBtn = this.container.querySelector('#btn-sonhar') as HTMLButtonElement;
        const cloudTransition = this.container.querySelector('#cloud-transition') as HTMLElement;
        
        let selectedWorldId = 'vilgem';

        let svgContent = `<svg class="island-group" viewBox="0 0 800 600"><defs>`;
        svgContent += `<marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="var(--world-ink)"/></marker>`;
        svgContent += `<pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M-2,2 l4,-4 M0,8 l8,-8 M6,10 l4,-4" stroke="var(--world-ink)" stroke-width="2" opacity="0.4" stroke-linecap="square"/></pattern>`;
        svgContent += `<g id="mountain"><path class="doodle-ink" d="M0,10 L6,0 L12,10" /></g>`;
        svgContent += `<g id="tree"><path class="doodle-ink" d="M6,0 L2,8 L4,8 L0,16 L12,16 L8,8 L10,8 Z M6,16 L6,20" /></g>`;
        svgContent += `<g id="house"><path class="doodle-ink" d="M0,12 L0,4 L6,0 L12,4 L12,12 Z M4,12 L4,6 L8,6 L8,12" /></g>`;
        svgContent += `
        <radialGradient id="spotlightGrad">
            <stop offset="0%" stop-color="black" />
            <stop offset="60%" stop-color="black" />
            <stop offset="100%" stop-color="white" />
        </radialGradient>
        <mask id="exploreMask">
            <rect x="-5000" y="-5000" width="10000" height="10000" fill="white" />
            <circle id="spotlight-hole" cx="400" cy="320" r="250" fill="url(#spotlightGrad)" style="transition: all 0.5s ease-in-out;" />
        </mask>
        </defs>`;

        // Fog of war ziz-zag background
        svgContent += `<path class="doodle-ink" stroke-width="4" opacity="0.2" d="M 50 50 L 150 150 L 250 50 L 350 150 L 450 50 L 550 150 L 650 50 L 750 150" />`;
        svgContent += `<path class="doodle-ink" stroke-width="4" opacity="0.2" d="M 50 450 L 150 550 L 250 450 L 350 550 L 450 450 L 550 550 L 650 450 L 750 550" />`;

        // Dashed paths connecting the maps
        svgContent += `<path d="M 180 300 Q 250 340 320 320" fill="none" stroke="var(--ui-border-primary)" stroke-width="4" stroke-dasharray="10,10" stroke-linecap="square" />`;
        svgContent += `<path d="M 480 320 Q 550 340 610 300" fill="none" stroke="var(--ui-border-primary)" stroke-width="4" stroke-dasharray="10,10" stroke-linecap="square" />`;

        this.worlds.forEach(w => {
            let interiorDoodles = '';
            if (w.id === 'cemii') {
                interiorDoodles = `<use href="#tree" x="140" y="250"/>`;
            } else if (w.id === 'vilgem') {
                interiorDoodles = `<use href="#mountain" x="380" y="240"/><use href="#house" x="395" y="280"/>`;
            } else if (w.id === 'alun') {
                interiorDoodles = `<use href="#tower" x="645" y="260"/>`;
            }

            svgContent += `
                <g class="world-node" data-id="${w.id}" style="transform: scale(${w.scale}); transform-origin: ${w.cx}px ${w.cy}px;">
                    <path class="island-border" d="${w.path}" />
                    <path d="${w.path}" fill="url(#hatch)" pointer-events="none" />
                    ${interiorDoodles}
                    <text x="${w.cx}" y="${w.cy + 60}" class="island-text">${w.name}</text>
                </g>
            `;
        });
        
        svgContent += `
            <g class="map-poi-group">
                <rect x="390" y="275" width="22" height="22" class="map-poi" data-poi="vilgem_tower"><title>Vilgem Center</title></rect>
            </g>
        `;

        // Add the fog overlay covering the map
        svgContent += `<rect x="-5000" y="-5000" width="10000" height="10000" fill="var(--ui-bg-darkest)" opacity="0.75" mask="url(#exploreMask)" pointer-events="none" />`;

        svgContent += `</svg>`;
        
        if (mapContainer) mapContainer.innerHTML = svgContent;

        const MIN_SCALE = 1.0;
        const MAX_SCALE = 1.5;

        const clampPan = () => {
            const maxPanX = 800 * this.scale;
            const maxPanY = 400 * this.scale;
            this.translateX = Math.max(-maxPanX, Math.min(maxPanX, this.translateX));
            this.translateY = Math.max(-maxPanY, Math.min(maxPanY, this.translateY));
        };

        const updateTransform = () => {
            if (mapContainer) mapContainer.style.transform = `translate(${this.translateX}px, ${this.translateY}px) scale(${this.scale})`;
        };

        if (viewport) {
            viewport.addEventListener('mousedown', (e) => {
                this.isDragging = true;
                this.startX = e.clientX - this.translateX;
                this.startY = e.clientY - this.translateY;
            });

            window.addEventListener('mousemove', (e) => {
                if (!this.isDragging) return;
                this.translateX = e.clientX - this.startX;
                this.translateY = e.clientY - this.startY;
                clampPan();
                updateTransform();
            });

            window.addEventListener('mouseup', () => { this.isDragging = false; });
            
            viewport.addEventListener('wheel', (e) => {
                e.preventDefault();
                const zoomSensitivity = 0.002;
                const delta = -e.deltaY * zoomSensitivity;
                const newScale = Math.min(Math.max(MIN_SCALE, this.scale + delta), MAX_SCALE);

                const rect = viewport.getBoundingClientRect();
                const mouseX = e.clientX - rect.left - rect.width / 2;
                const mouseY = e.clientY - rect.top - rect.height / 2;

                const ratio = 1 - newScale / this.scale;
                this.translateX += (mouseX - this.translateX) * ratio;
                this.translateY += (mouseY - this.translateY) * ratio;

                this.scale = newScale;
                clampPan();
                updateTransform();
            });
        }


        this.initVolumetricFog();
        updateTransform();

        const spotlightHole = this.container.querySelector('#spotlight-hole') as SVGCircleElement;
        const nodes = this.container.querySelectorAll('.world-node');
        
        nodes.forEach(node => {
            node.addEventListener('click', () => {
                const clickedId = node.getAttribute('data-id') || 'vilgem';
                if (selectedWorldId === clickedId) return; // Evita bug de double-click reiniciando a transição
                
                nodes.forEach(n => n.classList.remove('selected'));
                node.classList.add('selected');
                selectedWorldId = clickedId;
                
                const w = this.worlds.find(w => w.id === selectedWorldId);
                if (w && spotlightHole) {
                    spotlightHole.setAttribute('cx', w.cx.toString());
                    spotlightHole.setAttribute('cy', w.cy.toString());
                    // Vilgem is larger, others are smaller
                    spotlightHole.setAttribute('r', w.id === 'vilgem' ? '250' : '150');
                }
            });
        });

        // Seleciona Vilgem por padrão
        const defaultNode = this.container.querySelector('.world-node[data-id="vilgem"]');
        if (defaultNode) defaultNode.classList.add('selected');

        const pois = this.container.querySelectorAll('.map-poi');
        pois.forEach(poi => {
            poi.addEventListener('click', (e) => {
                e.stopPropagation();
                alert(`Você clicou no local: ${(e.target as HTMLElement).getAttribute('data-poi')}`);
            });
        });

        const loadingScreen = this.container.querySelector('#loading-screen-container') as HTMLElement;
        const funnyText = this.container.querySelector('#loading-funny-text') as HTMLElement;
        const techLog = this.container.querySelector('#loading-tech-log') as HTMLElement;
        const loadingSprite = this.container.querySelector('#loading-sprite') as HTMLImageElement;

        if (loadingSprite) {
            loadingSprite.src = new URL('../../../../../src-tauri/icons/game-icon-128.png', import.meta.url).href;
        }

        const funnyPhrases = [
            "Escovando os dentes dos Goblins...",
            "Polindo as Hitboxes...",
            "O Diretor Molor está terminando o café...",
            "Atores se posicionando no cenário...",
            "Afiando as espadas...",
            "Limpando o sangue do último aventureiro...",
            "Verificando se o Slime está gelatinoso...",
            "Os sonhos já vão começar..."
        ];

        let phraseIndex = 0;
        const phraseInterval = setInterval(() => {
            phraseIndex = (phraseIndex + 1) % funnyPhrases.length;
            if (funnyText) funnyText.textContent = funnyPhrases[phraseIndex]!;
        }, 2500);

        if (sonharBtn && cloudTransition) {
            const hideLoadingScreen = () => {
                logger.log('init', 'Sinal de IA Pronta recebido. Escondendo tela de loading.');
                clearInterval(phraseInterval);
                if (loadingScreen) {
                    loadingScreen.style.opacity = '0';
                    setTimeout(() => loadingScreen.style.display = 'none', 800);
                }
            };

            if ((window as any).__TAURI_INTERNALS__) {
                if (sessionStorage.getItem('ollama_ready') === 'true') {
                    hideLoadingScreen();
                }
                
                listen<string>('loading-progress', (event: any) => {
                    if (techLog) techLog.textContent = event.payload;
                });

                listen('ollama-ready', () => {
                    sessionStorage.setItem('ollama_ready', 'true');
                    hideLoadingScreen();
                });

                setTimeout(() => {
                    if (sessionStorage.getItem('ollama_ready') !== 'true') {
                        logger.log('init', 'Timeout esperando backend, forçando inicialização.');
                        sessionStorage.setItem('ollama_ready', 'true');
                        hideLoadingScreen();
                    }
                }, 5000);
            } else {
                clearInterval(phraseInterval);
                if (loadingScreen) loadingScreen.style.display = 'none';
            }

            sonharBtn.addEventListener('click', () => {
                sonharBtn.disabled = true;
                sonharBtn.style.pointerEvents = 'none';
                cloudTransition.classList.add('active');
                setTimeout(() => {
                    this.container.style.display = 'none';
                    this.onStartGameCallback(selectedWorldId); 
                }, 1200); 
            });
        }
    }

    private initVolumetricFog() {
        // Volumetric fog removed for performance. Now using SVG mask.
    }

    private setupSaveSystem(): void {
        const btnExport = this.container.querySelector('#btn-export-save') as HTMLButtonElement;
        const btnImport = this.container.querySelector('#btn-import-save') as HTMLButtonElement;
        const btnConfirm = this.container.querySelector('#btn-confirm-import') as HTMLButtonElement;
        const ioArea = this.container.querySelector('#save-data-io') as HTMLTextAreaElement;
        
        if (!btnExport || !btnImport || !ioArea || !btnConfirm) return;

        btnExport.addEventListener('click', async () => {
            try {
                const jsonString = await safeInvoke<string>('load_game_state');
                const data = JSON.parse(jsonString);
                const saveStr = btoa(JSON.stringify(data));
                ioArea.value = saveStr;
                ioArea.style.display = 'block';
                btnConfirm.style.display = 'none';
                ioArea.select();
            } catch (e) {
                alert("Nenhum save encontrado no disco ou falha de IPC: " + e);
            }
        });

        btnImport.addEventListener('click', () => {
            ioArea.value = '';
            ioArea.style.display = 'block';
            btnConfirm.style.display = 'inline-block';
            ioArea.focus();
        });

        btnConfirm.addEventListener('click', async () => {
            const data = ioArea.value.trim();
            if (!data) return;
            
            try {
                const decodedJson = atob(data);
                JSON.parse(decodedJson);
                await safeInvoke<string>('save_game_state', { payload: decodedJson });
                alert("Save importado com sucesso! Recarregando sonhos...");
                window.location.reload();
            } catch (e) {
                alert("Código de save inválido, corrompido ou falha de gravação (IPC)!");
            }
        });
    }
}