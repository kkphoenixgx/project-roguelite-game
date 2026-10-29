import { logger } from "../../shared/Logger";
import html from './weaponHud.html?raw';
import css from './weaponHud.css?raw';
import type { EntityRenderableState } from "../../../../domain/ports/domain-contracts";
import { VisualConfigMap, type ItemVisualConfig } from "../../shared/VisualConfigMap";

/** @class WeaponHudGui Renderiza o círculo com a arma principal em volta do jogador. */
export default class WeaponHudGui {
    private container!: HTMLElement;
    private weaponCircle!: HTMLElement;
    private weaponIcon!: HTMLImageElement;
    private lastIconId: number | undefined = undefined;
    private lastActionTime: number = Date.now();
    private lastMousePos = { x: 0, y: 0 };
    private lastPlayerWorldPos = { x: 0, y: 0 };

    constructor() {
        this.injectUI();
        this.setupElements();
        logger.log('init', 'WeaponHudGui instantiated and UI injected.');
    }

    private injectUI(): void {
        const style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);

        const div = document.createElement('div');
        div.innerHTML = html;
        this.container = div.firstElementChild as HTMLElement;
        document.body.appendChild(this.container);
    }

    private setupElements(): void {
        this.weaponCircle = this.container.querySelector('#weapon-circle') as HTMLElement;
        this.weaponIcon = this.container.querySelector('#weapon-icon') as HTMLImageElement;
    }

    private static itemConfigCache: Map<number, ItemVisualConfig> | null = null;

    private static getItemConfig(iconId: number): ItemVisualConfig | undefined {
        if (!WeaponHudGui.itemConfigCache) {
            WeaponHudGui.itemConfigCache = new Map();
            for (const c of Object.values(VisualConfigMap)) {
                if ((c.category === 'equipment' || c.category === 'weapon') && (c as ItemVisualConfig).iconId !== undefined) {
                    WeaponHudGui.itemConfigCache.set((c as ItemVisualConfig).iconId, c as ItemVisualConfig);
                }
            }
        }
        return WeaponHudGui.itemConfigCache.get(iconId);
    }

    public update(data: EntityRenderableState, playerScreenPos?: {x: number, y: number}, mousePos?: {x: number, y: number}): void {
        const mainHand = data.equipment?.mainHand;

        if (!mainHand || !playerScreenPos || !mousePos) {
            this.container.style.display = 'none';
            return;
        }

        if (mainHand.iconId !== this.lastIconId) {
            const itemConfig = WeaponHudGui.getItemConfig(mainHand.iconId);
            if (!itemConfig) {
                this.container.style.display = 'none';
                this.lastIconId = undefined;
                return;
            }
            this.weaponIcon.src = itemConfig.uiIconUrl;
            this.lastIconId = mainHand.iconId;
        }

        this.container.style.display = 'block';
        this.container.style.transform = `translate3d(${playerScreenPos.x}px, ${playerScreenPos.y}px, 0)`;

        let angle = 0;

        // O Adapter é agnóstico à classe concreta, lendo apenas o discriminador injetado no DTO
        const isStaff = mainHand.weaponType === 'staff' || mainHand.unlocksClass === 'Mago';
        const facingDirection = (data as EntityRenderableState & { facingDirection?: { x: number, y: number } }).facingDirection;

        if (isStaff && facingDirection) {
            // Para o Cajado: Aponta para a direção em que as magias vão sair
            angle = Math.atan2(facingDirection.y, facingDirection.x) * (180 / Math.PI);
        } else {
            // Para outras armas (Ex: Foice, Arma de fogo): Aponta ativamente para o Mouse
            const dx = mousePos.x - playerScreenPos.x;
            const dy = mousePos.y - playerScreenPos.y;
            angle = Math.atan2(dy, dx) * (180 / Math.PI);
        }

        this.weaponCircle.style.transform = `rotate(${angle + 90}deg)`;
        // Contra-rotaciona o ícone para que seu eixo permaneça fixo na tela (Canvas).
        // Retiramos o +180 para que a ponta da arma fique virada para cima naturalmente!
        const hasAirInfusion = data.spellElements?.includes('air') || data.activeStatuses?.some(s => s.id === 'blade_infusion_air');
        const hasLightInfusion = data.spellElements?.includes('light') || data.activeStatuses?.some(s => s.id === 'blade_infusion_light');

        const baseScale = hasLightInfusion ? 'scale(1.5) ' : '';
        this.weaponIcon.style.transform = `rotate(${-(angle + 90)}deg) ${baseScale}`;

        this.weaponIcon.classList.toggle('infused-air', !!hasAirInfusion);
        this.weaponIcon.classList.toggle('infused-light', !!hasLightInfusion);
        this.weaponCircle.classList.toggle('infused-air', !!hasAirInfusion);
        this.weaponCircle.classList.toggle('infused-light', !!hasLightInfusion);

        // Lógica de Fade Out por Inatividade
        const currentWorldPos = data.coordinates;
        const hasPlayerMoved = currentWorldPos.x !== this.lastPlayerWorldPos.x || currentWorldPos.y !== this.lastPlayerWorldPos.y;
        const hasMouseMoved = mousePos.x !== this.lastMousePos.x || mousePos.y !== this.lastMousePos.y;
        
        if (hasPlayerMoved || hasMouseMoved) {
            this.lastActionTime = Date.now();
            this.lastPlayerWorldPos = { ...currentWorldPos };
            this.lastMousePos = { ...mousePos };
        }

        // Oculta o HUD se passar de 2 segundos sem agir (combinado com a transição no CSS)
        this.container.style.opacity = (Date.now() - this.lastActionTime > 1500) ? '0' : '1';
    }
}