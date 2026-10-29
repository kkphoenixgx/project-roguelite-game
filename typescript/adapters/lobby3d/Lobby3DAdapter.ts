import type { IEventManager } from "../../domain/eventDispacher/IGameEvents";
import { logger } from "../web/shared/Logger";
import { Lobby3DSceneManager } from "./Lobby3DSceneManager";
import { Lobby3DUIManager } from "./Lobby3DUIManager";

/**
 * Lobby3DAdapter
 *
 * Adaptador de apresentação para o Lobby 3D. Renderiza uma cena atmosférica
 * usando WebGL puro (sem libs externas, Zero-GC) com um mapa-múndi girante,
 * névoa volumétrica e o painel de seleção de personagem.
 *
 * Arquitetura Hexagonal: Este adapter é completamente agnóstico ao Domínio.
 * Ele apenas escuta o EventManager para saber quando voltar ao GameAdapter.
 */
export default class Lobby3DAdapter {
    private container!: HTMLDivElement;
    private sceneManager!: Lobby3DSceneManager;
    private uiManager!: Lobby3DUIManager;
    
    private isRunning = true;
    private enterKeyListener: (e: KeyboardEvent) => void;

    constructor(private eventManager: IEventManager) {
        this.enterKeyListener = (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
                window.location.reload();
            }
        };
    }

    public async initialize(): Promise<void> {
        logger.log('init', 'Lobby3DAdapter initializing WebGL scene...');

        this.buildDOM();
        
        this.sceneManager = new Lobby3DSceneManager(this.container);
        this.sceneManager.initialize();

        this.uiManager = new Lobby3DUIManager(this.container, this.sceneManager.canvas);
        this.uiManager.setupUI();

        logger.log('init', 'Lobby3DAdapter: WebGL Lobby 3D initialized successfully.');
    }

    private buildDOM(): void {
        this.container = document.createElement('div');
        this.container.id = 'lobby3d-root';
        this.container.style.cssText = `
            position: fixed; inset: 0; z-index: 100;
            background: #050a14;
            display: flex; align-items: center; justify-content: center;
            font-family: 'Georgia', serif;
            pointer-events: none;
        `;
        document.body.appendChild(this.container);
    }

    public destroy(): void {
        logger.log('init', '[Lobby3DAdapter] Destruído.');
        
        if (this.sceneManager) {
            this.sceneManager.destroy();
        }
        
        if (this.uiManager) {
            this.uiManager.destroy();
        }

        if (this.container?.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}
