import BaseGuiTemplate from "../../templates/BaseGuiTemplate";
import html from "./spellBufferHud.html?raw";
import css from "./spellBufferHud.css?raw";

export interface RuneInfo {
    label: string;
    cssClass: string;
}

export const RUNE_DICTIONARY: Record<string, RuneInfo> = {
    'spell_0': { label: 'Projétil', cssClass: 'rune-projectile' },
    'spell_1': { label: 'Self', cssClass: 'rune-self' },
    'spell_2': { label: 'Impacto', cssClass: 'rune-impact' },
    'spell_3': { label: 'Puxão', cssClass: 'rune-pull' },
    'spell_4': { label: 'Fogo', cssClass: 'rune-fire' },
    'spell_5': { label: 'Água', cssClass: 'rune-water' },
    'spell_6': { label: 'Natureza', cssClass: 'rune-nature' },
    'spell_7': { label: 'Trevas', cssClass: 'rune-dark' },
    'spell_8': { label: 'Luz', cssClass: 'rune-light' },
    'spell_9': { label: 'Arcano', cssClass: 'rune-magic' },
    'spell_f': { label: 'Feixe', cssClass: 'rune-beam' },
};

/**
 * @class SpellBufferHudGui
 * Micro-widget minimalista e translúcido que fornece feedback visual em tempo real
 * da digitação de runas pelo Mago, estilhaços de erro e clarões de conjuração bem-sucedida.
 */
export default class SpellBufferHudGui extends BaseGuiTemplate {
    private countEl: HTMLElement | null = null;
    private runesContainer: HTMLElement | null = null;
    private currentRunes: string[] = [];
    private flashTimeout: any = null;
    private autoCastTimeout: any = null;

    constructor() {
        super('spell-buffer-container', html, css);
        this.setupElements();
    }

    protected override setupElements(): void {
        this.countEl = this.query('#spell-buffer-count');
        this.runesContainer = this.query('#spell-buffer-runes');
    }

    protected override bindEvents(): void {
        // Eventos DOM autônomos se necessários no futuro
    }

    /**
     * Adiciona uma runa digitada à fila em tempo real.
     */
    public pushRune(spellAction: string): void {
        if (this.flashTimeout) {
            clearTimeout(this.flashTimeout);
            this.flashTimeout = null;
            this.container.classList.remove('flash-success', 'flash-shatter');
        }

        if (this.currentRunes.length >= 9) {
            this.triggerShatter();
            return;
        }

        this.currentRunes.push(spellAction);
        this.renderRunes();
        this.container.classList.add('is-active');

        // Auto-Cast aos 500ms de inatividade após última runa
        if (this.autoCastTimeout) clearTimeout(this.autoCastTimeout);
        this.autoCastTimeout = setTimeout(() => {
            this.triggerSuccess();
        }, 500);
    }

    /**
     * Define a lista de runas de uma vez.
     */
    public setRunes(runes: string[]): void {
        this.currentRunes = [...runes];
        if (this.currentRunes.length > 9) {
            this.triggerShatter();
            return;
        }
        this.renderRunes();
        if (this.currentRunes.length > 0) {
            this.container.classList.add('is-active');
        } else {
            this.container.classList.remove('is-active');
        }
    }

    /**
     * Flash dourado/azul de conjuração com sucesso, dissolvendo o buffer.
     */
    public triggerSuccess(): void {
        if (this.autoCastTimeout) {
            clearTimeout(this.autoCastTimeout);
            this.autoCastTimeout = null;
        }
        if (this.currentRunes.length === 0) return;
        this.container.classList.remove('is-active', 'flash-shatter');
        this.container.classList.add('flash-success');

        if (this.flashTimeout) clearTimeout(this.flashTimeout);
        this.flashTimeout = setTimeout(() => {
            this.clear();
            this.container.classList.remove('flash-success');
            this.flashTimeout = null;
        }, 400);
    }

    /**
     * Flash vermelho de estilhaço rúnico (buffer overflow >9 ou falha de mana).
     */
    public triggerShatter(): void {
        if (this.autoCastTimeout) {
            clearTimeout(this.autoCastTimeout);
            this.autoCastTimeout = null;
        }
        this.container.classList.remove('is-active', 'flash-success');
        this.container.classList.add('flash-shatter');

        if (this.flashTimeout) clearTimeout(this.flashTimeout);
        this.flashTimeout = setTimeout(() => {
            this.clear();
            this.container.classList.remove('flash-shatter');
            this.flashTimeout = null;
        }, 450);
    }

    /**
     * Limpa as runas acumuladas.
     */
    public clear(): void {
        if (this.autoCastTimeout) {
            clearTimeout(this.autoCastTimeout);
            this.autoCastTimeout = null;
        }
        this.currentRunes = [];
        this.renderRunes();
        this.container.classList.remove('is-active');
    }

    /**
     * Atualiza o DOM das runas.
     */
    private renderRunes(): void {
        if (!this.countEl) this.countEl = this.query('#spell-buffer-count');
        if (!this.runesContainer) this.runesContainer = this.query('#spell-buffer-runes');

        if (this.countEl) this.countEl.textContent = `${this.currentRunes.length}/9`;
        if (this.runesContainer) this.runesContainer.innerHTML = '';

        for (const runeKey of this.currentRunes) {
            const info = RUNE_DICTIONARY[runeKey] || { label: runeKey.replace('spell_', ''), cssClass: 'rune-magic' };
            const badge = document.createElement('span');
            badge.className = `rune-glyph ${info.cssClass}`;
            badge.textContent = `[${info.label}]`;
            this.runesContainer.appendChild(badge);
        }
    }

    public get activeRunes(): readonly string[] {
        return this.currentRunes;
    }
}
