import { logger } from "../../shared/Logger";
import { ElementalEffectIcons } from "../../shared/VisualConfigMap";

import html from './playerStatus.html?raw';
import css from './playerStatus.css?raw';

/** @class PlayerStatusGui Controla a interface das barras de HP e Mana do jogador, aplicando alterações de tamanho via porcentagem calculada a partir dos dados do Domínio. */
export default class PlayerStatusGui {
    private hpBarFill!: HTMLElement;
    private hpBarTrail!: HTMLElement;
    private hpText!: HTMLElement;
    private manaBarFill!: HTMLElement;
    private manaBarTrail!: HTMLElement;
    private manaText!: HTMLElement;
    private statusContainer!: HTMLElement;

    private lastHpPercentage: number = -1;
    private lastManaPercentage: number = -1;
    private lastHpText: string = "";
    private lastManaText: string = "";
    private lastPoisoned: boolean | null = null;
    private lastBurning: boolean | null = null;
    private statusNodesCache = new Map<string, {
        div: HTMLElement;
        ring: HTMLElement | null;
        textEl: HTMLElement | null;
        lastPercent: number;
        lastTooltip: string;
    }>();

    private static readonly BUFF_METADATA: Record<string, { total: number, title: string, details: string, color: string, svg: string, iconUrl?: string }> = {
        'abyssal_demon_active': {
            total: 15,
            title: 'FORMA DEMONÍACA',
            details: '+100 HP Máx | +30% Escala Visual | Fogo Abissal',
            color: '#ff2222',
            iconUrl: ElementalEffectIcons['infernous'].icon32Url,
            svg: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>'
        },
        'blade_infusion_air': {
            total: 5,
            title: 'INFUSÃO DE AR',
            details: 'Lâminas de Vento Curvas | +Velocidade de Golpe | Dano Cortante Eólico',
            color: '#00FFFF',
            iconUrl: ElementalEffectIcons['air'].icon32Url,
            svg: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12.5 2C13.88 2 15 3.12 15 4.5c0 .96-.54 1.79-1.33 2.21l-.17.09V9h2.5c1.38 0 2.5 1.12 2.5 2.5s-1.12 2.5-2.5 2.5H13v3.5c0 1.38-1.12 2.5-2.5 2.5S8 18.88 8 17.5c0-.96.54-1.79 1.33-2.21l.17-.09V13H7c-1.38 0-2.5-1.12-2.5-2.5S5.62 8 7 8h4.5V4.5C11.5 3.12 11.95 2 12.5 2z"/></svg>'
        },
        'blade_infusion_light': {
            total: 5,
            title: 'INFUSÃO DE LUZ',
            details: '+50% Área de Ataque | Dano Sagrado | Flash Radiante Expansivo',
            color: '#FFD700',
            iconUrl: ElementalEffectIcons['light'].icon32Url,
            svg: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2L9.09 9.09 2 12l7.09 2.91L12 22l2.91-7.09L22 12l-7.09-2.91L12 2z"/></svg>'
        }
    };

    private static readonly STATUS_ELEMENTAL_MAP: Record<string, { iconUrl: string, color: string, name: string }> = {
        'burn': { iconUrl: ElementalEffectIcons['fire'].icon32Url, color: '#dc2626', name: 'Queimadura (Fogo)' },
        'fire': { iconUrl: ElementalEffectIcons['fire'].icon32Url, color: '#dc2626', name: 'Fogo' },
        'poison': { iconUrl: ElementalEffectIcons['poison'].icon32Url, color: '#10b981', name: 'Envenenamento' },
        'wet': { iconUrl: ElementalEffectIcons['water'].icon32Url, color: '#0284c7', name: 'Encharcado (Água)' },
        'water': { iconUrl: ElementalEffectIcons['water'].icon32Url, color: '#0284c7', name: 'Água' },
        'freeze': { iconUrl: ElementalEffectIcons['ice'].icon32Url, color: '#38bdf8', name: 'Congelamento (Gelo)' },
        'ice': { iconUrl: ElementalEffectIcons['ice'].icon32Url, color: '#38bdf8', name: 'Gelo' },
        'paralyze': { iconUrl: ElementalEffectIcons['thunder'].icon32Url, color: '#eab308', name: 'Paralisia (Raio)' },
        'thunder': { iconUrl: ElementalEffectIcons['thunder'].icon32Url, color: '#eab308', name: 'Trovão' },
        'stun': { iconUrl: ElementalEffectIcons['potencia'].icon32Url, color: '#c084fc', name: 'Atordoamento (Potência)' },
        'potencia': { iconUrl: ElementalEffectIcons['potencia'].icon32Url, color: '#c084fc', name: 'Potência' },
        'decay': { iconUrl: ElementalEffectIcons['decay'].icon32Url, color: '#84cc16', name: 'Decomposição Mórbida' },
        'blind': { iconUrl: ElementalEffectIcons['dark'].icon32Url, color: '#7e22ce', name: 'Cegueira Obscura' },
        'dark': { iconUrl: ElementalEffectIcons['dark'].icon32Url, color: '#7e22ce', name: 'Trevas' },
        'fear': { iconUrl: ElementalEffectIcons['abys'].icon32Url, color: '#581c87', name: 'Pavor Abissal' },
        'abys': { iconUrl: ElementalEffectIcons['abys'].icon32Url, color: '#581c87', name: 'Abismo' },
        'slow': { iconUrl: ElementalEffectIcons['ground'].icon32Url, color: '#d97706', name: 'Lentidão Telúrica' },
        'ground': { iconUrl: ElementalEffectIcons['ground'].icon32Url, color: '#d97706', name: 'Terra' },
        'vulnerable': { iconUrl: ElementalEffectIcons['negation'].icon32Url, color: '#ef4444', name: 'Vulnerabilidade Arcana' },
        'negation': { iconUrl: ElementalEffectIcons['negation'].icon32Url, color: '#ef4444', name: 'Negação' },
        'air': { iconUrl: ElementalEffectIcons['air'].icon32Url, color: '#00ffff', name: 'Ar' },
        'crystal': { iconUrl: ElementalEffectIcons['crystal'].icon32Url, color: '#ec4899', name: 'Cristal' },
        'holy': { iconUrl: ElementalEffectIcons['holy'].icon32Url, color: '#ffd700', name: 'Sagrado' },
        'infernous': { iconUrl: ElementalEffectIcons['infernous'].icon32Url, color: '#dc2626', name: 'Infernal' },
        'life': { iconUrl: ElementalEffectIcons['life'].icon32Url, color: '#22c55e', name: 'Vida' },
        'light': { iconUrl: ElementalEffectIcons['light'].icon32Url, color: '#fef08a', name: 'Luz' },
        'magic': { iconUrl: ElementalEffectIcons['magic'].icon32Url, color: '#a855f7', name: 'Magia' },
        'magma': { iconUrl: ElementalEffectIcons['magma'].icon32Url, color: '#ea580c', name: 'Magma' },
        'nature': { iconUrl: ElementalEffectIcons['nature'].icon32Url, color: '#4ade80', name: 'Natureza' },
        'ordem': { iconUrl: ElementalEffectIcons['ordem'].icon32Url, color: '#f59e0b', name: 'Ordem' }
    };

    constructor() {
        this.injectUI();
        this.setupElements();
        logger.log('init', 'PlayerStatusGui instantiated and UI injected.');
    }

    private injectUI(): void {
        const style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);

        const container = document.createElement('div');
        container.innerHTML = html;
        document.body.appendChild(container.firstChild!);
    }

    private setupElements(): void {
        this.hpBarFill = document.getElementById('hp-bar-fill') as HTMLElement;
        this.hpBarTrail = document.getElementById('hp-bar-trail') as HTMLElement;
        this.hpText = document.getElementById('hp-text') as HTMLElement;
        this.manaBarFill = document.getElementById('mana-bar-fill') as HTMLElement;
        this.manaBarTrail = document.getElementById('mana-bar-trail') as HTMLElement;
        this.manaText = document.getElementById('mana-text') as HTMLElement;
        this.statusContainer = document.getElementById('status-effects-container') as HTMLElement;
    }

    public update(data: { hp?: number | undefined, maxHp?: number | undefined, mana?: number | undefined, maxMana?: number | undefined, activeStatuses?: { id: string, description: string, remaining: number }[] | undefined }): void {
        if (data.hp === undefined || data.maxHp === undefined || data.mana === undefined || data.maxMana === undefined) return;

        const hpPercentage = data.maxHp > 0 ? Math.max(0, Math.min(100, (data.hp / data.maxHp) * 100)) : 0;
        const manaPercentage = data.maxMana > 0 ? Math.max(0, Math.min(100, (data.mana / data.maxMana) * 100)) : 0;

        // Reação Visual da Barra de HP aos Status Elementais (Dirty Checking Estrito)
        if (data.activeStatuses) {
            let isPoisoned = false;
            let isBurning = false;
            for (let i = 0; i < data.activeStatuses.length; i++) {
                const sid = data.activeStatuses[i]?.id;
                if (sid === 'poison') isPoisoned = true;
                else if (sid === 'burn') isBurning = true;
            }
            
            if (isPoisoned !== this.lastPoisoned || isBurning !== this.lastBurning) {
                this.lastPoisoned = isPoisoned;
                this.lastBurning = isBurning;
                if (isPoisoned) {
                    this.hpBarFill.className = 'status-bar-fill hp-fill poisoned';
                } else if (isBurning) {
                    this.hpBarFill.className = 'status-bar-fill hp-fill burning';
                } else {
                    this.hpBarFill.className = 'status-bar-fill hp-fill';
                }
            }
        }

        if (hpPercentage !== this.lastHpPercentage) {
            if (this.lastHpPercentage !== -1) {
                const isDamage = hpPercentage < this.lastHpPercentage;
                const diff = Math.abs(hpPercentage - this.lastHpPercentage);
                
                // Otimização de CPU: Só aplica as transições caras se for um chunk de dano (> 1%).
                // Se for dano/cura contínua (ex: Veneno) a cada frame, desliga a transição.
                if (diff > 1.0) {
                    if (isDamage) {
                        this.hpBarFill.style.transition = 'width 0.1s ease-out';
                        this.hpBarTrail.style.transition = 'width 0.4s ease-out 0.15s';
                    } else {
                        this.hpBarFill.style.transition = 'width 0.3s ease-out';
                        this.hpBarTrail.style.transition = 'none';
                    }
                } else {
                    this.hpBarFill.style.transition = 'none';
                    this.hpBarTrail.style.transition = 'none';
                }
            }
            this.hpBarFill.style.width = `${hpPercentage}%`;
            this.hpBarTrail.style.width = `${hpPercentage}%`;
            this.lastHpPercentage = hpPercentage;
        }
        if (manaPercentage !== this.lastManaPercentage) {
            if (this.lastManaPercentage !== -1) {
                const isDamage = manaPercentage < this.lastManaPercentage;
                const diff = Math.abs(manaPercentage - this.lastManaPercentage);
                if (diff > 1.0) {
                    this.manaBarFill.style.transition = isDamage ? 'width 0.1s ease-out' : 'width 0.3s ease-out';
                    this.manaBarTrail.style.transition = isDamage ? 'width 0.4s ease-out 0.15s' : 'none';
                } else {
                    this.manaBarFill.style.transition = 'none';
                    this.manaBarTrail.style.transition = 'none';
                }
            }
            this.manaBarFill.style.width = `${manaPercentage}%`;
            this.manaBarTrail.style.width = `${manaPercentage}%`;
            this.lastManaPercentage = manaPercentage;
        }

        const hpStr = `${Math.ceil(data.hp)}/${data.maxHp}`;
        if (hpStr !== this.lastHpText) { this.hpText.textContent = hpStr; this.lastHpText = hpStr; }

        const manaStr = `${Math.ceil(data.mana)}/${data.maxMana}`;
        if (manaStr !== this.lastManaText) { this.manaText.textContent = manaStr; this.lastManaText = manaStr; }

        if (this.statusContainer && data.activeStatuses) {
            // Otimização Zero-GC: Evita criar novos Sets e Arrays a cada frame
            const children = this.statusContainer.children;
            for (let i = children.length - 1; i >= 0; i--) {
                const child = children[i] as HTMLElement;
                if (!child) continue;
                const statusId = child.id.slice(7); // remove 'status-'
                let exists = false;
                for (let j = 0; j < data.activeStatuses.length; j++) {
                    if (data.activeStatuses[j]?.id === statusId) { exists = true; break; }
                }
                if (!exists) {
                    child.remove();
                    this.statusNodesCache.delete(statusId);
                }
            }

            for (let sIdx = 0; sIdx < data.activeStatuses.length; sIdx++) {
                const status = data.activeStatuses[sIdx]!;
                let cached = this.statusNodesCache.get(status.id);
                const buffInfo = PlayerStatusGui.BUFF_METADATA[status.id];
                
                if (!cached || !cached.div.isConnected) {
                    const div = document.createElement('div');
                    div.id = `status-${status.id}`;
                    div.className = buffInfo ? 'status-icon buff-circular-container' : 'status-icon';
                    
                    let ring: HTMLElement | null = null;
                    let textEl: HTMLElement | null = null;

                    if (buffInfo) {
                        div.innerHTML = `
                            <div class="buff-circular-ring">
                                <div class="buff-inner-icon" style="color: ${buffInfo.color}">
                                    ${buffInfo.iconUrl ? `<img src="${buffInfo.iconUrl}" width="20" height="20" style="object-fit: contain; pointer-events: none; border-radius: 50%;" />` : buffInfo.svg}
                                </div>
                            </div>
                            <span class="buff-countdown-text"></span>
                        `;
                        ring = div.querySelector('.buff-circular-ring') as HTMLElement;
                        textEl = div.querySelector('.buff-countdown-text') as HTMLElement;
                    } else {
                        const statusMeta = PlayerStatusGui.STATUS_ELEMENTAL_MAP[status.id];
                        div.style.width = '24px';
                        div.style.height = '24px';
                        div.style.borderRadius = '4px';
                        div.style.cursor = 'help';
                        
                        if (statusMeta) {
                            div.style.border = `1px solid ${statusMeta.color}`;
                            div.style.boxShadow = `0 0 5px ${statusMeta.color}80`;
                            div.style.backgroundImage = `url(${statusMeta.iconUrl})`;
                            div.style.backgroundSize = 'contain';
                            div.style.backgroundPosition = 'center';
                            div.style.backgroundRepeat = 'no-repeat';
                            div.style.backgroundColor = 'rgba(10, 10, 15, 0.85)';
                        } else {
                            div.style.border = '1px solid rgba(255,255,255,0.4)';
                            div.style.boxShadow = '0 0 5px rgba(0,0,0,0.5)';
                            div.style.backgroundColor = 'gray';
                        }
                    }
                    
                    this.statusContainer.appendChild(div);
                    cached = { div, ring, textEl, lastPercent: -1, lastTooltip: '' };
                    this.statusNodesCache.set(status.id, cached);
                }
                
                const remainingCeil = Math.ceil(status.remaining);
                if (buffInfo) {
                    const totalDuration = buffInfo.total;
                    const percent = Math.round(Math.max(0, Math.min(100, (status.remaining / totalDuration) * 100)) * 10) / 10;
                    if (cached.ring && cached.lastPercent !== percent) {
                        cached.lastPercent = percent;
                        cached.ring.style.background = `conic-gradient(${buffInfo.color} ${percent}%, rgba(255, 255, 255, 0.15) 0deg)`;
                    }
                    if (cached.textEl) {
                        const secStr = `${remainingCeil}s`;
                        if (cached.textEl.textContent !== secStr) cached.textEl.textContent = secStr;
                    }
                    const tooltipText = `✨ ${buffInfo.title} (${remainingCeil}s)\n${status.description || buffInfo.details}\n${buffInfo.details}`;
                    if (cached.lastTooltip !== tooltipText) {
                        cached.lastTooltip = tooltipText;
                        cached.div.setAttribute('data-tooltip', tooltipText);
                    }
                } else {
                    const statusMeta = PlayerStatusGui.STATUS_ELEMENTAL_MAP[status.id];
                    const tooltipText = `${status.id.toUpperCase()} - ${remainingCeil}s\n${status.description || (statusMeta ? statusMeta.name : '')}`.trim();
                    if (cached.lastTooltip !== tooltipText) {
                        cached.lastTooltip = tooltipText;
                        cached.div.setAttribute('data-tooltip', tooltipText);
                    }
                }
            }
        }
    }
}