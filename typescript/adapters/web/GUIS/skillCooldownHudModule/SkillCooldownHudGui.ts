import html from './skillCooldownHud.html?raw';
import css from './skillCooldownHud.css?raw';
import type { EntityRenderableState, IGameDomain } from '../../../../domain/ports/domain-contracts';
import { createSlotSvgElement } from '../../shared/SlotSvgAssets';
import { ElementalEffectIcons, SkillIcons } from '../../shared/VisualConfigMap';

// Assets visuais temáticos
const FIRE_ICON = new URL('../../assets/icons/fire-icon.png', import.meta.url).href;
const BULLET_ICON = new URL('../../assets/entities/vfx/simple-bullet.png', import.meta.url).href;
const SWORD_ICON = new URL('../../assets/entities/vfx/sword-atack-spritesheet.png', import.meta.url).href;
const EXPLOSION_ICON = new URL('../../assets/entities/vfx/explosion.png', import.meta.url).href;
const PET_FISH_ICON = new URL('../../assets/entities/pet-fish.png', import.meta.url).href;
const HOOK_ICON = new URL('../../assets/entities/vfx/fishing-hook.png', import.meta.url).href;
const LEVIATA_ICON = new URL('../../assets/entities/spawn-leviata.png', import.meta.url).href;
const HEAL_ICON = new URL('../../assets/itens/life-potion.png', import.meta.url).href;
const BOOTS_ICON = new URL('../../assets/itens/botas-de-ferro.png', import.meta.url).href;
const SHIELD_ICON = new URL('../../assets/itens/peitoral-de-ferro.png', import.meta.url).href;
const RING_ICON = new URL('../../assets/itens/simple-ring.png', import.meta.url).href;
const ADRANALINE_ICON = new URL('../../assets/itens/adranaline-flask.png', import.meta.url).href;

const SKILL_ICON_MAP: Record<string, string> = {
    // Mago
    'm_t1_fireball': SkillIcons['m_t1_fireball'].icon40Url,
    'm_t2_burn': SkillIcons['m_t2_burn'].icon40Url,
    'm_t3_knowledge': SkillIcons['m_t3_knowledge'].icon40Url,
    'm_t4_teleport': SkillIcons['m_t4_teleport'].icon40Url,
    'm_t5_blackhole': SkillIcons['m_t5_blackhole'].icon40Url,

    // Guerreiro
    'w_t1_strike': SkillIcons['w_t1_strike'].icon40Url,
    'w_t1_heavy_blow': SkillIcons['w_t1_heavy_blow'].icon40Url,
    'w_t1_iron_skin': SkillIcons['w_t1_iron_skin'].icon40Url,
    'w_t2_cleave': SkillIcons['w_t2_cleave'].icon40Url,
    'w_t2_shield_bash': SkillIcons['w_t2_shield_bash'].icon40Url,
    'w_t3_berserk': SkillIcons['w_t3_berserk'].icon40Url,
    'w_t3_war_cry': SkillIcons['w_t3_war_cry'].icon40Url,
    'w_t4_ground_slam': SkillIcons['w_t4_ground_slam'].icon40Url,
    'w_t3_colossus_vigor': SkillIcons['w_t3_colossus_vigor'].icon40Url,
    'w_t5_blade_dance': SkillIcons['w_t5_blade_dance'].icon40Url,
    'w_t4_armor_breaker': SkillIcons['w_t4_armor_breaker'].icon40Url,
    'w_t5_avatar_of_war': SkillIcons['w_t5_avatar_of_war'].icon40Url,

    // Gunslinger
    'gs_t1_quickdraw': SkillIcons['gs_t1_quickdraw'].icon40Url,
    'gs_t2_fanhammer': SkillIcons['gs_t2_fanhammer'].icon40Url,
    'gs_t3_deadeye': SkillIcons['gs_t3_deadeye'].icon40Url,

    // Necromante
    'n_t1_reap': SkillIcons['n_t1_reap'].icon40Url,
    'n_t1_death_aura': SkillIcons['n_t1_death_aura'].icon40Url,
    'n_t1_soul_leech': SkillIcons['n_t1_soul_leech'].icon40Url,
    'n_t2_lifesteal': SkillIcons['n_t2_lifesteal'].icon40Url,
    'n_t2_bone_spear': SkillIcons['n_t2_bone_spear'].icon40Url,
    'n_t3_soul': SkillIcons['n_t3_soul'].icon40Url,
    'n_t3_grasp_of_dead': SkillIcons['n_t3_grasp_of_dead'].icon40Url,
    'n_t4_corpse_explosion': SkillIcons['n_t4_corpse_explosion'].icon40Url,
    'n_t3_spectral_veil': SkillIcons['n_t3_spectral_veil'].icon40Url,
    'n_t5_wail_of_banshee': SkillIcons['n_t5_wail_of_banshee'].icon40Url,
    'n_t4_death_warden': SkillIcons['n_t4_death_warden'].icon40Url,
    'n_t5_dance_of_dead': SkillIcons['n_t5_dance_of_dead'].icon40Url,

    // Pescador
    'pesc_t1_fisgada': SkillIcons['pesc_t1_fisgada'].icon40Url,
    'pesc_t2_net': SkillIcons['pesc_t2_net'].icon40Url,
    'pesc_t3_leviata': SkillIcons['pesc_t3_leviata'].icon40Url,
    'pesc_t4_fishpet': SkillIcons['pesc_t4_fishpet'].icon40Url,

    // Broches Ativos
    'brooch_active_heal': SkillIcons['brooch_active_heal'].icon40Url,
    'brooch_heal': SkillIcons['brooch_active_heal'].icon40Url,
    'brooch_active_meteor': SkillIcons['brooch_active_meteor'].icon40Url,
    'brooch_meteor': SkillIcons['brooch_active_meteor'].icon40Url,
    'brooch_active_luck': SkillIcons['brooch_active_luck'].icon40Url,
    'brooch_luck': SkillIcons['brooch_active_luck'].icon40Url,
    'brooch_active_dash': SkillIcons['brooch_active_dash'].icon40Url,
    'brooch_dash': SkillIcons['brooch_active_dash'].icon40Url,
    'brooch_blink': SkillIcons['brooch_active_dash'].icon40Url,
    'brooch_active_shield': SkillIcons['brooch_active_shield'].icon40Url,
    'brooch_shield': SkillIcons['brooch_active_shield'].icon40Url,
    'brooch_active_berserk': SkillIcons['brooch_active_berserk'].icon40Url,
    'brooch_berserk': SkillIcons['brooch_active_berserk'].icon40Url,
    'brooch_chain': BULLET_ICON,

    // 21 Efeitos Elementais & Axiomáticos Oficiais
    'abys': ElementalEffectIcons['abys'].icon32Url,
    'air': ElementalEffectIcons['air'].icon32Url,
    'crystal': ElementalEffectIcons['crystal'].icon32Url,
    'dark': ElementalEffectIcons['dark'].icon32Url,
    'decay': ElementalEffectIcons['decay'].icon32Url,
    'fire': ElementalEffectIcons['fire'].icon32Url,
    'ground': ElementalEffectIcons['ground'].icon32Url,
    'holy': ElementalEffectIcons['holy'].icon32Url,
    'ice': ElementalEffectIcons['ice'].icon32Url,
    'infernous': ElementalEffectIcons['infernous'].icon32Url,
    'life': ElementalEffectIcons['life'].icon32Url,
    'light': ElementalEffectIcons['light'].icon32Url,
    'magic': ElementalEffectIcons['magic'].icon32Url,
    'magma': ElementalEffectIcons['magma'].icon32Url,
    'nature': ElementalEffectIcons['nature'].icon32Url,
    'negation': ElementalEffectIcons['negation'].icon32Url,
    'ordem': ElementalEffectIcons['ordem'].icon32Url,
    'poison': ElementalEffectIcons['poison'].icon32Url,
    'potencia': ElementalEffectIcons['potencia'].icon32Url,
    'thunder': ElementalEffectIcons['thunder'].icon32Url,
    'water': ElementalEffectIcons['water'].icon32Url
};

interface ActiveSlotEntry {
    element: HTMLElement;
    overlay: HTMLElement;
    countdownText: HTMLElement;
    totalMs: number;
    readyAt: number;
    lastText: string;
    isFinishing: boolean;
}

/**
 * @class SkillCooldownHudGui
 * HUD reativo de alta performance (Zero-GC / Zero DOM-thrashing).
 * Só exibe quadradinhos para habilidades que estão EFETIVAMENTE em cooldown.
 * No canto esquerdo inferior com cronômetro em relógio radial (conic-gradient).
 */
export default class SkillCooldownHudGui {
    private container!: HTMLElement;
    private activeSlots: Map<string, ActiveSlotEntry> = new Map();

    constructor(
        private domain?: IGameDomain,
        private onTriggerAction?: (actionName: string, payload?: any) => void
    ) {
        this.injectUI();
    }

    private injectUI(): void {
        const existing = document.getElementById('skill-cooldown-hud-container');
        if (existing) existing.remove();

        const style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        this.container = tempDiv.firstElementChild as HTMLElement;
        document.body.appendChild(this.container);
    }

    public destroy(): void {
        this.activeSlots.clear();
        if (this.container && this.container.parentElement) {
            this.container.remove();
        }
    }

    /**
     * Dispara manualmente um cooldown para testes (ex: Storybook)
     */
    public triggerCooldown(skillId: string, durationMs: number, customName?: string, keybind?: string, type?: 'class' | 'primordial' | 'brooch'): void {
        const now = Date.now();
        const existing = this.activeSlots.get(skillId);
        if (existing) {
            existing.totalMs = durationMs;
            existing.readyAt = now + durationMs;
            existing.isFinishing = false;
            existing.element.classList.remove('finishing');
            return;
        }

        const slot = this.createSquareNode(skillId, customName || skillId, keybind || '?', type || 'class', durationMs);
        slot.readyAt = now + durationMs;
        this.activeSlots.set(skillId, slot);
        this.container.appendChild(slot.element);
    }

    /**
     * Atualiza o HUD a cada frame do game loop com ZERO reconstrução de DOM desnecessária.
     */
    public update(data: EntityRenderableState): void {
        const rawCds = data.skillCooldowns;
        const now = Date.now();

        // 1. Sincroniza novos cooldowns vindos do DTO
        if (rawCds) {
            for (const skillId in rawCds) {
                const cd = rawCds[skillId];
                if (cd && cd.remainingMs > 0) {
                    const existing = this.activeSlots.get(skillId);
                    const targetReady = now + cd.remainingMs;

                    if (existing) {
                        // Corrige apenas em caso de desync considerável (> 350ms)
                        if (Math.abs(existing.readyAt - targetReady) > 350) {
                            existing.readyAt = targetReady;
                            existing.totalMs = cd.totalMs;
                        }
                    } else {
                        // Cria o quadradinho uma única vez
                        const meta = this.resolveSkillMetadata(skillId, data);
                        const slot = this.createSquareNode(skillId, meta.name, meta.keybind, meta.type, cd.totalMs);
                        slot.readyAt = targetReady;
                        this.activeSlots.set(skillId, slot);
                        this.container.appendChild(slot.element);
                    }
                }
            }
        }

        // Fast-path: Se nada está em cooldown, retorna imediatamente (0 operações de DOM!)
        if (this.activeSlots.size === 0) {
            return;
        }

        // 2. Atualiza o relógio radial e o contador numérico dos slots existentes
        for (const [skillId, slot] of this.activeSlots.entries()) {
            if (slot.isFinishing) continue;

            const remaining = slot.readyAt - now;

            if (remaining <= 0) {
                // Cooldown finalizado: aciona animação de flash e remove do DOM
                slot.isFinishing = true;
                slot.overlay.style.setProperty('--cd-angle', '0deg');
                slot.countdownText.textContent = '';
                slot.element.classList.add('finishing');

                setTimeout(() => {
                    if (slot.element.parentElement === this.container) {
                        this.container.removeChild(slot.element);
                    }
                    this.activeSlots.delete(skillId);
                }, 320);
            } else {
                // Atualiza ângulo do relógio (360 -> 0)
                const angle = Math.min(360, Math.max(0, (remaining / slot.totalMs) * 360));
                slot.overlay.style.setProperty('--cd-angle', `${angle.toFixed(1)}deg`);

                // Atualiza texto em segundos apenas se o valor mudou
                const formatted = remaining >= 10000 
                    ? `${Math.ceil(remaining / 1000)}s` 
                    : `${(remaining / 1000).toFixed(1)}s`;

                if (slot.lastText !== formatted) {
                    slot.countdownText.textContent = formatted;
                    slot.lastText = formatted;
                }
            }
        }
    }

    /**
     * Resolve nome, categoria e tecla de atalho de forma rápida
     */
    private resolveSkillMetadata(skillId: string, data: EntityRenderableState): { name: string; keybind: string; type: 'class' | 'primordial' | 'brooch' } {
        // 1. Verifica se está no activeLoadout da classe (1 a 4)
        if (data.activeLoadout) {
            const idx = data.activeLoadout.indexOf(skillId);
            if (idx !== -1) {
                const name = this.findSkillName(skillId, data);
                return { name, keybind: (idx + 1).toString(), type: 'class' };
            }
        }

        // 2. Verifica se é habilidade primordial / essencial (Tecla F)
        if (data.skillTree) {
            const ess = data.skillTree.find((s: any) => s.id === skillId && s.type === 'essential');
            if (ess) {
                return { name: ess.name, keybind: 'F', type: 'primordial' };
            }
        }

        // 3. Verifica se é broche ativo global (Teclas 5 a 8)
        const globalLoadout = (data as any).globalActiveLoadout;
        if (globalLoadout) {
            const idx = globalLoadout.indexOf(skillId);
            if (idx !== -1) {
                const name = this.findBroochName(skillId);
                return { name, keybind: (idx + 5).toString(), type: 'brooch' };
            }
        }

        // Fallback
        const fallbackName = this.findSkillName(skillId, data);
        const isBrooch = skillId.startsWith('brooch');
        return {
            name: fallbackName,
            keybind: isBrooch ? 'B' : '1',
            type: isBrooch ? 'brooch' : 'class'
        };
    }

    private findSkillName(skillId: string, data: EntityRenderableState): string {
        if (data.skillTree) {
            const s = data.skillTree.find((sk: any) => sk.id === skillId);
            if (s) return s.name;
        }
        if (data.unlockedActiveSkills) {
            const s = data.unlockedActiveSkills.find((sk: any) => sk.id === skillId);
            if (s) return s.name;
        }
        return skillId;
    }

    private findBroochName(broochId: string): string {
        if (this.domain && this.domain.globalMetaSummary && this.domain.globalMetaSummary.brooches) {
            const b = this.domain.globalMetaSummary.brooches.find((br: any) => (typeof br === 'string' ? br : br.id) === broochId);
            if (b) return typeof b === 'string' ? b : b.name;
        }
        return broochId;
    }

    /**
     * Constrói o elemento DOM do quadradinho de forma isolada e performática
     */
    private createSquareNode(
        skillId: string,
        name: string,
        keybind: string,
        type: 'class' | 'primordial' | 'brooch',
        totalMs: number
    ): ActiveSlotEntry {
        const square = document.createElement('div');
        const typeClass = type === 'primordial' ? 'primordial-skill' : type === 'brooch' ? 'brooch-skill' : 'class-skill';
        square.className = `cd-square ${typeClass}`;
        square.title = `${name.toUpperCase()} (Recarga)`;

        // Badge com tecla
        const badge = document.createElement('span');
        badge.className = 'cd-key-badge';
        badge.textContent = keybind;
        square.appendChild(badge);

        // Ícone ou SVG
        const iconUrl = SKILL_ICON_MAP[skillId];
        if (iconUrl) {
            const img = document.createElement('img');
            img.className = 'cd-icon';
            img.src = iconUrl;
            img.alt = name;
            img.onerror = () => {
                img.remove();
                this.createMonogram(square, name);
            };
            square.appendChild(img);
        } else if (type === 'primordial') {
            const svg = createSlotSvgElement('star');
            svg.classList.add('cd-svg');
            square.appendChild(svg);
        } else if (type === 'brooch') {
            const svg = createSlotSvgElement('sun');
            svg.classList.add('cd-svg');
            square.appendChild(svg);
        } else {
            this.createMonogram(square, name);
        }

        // Overlay do Relógio Radial (conic-gradient)
        const overlay = document.createElement('div');
        overlay.className = 'cd-clock-overlay';
        overlay.style.setProperty('--cd-angle', '360deg');
        square.appendChild(overlay);

        // Cronômetro textual
        const countdown = document.createElement('span');
        countdown.className = 'cd-timer-text';
        countdown.textContent = '';
        square.appendChild(countdown);

        return {
            element: square,
            overlay,
            countdownText: countdown,
            totalMs,
            readyAt: Date.now() + totalMs,
            lastText: '',
            isFinishing: false
        };
    }

    private createMonogram(parent: HTMLElement, name: string): void {
        const span = document.createElement('span');
        span.className = 'cd-monogram';
        span.textContent = name.substring(0, 3).toUpperCase();
        parent.appendChild(span);
    }
}
