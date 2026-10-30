import { logger } from "../../shared/Logger";
import { getRewardSvg } from "../../shared/RewardSvgAssets";
import html from './levelUpReward.html?raw';
import css from './levelUpReward.css?raw';
import type { IGameDomain } from "../../../../domain/ports/domain-contracts";

const REWARD_NAME_MAP: Record<string, string> = {
  'stat_str': 'Força Titânica',
  'stat_con': 'Vigor Inabalável',
  'stat_int': 'Mente Brilhante',
  'stat_dex': 'Agilidade Felina',
  'stat_cha': 'Presença Magnética',
  'stat_wis': 'Clarividência',
  'der_speed': 'Passos Leves',
  'der_crit_chance': 'Golpe Certeiro',
  'der_crit_dmg': 'Força Bruta',
  'der_splash': 'Impacto Sísmico',
  'der_def': 'Carapaça Dura',
  'der_dodge': 'Reflexos',
  'der_luck': 'Sorte Grande',
  'der_pierce': 'Lâmina Penetrante',
  'der_maxhp': 'Vitalidade Pura',
  'der_lifesteal': 'Sede de Sangue',
  'der_area': 'Impacto Expansivo',
  'der_recharge': 'Fluxo Acelerado',
  'der_tenacity': 'Determinação Férrea',
  'der_vigor': 'Seiva Curativa',
  'der_insight': 'Epifania Arcana'
};

export default class LevelUpRewardGui {
    private container!: HTMLElement;
    private cardsContainer!: HTMLElement;
    private isVisible: boolean = false;
    private claimCallback!: (rewardId: string, coords: any, amount?: number) => void;
    private togglePauseCallback!: () => void;
    private currentCoords: any = null;
    private flipTimers: any[] = [];

    //? Sigilo Rúnico Arcano para o verso da carta (Renderizado em SVG inline, zero GC)
    private static readonly CARD_BACK_SIGIL = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="60" height="60">
            <circle cx="32" cy="32" r="28" fill="none" stroke="#855cc7" stroke-width="2" stroke-dasharray="4 2"/>
            <polygon points="32,6 38,24 58,32 38,40 32,58 26,40 6,32 26,24" fill="none" stroke="#FFD700" stroke-width="1.8"/>
            <circle cx="32" cy="32" r="10" fill="#2b133d" stroke="#855cc7" stroke-width="1.5"/>
            <circle cx="32" cy="32" r="4" fill="#FFD700"/>
        </svg>
    `;

    constructor(private domain: IGameDomain, claimCallback: (rewardId: string, coords: any, amount?: number) => void, togglePauseCallback: () => void) {
        this.claimCallback = claimCallback;
        this.togglePauseCallback = togglePauseCallback;
        this.injectUI();
        logger.log('init', 'LevelUpRewardGui instantiated.');
    }

    private injectUI(): void {
        const style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);

        const div = document.createElement('div');
        div.innerHTML = html;
        this.container = div.firstElementChild as HTMLElement;
        document.body.appendChild(this.container);

        this.cardsContainer = this.container.querySelector('#levelup-cards-container') as HTMLElement;
    }

    public get isOpen(): boolean {
        return this.isVisible;
    }

    public show(coords: any, choices: any[] = []): void {
        if (this.isVisible) return;
        this.currentCoords = coords;
        this.isVisible = true;
        this.container.style.display = 'flex';
        this.generateRandomRewards(choices);
        this.togglePauseCallback();
    }

    public hide(): void {
        if (!this.isVisible) return;
        this.clearTimers();
        this.isVisible = false;
        this.container.style.display = 'none';
        this.togglePauseCallback();
    }

    private clearTimers(): void {
        this.flipTimers.forEach(t => clearTimeout(t));
        this.flipTimers.length = 0;
    }

    private generateRandomRewards(choices: any[]): void {
        this.clearTimers();
        this.cardsContainer.innerHTML = '';
        
        let selectedRewards = choices;
        if (!selectedRewards || selectedRewards.length === 0) {
            selectedRewards = this.domain.generateLocalRewards();
        }

        const cardWrappers: HTMLElement[] = [];

        selectedRewards.forEach((reward, index) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'reward-card-wrapper';
            
            const rarityColor = this.getRarityColor(reward.rarity || 'comum');
            const icon = this.getIconForId(reward.id) || reward.iconSvg;
            const desc = reward.description || reward.desc;
            const title = reward.name || REWARD_NAME_MAP[reward.id] || reward.id;
            const rarityLabel = String(reward.rarity || 'comum').toUpperCase();
            const valueText = reward.value ? `+${reward.value}` : '';

            wrapper.innerHTML = `
                <div class="reward-card-inner">
                    <!-- Costas da Carta -->
                    <div class="reward-card-face reward-card-back">
                        <div class="card-back-frame">
                            <div class="card-back-sigil">
                                ${LevelUpRewardGui.CARD_BACK_SIGIL}
                            </div>
                            <span class="card-back-rune-text">ARCANUM</span>
                        </div>
                    </div>
                    <!-- Frente da Carta -->
                    <div class="reward-card-face reward-card-front" style="border-color: ${rarityColor}; box-shadow: inset 0 0 24px rgba(0,0,0,0.8), 0 0 12px ${rarityColor}40;">
                        <div class="card-ornate-border">
                            <div class="reward-rarity-badge" style="background: ${rarityColor};">${rarityLabel}</div>
                            <div class="reward-name" style="color: ${rarityColor};">${title}</div>
                            <div class="reward-art-frame">
                                <div class="reward-icon">${icon}</div>
                            </div>
                            <div class="reward-desc-box">
                                <div class="reward-desc">${desc}</div>
                                ${valueText ? `<div class="reward-value-pill">${valueText}</div>` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            wrapper.addEventListener('click', () => {
                this.claimCallback(reward.id, this.currentCoords, reward.value);
                this.hide();
            });

            this.cardsContainer.appendChild(wrapper);
            cardWrappers.push(wrapper);
        });

        //? Animação escalonada (staggered) de flipagem das cartas no próximo frame de renderização
        requestAnimationFrame(() => {
            cardWrappers.forEach((wrapper, index) => {
                const timer = setTimeout(() => {
                    wrapper.classList.add('flipped');
                    //? Adiciona classe 'ready' após término da rotação para permitir hover suave
                    const readyTimer = setTimeout(() => {
                        wrapper.classList.add('ready');
                    }, 550);
                    this.flipTimers.push(readyTimer);
                }, 100 + index * 140);
                this.flipTimers.push(timer);
            });
        });
    }

    private getIconForId(id: string): string {
        return getRewardSvg(id);
    }

    private getRarityColor(rarity: string): string {
        switch(rarity) {
            case 'incomum': return '#1eff00';
            case 'raro': return '#0070dd';
            case 'epico': return '#a335ee';
            case 'lendario': return '#ff8000';
            case 'comum':
            default: return '#a0a0a0';
        }
    }

    public destroy(): void {
        this.clearTimers();
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}