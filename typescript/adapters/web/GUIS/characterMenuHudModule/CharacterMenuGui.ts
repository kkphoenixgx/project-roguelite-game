import { logger } from "../../shared/Logger";
import html from './characterMenu.html?raw';
import css from './characterMenu.css?raw';

import bagHtml from './partials/bag/bag.html?raw';
import bagCss from './partials/bag/bag.css?raw';
import statsHtml from './partials/stats/stats.html?raw';
import statsCss from './partials/stats/stats.css?raw';
import skillsHtml from './partials/skills/skills.html?raw';
import skillsCss from './partials/skills/skills.css?raw';

import type { EntityRenderableState, IGameDomain } from "../../../../domain/ports/domain-contracts";
import { GlobalBroochPool } from "../../../../domain/facadeComponents/MetaProgressionMap";
import { VisualConfigMap, ElementalEffectIcons, SkillIcons, getItemVisualByIconId, type ItemVisualConfig } from "../../shared/VisualConfigMap";
import { createSlotSvgElement } from "../../shared/SlotSvgAssets";

const BROOCH_FALLBACK_ICONS: Record<string, string> = {
    'brooch_active_heal': (SkillIcons as any)['brooch_active_heal']?.icon80Url || (SkillIcons as any)['brooch_active_heal']?.icon40Url,
    'brooch_heal': (SkillIcons as any)['brooch_active_heal']?.icon80Url || (SkillIcons as any)['brooch_active_heal']?.icon40Url,
    'brooch_active_meteor': (SkillIcons as any)['brooch_active_meteor']?.icon80Url || (SkillIcons as any)['brooch_active_meteor']?.icon40Url,
    'brooch_meteor': (SkillIcons as any)['brooch_active_meteor']?.icon80Url || (SkillIcons as any)['brooch_active_meteor']?.icon40Url,
    'brooch_active_luck': (SkillIcons as any)['brooch_active_luck']?.icon80Url || (SkillIcons as any)['brooch_active_luck']?.icon40Url,
    'brooch_luck': (SkillIcons as any)['brooch_active_luck']?.icon80Url || (SkillIcons as any)['brooch_active_luck']?.icon40Url,
    'brooch_active_dash': (SkillIcons as any)['brooch_active_dash']?.icon80Url || (SkillIcons as any)['brooch_active_dash']?.icon40Url,
    'brooch_dash': (SkillIcons as any)['brooch_active_dash']?.icon80Url || (SkillIcons as any)['brooch_active_dash']?.icon40Url,
    'brooch_blink': (SkillIcons as any)['brooch_active_dash']?.icon80Url || (SkillIcons as any)['brooch_active_dash']?.icon40Url,
    'brooch_active_shield': (SkillIcons as any)['brooch_active_shield']?.icon80Url || (SkillIcons as any)['brooch_active_shield']?.icon40Url,
    'brooch_shield': (SkillIcons as any)['brooch_active_shield']?.icon80Url || (SkillIcons as any)['brooch_active_shield']?.icon40Url,
    'brooch_active_berserk': (SkillIcons as any)['brooch_active_berserk']?.icon80Url || (SkillIcons as any)['brooch_active_berserk']?.icon40Url,
    'brooch_berserk': (SkillIcons as any)['brooch_active_berserk']?.icon80Url || (SkillIcons as any)['brooch_active_berserk']?.icon40Url,
    'brooch_phoenix': (SkillIcons as any)['brooch_phoenix']?.icon80Url || (SkillIcons as any)['brooch_phoenix']?.icon40Url,
    'brooch_titan': (SkillIcons as any)['brooch_titan']?.icon80Url || (SkillIcons as any)['brooch_titan']?.icon40Url,
    'brooch_shadow': (SkillIcons as any)['brooch_shadow']?.icon80Url || (SkillIcons as any)['brooch_shadow']?.icon40Url,
    'brooch_pyro_core': (SkillIcons as any)['brooch_pyro_core']?.icon80Url || (SkillIcons as any)['brooch_pyro_core']?.icon40Url,
    'brooch_luck_charm': (SkillIcons as any)['brooch_luck_charm']?.icon80Url || (SkillIcons as any)['brooch_luck_charm']?.icon40Url,
    'brooch_vampiric': (SkillIcons as any)['brooch_vampiric']?.icon80Url || (SkillIcons as any)['brooch_vampiric']?.icon40Url,
    'brooch_reroll_master': (SkillIcons as any)['brooch_reroll_master']?.icon80Url || (SkillIcons as any)['brooch_reroll_master']?.icon40Url,
};

function getSkillOrEffectIconUrl(id: string | null | undefined): string | null {
    if (!id) return null;
    if (BROOCH_FALLBACK_ICONS[id]) return BROOCH_FALLBACK_ICONS[id];
    if ((SkillIcons as any)[id]?.icon80Url) return (SkillIcons as any)[id].icon80Url;
    if ((SkillIcons as any)[id]?.icon40Url) return (SkillIcons as any)[id].icon40Url;
    if ((ElementalEffectIcons as any)[id]?.icon32Url) return (ElementalEffectIcons as any)[id].icon32Url;
    return null;
}

const BEST_ATTRIBUTE_RULE_TOOLTIP = `
<div style="font-weight:bold;color:#FFD700;font-size:14px;margin-bottom:6px;display:flex;align-items:center;gap:6px;">
    <span>REGRA DO MELHOR ATRIBUTO</span>
</div>
<div style="color:#ddd;font-size:12px;margin-bottom:8px;line-height:1.4;">
    O sistema identifica automaticamente qual dos seus 6 atributos base possui o <b>maior valor numérico atual</b> (Força, Destreza, Inteligência, Constituição, Sabedoria ou Carisma).
</div>
<div style="background:rgba(255,215,0,0.08);border-left:3px solid #FFD700;padding:6px 8px;border-radius:4px;margin-bottom:8px;font-size:11px;color:#eee;line-height:1.4;">
    <b style="color:#FFD700;">Empates:</b> Se dois ou mais atributos empatarem no valor mais alto, qualquer um deles qualifica o teto máximo com benefício idêntico.
</div>
<div style="border-top:1px dashed rgba(255,255,255,0.2);padding-top:6px;font-size:12px;color:#a0e0ff;line-height:1.4;">
    <span style="color:#FFD700;font-weight:bold;">Status Beneficiados Diretamente:</span><br>
    • <b>Dano Crítico:</b> +1% por ponto do Melhor Atributo (150% + Atributo)<br>
    • <b>Chance Crítica:</b> +0.1% por ponto (Melhor Atributo ÷ 10)<br>
    • <b>Dano em Área (Splash):</b> +0.2% por ponto (Melhor Atributo × 0.2)<br>
    <br>
    <span style="color:#a0e0ff;font-size:11px;font-style:italic;">O atributo que estiver em destaque dourado na lista é o seu Melhor Atributo ativo no momento.</span>
</div>
`;

const PRIMARY_TOOLTIPS: Record<string, string> = {
    strength: `<div style="font-weight:bold;color:#FFD700;font-size:14px;margin-bottom:4px;">FORÇA (STR)</div><div style="color:#ddd;font-size:12px;margin-bottom:8px;line-height:1.4;">Poder muscular bruto e capacidade de impacto físico.</div><div style="border-top:1px dashed rgba(255,255,255,0.2);padding-top:6px;font-size:12px;color:#a0e0ff;line-height:1.4;"><span style="color:#FFD700;font-weight:bold;">Influência nos Status:</span><br>• Dano de ataques com armas físicas<br>• Se for o seu <b style="color:#FFD700;">Melhor Atributo</b> (maior entre todos os 6), amplia:<br>&nbsp;&nbsp;- Dano Crítico (+1% por ponto)<br>&nbsp;&nbsp;- Chance Crítica (+0.1% por ponto)<br>&nbsp;&nbsp;- Dano em Área (+0.2% por ponto)</div>`,
    dexterity: `<div style="font-weight:bold;color:#FFD700;font-size:14px;margin-bottom:4px;">DESTREZA (DEX)</div><div style="color:#ddd;font-size:12px;margin-bottom:8px;line-height:1.4;">Agilidade, precisão motora, reflexos rápidos e tempo de reação.</div><div style="border-top:1px dashed rgba(255,255,255,0.2);padding-top:6px;font-size:12px;color:#a0e0ff;line-height:1.4;"><span style="color:#FFD700;font-weight:bold;">Influência nos Status:</span><br>• <b>Velocidade:</b> +0.1 por ponto (+1 a cada 10 DEX)<br>• <b>Defesa:</b> +0.1 por ponto (+1 a cada 10 DEX)<br>• <b>Esquiva:</b> +0.2% por ponto<br>• <b>Precisão:</b> +0.5% por ponto<br>• <b>Recarga (CDR):</b> +0.25% por ponto<br>• <b>Perfuração:</b> +1 alvo a cada 10 DEX<br>• Se for o seu <b style="color:#FFD700;">Melhor Atributo</b>, amplia Dano Crítico, Chance Crítica e Dano em Área!</div>`,
    intelligence: `<div style="font-weight:bold;color:#FFD700;font-size:14px;margin-bottom:4px;">INTELIGÊNCIA (INT)</div><div style="color:#ddd;font-size:12px;margin-bottom:8px;line-height:1.4;">Poder mental puro e capacidade de processamento mágico.</div><div style="border-top:1px dashed rgba(255,255,255,0.2);padding-top:6px;font-size:12px;color:#a0e0ff;line-height:1.4;"><span style="color:#FFD700;font-weight:bold;">Influência nos Status:</span><br>• <b>Mana Máxima:</b> +1 por ponto (+10 a cada 10 INT)<br>• Dano de ataques mágicos e feitiços<br>• Se for o seu <b style="color:#FFD700;">Melhor Atributo</b>, amplia Dano Crítico, Chance Crítica e Dano em Área!</div>`,
    constitution: `<div style="font-weight:bold;color:#FFD700;font-size:14px;margin-bottom:4px;">CONSTITUIÇÃO (CON)</div><div style="color:#ddd;font-size:12px;margin-bottom:8px;line-height:1.4;">Resistência física, imunidade e volume de vitalidade.</div><div style="border-top:1px dashed rgba(255,255,255,0.2);padding-top:6px;font-size:12px;color:#a0e0ff;line-height:1.4;"><span style="color:#FFD700;font-weight:bold;">Influência nos Status:</span><br>• <b>Vida Máxima:</b> +1 por ponto (+10 a cada 10 CON)<br>• <b>Tenacidade (Resistência a Controle):</b> +0.2% por ponto<br>• Se for o seu <b style="color:#FFD700;">Melhor Atributo</b>, amplia Dano Crítico, Chance Crítica e Dano em Área!</div>`,
    wisdom: `<div style="font-weight:bold;color:#FFD700;font-size:14px;margin-bottom:4px;">SABEDORIA (WIS)</div><div style="color:#ddd;font-size:12px;margin-bottom:8px;line-height:1.4;">Conexão espiritual, intuição e controle de energias vitais.</div><div style="border-top:1px dashed rgba(255,255,255,0.2);padding-top:6px;font-size:12px;color:#a0e0ff;line-height:1.4;"><span style="color:#FFD700;font-weight:bold;">Influência nos Status:</span><br>• <b>Regeneração de Mana:</b> +0.05/s por ponto (+0.5 a cada 10 WIS)<br>• <b>Regeneração de Vida:</b> +0.025/s por ponto (+0.25 a cada 10 WIS)<br>• <b>Vigor (Ampliação de Cura):</b> +0.5% por ponto<br>• <b>Percepção XP:</b> +0.3% de XP ganho por ponto<br>• Se for o seu <b style="color:#FFD700;">Melhor Atributo</b>, amplia Dano Crítico, Chance Crítica e Dano em Área!</div>`,
    charisma: `<div style="font-weight:bold;color:#FFD700;font-size:14px;margin-bottom:4px;">CARISMA (CHA)</div><div style="color:#ddd;font-size:12px;margin-bottom:8px;line-height:1.4;">Presença de espírito, sorte cósmica e manipulação de probabilidades.</div><div style="border-top:1px dashed rgba(255,255,255,0.2);padding-top:6px;font-size:12px;color:#a0e0ff;line-height:1.4;"><span style="color:#FFD700;font-weight:bold;">Influência nos Status:</span><br>• <b>Sorte (RNG Geral):</b> +1 por ponto (+10 a cada 10 CHA)<br>• <b>Preços em Mercadores:</b> Melhores descontos<br>• Se for o seu <b style="color:#FFD700;">Melhor Atributo</b>, amplia Dano Crítico, Chance Crítica e Dano em Área!</div>`
};

const DERIVED_TOOLTIPS: Record<string, string> = {
    'derived-critchance': `<div style="font-weight:bold;color:#00e5ff;font-size:14px;margin-bottom:4px;">CHANCE CRÍTICA</div><div style="color:#ddd;font-size:12px;margin-bottom:8px;line-height:1.4;">Chance de desferir um golpe crítico devastador.</div><div style="border-top:1px dashed rgba(255,255,255,0.2);padding-top:6px;font-size:12px;color:#a0e0ff;line-height:1.4;"><span style="color:#FFD700;font-weight:bold;">Como é calculado:</span><br><code style="color:#00ffcc;">3% (Base) + (Melhor Atributo ÷ 10)% + Sorte% + Bônus</code><br>• O <b style="color:#FFD700;">Melhor Atributo</b> é o de maior valor entre STR, DEX, CON, INT, WIS e CHA.<br>• Escala com seu atributo dominante (+0.1% a cada ponto) e sua pontuação de Sorte.</div>`,
    'derived-critdamage': `<div style="font-weight:bold;color:#00e5ff;font-size:14px;margin-bottom:4px;">DANO CRÍTICO</div><div style="color:#ddd;font-size:12px;margin-bottom:8px;line-height:1.4;">Multiplicador de dano aplicado nos acertos críticos.</div><div style="border-top:1px dashed rgba(255,255,255,0.2);padding-top:6px;font-size:12px;color:#a0e0ff;line-height:1.4;"><span style="color:#FFD700;font-weight:bold;">Como é calculado:</span><br><code style="color:#00ffcc;">150% (Base 1.5x) + (Melhor Atributo × 1)% + Bônus</code><br>• O <b style="color:#FFD700;">Melhor Atributo</b> é o de maior valor entre STR, DEX, CON, INT, WIS e CHA.<br>• Cada ponto do seu maior atributo adiciona +1% direto ao dano crítico.</div>`,
    'derived-dodge': `<div style="font-weight:bold;color:#00e5ff;font-size:14px;margin-bottom:4px;">ESQUIVA</div><div style="color:#ddd;font-size:12px;margin-bottom:8px;line-height:1.4;">Chance percentual de desviar e anular totalmente um golpe inimigo.</div><div style="border-top:1px dashed rgba(255,255,255,0.2);padding-top:6px;font-size:12px;color:#a0e0ff;line-height:1.4;"><span style="color:#FFD700;font-weight:bold;">Como é calculado:</span><br><code style="color:#00ffcc;">(DEX × 0.2)% + Bônus</code><br>• Cada ponto de Destreza concede +0.2% de chance de esquiva (+1% a cada 5 DEX).</div>`,
    'derived-accuracy': `<div style="font-weight:bold;color:#00e5ff;font-size:14px;margin-bottom:4px;">PRECISÃO</div><div style="color:#ddd;font-size:12px;margin-bottom:8px;line-height:1.4;">Chance de acertar alvos ou redirecionar ataques desviados para inimigos próximos.</div><div style="border-top:1px dashed rgba(255,255,255,0.2);padding-top:6px;font-size:12px;color:#a0e0ff;line-height:1.4;"><span style="color:#FFD700;font-weight:bold;">Como é calculado:</span><br><code style="color:#00ffcc;">(DEX × 0.5)% + Bônus</code><br>• Cada 2 pontos de Destreza concedem +1% de precisão.</div>`,
    'derived-recharge': `<div style="font-weight:bold;color:#00e5ff;font-size:14px;margin-bottom:4px;">RECARGA (CDR)</div><div style="color:#ddd;font-size:12px;margin-bottom:8px;line-height:1.4;">Redução no tempo de recarga (cooldown) de todas as habilidades.</div><div style="border-top:1px dashed rgba(255,255,255,0.2);padding-top:6px;font-size:12px;color:#a0e0ff;line-height:1.4;"><span style="color:#FFD700;font-weight:bold;">Como é calculado:</span><br><code style="color:#00ffcc;">(DEX × 0.25)% + Bônus</code><br>• Cada 4 pontos de Destreza reduzem em 1% o tempo de recarga.</div>`,
    'derived-piercing': `<div style="font-weight:bold;color:#00e5ff;font-size:14px;margin-bottom:4px;">PERFURAÇÃO</div><div style="color:#ddd;font-size:12px;margin-bottom:8px;line-height:1.4;">Número de inimigos que seus disparos e projéteis atravessam.</div><div style="border-top:1px dashed rgba(255,255,255,0.2);padding-top:6px;font-size:12px;color:#a0e0ff;line-height:1.4;"><span style="color:#FFD700;font-weight:bold;">Como é calculado:</span><br><code style="color:#00ffcc;">⌊DEX ÷ 10⌋ + Bônus</code><br>• +1 perfuração garantida a cada 10 pontos de Destreza.</div>`,
    'derived-splash': `<div style="font-weight:bold;color:#00e5ff;font-size:14px;margin-bottom:4px;">DANO EM ÁREA (SPLASH)</div><div style="color:#ddd;font-size:12px;margin-bottom:8px;line-height:1.4;">Porcentagem de dano espalhado para inimigos ao redor do alvo primário.</div><div style="border-top:1px dashed rgba(255,255,255,0.2);padding-top:6px;font-size:12px;color:#a0e0ff;line-height:1.4;"><span style="color:#FFD700;font-weight:bold;">Como é calculado:</span><br><code style="color:#00ffcc;">(Melhor Atributo × 0.2)% + Bônus</code><br>• O <b style="color:#FFD700;">Melhor Atributo</b> é o maior entre os 6 atributos primários.<br>• Cada 5 pontos do seu melhor atributo adicionam +1% de dano em área.</div>`,
    'derived-tenacity': `<div style="font-weight:bold;color:#00e5ff;font-size:14px;margin-bottom:4px;">TENACIDADE</div><div style="color:#ddd;font-size:12px;margin-bottom:8px;line-height:1.4;">Redução na duração de efeitos de controle de grupo (stuns, lentidão).</div><div style="border-top:1px dashed rgba(255,255,255,0.2);padding-top:6px;font-size:12px;color:#a0e0ff;line-height:1.4;"><span style="color:#FFD700;font-weight:bold;">Como é calculado:</span><br><code style="color:#00ffcc;">max(CON, WIS, INT) × 0.5% + Bônus</code><br>• Baseado no maior atributo entre Constituição, Sabedoria e Inteligência.</div>`,
    'derived-vigor': `<div style="font-weight:bold;color:#00e5ff;font-size:14px;margin-bottom:4px;">VIGOR (CURA RECEBIDA)</div><div style="color:#ddd;font-size:12px;margin-bottom:8px;line-height:1.4;">Amplificação percentual de todas as fontes de cura recebidas.</div><div style="border-top:1px dashed rgba(255,255,255,0.2);padding-top:6px;font-size:12px;color:#a0e0ff;line-height:1.4;"><span style="color:#FFD700;font-weight:bold;">Como é calculado:</span><br><code style="color:#00ffcc;">CON × 0.5% + Bônus</code><br>• Cada 2 pontos de Constituição conferem +1% de eficácia em curas.</div>`,
    'derived-lucky': `<div style="font-weight:bold;color:#00e5ff;font-size:14px;margin-bottom:4px;">SORTE</div><div style="color:#ddd;font-size:12px;margin-bottom:8px;line-height:1.4;">Aumenta a probabilidade de eventos fortuitos, itens raros e crítico.</div><div style="border-top:1px dashed rgba(255,255,255,0.2);padding-top:6px;font-size:12px;color:#a0e0ff;line-height:1.4;"><span style="color:#FFD700;font-weight:bold;">Como é calculado:</span><br><code style="color:#00ffcc;">⌊((CHA + WIS) ÷ 2) ÷ 10⌋ + Bônus</code><br>• Baseado na média de Carisma e Sabedoria dividida por 10.</div>`,
    'derived-insight': `<div style="font-weight:bold;color:#00e5ff;font-size:14px;margin-bottom:4px;">PERCEPÇÃO (XP EXTRA)</div><div style="color:#ddd;font-size:12px;margin-bottom:8px;line-height:1.4;">Aumento percentual de pontos de experiência adquiridos.</div><div style="border-top:1px dashed rgba(255,255,255,0.2);padding-top:6px;font-size:12px;color:#a0e0ff;line-height:1.4;"><span style="color:#FFD700;font-weight:bold;">Como é calculado:</span><br><code style="color:#00ffcc;">(WIS ÷ 10)% + Bônus</code><br>• Cada 10 pontos de Sabedoria garantem +1% de experiência adicional.</div>`
};

/** @class CharacterMenuGui Controla a interface principal do personagem com abas (Inv, Status, Skill). */
export default class CharacterMenuGui {
    private container!: HTMLElement;
    private isVisible: boolean = false;
    private globalTooltip!: HTMLElement;

    private strEl!: HTMLElement; private dexEl!: HTMLElement;
    private intEl!: HTMLElement; private conEl!: HTMLElement;
    private wisEl!: HTMLElement; private chaEl!: HTMLElement;
    private derivedEls: Record<string, HTMLElement> = {};

    private tabs: { [key: string]: { btn: HTMLElement, content: HTMLElement } } = {};

    private togglePauseCallback: () => void;
    private bpSlots!: NodeListOf<HTMLElement>;
    private eqMain!: HTMLElement;
    private eqOff!: HTMLElement;
    private eqHead!: HTMLElement;
    private eqChest!: HTMLElement;
    private eqPants!: HTMLElement;
    private eqBoots!: HTMLElement;
    private eqGloves!: HTMLElement;
    private eqAmulet!: HTMLElement;
    private eqBag!: HTMLElement;
    private eqBelt!: HTMLElement;
    private pointsEl!: HTMLElement;
    private addBtns!: NodeListOf<HTMLButtonElement>;
    private currentSkillFilter: 'active' | 'passive' = 'active';
    private cachedData: EntityRenderableState | null = null;
    private lastSkillTabHash: string = '';
    private coinsDisplayEl: HTMLElement | null = null;
    private backpackGridEl: HTMLElement | null = null;
    private beltIconHolderEl: HTMLElement | null = null;
    private beltPopoverEl: HTMLElement | null = null;
    private leftRingSlots!: NodeListOf<HTMLElement>;
    private rightRingSlots!: NodeListOf<HTMLElement>;
    private attrRows: Record<string, HTMLElement | null> = {};
    private lastCoins: number = -1;
    private lastAttrsSignature: string = '';
    private lastDerivedSignature: string = '';

    constructor(
        private domain: IGameDomain,
        togglePauseCallback: () => void, 
        private equipItemCallback: (index: number) => void,
        private unequipItemCallback: (slot: string, index?: number) => void,
        private allocateAttributeCallback: (attribute: string) => void,
        private deleteItemCallback: (index: number) => void,
        private skillActionCallback?: (action: 'unlock' | 'changeClass' | 'equip', payload: any) => void,
        private toolActionCallback?: (action: 'equipTool' | 'unequipTool' | 'selectTool', payload: any) => void
    ) {
        this.togglePauseCallback = togglePauseCallback;
        this.injectUI();
        this.setupElements();
        this.setupTabs();
        this.setupTooltip();
        this.hide();
        logger.log('init', 'CharacterMenuGui instantiated and UI injected.');
    }

    private injectUI(): void {
        const style = document.createElement('style'); 
        style.textContent = css + '\n' + bagCss + '\n' + statsCss + '\n' + skillsCss; 
        document.head.appendChild(style);
        
        const div = document.createElement('div'); 
        div.innerHTML = html
            .replace('<!-- INJECT_BAG_TAB -->', bagHtml)
            .replace('<!-- INJECT_STATS_TAB -->', statsHtml)
            .replace('<!-- INJECT_SKILLS_TAB -->', skillsHtml);
            
        this.container = div.firstElementChild as HTMLElement;
        document.body.appendChild(this.container);
    }

    private setupElements(): void {
        this.strEl = document.getElementById('attr-str') as HTMLElement; this.dexEl = document.getElementById('attr-dex') as HTMLElement;
        this.intEl = document.getElementById('attr-int') as HTMLElement; this.conEl = document.getElementById('attr-con') as HTMLElement;
        this.wisEl = document.getElementById('attr-wis') as HTMLElement; this.chaEl = document.getElementById('attr-cha') as HTMLElement;
        this.pointsEl = document.getElementById('attr-points') as HTMLElement;
        this.coinsDisplayEl = document.getElementById('player-coins-text');
        this.backpackGridEl = this.container.querySelector('.backpack-grid') as HTMLElement;

        this.attrRows = {
            strength: document.getElementById('row-str'),
            dexterity: document.getElementById('row-dex'),
            intelligence: document.getElementById('row-int'),
            constitution: document.getElementById('row-con'),
            wisdom: document.getElementById('row-wis'),
            charisma: document.getElementById('row-cha')
        };

        this.addBtns = this.container.querySelectorAll('.attr-add-btn') as NodeListOf<HTMLButtonElement>;

        this.eqMain = this.container.querySelector('#eq-main') as HTMLElement;
        this.eqOff = this.container.querySelector('#eq-off') as HTMLElement;
        this.eqHead = this.container.querySelector('#eq-head') as HTMLElement;
        this.eqChest = this.container.querySelector('#eq-chest') as HTMLElement;
        this.eqPants = this.container.querySelector('#eq-pants') as HTMLElement;
        this.eqBoots = this.container.querySelector('#eq-boots') as HTMLElement;
        this.eqGloves = this.container.querySelector('#eq-gloves') as HTMLElement;
        this.eqAmulet = this.container.querySelector('#eq-amulet') as HTMLElement;
        this.eqBag = this.container.querySelector('#eq-bag') as HTMLElement;
        this.eqBelt = this.container.querySelector('#eq-belt') as HTMLElement;
        this.beltIconHolderEl = this.eqBelt?.querySelector('.belt-icon-holder') as HTMLElement;
        this.beltPopoverEl = this.container.querySelector('.belt-tools-popover') as HTMLElement;
        this.leftRingSlots = this.container.querySelectorAll('.ring-sub-slot[data-slot="leftHandRings"]') as NodeListOf<HTMLElement>;
        this.rightRingSlots = this.container.querySelectorAll('.ring-sub-slot[data-slot="rightHandRings"]') as NodeListOf<HTMLElement>;

        this.eqMain.addEventListener('click', () => this.unequipItemCallback('mainHand'));
        this.eqOff.addEventListener('click', () => this.unequipItemCallback('secondHand'));
        this.eqHead.addEventListener('click', () => this.unequipItemCallback('helmet'));
        this.eqChest.addEventListener('click', () => this.unequipItemCallback('chestplate'));
        this.eqPants.addEventListener('click', () => this.unequipItemCallback('pants'));
        this.eqBoots.addEventListener('click', () => this.unequipItemCallback('boots'));
        this.eqGloves.addEventListener('click', () => this.unequipItemCallback('gloves'));
        this.eqAmulet.addEventListener('click', () => this.unequipItemCallback('amulet'));
        this.eqBag.addEventListener('click', () => this.unequipItemCallback('bag'));
        this.eqBelt?.addEventListener('click', (e) => {
            if ((e.target as HTMLElement).closest('.tool-sub-slot')) return;
            this.unequipItemCallback('belt');
        });

        const beltPopover = this.container.querySelector('.belt-tools-popover');
        beltPopover?.addEventListener('click', (e: Event) => {
            const mouseEvent = e as MouseEvent;
            const slot = (mouseEvent.target as HTMLElement).closest('.tool-sub-slot') as HTMLElement;
            if (!slot) return;
            mouseEvent.stopPropagation();
            const idx = parseInt(slot.getAttribute('data-index') || '0');
            if (mouseEvent.ctrlKey) {
                // Ctrl + Click: Desequipar ferramenta do cinto e mandar para o inventário
                if (this.toolActionCallback) {
                    this.toolActionCallback('unequipTool', { beltSlotIndex: idx });
                } else {
                    this.unequipItemCallback('beltTool', idx);
                }
            } else {
                // Clique simples: Selecionar como ferramenta ativa
                if (this.toolActionCallback) {
                    this.toolActionCallback('selectTool', { beltSlotIndex: idx });
                }
            }
        });

        this.container.querySelectorAll('.ring-sub-slot').forEach(slot => {
            slot.addEventListener('click', () => {
                const type = slot.getAttribute('data-slot');
                const idx = parseInt(slot.getAttribute('data-index') || '0');
                if (type) this.unequipItemCallback(type, idx);
            });
        });

        this.addBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const attr = btn.getAttribute('data-attr');
                if (attr) this.allocateAttributeCallback(attr);
            });
        });

        this.tabs = {
            'inv': { btn: document.getElementById('tab-btn-inv')!, content: document.getElementById('tab-content-inv')! },
            'status': { btn: document.getElementById('tab-btn-status')!, content: document.getElementById('tab-content-status')! },
            'skill': { btn: document.getElementById('tab-btn-skill')!, content: document.getElementById('tab-content-skill')! }
        };

        const derivedKeys = [
            'maxHp', 'maxMana', 'hpRegen', 'manaRegen', 'defence', 'speed',
            'critChance', 'critDamage', 'dodge', 'accuracy', 'recharge',
            'piercing', 'splashDamage', 'tenacity', 'vigor', 'lucky', 'insight'
        ];
        for (const key of derivedKeys) {
            const el = document.getElementById(`val-${key}`);
            if (el) this.derivedEls[key] = el;
        }

        // Configurar tooltips detalhados para os atributos base
        for (const [attr, tooltipHtml] of Object.entries(PRIMARY_TOOLTIPS)) {
            const row = this.container.querySelector(`.attr-add-btn[data-attr="${attr}"]`)?.closest('.attr-row');
            if (row) row.setAttribute('data-tooltip', tooltipHtml);
        }

        // Configurar tooltip explicativo da Regra do Melhor Atributo
        const bestAttrChip = this.container.querySelector('#best-attr-rule-chip');
        if (bestAttrChip) {
            bestAttrChip.setAttribute('data-tooltip', BEST_ATTRIBUTE_RULE_TOOLTIP);
        }

        // Configurar tooltips detalhados para os status derivados
        for (const [id, tooltipHtml] of Object.entries(DERIVED_TOOLTIPS)) {
            const el = document.getElementById(id);
            if (el) el.setAttribute('data-tooltip', tooltipHtml);
        }
    }

    private setupTabs(): void {
        for (const [key, tab] of Object.entries(this.tabs)) {
            tab.btn.addEventListener('click', () => this.switchTab(key));
        }
    }

    public switchTab(tabKey: string): void {
        for (const [key, tab] of Object.entries(this.tabs)) {
            if (key === tabKey) {
                tab.btn.classList.add('active');
                tab.content.style.display = 'flex';
            } else {
                tab.btn.classList.remove('active');
                tab.content.style.display = 'none';
            }
        }
    }

    private setupTooltip(): void {
        this.globalTooltip = document.createElement('div');
        this.globalTooltip.className = 'global-tooltip';
        document.body.appendChild(this.globalTooltip);

        this.container.addEventListener('mouseover', (e) => {
            const target = (e.target as HTMLElement).closest('[data-tooltip]') as HTMLElement;
            if (target) {
                const text = target.getAttribute('data-tooltip');
                if (text) {
                    if (text.includes('<')) {
                        this.globalTooltip.innerHTML = text;
                    } else {
                        this.globalTooltip.textContent = text;
                    }
                    this.globalTooltip.style.display = 'block';
                    
                    // Calcula a posição imediatamente para evitar pulos
                    let x = e.clientX + 15;
                    let y = e.clientY + 15;
                    const rect = this.globalTooltip.getBoundingClientRect();
                    if (x + rect.width > window.innerWidth) x = window.innerWidth - rect.width - 10;
                    if (y + rect.height > window.innerHeight) y = window.innerHeight - rect.height - 10;
                    this.globalTooltip.style.left = `${x}px`;
                    this.globalTooltip.style.top = `${y}px`;
                }
            }
        });

        this.container.addEventListener('mousemove', (e) => {
            if (this.globalTooltip.style.display === 'block') {
                let x = e.clientX + 15;
                let y = e.clientY + 15;

                // Previne que vaze da tela
                const rect = this.globalTooltip.getBoundingClientRect();
                if (x + rect.width > window.innerWidth) x = window.innerWidth - rect.width - 10;
                if (y + rect.height > window.innerHeight) y = window.innerHeight - rect.height - 10;

                this.globalTooltip.style.left = `${x}px`;
                this.globalTooltip.style.top = `${y}px`;
            }
        });

        this.container.addEventListener('mouseout', (e) => {
            const target = (e.target as HTMLElement).closest('[data-tooltip]') as HTMLElement;
            if (target) {
                this.globalTooltip.style.display = 'none';
            }
        });
    }

    public get isOpen(): boolean { return this.isVisible; }

    public toggle(): void {
        this.isVisible = !this.isVisible;
        this.container.style.display = this.isVisible ? 'flex' : 'none';
        if (!this.isVisible && this.globalTooltip) this.globalTooltip.style.display = 'none';
        this.togglePauseCallback();
    }

    public hide(): void { 
        if (this.isVisible) { 
            this.isVisible = false; 
            this.container.style.display = 'none'; 
            if (this.globalTooltip) this.globalTooltip.style.display = 'none'; // Garante que o tooltip soma ao fechar o menu!
            this.togglePauseCallback(); 
        } 
    }

    public update(data: EntityRenderableState): void {
        if (!this.isVisible || !data.attributes) return;
        
        if (this.coinsDisplayEl && data.coins !== undefined && data.coins !== this.lastCoins) {
            this.coinsDisplayEl.textContent = data.coins.toString();
            this.lastCoins = data.coins;
        }

        const buildTooltip = (item: any) => {
            if (!item) return '';
            let text = `${item.name.toUpperCase()}\n`;
            text += `Raridade: ${item.rarity}\n`;
            if (item.baseDamage) text += `Dano: ${item.baseDamage}\n`;
            if (item.capacityBonus) text += `Capacidade: +${item.capacityBonus} slots\n`;
            if (item.storedItems && item.storedItems.length > 0) {
                text += `Itens Guardados: ${item.storedItems.length} / ${item.capacityBonus || item.capacity || 12}\n`;
                text += `Conteúdo: ${item.storedItems.map((i: any) => i.name).join(', ')}\n`;
            } else if (item.category === 'storage') {
                text += `Itens Guardados: 0 / ${item.capacityBonus || item.capacity || 12}\n`;
            }
            if (item.toolType) text += `Tipo: Ferramenta (${item.toolType})\n`;
            if (item.currentWater !== undefined) text += `Água: ${item.currentWater}/${item.maxWater}\n`;
            if (item.tier) text += `Tier: ${item.tier}\n`;
            return text + `\n${item.description}`;
        };

        const attrs = data.attributes;
        const ptsStr = attrs.availablePoints.toString();
        if (this.pointsEl.textContent !== ptsStr) {
            this.pointsEl.textContent = ptsStr;
            const disableBtns = attrs.availablePoints <= 0;
            for (let i = 0; i < this.addBtns.length; i++) {
                this.addBtns[i]!.disabled = disableBtns;
            }
        }

        const attrsSig = `${attrs.strength}|${attrs.dexterity}|${attrs.intelligence}|${attrs.constitution}|${attrs.wisdom}|${attrs.charisma}`;
        if (attrsSig !== this.lastAttrsSignature) {
            this.lastAttrsSignature = attrsSig;

            this.strEl.textContent = attrs.strength.toString(); this.dexEl.textContent = attrs.dexterity.toString();
            this.intEl.textContent = attrs.intelligence.toString(); this.conEl.textContent = attrs.constitution.toString();
            this.wisEl.textContent = attrs.wisdom.toString(); this.chaEl.textContent = attrs.charisma.toString();

            // Identifica e destaca dinamicamente o(s) Melhor(es) Atributo(s)
            const attrValues: Record<string, number> = {
                strength: attrs.strength,
                dexterity: attrs.dexterity,
                intelligence: attrs.intelligence,
                constitution: attrs.constitution,
                wisdom: attrs.wisdom,
                charisma: attrs.charisma
            };
            const values = [attrs.strength, attrs.dexterity, attrs.intelligence, attrs.constitution, attrs.wisdom, attrs.charisma];
            const maxAttrVal = Math.max(...values);
            const allEqual = values.every(v => v === values[0]);
            const hasDominantAttr = !allEqual && maxAttrVal > 0;

            for (const [attrKey, row] of Object.entries(this.attrRows)) {
                if (!row) continue;
                const isBest = hasDominantAttr && attrValues[attrKey] === maxAttrVal;
                const existingTag = row.querySelector('.best-attr-tag');

                if (isBest) {
                    row.classList.add('is-best-attr');
                    if (!existingTag) {
                        const tag = document.createElement('span');
                        tag.className = 'best-attr-tag';
                        tag.textContent = 'Melhor';
                        row.querySelector('.attr-label')?.appendChild(tag);
                    }
                } else {
                    row.classList.remove('is-best-attr');
                    if (existingTag) {
                        existingTag.remove();
                    }
                }
            }
        }

        if (data.derivedAttributes) {
            const da = data.derivedAttributes;
            const derivedSig = `${Math.round(da.hp)}|${Math.round(da.maxHp)}|${Math.round(da.mana)}|${Math.round(da.maxMana)}|${da.hpRegen.toFixed(1)}|${da.manaRegen.toFixed(1)}|${da.defence.toFixed(1)}|${Math.round(da.speed)}|${da.critChance.toFixed(1)}|${Math.round(da.critDamage)}|${da.dodge.toFixed(1)}|${da.accuracy.toFixed(1)}|${da.recharge.toFixed(1)}|${da.piercing}|${da.splashDamage.toFixed(1)}|${da.tenacity.toFixed(1)}|${da.vigor.toFixed(1)}|${da.lucky}|${da.insight.toFixed(1)}`;
            if (derivedSig !== this.lastDerivedSignature) {
                this.lastDerivedSignature = derivedSig;
                if (this.derivedEls.maxHp) this.derivedEls.maxHp.textContent = `${Math.round(da.hp)} / ${Math.round(da.maxHp)}`;
                if (this.derivedEls.maxMana) this.derivedEls.maxMana.textContent = `${Math.round(da.mana)} / ${Math.round(da.maxMana)}`;
                if (this.derivedEls.hpRegen) this.derivedEls.hpRegen.textContent = `+${da.hpRegen.toFixed(1)}/s`;
                if (this.derivedEls.manaRegen) this.derivedEls.manaRegen.textContent = `+${da.manaRegen.toFixed(1)}/s`;
                if (this.derivedEls.defence) this.derivedEls.defence.textContent = da.defence.toFixed(1);
                if (this.derivedEls.speed) this.derivedEls.speed.textContent = Math.round(da.speed).toString();
                if (this.derivedEls.critChance) this.derivedEls.critChance.textContent = `${da.critChance.toFixed(1)}%`;
                if (this.derivedEls.critDamage) this.derivedEls.critDamage.textContent = `${Math.round(da.critDamage)}%`;
                if (this.derivedEls.dodge) this.derivedEls.dodge.textContent = `${da.dodge.toFixed(1)}%`;
                if (this.derivedEls.accuracy) this.derivedEls.accuracy.textContent = `${da.accuracy.toFixed(1)}%`;
                if (this.derivedEls.recharge) this.derivedEls.recharge.textContent = `${da.recharge.toFixed(1)}%`;
                if (this.derivedEls.piercing) this.derivedEls.piercing.textContent = da.piercing.toString();
                if (this.derivedEls.splashDamage) this.derivedEls.splashDamage.textContent = `${da.splashDamage.toFixed(1)}%`;
                if (this.derivedEls.tenacity) this.derivedEls.tenacity.textContent = `${da.tenacity.toFixed(1)}%`;
                if (this.derivedEls.vigor) this.derivedEls.vigor.textContent = `${da.vigor.toFixed(1)}%`;
                if (this.derivedEls.lucky) this.derivedEls.lucky.textContent = da.lucky.toString();
                if (this.derivedEls.insight) this.derivedEls.insight.textContent = `+${da.insight.toFixed(1)}%`;
            }
        }

        this.updateSkillTab(data);
        
        const backpackGrid = this.backpackGridEl;
        const targetSlots = data.maxBackpackSize || 24;

        // Recria os slots apenas se o tamanho da bolsa mudou (Desempenho)
        if (backpackGrid && backpackGrid.children.length !== targetSlots) {
            backpackGrid.innerHTML = '';
            for (let i = 0; i < targetSlots; i++) {
                const slot = document.createElement('div');
                slot.className = 'bp-slot';
                slot.addEventListener('click', (e) => {
                    if (e.ctrlKey) this.deleteItemCallback(i);
                    else this.equipItemCallback(i);
                });
                backpackGrid.appendChild(slot);
            }
            this.bpSlots = this.container.querySelectorAll('.bp-slot') as NodeListOf<HTMLElement>;
        }

        if (data.backpack && this.bpSlots) {
            for (let index = 0; index < this.bpSlots.length; index++) {
                const slot = this.bpSlots[index]!;
                const item = data.backpack[index];
                const currentKey = slot.getAttribute('data-slot-key');
                const newKey = item ? `${item.iconId}_${item.name}_${item.rarity || ''}_${item.description || ''}` : 'none';

                if (currentKey !== newKey) {
                    slot.setAttribute('data-slot-key', newKey);
                    if (item) {
                        const itemConfig = getItemVisualByIconId(item.iconId);
                        if (itemConfig) {
                            slot.innerHTML = `<img src="${itemConfig.uiIconUrl}" style="width: 100%; height: 100%; object-fit: contain; pointer-events: none;">`;
                        } else { 
                            slot.innerHTML = '<span style="color: #666; font-size: 20px; font-weight: bold; pointer-events: none;">?</span>'; 
                        }
                        
                        slot.setAttribute('data-tooltip', buildTooltip(item));
                        slot.style.borderColor = '#FFD700';
                    } else { 
                        slot.innerHTML = ''; 
                        slot.removeAttribute('data-tooltip'); 
                        slot.style.borderColor = '#444'; 
                    }
                }
            }
        }
        if (data.equipment) {
            // Helper inteligente para atualizar slots no DOM de forma limpa!
            const updateSlot = (element: HTMLElement, itemData: any) => {
                const currentKey = element.getAttribute('data-slot-key');
                const newKey = itemData ? `${itemData.iconId}_${itemData.name}_${itemData.rarity || ''}` : 'none';
                
                if (currentKey !== newKey) {
                    element.setAttribute('data-slot-key', newKey);
                    if (itemData) {
                        const itemConfig = getItemVisualByIconId(itemData.iconId);
                        if (itemConfig) {
                            element.innerHTML = `<img src="${itemConfig.uiIconUrl}" style="width: 100%; height: 100%; object-fit: contain; pointer-events: none;">`;
                        } else { 
                            element.innerHTML = '<span style="color: #666; font-size: 20px; font-weight: bold; pointer-events: none;">?</span>'; 
                        }
                        element.setAttribute('data-tooltip', buildTooltip(itemData));
                        element.style.borderColor = '#FFD700';
                    } else {
                        element.innerHTML = '';
                        element.removeAttribute('data-tooltip');
                        element.style.borderColor = 'rgba(255,255,255,0.15)';
                    }
                }
            };

            const updateRings = (ringSlots: NodeListOf<HTMLElement>, rings: any[]) => {
                for (let index = 0; index < ringSlots.length; index++) {
                    const slotElement = ringSlots[index]!;
                    const ring = rings[index];
                    const currentKey = slotElement.getAttribute('data-slot-key');
                    const newKey = ring ? `${ring.iconId}_${ring.name}_${ring.rarity || ''}` : 'none';

                    if (currentKey !== newKey) {
                        slotElement.setAttribute('data-slot-key', newKey);
                        if (ring) {
                            const itemConfig = getItemVisualByIconId(ring.iconId);
                            if (itemConfig) {
                                slotElement.innerHTML = `<img src="${itemConfig.uiIconUrl}" style="width: 100%; height: 100%; object-fit: contain; pointer-events: none;">`;
                            } else {
                                slotElement.innerHTML = '<span style="color: #666; font-size: 16px; font-weight: bold; pointer-events: none;">?</span>';
                            }
                            slotElement.setAttribute('data-tooltip', buildTooltip(ring));
                            slotElement.style.borderColor = '#FFD700';
                        } else {
                            slotElement.innerHTML = '';
                            slotElement.removeAttribute('data-tooltip');
                            slotElement.style.borderColor = 'rgba(255,255,255,0.2)';
                        }
                    }
                }
            };

            updateSlot(this.eqMain, data.equipment.mainHand);
            updateSlot(this.eqOff, data.equipment.secondHand);
            updateSlot(this.eqHead, data.equipment.helmet);
            updateSlot(this.eqChest, data.equipment.chestplate);
            updateSlot(this.eqPants, data.equipment.pants);
            updateSlot(this.eqBoots, data.equipment.boots);
            updateSlot(this.eqGloves, data.equipment.gloves);
            updateSlot(this.eqAmulet, data.equipment.amulet);
            updateSlot(this.eqBag, data.equipment.bag);
            
            // Atualiza o Cinto de Utilidades sem sobrescrever o popover de ferramentas
            const belt = (data.equipment as any)?.belt;
            const beltIconHolder = this.beltIconHolderEl;
            const currentBeltKey = this.eqBelt?.getAttribute('data-slot-key');
            const newBeltKey = belt ? `${belt.iconId}_${belt.name}` : 'none';

            if (this.eqBelt && currentBeltKey !== newBeltKey) {
                this.eqBelt.setAttribute('data-slot-key', newBeltKey);
                if (belt) {
                    const itemConfig = getItemVisualByIconId(belt.iconId);
                    if (beltIconHolder) {
                        if (itemConfig) {
                            beltIconHolder.innerHTML = `<img src="${itemConfig.uiIconUrl}" style="width: 100%; height: 100%; object-fit: contain; pointer-events: none;">`;
                        } else {
                            beltIconHolder.innerHTML = '<span style="color: #666; font-size: 20px; font-weight: bold; pointer-events: none;">?</span>';
                        }
                    }
                    this.eqBelt.setAttribute('data-tooltip', buildTooltip(belt));
                    this.eqBelt.style.borderColor = '#FFD700';
                } else {
                    if (beltIconHolder) beltIconHolder.innerHTML = '';
                    this.eqBelt.removeAttribute('data-tooltip');
                    this.eqBelt.style.borderColor = 'rgba(255,255,255,0.15)';
                }
            }
            
            updateRings(this.leftRingSlots, data.equipment.leftHandRings || []);
            updateRings(this.rightRingSlots, data.equipment.rightHandRings || []);

            // Atualiza ferramentas no Cinto de Utilidades dinamicamente conforme belt.capacity
            const beltPopover = this.beltPopoverEl;

            if (belt) {
                this.eqBelt?.classList.add('has-belt');
                const capacity = belt.capacity || belt.toolSlots?.length || 4;
                const toolSlots = belt.toolSlots || [];
                const activeIdx = belt.activeToolIndex ?? -1;

                if (beltPopover && beltPopover.children.length !== capacity) {
                    beltPopover.innerHTML = '';
                    for (let i = 0; i < capacity; i++) {
                        const slotEl = document.createElement('div');
                        slotEl.className = 'tool-sub-slot';
                        slotEl.setAttribute('data-slot', 'beltTool');
                        slotEl.setAttribute('data-index', i.toString());
                        slotEl.title = `Ferramenta ${i + 1}`;
                        beltPopover.appendChild(slotEl);
                    }
                }

                if (beltPopover) {
                    const children = beltPopover.children;
                    for (let idx = 0; idx < children.length; idx++) {
                        const slotEl = children[idx] as HTMLElement;
                        const tool = toolSlots[idx];
                        const currentKey = slotEl.getAttribute('data-slot-key');
                        const newKey = tool ? `${tool.iconId}_${tool.name}_${tool.tier || ''}_${tool.currentWater ?? ''}` : 'none';

                        if (currentKey !== newKey) {
                            slotEl.setAttribute('data-slot-key', newKey);
                            if (tool) {
                                const itemConfig = getItemVisualByIconId(tool.iconId);
                                if (itemConfig) {
                                    slotEl.innerHTML = `<img src="${itemConfig.uiIconUrl}" style="width: 100%; height: 100%; object-fit: contain; pointer-events: none;">`;
                                } else {
                                    const initial = tool.name ? tool.name.charAt(0).toUpperCase() : 'T';
                                    slotEl.innerHTML = `<span style="color: #FFD700; font-size: 14px; font-weight: bold; pointer-events: none;">${initial}</span>`;
                                }
                                slotEl.setAttribute('data-tooltip', buildTooltip(tool));
                                slotEl.style.borderColor = '#FFD700';
                            } else {
                                slotEl.innerHTML = '';
                                slotEl.removeAttribute('data-tooltip');
                                slotEl.style.borderColor = 'rgba(255,255,255,0.25)';
                            }
                        }

                        if (idx === activeIdx && tool) {
                            slotEl.classList.add('active-tool');
                        } else {
                            slotEl.classList.remove('active-tool');
                        }
                    }
                }
            } else {
                this.eqBelt?.classList.remove('has-belt');
                if (beltPopover && beltPopover.children.length > 0) beltPopover.innerHTML = '';
            }
        }
    }

    private updateSkillTab(data: EntityRenderableState): void {
        const activeLoadout = data.activeLoadout || [null, null, null, null];
        const globalActiveLoadout: (string | null)[] = (data as any).globalActiveLoadout || [null, null, null, null];
        const passiveLoadout: (string | null)[] = data.passiveLoadout || [null, null, null, null];
        const unlockedBrooches = this.domain.globalMetaSummary?.brooches || [];
        const metaStats = this.domain.globalMetaSummary?.stats || [];

        const skillTabHash = `${activeLoadout.join(',')}|${globalActiveLoadout.join(',')}|${passiveLoadout.join(',')}|${unlockedBrooches.length}|${metaStats.length}|${data.unlockedActiveSkills?.length || 0}|${data.skillTree?.length || 0}`;

        if (this.lastSkillTabHash === skillTabHash) {
            return;
        }
        this.lastSkillTabHash = skillTabHash;

        // 1. Ativas da Classe (1 a 4 - Quadrados)
        const classActiveContainer = this.container.querySelector('#class-active-slots');
        if (classActiveContainer) {
            classActiveContainer.innerHTML = '';
            for (let i = 0; i < 4; i++) {
                const skillId = activeLoadout[i];
                const slotDiv = document.createElement('div');
                slotDiv.className = `skill-slot-frame square-slot ${skillId ? 'filled' : 'empty'}`;

                const numBadge = document.createElement('span');
                numBadge.className = 'skill-slot-number';
                numBadge.textContent = (i + 1).toString();
                slotDiv.appendChild(numBadge);

                if (skillId) {
                    let skillInfo: any = null;
                    if (data.unlockedActiveSkills) {
                        skillInfo = data.unlockedActiveSkills.find((s: any) => s.id === skillId);
                    }
                    if (!skillInfo && data.skillTree) {
                        skillInfo = data.skillTree.find((s: any) => s.id === skillId);
                    }

                    const name = skillInfo ? skillInfo.name : skillId;
                    const desc = skillInfo ? skillInfo.description : 'Habilidade ativa de classe equipada.';
                    slotDiv.setAttribute('data-tooltip', `HABILIDADE ATIVA DE CLASSE [SLOT ${i + 1}]\n${name.toUpperCase()}\n\n${desc}`);

                    const iconUrl = getSkillOrEffectIconUrl(skillId);
                    if (iconUrl) {
                        const img = document.createElement('img');
                        img.src = iconUrl;
                        img.className = 'slot-content-icon';
                        img.style.width = '24px';
                        img.style.height = '24px';
                        img.style.objectFit = 'contain';
                        img.style.pointerEvents = 'none';
                        slotDiv.appendChild(img);
                    } else {
                        const text = document.createElement('span');
                        text.className = 'slot-content-text';
                        text.textContent = name.substring(0, 3).toUpperCase();
                        slotDiv.appendChild(text);
                    }
                } else {
                    slotDiv.setAttribute('data-tooltip', `SLOT ATIVO DE CLASSE ${i + 1}\n(Vazio - Nenhuma habilidade equipada)`);
                    const emptyIcon = document.createElement('span');
                    emptyIcon.className = 'slot-content-text';
                    emptyIcon.style.opacity = '0.3';
                    emptyIcon.textContent = '+';
                    slotDiv.appendChild(emptyIcon);
                }
                classActiveContainer.appendChild(slotDiv);
            }
        }

        // 2. Ativas Primordiais / Essenciais da Classe (Estrelas)
        const primordialContainer = this.container.querySelector('#primordial-slot-container');
        if (primordialContainer) {
            primordialContainer.innerHTML = '';
            // Procura todas habilidades primordiais/essenciais na árvore ou habilidades desbloqueadas
            let primordialSkills: any[] = [];
            if (data.skillTree) {
                primordialSkills = data.skillTree.filter((s: any) => s.type === 'essential');
            }
            if (primordialSkills.length === 0 && data.unlockedActiveSkills) {
                primordialSkills = data.unlockedActiveSkills.filter((s: any) => s.type === 'essential');
            }

            // Se não houver nenhuma, cria pelo menos 1 slot vazio indicativo
            if (primordialSkills.length === 0) {
                primordialSkills.push(null);
            }

            primordialSkills.forEach((primordialSkill, index) => {
                const slotDiv = document.createElement('div');
                slotDiv.className = `skill-slot skill-slot-frame primordial-slot ${primordialSkill ? 'filled' : 'empty'}`;

                // SVG Estrela padronizado via assets
                const svg = createSlotSvgElement('star');
                slotDiv.appendChild(svg);

                const starBadge = document.createElement('span');
                starBadge.className = 'skill-slot-number';
                starBadge.textContent = '★'; // Poderia ser index + 1, mas a estrela é o padrão
                slotDiv.appendChild(starBadge);

                if (primordialSkill) {
                    slotDiv.setAttribute('data-tooltip', `HABILIDADE PRIMORDIAL (CLASSE)\n${primordialSkill.name.toUpperCase()}\n\n${primordialSkill.description}`);
                    const iconUrl = getSkillOrEffectIconUrl(primordialSkill.id);
                    if (iconUrl) {
                        const img = document.createElement('img');
                        img.src = iconUrl;
                        img.className = 'slot-content-icon';
                        img.style.width = '24px';
                        img.style.height = '24px';
                        img.style.objectFit = 'contain';
                        img.style.pointerEvents = 'none';
                        slotDiv.appendChild(img);
                    } else {
                        const text = document.createElement('span');
                        text.className = 'slot-content-text';
                        text.textContent = primordialSkill.name.substring(0, 3).toUpperCase();
                        slotDiv.appendChild(text);
                    }
                } else {
                    slotDiv.setAttribute('data-tooltip', `HABILIDADE PRIMORDIAL\n(Nenhuma habilidade essencial desbloqueada)`);
                    const emptyIcon = document.createElement('span');
                    emptyIcon.className = 'slot-content-text';
                    emptyIcon.style.opacity = '0.3';
                    emptyIcon.textContent = '✦';
                    slotDiv.appendChild(emptyIcon);
                }
                primordialContainer.appendChild(slotDiv);
            });
        }

        // 3. Broches Ativos da Árvore Global (4 slots - Teclas 5 a 8)
        const globalActiveContainer = this.container.querySelector('#global-active-brooch-slots');
        if (globalActiveContainer) {
            globalActiveContainer.innerHTML = '';
            const globalActiveLoadout: (string | null)[] = (data as any).globalActiveLoadout || [null, null, null, null];
            
            for (let i = 0; i < 4; i++) {
                const broochId = globalActiveLoadout[i];
                const slotDiv = document.createElement('div');
                slotDiv.className = `skill-slot skill-slot-frame sun-brooch-slot ${broochId ? 'filled' : 'empty'}`;

                // SVG Sol com Espinhos padronizado via assets
                const svg = createSlotSvgElement('sun');
                slotDiv.appendChild(svg);

                const numBadge = document.createElement('span');
                numBadge.className = 'skill-slot-number';
                numBadge.textContent = (i + 5).toString();
                slotDiv.appendChild(numBadge);

                if (broochId) {
                    let broochInfo: any = null;
                    if (this.domain.globalMetaSummary && this.domain.globalMetaSummary.brooches) {
                        broochInfo = this.domain.globalMetaSummary.brooches.find((b: any) => (typeof b === 'string' ? b : b.id) === broochId);
                    }
                    if (!broochInfo && data.skillTree) {
                        broochInfo = data.skillTree.find((s: any) => s.id === broochId);
                    }

                    const name = broochInfo ? (typeof broochInfo === 'string' ? broochInfo : broochInfo.name) : broochId;
                    const desc = broochInfo ? (typeof broochInfo === 'string' ? 'Broche ativo ancestral.' : broochInfo.description) : 'Broche ativo equipado.';
                    slotDiv.setAttribute('data-tooltip', `BROCHE ATIVO [TECLA ${i + 5}]\n${name.toUpperCase()}\n\n${desc}\n\n[Loadout Fixo da Jornada]`);
                    slotDiv.style.cursor = 'default';

                    const iconUrl = getSkillOrEffectIconUrl(broochId);
                    if (iconUrl) {
                        const img = document.createElement('img');
                        img.src = iconUrl;
                        img.className = 'slot-content-icon';
                        img.style.width = '34px';
                        img.style.height = '34px';
                        img.style.objectFit = 'contain';
                        img.style.pointerEvents = 'none';
                        img.style.position = 'relative';
                        img.style.zIndex = '3';
                        img.style.filter = 'drop-shadow(0 0 5px rgba(255, 215, 0, 0.8)) brightness(1.25)';
                        slotDiv.appendChild(img);
                    } else {
                        const text = document.createElement('span');
                        text.className = 'slot-content-text';
                        text.textContent = (typeof name === 'string' ? name : '').substring(0, 3).toUpperCase();
                        slotDiv.appendChild(text);
                    }
                } else {
                    slotDiv.setAttribute('data-tooltip', `BROCHE ATIVO [TECLA ${i + 5}]\n(Vazio - Nenhum broche ativo equipado)`);
                    const emptyIcon = document.createElement('span');
                    emptyIcon.className = 'slot-content-text';
                    emptyIcon.style.opacity = '0.3';
                    emptyIcon.textContent = '+';
                    slotDiv.appendChild(emptyIcon);
                }
                globalActiveContainer.appendChild(slotDiv);
            }
        }

        // 4. Broches Passivos da Árvore Global (I a IV - Triângulos Truncados sem botão)
        const globalPassiveContainer = this.container.querySelector('#global-passive-brooch-slots');
        if (globalPassiveContainer) {
            globalPassiveContainer.innerHTML = '';
            const passiveLoadout = data.passiveLoadout || [null, null, null, null];
            const romanNumerals = ['I', 'II', 'III', 'IV'];

            for (let i = 0; i < 4; i++) {
                const passiveId = passiveLoadout[i];
                const isRealPassive = passiveId && GlobalBroochPool.some(b => b.id === passiveId && b.type === 'passivo');
                const slotDiv = document.createElement('div');
                slotDiv.className = `skill-slot skill-slot-frame triangle-passive-slot ${isRealPassive ? 'filled' : 'empty'}`;

                // SVG Triângulo Truncado padronizado via assets
                const svg = createSlotSvgElement('triangle');
                slotDiv.appendChild(svg);

                const numBadge = document.createElement('span');
                numBadge.className = 'skill-slot-number';
                numBadge.textContent = romanNumerals[i]!;
                slotDiv.appendChild(numBadge);

                if (isRealPassive) {
                    let broochInfo: any = GlobalBroochPool.find(b => b.id === passiveId);
                    if (!broochInfo && this.domain.globalMetaSummary && this.domain.globalMetaSummary.brooches) {
                        broochInfo = this.domain.globalMetaSummary.brooches.find((b: any) => (typeof b === 'string' ? b : b.id) === passiveId);
                    }

                    const name = broochInfo ? (typeof broochInfo === 'string' ? broochInfo : broochInfo.name) : passiveId;
                    const desc = broochInfo ? (typeof broochInfo === 'string' ? 'Efeito passivo do broche.' : broochInfo.description) : 'Efeito passivo.';
                    slotDiv.setAttribute('data-tooltip', `BROCHE PASSIVO [SLOT ${romanNumerals[i]}]\n${name.toUpperCase()}\n\n${desc}\n\n[Loadout Fixo da Jornada]`);
                    slotDiv.style.cursor = 'default';

                    const iconUrl = getSkillOrEffectIconUrl(passiveId);
                    if (iconUrl) {
                        const img = document.createElement('img');
                        img.src = iconUrl;
                        img.className = 'slot-content-icon';
                        img.style.width = '30px';
                        img.style.height = '30px';
                        img.style.objectFit = 'contain';
                        img.style.pointerEvents = 'none';
                        img.style.position = 'relative';
                        img.style.zIndex = '3';
                        img.style.filter = 'drop-shadow(0 0 5px rgba(255, 170, 0, 0.8)) brightness(1.2)';
                        slotDiv.appendChild(img);
                    } else {
                        const text = document.createElement('span');
                        text.className = 'slot-content-text';
                        text.textContent = (typeof name === 'string' ? name : '').substring(0, 3).toUpperCase();
                        slotDiv.appendChild(text);
                    }
                } else {
                    slotDiv.setAttribute('data-tooltip', `BROCHE PASSIVO [SLOT ${romanNumerals[i]}]\n(Vazio)`);
                    const emptyIcon = document.createElement('span');
                    emptyIcon.className = 'slot-content-text';
                    emptyIcon.style.opacity = '0.3';
                    emptyIcon.textContent = '+';
                    slotDiv.appendChild(emptyIcon);
                }
                globalPassiveContainer.appendChild(slotDiv);
            }
        }

        // 4.5. Lista de Broches Desbloqueados (Informativo in-game, alteração apenas no menu principal)
        const availableBroochesContainer = this.container.querySelector('#global-available-brooches-list');
        if (availableBroochesContainer) {
            availableBroochesContainer.innerHTML = '';
            const unlockedBrooches = this.domain.globalMetaSummary?.brooches || [];
            const globalActiveLoadout: (string | null)[] = (data as any).globalActiveLoadout || [null, null, null, null];
            const passiveLoadout: (string | null)[] = data.passiveLoadout || [null, null, null, null];
            const romanNumerals = ['I', 'II', 'III', 'IV'];

            // Junta os broches desbloqueados ou equipados
            const broochMap = new Map<string, any>();
            unlockedBrooches.forEach((b: any) => {
                const id = typeof b === 'string' ? b : b?.id;
                if (id && typeof id === 'string' && id.startsWith('brooch_')) {
                    const full = GlobalBroochPool.find(item => item.id === id) || (typeof b === 'object' ? b : { id, name: id, description: 'Broche ancestral.', type: 'ativo', shape: 'circle' });
                    broochMap.set(id, full);
                }
            });

            // Adiciona também os broches legitimamente equipados
            [...globalActiveLoadout, ...passiveLoadout].forEach(id => {
                if (id && typeof id === 'string' && id.startsWith('brooch_') && !broochMap.has(id)) {
                    const found = GlobalBroochPool.find(b => b.id === id);
                    if (found) broochMap.set(id, found);
                }
            });

            const allBroochesList = Array.from(broochMap.values());

            if (allBroochesList.length > 0) {
                allBroochesList.forEach((brooch: any) => {
                    const broochId = typeof brooch === 'string' ? brooch : brooch.id;
                    const broochName = typeof brooch === 'string' ? brooch : brooch.name;
                    const broochDesc = typeof brooch === 'string' ? 'Poder ancestral herdado.' : brooch.description;
                    const isAtivo = (brooch.type === 'ativo' || brooch.type === 'active' || brooch.shape === 'circle');

                    const activeEquippedIndex = globalActiveLoadout.indexOf(broochId);
                    const passiveEquippedIndex = passiveLoadout.indexOf(broochId);
                    const isEquipped = isAtivo ? activeEquippedIndex !== -1 : (passiveEquippedIndex !== -1 && GlobalBroochPool.some(b => b.id === broochId && b.type === 'passivo'));

                    const itemDiv = document.createElement('div');
                    itemDiv.className = `available-brooch-item ${isEquipped ? 'is-equipped' : ''}`;
                    itemDiv.style.cursor = 'default';

                    const statusTooltip = isEquipped
                        ? `[EQUIPADO no slot ${isAtivo ? activeEquippedIndex + 5 : romanNumerals[passiveEquippedIndex]}] (Fixo durante a jornada)`
                        : `[DISPONÍVEL - Alterações apenas fora da jornada]`;
                    itemDiv.setAttribute('data-tooltip', `BROCHE ${isAtivo ? 'ATIVO' : 'PASSIVO'}\n${broochName.toUpperCase()}\n\n${broochDesc}\n\n${statusTooltip}`);

                    const iconBox = document.createElement('div');
                    iconBox.className = 'available-brooch-icon-box';
                    const iconUrl = getSkillOrEffectIconUrl(broochId);
                    if (iconUrl) {
                        const img = document.createElement('img');
                        img.src = iconUrl;
                        img.style.width = '24px';
                        img.style.height = '24px';
                        img.style.objectFit = 'contain';
                        img.style.pointerEvents = 'none';
                        iconBox.appendChild(img);
                    } else {
                        const initial = document.createElement('span');
                        initial.style.color = '#FFD700';
                        initial.style.fontWeight = 'bold';
                        initial.style.fontSize = '12px';
                        initial.textContent = broochName.substring(0, 2).toUpperCase();
                        iconBox.appendChild(initial);
                    }
                    itemDiv.appendChild(iconBox);

                    const labelGroup = document.createElement('div');
                    labelGroup.className = 'available-brooch-label-group';
                    const nameSpan = document.createElement('span');
                    nameSpan.className = 'available-brooch-name';
                    nameSpan.textContent = broochName;
                    const typeSpan = document.createElement('span');
                    typeSpan.className = 'available-brooch-type';
                    typeSpan.textContent = isAtivo ? 'Ativo [5-8]' : 'Passivo [I-IV]';
                    labelGroup.appendChild(nameSpan);
                    labelGroup.appendChild(typeSpan);
                    itemDiv.appendChild(labelGroup);

                    availableBroochesContainer.appendChild(itemDiv);
                });
            } else {
                availableBroochesContainer.innerHTML = '<div class="available-brooches-empty-hint">Nenhum broche disponivel.</div>';
            }
        }

        // 5. Atributos Acumulativos da Árvore Global (Círculos com Escala Infinita)
        const cumulativeContainer = this.container.querySelector('#meta-cumulative-attributes');
        if (cumulativeContainer) {
            cumulativeContainer.innerHTML = '';
            const summary = this.domain.globalMetaSummary;
            // Filtra APENAS atributos que realmente possuem valor acumulado > 0 para não listar vários "+0"
            const activeStats = (summary && summary.stats) 
                ? summary.stats.filter((stat: any) => typeof stat.totalValue === 'number' && stat.totalValue > 0)
                : [];

            if (activeStats.length > 0) {
                activeStats.forEach((stat: any) => {
                    const orb = document.createElement('div');
                    orb.className = 'cumulative-attr-orb';
                    orb.setAttribute('data-tooltip', `ATRIBUTO ACUMULATIVO GLOBAL\n+${stat.totalValue} em ${stat.name}\n\nBônus permanente concedido pela árvore global.`);
                    orb.innerHTML = `
                        <div class="orb-circle">+</div>
                        <div class="orb-label-group">
                            <span class="orb-name">${stat.name}</span>
                            <span class="orb-val">+${stat.totalValue}</span>
                        </div>
                    `;
                    cumulativeContainer.appendChild(orb);
                });
            } else {
                cumulativeContainer.innerHTML = '<div class="cumulative-empty-hint">Nenhum bônus cumulativo adquirido na árvore global.</div>';
            }
        }
    }
}