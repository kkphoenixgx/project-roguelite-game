import BaseGuiTemplate from "../../templates/BaseGuiTemplate";
import html from './equippedWeaponsHud.html?raw';
import css from './equippedWeaponsHud.css?raw';
import type { EntityRenderableState } from "../../../../domain/ports/domain-contracts";
import { VisualConfigMap, type ItemVisualConfig } from "../../shared/VisualConfigMap";

interface PhysicalSlotRefs {
    slotEl: HTMLElement;
    nameEl: HTMLElement;
    iconEl: HTMLImageElement;
    emptyEl: HTMLElement;
    lastRenderedKey: string;
}

export default class EquippedWeaponsHudGui extends BaseGuiTemplate {
    private primarySlot!: HTMLElement;
    private primaryNameEl!: HTMLElement;
    private primaryIconEl!: HTMLImageElement;
    private primaryEmptyEl!: HTMLElement;

    private secondarySlot!: HTMLElement;
    private secondaryNameEl!: HTMLElement;
    private secondaryIconEl!: HTMLImageElement;
    private secondaryEmptyEl!: HTMLElement;

    private btnSwap!: HTMLElement;

    private slots: [PhysicalSlotRefs, PhysicalSlotRefs] | null = null;
    private activeSlotIndex: 0 | 1 = 0;
    private lastMainKey: string = '';
    private lastSecondKey: string = '';
    private lastSwapHash: string = '';

    private static itemConfigCache: Map<number, ItemVisualConfig> | null = null;

    constructor(private onSwapWeaponsCallback?: () => void) {
        super('equipped-weapons-hud-container', html, css);
        this.setupElements();
    }

    private static getItemConfig(iconId: number): ItemVisualConfig | undefined {
        if (!EquippedWeaponsHudGui.itemConfigCache) {
            EquippedWeaponsHudGui.itemConfigCache = new Map();
            for (const c of Object.values(VisualConfigMap)) {
                if ((c.category === 'equipment' || c.category === 'weapon') && (c as ItemVisualConfig).iconId !== undefined) {
                    EquippedWeaponsHudGui.itemConfigCache.set((c as ItemVisualConfig).iconId, c as ItemVisualConfig);
                }
            }
        }
        return EquippedWeaponsHudGui.itemConfigCache.get(iconId);
    }

    protected override setupElements(): void {
        this.primarySlot = this.query('#ew-primary-slot');
        this.primaryNameEl = this.query('#ew-primary-name');
        this.primaryIconEl = this.query<HTMLImageElement>('#ew-primary-icon');
        this.primaryEmptyEl = this.query('#ew-primary-empty');

        this.secondarySlot = this.query('#ew-secondary-slot');
        this.secondaryNameEl = this.query('#ew-secondary-name');
        this.secondaryIconEl = this.query<HTMLImageElement>('#ew-secondary-icon');
        this.secondaryEmptyEl = this.query('#ew-secondary-empty');

        this.btnSwap = this.query('#ew-btn-swap');

        this.slots = [
            {
                slotEl: this.primarySlot,
                nameEl: this.primaryNameEl,
                iconEl: this.primaryIconEl,
                emptyEl: this.primaryEmptyEl,
                lastRenderedKey: ''
            },
            {
                slotEl: this.secondarySlot,
                nameEl: this.secondaryNameEl,
                iconEl: this.secondaryIconEl,
                emptyEl: this.secondaryEmptyEl,
                lastRenderedKey: ''
            }
        ];
    }

    protected override bindEvents(): void {
        this.addManagedListener(this.btnSwap, 'click', () => {
            this.handleSwapClick();
        });

        this.addManagedListener(this.primarySlot, 'click', () => {
            if (this.activeSlotIndex !== 0) {
                this.handleSwapClick();
            }
        });

        this.addManagedListener(this.secondarySlot, 'click', () => {
            if (this.activeSlotIndex !== 1) {
                this.handleSwapClick();
            }
        });
    }

    private handleSwapClick(): void {
        if (this.onSwapWeaponsCallback) {
            this.onSwapWeaponsCallback();
        }
    }

    private static getWeaponIdentityKey(weapon: any): string {
        if (!weapon) return 'none';
        const id = weapon.iconId ?? weapon.itemId ?? 'unknown';
        const name = weapon.name ?? '';
        return `${id}:${name}`;
    }

    public getSelectedSlotIndex(): 0 | 1 {
        return this.activeSlotIndex;
    }

    public update(data: EntityRenderableState | undefined): void {
        if (!data || !data.equipment || !this.slots) {
            return;
        }

        const mainHand = data.equipment.mainHand;
        const secondHand = data.equipment.secondHand;

        const mainKey = EquippedWeaponsHudGui.getWeaponIdentityKey(mainHand);
        const secondKey = EquippedWeaponsHudGui.getWeaponIdentityKey(secondHand);
        const currentSwapHash = `${mainKey}|${secondKey}`;

        // Detecta se houve uma troca (swap) entre mainHand e secondHand:
        // Nesse caso, mantemos as armas fixas em seus respectivos slots físicos
        // e alternamos qual slot recebe o estilo de selecionado (activeSlotIndex).
        const isWeaponSwap =
            this.lastSwapHash !== '' &&
            this.lastSwapHash !== currentSwapHash &&
            mainKey === this.lastSecondKey &&
            secondKey === this.lastMainKey &&
            mainKey !== secondKey;

        if (isWeaponSwap) {
            this.activeSlotIndex = this.activeSlotIndex === 0 ? 1 : 0;
        }

        if (this.lastSwapHash && this.lastSwapHash !== currentSwapHash) {
            this.container.classList.remove('ew-swap-anim');
            void this.container.offsetWidth;
            this.container.classList.add('ew-swap-anim');
        }

        this.lastMainKey = mainKey;
        this.lastSecondKey = secondKey;
        this.lastSwapHash = currentSwapHash;

        // Aplica o estilo de selecionado (.ew-slot-primary / .is-selected) ao slot ativo
        // e o estilo de reserva (.ew-slot-secondary) ao slot inativo
        this.applySlotSelectionStyle(0, this.activeSlotIndex === 0);
        this.applySlotSelectionStyle(1, this.activeSlotIndex === 1);

        // Os dados de mainHand vão para o slot atualmente selecionado,
        // e os de secondHand vão para o outro slot — mantendo as imagens fixas nos slots durante swaps!
        const slot0Weapon = this.activeSlotIndex === 0 ? mainHand : secondHand;
        const slot1Weapon = this.activeSlotIndex === 1 ? mainHand : secondHand;

        this.renderPhysicalSlot(this.slots[0], slot0Weapon, this.activeSlotIndex === 0 ? 'Desarmado' : 'Vazio');
        this.renderPhysicalSlot(this.slots[1], slot1Weapon, this.activeSlotIndex === 1 ? 'Desarmado' : 'Vazio');
    }

    private applySlotSelectionStyle(slotIndex: 0 | 1, isSelected: boolean): void {
        if (!this.slots) return;
        const { slotEl } = this.slots[slotIndex];

        slotEl.classList.toggle('ew-slot-primary', isSelected);
        slotEl.classList.toggle('is-selected', isSelected);
        slotEl.classList.toggle('ew-slot-secondary', !isSelected);
        slotEl.setAttribute('data-selected', isSelected ? 'true' : 'false');
        slotEl.title = isSelected
            ? 'Arma Principal (Ativa)'
            : 'Arma Secundária (Reserva - Clique ou TAB para alternar)';
    }

    private renderPhysicalSlot(slot: PhysicalSlotRefs, weapon: any, emptyLabel: string): void {
        if (weapon) {
            const iconId = weapon.iconId ?? weapon.itemId;
            const label = weapon.name || 'Arma';
            const renderKey = `weapon:${iconId ?? 'none'}:${label}`;

            if (slot.lastRenderedKey !== renderKey) {
                slot.nameEl.textContent = label;
                const config = iconId !== undefined ? EquippedWeaponsHudGui.getItemConfig(iconId) : undefined;
                if (config?.uiIconUrl) {
                    if (slot.iconEl.src !== config.uiIconUrl) {
                        slot.iconEl.src = config.uiIconUrl;
                    }
                    slot.iconEl.style.display = 'block';
                    slot.emptyEl.style.display = 'none';
                } else {
                    slot.iconEl.style.display = 'none';
                    slot.emptyEl.style.display = 'flex';
                }
                slot.lastRenderedKey = renderKey;
            }
        } else {
            const renderKey = `empty:${emptyLabel}`;
            if (slot.lastRenderedKey !== renderKey) {
                slot.nameEl.textContent = emptyLabel;
                slot.iconEl.style.display = 'none';
                slot.emptyEl.style.display = 'flex';
                slot.lastRenderedKey = renderKey;
            }
        }
    }
}
