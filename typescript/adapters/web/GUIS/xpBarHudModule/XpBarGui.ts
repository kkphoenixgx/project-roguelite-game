import { logger } from "../../shared/Logger";

import html from './xpBar.html?raw';
import css from './xpBar.css?raw';

/**
 * @class XpBarGui
 * Controla a interface da barra de experiência do jogador.
 * Carrega sua própria estrutura HTML e CSS e a injeta no DOM.
 */
export default class XpBarGui {
    private xpBarFill!: HTMLElement;
    private levelDisplay!: HTMLElement;
    private lastLevel: number = 0;
    private lastPercentage: number = -1;

    constructor() {
        this.injectUI();
        this.setupElements();
        logger.log('init', 'XpBarGui instantiated and UI injected.');
    }


    /**
     * Injeta o HTML e o CSS da UI no corpo do documento.
     */
    private injectUI(): void {
        const style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);

        const container = document.createElement('div');
        container.innerHTML = html;
        document.body.appendChild(container.firstChild!);
    }

    /**
     * Obtém referências para os elementos do DOM que serão manipulados.
     */
    private setupElements(): void {
        this.xpBarFill = document.getElementById('xp-bar-fill') as HTMLElement;
        this.levelDisplay = document.getElementById('player-level') as HTMLElement;
    }

    /**
     * Atualiza a UI com os novos dados de XP e nível do jogador.
     * Este método será chamado a cada frame pelo GameAdapter.
     * @param data Os dados mais recentes do jogador.
     */
    public update(data: { level?: number, currentXp?: number, xpToNextLevel?: number }): void {
        if (data.level === undefined || data.currentXp === undefined || data.xpToNextLevel === undefined) {
            return;
        }
        const percentage = data.xpToNextLevel > 0 ? (data.currentXp / data.xpToNextLevel) * 100 : 0;

        //? Dirty checking para só atualizar nós do DOM quando os valores numéricos mudarem
        if (percentage !== this.lastPercentage) {
            this.xpBarFill.style.width = `${percentage}%`;
            this.lastPercentage = percentage;
        }

        if (data.level !== this.lastLevel) {
            this.levelDisplay.textContent = data.level.toString();
            this.lastLevel = data.level;
        }
    }
}