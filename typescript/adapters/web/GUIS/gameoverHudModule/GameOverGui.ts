import { logger } from "../../shared/Logger";
import html from './gameOver.html?raw';
import css from './gameOver.css?raw';

import type { IGameDomain } from "../../../../domain/ports/domain-contracts";

export default class GameOverGui {
    private container!: HTMLElement;

    constructor(private restartCallback: () => void, private domain: IGameDomain) {
        this.injectUI();
        this.hide();
        logger.log('init', 'GameOverGui instantiated and UI injected.');
    }

    private injectUI(): void {
        const style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);

        const div = document.createElement('div');
        div.innerHTML = html;
        this.container = div.firstElementChild as HTMLElement;
        document.body.appendChild(this.container);

        const restartBtn = this.container.querySelector('#restart-btn') as HTMLButtonElement;
        restartBtn.addEventListener('click', () => {
            this.restartCallback();
        });
    }

    public show(): void {
        this.container.style.display = 'flex';
        
        // Fetch stats from Domain
        const mpm = (this.domain as any).metaProgressionManager;
        if (mpm && mpm.lastRunSummary) {
            const summary = mpm.lastRunSummary;
            const lvlEl = this.container.querySelector('#go-final-level') as HTMLElement;
            const lvlEssEl = this.container.querySelector('#go-level-essence') as HTMLElement;
            const featsList = this.container.querySelector('#go-feats-list') as HTMLElement;
            const totalEl = this.container.querySelector('#go-total-reward') as HTMLElement;
            
            // Note: finalLevel is inferred from levelReward (levelReward = finalLevel * 50)
            lvlEl.textContent = (summary.breakdown.levelReward / 50).toString();
            lvlEssEl.textContent = `+${summary.breakdown.levelReward} XP`;
            
            featsList.innerHTML = '';
            if (summary.breakdown.feats && summary.breakdown.feats.length > 0) {
                summary.breakdown.feats.forEach((feat: any) => {
                    const div = document.createElement('div');
                    div.className = 'go-feat-item';
                    div.innerHTML = `<span style="color: #ddd;">${feat.name}</span> <span style="color: #1eff00;">+${feat.value} XP</span>`;
                    featsList.appendChild(div);
                });
            } else {
                featsList.innerHTML = `<span style="color: #888; font-family: 'PixelArtFont', monospace; text-align: center; display: block; margin-top: 10px;">Nenhum feito notável.</span>`;
            }
            
            totalEl.textContent = `+${summary.totalReward} XP`;
        }

        // Fallback garantido: Pressione qualquer tecla ou clique para reiniciar
        // Atraso de 1.5 segundos para o jogador não pular a tela sem querer se estiver atacando alucinadamente
        setTimeout(() => {
            const forceRestart = () => { this.restartCallback(); };
            window.addEventListener('keydown', forceRestart, { once: true });
            // window.addEventListener('mousedown', forceRestart, { once: true }); // Desativado mouse p/ poder scrollar feats
        }, 1500);
    }

    public hide(): void {
        this.container.style.display = 'none';
    }
}