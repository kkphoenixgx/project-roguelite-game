import { logger } from "../../shared/Logger";
import { SlotSvgAssets } from "../../shared/SlotSvgAssets";
import html from './mainMenu.html?raw';

// Imports dos sub-módulos CSS com o loader em string pura do Vite (?raw)
import cssGlobalLayout from './styles/global-layout.css?raw';

import progressionHtml from './partials/progression/progression.html?raw';
import progressionCss from './partials/progression/progression.css?raw';

import loadoutHtml from './partials/loadout/loadout.html?raw';
import loadoutCss from './partials/loadout/loadout.css?raw';

import worldHtml from './partials/world/world.html?raw';
import worldCss from './partials/world/world.css?raw';

import statsHtml from './partials/stats/stats.html?raw';
import statsCss from './partials/stats/stats.css?raw';

import systemHtml from './partials/system/system.html?raw';
import systemCss from './partials/system/system.css?raw';

import { safeInvoke } from '../../shared/TauriIPC';
import { listen } from '@tauri-apps/api/event';
import { checkOllamaHealth, warmupOllamaModel } from '../../shared/OllamaHealthCheck';
import { invoke } from '@tauri-apps/api/core';

import Attributes from "../../../../domain/ObjectModule/Entities/Attributes";
import { GlobalBroochPool } from "../../../../domain/facadeComponents/MetaProgressionMap";
import { ConfirmationModal } from '../confirmationModalModule/ConfirmationModalGui';

import type { IGameDomain } from "../../../../domain/ports/domain-contracts";
import ProgressionTabController from "./partials/progression/ProgressionTabController";
import LoadoutTabController from "./partials/loadout/LoadoutTabController";

export interface WorldConfig {
    id: string;
    name: string;
    cx: number;
    cy: number;
    scale: number;
    path: string;
}

export default class MainMenuGui {
    private container!: HTMLElement;

    // Estado da câmera do mapa
    private translateX: number = 0;
    private translateY: number = 0;
    private scale: number = 1;
    private isDragging: boolean = false;
    private startX: number = 0;
    private startY: number = 0;
    private currentModel: string = "qwen2.5:0.5b";
    private progressionController!: ProgressionTabController;
    public loadoutController!: LoadoutTabController; // Expose to get the choices
    private skipSubtabDefaultToSaves: boolean = false;
    public activeSlot: number = 1;
    public activeSlotData: any = null;
    public selectedWorldId: string = 'vilgem';

    constructor(
        private domain: IGameDomain, 
        private onStartGameCallback: (mapId: string, active: (string|null)[], passive: (string|null)[], checkpoint?: any) => void, 
        private worlds: WorldConfig[] = []
    ) {
        if (!this.worlds || this.worlds.length === 0) {
            this.worlds = (this.domain && typeof this.domain.getAvailableWorlds === 'function')
                ? this.domain.getAvailableWorlds()
                : [
                    { id: 'cemii', name: 'Cemii', cx: 150, cy: 300, scale: 1.0, path: 'M 100 200 L 150 200 L 200 250 L 200 350 L 150 400 L 100 350 Z' },
                    { id: 'vilgem', name: 'Vilgem', cx: 400, cy: 320, scale: 1.0, path: 'M 300 220 L 450 220 L 500 280 L 500 400 L 400 450 L 300 400 Z' },
                    { id: 'alun', name: 'Alun', cx: 650, cy: 300, scale: 1.0, path: 'M 600 200 L 700 200 L 750 280 L 700 380 L 600 350 Z' }
                ];
        }

        const storedSlot = localStorage.getItem('active_game_slot');
        if (storedSlot) {
            this.activeSlot = parseInt(storedSlot, 10) || 1;
        }

        this.injectUI();
        this.setupProgressionTab();
        this.setupLoadoutTab();
        this.setupStatsTab();
        this.setupTabs();
        this.setupMapSelection();
        this.setupSaveSystem();
        this.setupModelManager();
        this.setupSystemSubtabs();
        this.initActiveSlotPromise = this.initActiveSlot();
        logger.log('init', 'MainMenuGui instantiated and partitioned CSS injected.');
    }

    public initActiveSlotPromise!: Promise<void>;
    private isManuallySelectedSlot: boolean = false;

    public async loadSlotDataFromAnySource(slot: number): Promise<any | null> {
        let slotData: any = null;
        try {
            const json = await safeInvoke<string>('load_game_slot', { slot }).catch(() => null);
            if (json) slotData = JSON.parse(json);
        } catch (e) {}

        if (!slotData) {
            try {
                const local = localStorage.getItem(`game_slot_${slot}`);
                if (local) slotData = JSON.parse(local);
            } catch (e) {}
        }

        if (slot === 1 && !slotData) {
            try {
                const legacyJson = await safeInvoke<string>('load_game_state').catch(() => null);
                if (legacyJson) slotData = JSON.parse(legacyJson);
            } catch (e) {}
            if (!slotData) {
                try {
                    const legacyLocal = localStorage.getItem('saved_game_state') || localStorage.getItem('savegame');
                    if (legacyLocal) slotData = JSON.parse(legacyLocal);
                } catch (e) {}
            }
        }

        return slotData;
    }

    public createDefaultSlotPayload(slot: number = 1): any {
        const now = new Date();
        const dateStr = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth()+1).toString().padStart(2, '0')} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        let activeCheckpoint: any = null;
        if (typeof (this.domain as any)?.serializePlayerState === 'function') {
            const pState = (this.domain as any).serializePlayerState();
            if (pState) {
                activeCheckpoint = {
                    mapId: 'vilgem',
                    timestamp: Date.now(),
                    player: {
                        ...pState,
                        globalActiveLoadout: [null, null, null, null],
                        passiveLoadout: [null, null, null, null],
                        classes: pState.classes ? {
                            ...pState.classes,
                            globalActiveLoadout: [null, null, null, null],
                            passiveLoadout: [null, null, null, null]
                        } : undefined
                    }
                };
            }
        }

        const charLvl = activeCheckpoint?.player?.level ?? activeCheckpoint?.player?.attributes?.level ?? 1;
        const metaState = (this.domain as any)?.metaProgressionManager?.getGlobalState?.() ?? null;
        if (metaState) {
            metaState.unlockedBrooches = [];
            metaState.purchasedPermanentNodes = [];
            metaState.unlockedGlobalNodes = [];
            metaState.spentSkillPoints = 0;
        }
        const saveId = `save_slot_${slot}_${Date.now()}`;
        if (activeCheckpoint) {
            activeCheckpoint.saveId = saveId;
            activeCheckpoint.slot = slot;
        }
        const pState = activeCheckpoint?.player ?? null;

        return {
            slot,
            saveId,
            characterName: slot === 1 ? `Aventureiro (Nvl ${charLvl})` : `Sonhador ${slot} (Nvl ${charLvl})`,
            cycle: 1,
            world: activeCheckpoint?.mapId || 'Vilgem',
            savedAt: dateStr,
            globalMetaSummary: { stats: [], brooches: [] },
            playerState: pState,
            metaProgressionState: metaState,
            unlockedBrooches: [],
            globalActiveLoadout: [null, null, null, null],
            passiveLoadout: [null, null, null, null],
            activeCheckpoint: activeCheckpoint,
            checkpoint: activeCheckpoint
        };
    }

    public async createAndPersistDefaultSlot(slot: number = 1): Promise<any> {
        if (typeof (this.domain as any).resetToInitialState === 'function') {
            (this.domain as any).resetToInitialState();
        }
        const defaultPayload = this.createDefaultSlotPayload(slot);
        const jsonStr = JSON.stringify(defaultPayload);
        try {
            await safeInvoke('save_game_slot', { slot, payload: jsonStr }).catch(() => {});
        } catch (e) {}
        try {
            localStorage.setItem(`game_slot_${slot}`, jsonStr);
            if (slot === 1) {
                localStorage.setItem('saved_game_state', jsonStr);
            }
        } catch (e) {}
        return defaultPayload;
    }

    private async initActiveSlot(): Promise<void> {
        if (this.isManuallySelectedSlot) return;
        const storedSlot = localStorage.getItem('active_game_slot');
        let targetSlot = storedSlot ? (parseInt(storedSlot, 10) || 1) : 1;

        let hasAnySave = false;
        for (let s = 1; s <= 5; s++) {
            const data = await this.loadSlotDataFromAnySource(s);
            if (data) {
                hasAnySave = true;
                if (!storedSlot) {
                    targetSlot = s;
                    break;
                }
            }
        }

        if (!hasAnySave) {
            targetSlot = 1;
            await this.createAndPersistDefaultSlot(1);
        }

        if (this.isManuallySelectedSlot) return;
        await this.setActiveSlot(targetSlot, true);
    }

    public async setActiveSlot(slot: number, updateUi: boolean = true): Promise<void> {
        this.isManuallySelectedSlot = true;
        this.activeSlot = slot;
        localStorage.setItem('active_game_slot', slot.toString());

        const slotData = await this.loadSlotDataFromAnySource(slot);
        this.activeSlotData = slotData;

        if (slotData) {
            if (typeof (this.domain as any).restoreGameState === 'function') {
                (this.domain as any).restoreGameState(slotData);
            } else if (typeof (this.domain as any).restorePlayerState === 'function') {
                (this.domain as any).restorePlayerState(slotData.playerState || slotData.player || slotData);
            }

            const currentTree = (this.domain as any)?.metaProgressionManager?.getAvailableNodesMap?.();
            if (currentTree && currentTree.length > 0 && (!slotData.metaProgressionState?.generatedTree || slotData.metaProgressionState.generatedTree.length === 0)) {
                await this.persistActiveSlotProgression();
            }
        } else {
            if (typeof (this.domain as any).resetToInitialState === 'function') {
                (this.domain as any).resetToInitialState();
            } else if (typeof (this.domain as any).restoreGameState === 'function') {
                (this.domain as any).restoreGameState(null);
            }
        }

        if (updateUi) {
            if (this.loadoutController) {
                if (slotData && typeof (this.loadoutController as any).syncFromSlotData === 'function') {
                    this.loadoutController.syncFromSlotData(slotData);
                } else {
                    this.loadoutController.refresh();
                }
            }
            if (this.progressionController) {
                if (slotData && typeof (this.progressionController as any).syncFromSlotData === 'function') {
                    this.progressionController.syncFromSlotData(slotData);
                } else {
                    this.progressionController.refresh();
                }
            }
            this.setupStatsTab();
            this.updateActiveSlotBanner(slotData);
        }
    }

    public updateActiveSlotBanner(slotData?: any): void {
        const data = slotData !== undefined ? slotData : this.activeSlotData;

        // Atualiza o indicador persistente no topo do Menu Principal
        const mmHeaderEl = this.container.querySelector('#mm-active-save-text') as HTMLElement;
        if (mmHeaderEl) {
            if (data) {
                const cp = data.activeCheckpoint || data.checkpoint || data;
                const p = cp.player || cp.playerState || data.playerState || {};
                const lvl = p.attributes?.level || p.level || 1;
                const cls = p.classes?.activeClass || p.activeClass || 'Aventureiro';
                const world = data.world || cp.mapId || 'Vilgem';
                const characterName = data.characterName || `Sonhador ${this.activeSlot}`;
                mmHeaderEl.textContent = `Save Ativo: Slot ${this.activeSlot} (Registro ${this.activeSlot}) - ${characterName} (Nv. ${lvl} ${cls}) | ${world}`;
            } else {
                mmHeaderEl.textContent = `Save Ativo: Slot ${this.activeSlot} (Registro ${this.activeSlot}) [Vazio]`;
            }
        }

        const nameEl = this.container.querySelector('#ds-active-slot-name') as HTMLElement;
        const detailsEl = this.container.querySelector('#ds-active-slot-details') as HTMLElement;
        const badgeEl = this.container.querySelector('#ds-active-slot-badge') as HTMLElement;
        if (!nameEl || !detailsEl) return;

        if (data) {
            const cp = data.activeCheckpoint || data.checkpoint || data;
            const p = cp.player || cp.playerState || data.playerState || {};
            const lvl = p.attributes?.level || p.level || 1;
            const cls = p.classes?.activeClass || p.activeClass || 'Aventureiro';
            const world = data.world || cp.mapId || 'Vilgem';
            const characterName = data.characterName || `Sonhador ${this.activeSlot}`;
            const cycle = data.cycle || 
                          cp.cycle || 
                          data.metaProgressionState?.treeGenerationCount || 
                          cp.metaProgressionState?.treeGenerationCount || 
                          data.day || 
                          1;

            nameEl.textContent = `Slot ${this.activeSlot} (Registro ${this.activeSlot}): ${characterName}`;
            detailsEl.textContent = `Nível ${lvl} | Classe: ${cls} | Local: ${world} | Ciclo ${cycle}`;
            if (badgeEl) badgeEl.textContent = 'Ativo';
        } else {
            nameEl.textContent = `Slot ${this.activeSlot} (Registro ${this.activeSlot}): Slot Vazio`;
            detailsEl.textContent = 'Nenhum progresso gravado neste slot. Inicie um jogo para gravar aqui.';
            if (badgeEl) badgeEl.textContent = 'Vazio';
        }
    }

    private setupLoadoutTab(): void {
        const loadoutContainer = this.container.querySelector('#mm-tab-2') as HTMLElement;
        if (loadoutContainer) {
            this.loadoutController = new LoadoutTabController(loadoutContainer, this.domain);
        }
    }

    private setupProgressionTab(): void {
        const progressionContainer = this.container.querySelector('#mm-tab-1') as HTMLElement;
        if (progressionContainer) {
            this.progressionController = new ProgressionTabController(
                progressionContainer, 
                this.domain,
                () => {
                    this.persistActiveSlotProgression();
                    this.setupStatsTab();
                }
            );
        }
    }

    public async persistActiveSlotProgression(): Promise<void> {
        if (!this.activeSlot || !this.activeSlotData || Object.keys(this.activeSlotData).length === 0) return;
        const metaState = (this.domain as any)?.metaProgressionManager?.getGlobalState?.();
        if (!metaState) return;

        this.activeSlotData.metaProgressionState = metaState;
        this.activeSlotData.globalMetaSummary = this.domain?.globalMetaSummary ?? { stats: [], brooches: [] };

        const jsonStr = JSON.stringify(this.activeSlotData);
        try {
            await safeInvoke('save_game_slot', { slot: this.activeSlot, payload: jsonStr }).catch(() => {});
        } catch (e) {}
        try {
            localStorage.setItem(`game_slot_${this.activeSlot}`, jsonStr);
            if (this.activeSlot === 1) {
                localStorage.setItem('saved_game_state', jsonStr);
            }
        } catch (e) {}
        logger.log('domain', `[MainMenuGui] Meta-progressão e árvore salvas com sucesso no Slot ${this.activeSlot}!`);
    }

    private setupStatsTab(): void {
        const baseContainer = this.container.querySelector('#stats-base-container') as HTMLElement;
        const derivedContainer = this.container.querySelector('#stats-derived-container') as HTMLElement;
        const elementalContainer = this.container.querySelector('#stats-elemental-container') as HTMLElement;
        const broochesContainer = this.container.querySelector('#stats-brooches-container') as HTMLElement;
        const broochesCounter = this.container.querySelector('#stats-brooches-counter') as HTMLElement;

        if (!baseContainer || !derivedContainer || !elementalContainer) return;

        const summary = this.activeSlotData?.globalMetaSummary ?? this.domain?.globalMetaSummary ?? { stats: [], brooches: [] };
        const proceduralStats = summary?.stats ?? [];
        baseContainer.innerHTML = '';
        derivedContainer.innerHTML = '';
        elementalContainer.innerHTML = '';

        const percentStatKeys = new Set([
            'crit', 'crit_dmg', 'dodge', 'accuracy', 'recharge', 'splash',
            'tenacity', 'vigor', 'insight', 'lifesteal', 'area'
        ]);

        const createStatCard = (stat: { type?: string, category?: string, name: string, desc?: string, totalValue: number }, isRawNumber: boolean = false): HTMLElement => {
            const card = document.createElement('div');
            const hasBonus = stat.totalValue > 0;
            card.className = `stat-card-item ${hasBonus ? 'has-bonus' : ''}`;

            const isElemental = stat.category === 'elemental' || (stat.type && stat.type.endsWith('_dmg')) || stat.name.startsWith('Afinidade');
            const isPercent = !isRawNumber && (isElemental || (stat.type && percentStatKeys.has(stat.type)) ||
                ['Chance', 'Dano', 'Afinidade', 'Percepção', 'Esquiva', 'Precisão', 'Recarga', 'Vigor', 'Tenacidade'].some(k => stat.name.includes(k)));

            let formattedVal = '';
            if (isRawNumber) {
                formattedVal = Number.isInteger(stat.totalValue) ? `${stat.totalValue}` : `${Number(stat.totalValue.toFixed(1))}`;
            } else {
                const sign = stat.totalValue > 0 ? '+' : (stat.totalValue < 0 ? '-' : '+');
                const valNum = Number.isInteger(stat.totalValue) ? Math.abs(stat.totalValue) : Number(Math.abs(stat.totalValue).toFixed(1));
                formattedVal = `${sign}${valNum}${isPercent ? '%' : ''}`;
            }

            const tooltipText = stat.desc ? `${stat.name}\n${stat.desc}` : stat.name;

            card.innerHTML = `
                <span class="stat-card-name" title="${tooltipText}">${stat.name}</span>
                <span class="stat-card-value">${formattedVal}</span>
            `;
            return card;
        };

        // Extrai atributos reais do jogador do save ativo
        const p = this.activeSlotData?.activeCheckpoint?.player
            || this.activeSlotData?.checkpoint?.player
            || this.activeSlotData?.playerState
            || this.activeSlotData?.player
            || (this.domain as any)?.player;
        const playerAttrs = p?.attributes || {};

        // 1. Atributos Base
        const baseDefinitions = [
            { key: 'strength', alias: 'str', name: 'Força', desc: 'Aumenta dano físico e capacidade de impacto' },
            { key: 'dexterity', alias: 'dex', name: 'Destreza', desc: 'Aumenta agilidade, velocidade de ataque e esquiva' },
            { key: 'constitution', alias: 'con', name: 'Constituição', desc: 'Aumenta pontos de vida máximos e tolerância a dano' },
            { key: 'intelligence', alias: 'int', name: 'Inteligência', desc: 'Aumenta poder de feitiços e dano mágico' },
            { key: 'wisdom', alias: 'wis', name: 'Sabedoria', desc: 'Aumenta regeneração de mana e eficácia de cura' },
            { key: 'charisma', alias: 'cha', name: 'Carisma', desc: 'Aumenta liderança, presença e afinidade arcana' }
        ];

        baseDefinitions.forEach(def => {
            const rawVal = playerAttrs[def.key] ?? playerAttrs[def.alias] ?? 10;
            const proceduralBonus = proceduralStats.find((s: any) => s.type === def.alias || s.type === `stat_${def.alias}`);
            const bonusVal = proceduralBonus ? proceduralBonus.totalValue : 0;
            const totalVal = rawVal + bonusVal;

            const card = createStatCard({
                type: def.alias,
                category: 'base',
                name: def.name,
                desc: def.desc,
                totalValue: totalVal
            }, true);
            baseContainer.appendChild(card);
        });

        // 2. Atributos Derivados Primários do Personagem
        const derivedDefinitions = [
            { key: 'level', name: 'Nível', desc: 'Nível de maestria do personagem', val: playerAttrs.level ?? p?.level ?? 1 },
            { key: 'maxHp', name: 'Vida Máxima', desc: 'Pontos máximos de integridade vital', val: playerAttrs.maxHp ?? playerAttrs.hp ?? 100 },
            { key: 'mana', name: 'Mana Máxima', desc: 'Capacidade máxima de reserva arcana', val: playerAttrs.mana ?? playerAttrs.maxMana ?? 50 }
        ];

        derivedDefinitions.forEach(def => {
            const card = createStatCard({
                type: def.key,
                category: 'derived',
                name: def.name,
                desc: def.desc,
                totalValue: def.val
            }, true);
            derivedContainer.appendChild(card);
        });

        // 3. Distribui os bônus procedurais restantes (Secundários e Elementais)
        const baseKeySet = new Set(['str', 'dex', 'con', 'int', 'wis', 'cha', 'stat_str', 'stat_dex', 'stat_con', 'stat_int', 'stat_wis', 'stat_cha']);
        proceduralStats.forEach((stat: any) => {
            if (baseKeySet.has(stat.type)) return; // Já consolidado nos Atributos Base
            const card = createStatCard(stat, false);
            if (stat.category === 'elemental' || (stat.type && stat.type.endsWith('_dmg')) || stat.name.startsWith('Afinidade')) {
                elementalContainer.appendChild(card);
            } else {
                derivedContainer.appendChild(card);
            }
        });

        // 4. Renderiza Broches Relicários Consolidados
        if (broochesContainer) {
            broochesContainer.innerHTML = '';

            const map = new Map<string, any>();
            const registerB = (id: any) => {
                const bId = typeof id === 'string' ? id : id?.id;
                if (!bId || typeof bId !== 'string') return;
                const found = GlobalBroochPool.find(b => b.id === bId);
                map.set(bId, found || (typeof id === 'object' ? id : { id: bId, name: bId, description: '', type: 'passivo' }));
            };

            const pClasses = p?.classes || this.activeSlotData?.classes || {};
            (pClasses.globalActiveLoadout || []).forEach(registerB);
            (pClasses.passiveLoadout || []).forEach(registerB);
            (this.activeSlotData?.globalActiveLoadout || []).forEach(registerB);
            (this.activeSlotData?.passiveLoadout || []).forEach(registerB);
            (this.activeSlotData?.metaProgressionState?.unlockedBrooches || []).forEach(registerB);
            (summary?.brooches || []).forEach(registerB);
            if (this.loadoutController && typeof (this.loadoutController as any).getConsolidatedBrooches === 'function') {
                this.loadoutController.getConsolidatedBrooches().forEach(registerB);
            }

            const brooches: any[] = Array.from(map.values());

            if (broochesCounter) {
                broochesCounter.textContent = `${brooches.length} Desbloqueado${brooches.length === 1 ? '' : 's'}`;
            }

            if (brooches.length === 0) {
                broochesContainer.innerHTML = '<div class="empty-state-text">Nenhum broche relicário resgatado até o momento.<br>Alcance o final de uma árvore cósmica para forjar um broche!</div>';
            } else {
                brooches.forEach((b: any) => {
                    const brooch = typeof b === 'string' ? (GlobalBroochPool.find(p => p.id === b) || { id: b, name: b, description: '', type: 'passivo' }) : b;
                    const card = document.createElement('div');
                    card.className = 'brooch-stat-card';

                    const isAtivo = brooch.type === 'ativo';
                    const iconClass = isAtivo ? 'sun-brooch-slot' : 'triangle-passive-slot';
                    const iconInnerHtml = isAtivo ? SlotSvgAssets.sunBrooch : SlotSvgAssets.trianglePassive;

                    card.innerHTML = `
                        <div class="brooch-stat-icon-wrapper ${iconClass} filled" style="background: transparent; border: none;">
                            ${iconInnerHtml}
                        </div>
                        <div class="brooch-stat-info">
                            <span class="brooch-stat-name" title="${brooch.name || brooch.id}">${brooch.name || brooch.id}</span>
                            <span class="brooch-stat-desc">${brooch.description || ''}</span>
                        </div>
                        <span class="brooch-stat-badge ${brooch.type || 'passivo'}">${brooch.type || 'passivo'}</span>
                    `;
                    broochesContainer.appendChild(card);
                });
            }
        }
    }

    /** Injeta a marcação estrutural e concatena as strings CSS para montagem do escopo */
    private injectUI(): void {
        const style = document.createElement('style');
        // Concatenação linear sem quebras de regras
        style.textContent = [cssGlobalLayout, progressionCss, loadoutCss, worldCss, statsCss, systemCss].join('\n');
        document.head.appendChild(style);
        
        const div = document.createElement('div');
        div.innerHTML = html.replace('<!-- TABS_PLACEHOLDER -->', progressionHtml + loadoutHtml + worldHtml + statsHtml + systemHtml);
        this.container = div.firstElementChild as HTMLElement;
        document.body.appendChild(this.container);
    }

    private setupTabs(): void {
        const navBtns = this.container.querySelectorAll('.mm-nav-btn');
        const tabContents = this.container.querySelectorAll('.mm-tab-content');

        navBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                navBtns.forEach(b => b.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));
                
                const targetId = (e.currentTarget as HTMLElement).getAttribute('data-target')!;
                
                (e.currentTarget as HTMLElement).classList.add('active');
                this.container.querySelector(`#${targetId}`)!.classList.add('active');
                
                if (targetId === 'mm-tab-1' && this.progressionController) {
                    this.progressionController.refresh();
                } else if (targetId === 'mm-tab-2' && this.loadoutController) {
                    if (this.activeSlotData && typeof (this.loadoutController as any).syncFromSlotData === 'function') {
                        this.loadoutController.syncFromSlotData(this.activeSlotData);
                    } else {
                        this.loadoutController.refresh();
                    }
                } else if (targetId === 'mm-tab-3') {
                    this.unlockSonharBtn();
                } else if (targetId === 'mm-tab-4') {
                    this.setupStatsTab();
                } else if (targetId === 'mm-tab-5') {
                    if (!this.skipSubtabDefaultToSaves) {
                        this.switchSystemSubtab('saves');
                    }
                    this.skipSubtabDefaultToSaves = false;
                    this.updateActiveSlotBanner(this.activeSlotData);
                }
            });
        });
    }

    public selectWorld(worldId: string): void {
        this.selectedWorldId = worldId;
        const nodes = this.container.querySelectorAll('.world-node');
        nodes.forEach(node => {
            if (node.getAttribute('data-id') === worldId) {
                node.classList.add('selected');
            } else {
                node.classList.remove('selected');
            }
        });

        const spotlightHole = this.container.querySelector('#spotlight-hole') as SVGCircleElement;
        const w = this.worlds.find(world => world.id === worldId);
        if (w && spotlightHole) {
            spotlightHole.setAttribute('cx', w.cx.toString());
            spotlightHole.setAttribute('cy', w.cy.toString());
            // Ilha central (Vilgem) e ilhas secundarias com raio expandido
            spotlightHole.setAttribute('r', w.id === 'vilgem' ? '310' : '210');
        }
    }

    private setupMapSelection(): void {
        const mapContainer = this.container.querySelector('#map-layer') as HTMLElement;
        const viewport = this.container.querySelector('#map-viewport') as HTMLElement;
        const sonharBtn = this.container.querySelector('#btn-sonhar') as HTMLButtonElement;
        const cloudTransition = this.container.querySelector('#cloud-transition') as HTMLElement;

        let svgContent = `<svg class="island-group" viewBox="0 0 800 600"><defs>`;
        svgContent += `<marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="var(--world-ink)"/></marker>`;
        svgContent += `<pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M-2,2 l4,-4 M0,8 l8,-8 M6,10 l4,-4" stroke="var(--world-ink)" stroke-width="2" opacity="0.4" stroke-linecap="square"/></pattern>`;
        svgContent += `<g id="mountain"><path class="doodle-ink" d="M0,10 L6,0 L12,10" /></g>`;
        svgContent += `<g id="tree"><path class="doodle-ink" d="M6,0 L2,8 L4,8 L0,16 L12,16 L8,8 L10,8 Z M6,16 L6,20" /></g>`;
        svgContent += `<g id="house"><path class="doodle-ink" d="M0,12 L0,4 L6,0 L12,4 L12,12 Z M4,12 L4,6 L8,6 L8,12" /></g>`;
        svgContent += `
        <radialGradient id="spotlight-hole" cx="400" cy="320" r="320" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="var(--ui-bg-darkest, #1a0f2e)" stop-opacity="0" />
            <stop offset="60%" stop-color="var(--ui-bg-darkest, #1a0f2e)" stop-opacity="0.3" />
            <stop offset="100%" stop-color="var(--ui-bg-darkest, #1a0f2e)" stop-opacity="1" />
        </radialGradient>
        </defs>`;

        // Fog of war ziz-zag background
        svgContent += `<path class="doodle-ink" stroke-width="4" opacity="0.2" d="M 50 50 L 150 150 L 250 50 L 350 150 L 450 50 L 550 150 L 650 50 L 750 150" />`;
        svgContent += `<path class="doodle-ink" stroke-width="4" opacity="0.2" d="M 50 450 L 150 550 L 250 450 L 350 550 L 450 450 L 550 550 L 650 450 L 750 550" />`;

        // Dashed paths connecting the maps
        svgContent += `<path d="M 180 300 Q 250 340 320 320" fill="none" stroke="var(--ui-border-primary)" stroke-width="4" stroke-dasharray="10,10" stroke-linecap="square" />`;
        svgContent += `<path d="M 480 320 Q 550 340 610 300" fill="none" stroke="var(--ui-border-primary)" stroke-width="4" stroke-dasharray="10,10" stroke-linecap="square" />`;

        this.worlds.forEach(w => {
            let interiorDoodles = '';
            if (w.id === 'cemii') {
                interiorDoodles = `<use href="#tree" x="140" y="250"/>`;
            } else if (w.id === 'vilgem') {
                interiorDoodles = `<use href="#mountain" x="380" y="240"/><use href="#house" x="395" y="280"/>`;
            } else if (w.id === 'alun') {
                interiorDoodles = `<use href="#tower" x="645" y="260"/>`;
            }

            svgContent += `
                <g class="world-node" data-id="${w.id}" style="transform: scale(${w.scale}); transform-origin: ${w.cx}px ${w.cy}px;">
                    <path class="island-border" d="${w.path}" />
                    <path d="${w.path}" fill="url(#hatch)" pointer-events="none" />
                    ${interiorDoodles}
                    <text x="${w.cx}" y="${w.cy + 60}" class="island-text">${w.name}</text>
                </g>
            `;
        });
        
        svgContent += `
            <g class="map-poi-group">
                <rect x="390" y="275" width="22" height="22" class="map-poi" data-poi="vilgem_tower"><title>Vilgem Center</title></rect>
            </g>
        `;

        // Fog overlay uniforme sem corte retangular nas bordas
        svgContent += `<rect x="-3000" y="-2000" width="6800" height="4600" fill="url(#spotlight-hole)" pointer-events="none" />`;

        svgContent += `</svg>`;
        
        if (mapContainer) mapContainer.innerHTML = svgContent;

        const MIN_SCALE = 1.0;
        const MAX_SCALE = 1.5;

        const clampPan = () => {
            const maxPanX = 800 * this.scale;
            const maxPanY = 400 * this.scale;
            this.translateX = Math.max(-maxPanX, Math.min(maxPanX, this.translateX));
            this.translateY = Math.max(-maxPanY, Math.min(maxPanY, this.translateY));
        };

        let rafId: number | null = null;
        const requestFrame = typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function'
            ? window.requestAnimationFrame.bind(window)
            : (cb: FrameRequestCallback) => setTimeout(cb, 16) as unknown as number;

        const updateTransform = () => {
            if (mapContainer) {
                mapContainer.style.transform = `translate3d(${this.translateX.toFixed(2)}px, ${this.translateY.toFixed(2)}px, 0px) scale(${this.scale.toFixed(3)})`;
            }
        };

        const scheduleTransform = () => {
            if (rafId !== null) return;
            rafId = requestFrame(() => {
                rafId = null;
                updateTransform();
            });
        };

        if (viewport) {
            let cachedRect: DOMRect | null = null;
            const getViewportRect = (): DOMRect => {
                if (!cachedRect) {
                    cachedRect = viewport.getBoundingClientRect();
                }
                return cachedRect;
            };

            window.addEventListener('resize', () => {
                cachedRect = null;
            });

            let isPointerDown = false;
            let dragStarted = false;
            let startPointerX = 0;
            let startPointerY = 0;
            const DRAG_THRESHOLD = 6;

            const onPointerDown = (clientX: number, clientY: number) => {
                isPointerDown = true;
                dragStarted = false;
                startPointerX = clientX;
                startPointerY = clientY;
                this.startX = clientX - this.translateX;
                this.startY = clientY - this.translateY;
            };

            const onPointerMove = (clientX: number, clientY: number) => {
                if (!isPointerDown) return;
                
                if (!dragStarted) {
                    const dist = Math.hypot(clientX - startPointerX, clientY - startPointerY);
                    if (dist > DRAG_THRESHOLD) {
                        dragStarted = true;
                        this.isDragging = true;
                        viewport.classList.add('is-dragging');
                    }
                }

                if (dragStarted) {
                    this.translateX = clientX - this.startX;
                    this.translateY = clientY - this.startY;
                    clampPan();
                    scheduleTransform();
                }
            };

            const stopDragging = () => {
                if (!isPointerDown) return;
                isPointerDown = false;
                if (dragStarted) {
                    dragStarted = false;
                    this.isDragging = false;
                    viewport.classList.remove('is-dragging');
                    updateTransform();
                }
            };

            viewport.addEventListener('mousedown', (e) => {
                if (e.button !== 0) return;
                onPointerDown(e.clientX, e.clientY);
            });

            window.addEventListener('mousemove', (e) => {
                onPointerMove(e.clientX, e.clientY);
            });

            window.addEventListener('mouseup', stopDragging);
            window.addEventListener('blur', stopDragging);
            
            viewport.addEventListener('wheel', (e) => {
                e.preventDefault();
                const zoomSensitivity = 0.002;
                const delta = -e.deltaY * zoomSensitivity;
                const newScale = Math.min(Math.max(MIN_SCALE, this.scale + delta), MAX_SCALE);

                const rect = getViewportRect();
                const mouseX = e.clientX - rect.left - rect.width / 2;
                const mouseY = e.clientY - rect.top - rect.height / 2;

                const ratio = 1 - newScale / this.scale;
                this.translateX += (mouseX - this.translateX) * ratio;
                this.translateY += (mouseY - this.translateY) * ratio;

                this.scale = newScale;
                clampPan();
                scheduleTransform();
            }, { passive: false });
        }


        this.initVolumetricFog();
        updateTransform();

        const nodes = this.container.querySelectorAll('.world-node');
        
        nodes.forEach(node => {
            const handleSelect = (e: Event) => {
                e.stopPropagation();
                const clickedId = node.getAttribute('data-id') || 'vilgem';
                this.selectWorld(clickedId);
            };

            node.addEventListener('click', handleSelect);
            node.addEventListener('pointerup', handleSelect);
        });

        // Seleciona o mundo ativo por padrão
        this.selectWorld(this.selectedWorldId);

        const pois = this.container.querySelectorAll('.map-poi');
        pois.forEach(poi => {
            poi.addEventListener('click', (e) => {
                e.stopPropagation();
                const poiName = (e.target as HTMLElement).getAttribute('data-poi') || 'desconhecido';
                ConfirmationModal.alert({
                    title: 'Ponto de Interesse',
                    message: `Você selecionou o local: ${poiName}`,
                    variant: 'info'
                });
            });
        });

        const loadingScreen = this.container.querySelector('#loading-screen-container') as HTMLElement;
        const funnyText = this.container.querySelector('#loading-funny-text') as HTMLElement;
        const techLog = this.container.querySelector('#loading-tech-log') as HTMLElement;
        const loadingSprite = this.container.querySelector('#loading-sprite') as HTMLImageElement;

        if (loadingSprite) {
            loadingSprite.src = new URL('../../../../../src-tauri/icons/game-icon-128.png', import.meta.url).href;
        }

        const funnyPhrases = [
            "Escovando os dentes dos Goblins...",
            "Polindo as Hitboxes...",
            "O Diretor Molor está terminando o café...",
            "Atores se posicionando no cenário...",
            "Afiando as espadas...",
            "Limpando o sangue do último aventureiro...",
            "Verificando se o Slime está gelatinoso...",
            "Os sonhos já vão começar..."
        ];

        let phraseIndex = 0;
        const phraseInterval = setInterval(() => {
            phraseIndex = (phraseIndex + 1) % funnyPhrases.length;
            if (funnyText) funnyText.textContent = funnyPhrases[phraseIndex]!;
        }, 2500);

        if (sonharBtn && cloudTransition) {
            const hideLoadingScreen = () => {
                logger.log('init', 'Sinal de IA Pronta recebido. Escondendo tela de loading.');
                clearInterval(phraseInterval);
                if (loadingScreen) {
                    loadingScreen.style.opacity = '0';
                    setTimeout(() => loadingScreen.style.display = 'none', 800);
                }
                this.unlockSonharBtn();
            };

            if ((window as any).__TAURI_INTERNALS__) {
                let isChecking = false;
                const checkAndWarmup = async () => {
                    if (isChecking) return;
                    isChecking = true;
                    
                    try {
                        this.currentModel = await invoke('get_active_model');
                    } catch (e) {}

                    if (!this.currentModel) {
                        this.forceSetupModel();
                        return;
                    }

                    const health = await checkOllamaHealth(this.currentModel);
                    if (health.hasTargetModel) {
                        logger.log('init', `[Warmup] Iniciando warmup com modelo ${this.currentModel}...`);
                        if (techLog) techLog.textContent = `Aguardando ${this.currentModel} confirmar o seu papel...`;
                        const isWarm = await warmupOllamaModel(this.currentModel);
                        logger.log('init', `[Warmup] Resultado do warmup: ${isWarm}`);
                        if (techLog) techLog.textContent = 'Modelo quente e pronto!';
                        hideLoadingScreen();
                    } else if (health.online && !health.hasTargetModel) {
                        if (techLog) techLog.textContent = 'Modelo ausente. Configure no Sistema.';
                        logger.log('init', '[Warmup] Modelo alvo não encontrado. Redirecionando...');
                        this.forceSetupModel();
                    } else {
                        // Not online yet, unlock check
                        isChecking = false;
                    }
                };

                const pollInterval = setInterval(async () => {
                    const health = await checkOllamaHealth();
                    if (health.online) {
                        clearInterval(pollInterval);
                        sessionStorage.setItem('ollama_ready', 'true');
                        await checkAndWarmup();
                    }
                }, 1500);

                if (sessionStorage.getItem('ollama_ready') === 'true') {
                    clearInterval(pollInterval);
                    checkAndWarmup();
                }
                
                listen<string>('loading-progress', (event: any) => {
                    if (techLog) techLog.textContent = event.payload;
                });

                listen('ollama-ready', async () => {
                    sessionStorage.setItem('ollama_ready', 'true');
                    clearInterval(pollInterval);
                    if (techLog) techLog.textContent = 'Ollama online. Verificando modelo ativo...';
                    await checkAndWarmup();
                });

                setTimeout(() => {
                    if (sessionStorage.getItem('ollama_ready') !== 'true') {
                        logger.log('init', 'Timeout esperando backend, forçando inicialização.');
                        sessionStorage.setItem('ollama_ready', 'true');
                        hideLoadingScreen();
                        this.unlockSonharBtn();
                    }
                }, 15000); // 15s para dar tempo do warmup
            } else {
                clearInterval(phraseInterval);
                if (loadingScreen) loadingScreen.style.display = 'none';
                this.unlockSonharBtn();
            }

            const startDream = (slot: number, checkpointData: any | null) => {
                const checkpoint = checkpointData?.activeCheckpoint || checkpointData?.checkpoint || checkpointData;
                if (checkpoint) {
                    checkpoint.slot = slot;
                    if (checkpointData && checkpointData !== checkpoint) {
                        checkpoint.metaProgressionState = checkpoint.metaProgressionState || checkpointData.metaProgressionState;
                        checkpoint.playerState = checkpoint.playerState || checkpointData.playerState;
                    }
                }
                sonharBtn.disabled = true;
                sonharBtn.style.pointerEvents = 'none';
                cloudTransition.classList.add('active');
                setTimeout(() => {
                    try {
                        this.container.style.display = 'none';
                        const targetMapId = this.selectedWorldId || checkpoint?.mapId || 'vilgem';
                        const menuActiveBrooches = this.loadoutController ? this.loadoutController.selectedActiveLoadout : [];
                        const menuPassiveBrooches = this.loadoutController ? this.loadoutController.selectedPassiveLoadout : [];

                        if (checkpoint) {
                            const p = checkpoint.player || checkpoint.playerState || {};
                            if (!checkpoint.player && checkpoint.playerState) checkpoint.player = checkpoint.playerState;

                            // Mescla o loadout ativo: se o usuário configurou broches no menu, usa-os
                            const hasMenuActives = menuActiveBrooches.some((b: any) => Boolean(b));
                            const hasMenuPassives = menuPassiveBrooches.some((b: any) => Boolean(b));

                            const effectiveActiveLoadout = p.activeLoadout || p.classes?.activeLoadout || [];
                            const effectivePassiveLoadout = hasMenuPassives
                                ? menuPassiveBrooches
                                : (p.passiveLoadout || p.classes?.passiveLoadout || menuPassiveBrooches);
                            const effectiveGlobalActives = hasMenuActives
                                ? menuActiveBrooches
                                : (checkpoint.globalActiveLoadout || p.globalActiveLoadout || p.classes?.globalActiveLoadout || menuActiveBrooches);

                            // Atualiza checkpoint para sincronizar save
                            checkpoint.globalActiveLoadout = [...effectiveGlobalActives];
                            checkpoint.passiveLoadout = [...effectivePassiveLoadout];
                            if (checkpoint.player) {
                                checkpoint.player.globalActiveLoadout = [...effectiveGlobalActives];
                                checkpoint.player.passiveLoadout = [...effectivePassiveLoadout];
                                if (checkpoint.player.classes) {
                                    checkpoint.player.classes.globalActiveLoadout = [...effectiveGlobalActives];
                                    checkpoint.player.classes.passiveLoadout = [...effectivePassiveLoadout];
                                }
                            }

                            this.onStartGameCallback(
                                targetMapId,
                                effectiveActiveLoadout,
                                effectivePassiveLoadout,
                                checkpoint
                            );
                        } else {
                            const activeL = menuActiveBrooches;
                            const passiveL = menuPassiveBrooches;
                            this.onStartGameCallback(targetMapId, activeL, passiveL, {
                                slot,
                                globalActiveLoadout: [...activeL],
                                passiveLoadout: [...passiveL]
                            });
                        }
                    } catch (err) {
                        console.error('[MainMenuGui] Erro ao iniciar o jogo:', err);
                        cloudTransition.classList.remove('active');
                        this.container.style.display = '';
                        this.unlockSonharBtn();
                    }
                }, 1200);
            };

            sonharBtn.addEventListener('click', () => {
                startDream(this.activeSlot, this.activeSlotData);
            });
        }
    }

    private initVolumetricFog() {
        // Volumetric fog removed for performance. Now using SVG mask.
    }

    private setupSaveSystem(): void {
        const ioArea = this.container.querySelector('#save-data-io') as HTMLTextAreaElement;
        const drawer = this.container.querySelector('#save-io-drawer') as HTMLElement;
        const drawerTitle = this.container.querySelector('#save-io-title') as HTMLElement;
        const btnCopy = this.container.querySelector('#btn-copy-save') as HTMLButtonElement;
        const btnClose = this.container.querySelector('#btn-close-save-drawer') as HTMLButtonElement;
        const btnConfirm = this.container.querySelector('#btn-confirm-import') as HTMLButtonElement;
        const copyText = this.container.querySelector('#copy-btn-text') as HTMLElement;
        const targetRow = this.container.querySelector('#save-drawer-target-row') as HTMLElement;
        const slotSelect = this.container.querySelector('#save-target-slot-select') as HTMLSelectElement;
        const btnQuickExport = this.container.querySelector('#btn-quick-export') as HTMLButtonElement;
        const btnQuickImport = this.container.querySelector('#btn-quick-import') as HTMLButtonElement;

        if (btnClose && drawer) {
            btnClose.addEventListener('click', () => {
                drawer.style.display = 'none';
            });
        }

        if (btnCopy && copyText) {
            btnCopy.addEventListener('click', async () => {
                if (ioArea && ioArea.value) {
                    await navigator.clipboard.writeText(ioArea.value);
                    copyText.textContent = 'Copiado!';
                    setTimeout(() => { copyText.textContent = 'Copiar Save'; }, 2000);
                }
            });
        }

        const openExportDrawer = (title: string, code: string) => {
            if (!drawer || !ioArea) return;
            ioArea.value = code;
            ioArea.readOnly = true;
            if (drawerTitle) drawerTitle.textContent = title;
            if (targetRow) targetRow.style.display = 'none';
            if (btnCopy) btnCopy.style.display = 'inline-flex';
            if (btnConfirm) btnConfirm.style.display = 'none';
            drawer.style.display = 'flex';
            ioArea.select();
        };

        const openImportDrawer = (slot: number = 1) => {
            if (!drawer || !ioArea) return;
            ioArea.value = '';
            ioArea.readOnly = false;
            if (drawerTitle) drawerTitle.textContent = `Restaurar Save no Slot ${slot}`;
            if (targetRow) targetRow.style.display = 'flex';
            if (slotSelect) slotSelect.value = slot.toString();
            if (btnCopy) btnCopy.style.display = 'none';
            if (btnConfirm) btnConfirm.style.display = 'inline-flex';
            drawer.style.display = 'flex';
            ioArea.focus();
        };

        if (btnQuickExport) {
            btnQuickExport.addEventListener('click', async () => {
                try {
                    const jsonString = await safeInvoke<string>('load_game_slot', { slot: this.activeSlot })
                        .catch(() => safeInvoke<string>('load_game_state'));
                    const data = JSON.parse(jsonString);
                    const saveStr = btoa(JSON.stringify(data));
                    openExportDrawer(`Save Atual (Registro ${this.activeSlot})`, saveStr);
                } catch (e) {
                    const currentData = {
                        slot: this.activeSlot,
                        characterName: 'Aventureiro de Vilgem',
                        cycle: 1,
                        world: 'Vilgem',
                        savedAt: new Date().toLocaleDateString('pt-BR'),
                        globalMetaSummary: this.domain?.globalMetaSummary ?? { stats: [], brooches: [] }
                    };
                    const saveStr = btoa(JSON.stringify(currentData));
                    openExportDrawer(`Save Atual (Registro ${this.activeSlot} - Em Memória)`, saveStr);
                }
            });
        }

        if (btnQuickImport) {
            btnQuickImport.addEventListener('click', () => openImportDrawer(this.activeSlot));
        }

        const btnCreateSlotSave = this.container.querySelector('#btn-create-slot-save') as HTMLButtonElement;
        if (btnCreateSlotSave) {
            btnCreateSlotSave.addEventListener('click', async () => {
                let targetSlot: number | null = null;
                for (let s = 1; s <= 5; s++) {
                    const data = await this.loadSlotDataFromAnySource(s);
                    if (!data) {
                        targetSlot = s;
                        break;
                    }
                }

                if (targetSlot !== null) {
                    await this.createAndPersistDefaultSlot(targetSlot);
                    await this.setActiveSlot(targetSlot, true);
                    await renderSlots();
                } else {
                    const confirmed = await ConfirmationModal.confirm({
                        title: 'Slots Cheios',
                        message: 'Todos os 5 slots possuem saves gravados. Deseja substituir o Slot 5 por um novo save limpo? O progresso anterior será perdido.',
                        confirmText: 'Substituir Slot 5',
                        cancelText: 'Cancelar',
                        variant: 'warning'
                    });
                    if (confirmed) {
                        await this.createAndPersistDefaultSlot(5);
                        await this.setActiveSlot(5, true);
                        await renderSlots();
                    }
                }
            });
        }

        if (btnConfirm && ioArea) {
            btnConfirm.addEventListener('click', async () => {
                const data = ioArea.value.trim();
                if (!data) return;
                const targetSlot = slotSelect ? parseInt(slotSelect.value, 10) : this.activeSlot;

                try {
                    const decodedJson = atob(data);
                    JSON.parse(decodedJson);
                    await safeInvoke<string>('save_game_slot', { slot: targetSlot, payload: decodedJson }).catch(() => {});
                    await ConfirmationModal.alert({
                        title: 'Sucesso',
                        message: `Save importado com sucesso no Registro ${targetSlot}! Recarregando memórias...`,
                        variant: 'success'
                    });
                    if (drawer) drawer.style.display = 'none';
                    await this.setActiveSlot(targetSlot, true);
                    renderSlots();
                } catch (e) {
                    await ConfirmationModal.alert({
                        title: 'Erro na Importação',
                        message: 'Save inválido, corrompido ou formato incompatível!',
                        variant: 'danger'
                    });
                }
            });
        }

        const saveToSlot = async (slot: number) => {
            const now = new Date();
            const dateStr = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth()+1).toString().padStart(2, '0')} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
            
            let activeCheckpoint: any = null;
            if (typeof (this.domain as any)?.serializePlayerState === 'function') {
                const pState = (this.domain as any).serializePlayerState();
                if (pState) {
                    activeCheckpoint = {
                        mapId: 'vilgem',
                        timestamp: Date.now(),
                        player: pState
                    };
                }
            }

            const charLvl = activeCheckpoint?.player?.level ?? activeCheckpoint?.player?.attributes?.level ?? 1;
            const metaState = (this.domain as any)?.metaProgressionManager?.getGlobalState?.() ?? null;
            const pState = activeCheckpoint?.player ?? null;
            const slotPayload = {
                slot,
                characterName: slot === 1 ? `Aventureiro (Nvl ${charLvl})` : `Sonhador ${slot} (Nvl ${charLvl})`,
                cycle: 1,
                world: activeCheckpoint?.mapId || 'Vilgem',
                savedAt: dateStr,
                globalMetaSummary: this.domain?.globalMetaSummary ?? { stats: [], brooches: [] },
                playerState: pState,
                metaProgressionState: metaState,
                activeCheckpoint: activeCheckpoint,
                checkpoint: activeCheckpoint
            };

            const jsonStr = JSON.stringify(slotPayload);
            try {
                await safeInvoke('save_game_slot', { slot, payload: jsonStr }).catch(() => {});
            } catch (e) {}
            try {
                localStorage.setItem(`game_slot_${slot}`, jsonStr);
                localStorage.setItem('saved_game_state', jsonStr);
            } catch (e) {}

            await this.setActiveSlot(slot, true);
            await ConfirmationModal.alert({
                title: 'Gravação Concluída',
                message: `Progresso gravado com sucesso no Slot ${slot}!`,
                variant: 'success'
            });
            await renderSlots();
        };

        const deleteSlot = async (slot: number) => {
            const confirmed = await ConfirmationModal.confirm({
                title: 'Apagar Save',
                message: `Tem certeza que deseja apagar o Save do Slot ${slot}? Esta memória será perdida para sempre.`,
                confirmText: 'Apagar Memória',
                cancelText: 'Cancelar',
                variant: 'danger'
            });
            if (confirmed) {
                try {
                    await safeInvoke('delete_game_slot', { slot }).catch(() => {});
                } catch (e) {}
                try {
                    localStorage.removeItem(`game_slot_${slot}`);
                } catch (e) {}

                if (slot === 1) {
                    try {
                        localStorage.removeItem('saved_game_state');
                        localStorage.removeItem('savegame');
                    } catch (e) {}
                }

                // Verifica se restou algum save gravado nos outros slots
                let firstRemainingSlot: number | null = null;
                for (let s = 1; s <= 5; s++) {
                    if (s === slot) continue;
                    const data = await this.loadSlotDataFromAnySource(s);
                    if (data) {
                        firstRemainingSlot = s;
                        break;
                    }
                }

                if (!firstRemainingSlot) {
                    // Nenhum save restante: cria automaticamente um save padrão no Slot 1 e o ativa
                    await this.createAndPersistDefaultSlot(1);
                    await this.setActiveSlot(1, true);
                } else if (this.activeSlot === slot) {
                    // O slot ativo foi apagado mas existem outros: ativa o primeiro save disponível
                    await this.setActiveSlot(firstRemainingSlot, true);
                } else {
                    // Slot não-ativo apagado: apenas sincroniza UI
                    await this.setActiveSlot(this.activeSlot, true);
                }

                await ConfirmationModal.alert({
                    title: 'Memória Excluída',
                    message: `Save do Slot ${slot} apagado.`,
                    variant: 'info'
                });
                await renderSlots();
            }
        };

        const renderSlots = async () => {
            const stack = this.container.querySelector('#ds-save-slots-stack');
            if (!stack) return;
            stack.innerHTML = '';

            const defaultClasses = [
                { name: 'O Aventureiro de Vilgem', icon: '', classId: 'warrior' },
                { name: 'O Arcanista das Sombras', icon: '', classId: 'mage' },
                { name: 'O Pescador do Crepúsculo', icon: '', classId: 'pescador' },
                { name: 'O Caçador Renegado', icon: '', classId: 'gunslinger' },
                { name: 'O Mestre dos Ossos', icon: '', classId: 'necromancer' }
            ];

            // Carrega antecipadamente todos os slots para determinar o primeiro slot por saveId
            const allSystemSlots: { slot: number; slotData: any; saveId?: string }[] = [];
            const systemFirstSlotBySaveId = new Map<string, number>();

            for (let slot = 1; slot <= 5; slot++) {
                const slotData = await this.loadSlotDataFromAnySource(slot);
                const sId = slotData?.saveId || slotData?.activeCheckpoint?.saveId || slotData?.checkpoint?.saveId || null;
                allSystemSlots.push({ slot, slotData, saveId: sId || undefined });
                if (sId && !systemFirstSlotBySaveId.has(sId)) {
                    systemFirstSlotBySaveId.set(sId, slot);
                }
            }

            for (const item of allSystemSlots) {
                const { slot, slotData, saveId } = item;
                const card = document.createElement('div');
                const hasSave = Boolean(slotData);
                const isActiveSlot = (this.activeSlot === slot);
                card.className = `ds-slot-card ${hasSave ? 'has-save' : 'is-empty'} ${isActiveSlot ? 'is-active-save-slot' : ''}`;
                card.setAttribute('data-slot', slot.toString());

                const defaultInfo = defaultClasses[(slot - 1) % defaultClasses.length]!;
                const title = slotData?.characterName || slotData?.title || defaultInfo.name;
                const cycle = slotData?.cycle || 
                              slotData?.activeCheckpoint?.cycle || 
                              slotData?.checkpoint?.cycle || 
                              slotData?.metaProgressionState?.treeGenerationCount || 
                              slotData?.activeCheckpoint?.metaProgressionState?.treeGenerationCount || 
                              slotData?.checkpoint?.metaProgressionState?.treeGenerationCount || 
                              slotData?.day || 
                              1;
                const world = slotData?.world || slotData?.activeCheckpoint?.mapId || slotData?.checkpoint?.mapId || 'Vilgem';

                // Consolida broches desbloqueados e equipados no slotData
                const broochSet = new Set<string>();
                const registerBrooch = (b: any) => {
                    const id = typeof b === 'string' ? b : b?.id;
                    if (id && typeof id === 'string' && id.startsWith('brooch_')) broochSet.add(id);
                };

                const p = slotData?.player || slotData?.playerState || slotData?.activeCheckpoint?.player || slotData?.checkpoint?.player || {};
                const pClasses = p?.classes || slotData?.classes || {};
                (pClasses.globalActiveLoadout || []).forEach(registerBrooch);
                (pClasses.passiveLoadout || []).forEach(registerBrooch);
                (slotData?.globalActiveLoadout || []).forEach(registerBrooch);
                (slotData?.passiveLoadout || []).forEach(registerBrooch);
                (slotData?.metaProgressionState?.unlockedBrooches || []).forEach(registerBrooch);
                (slotData?.activeCheckpoint?.metaProgressionState?.unlockedBrooches || []).forEach(registerBrooch);
                (slotData?.checkpoint?.metaProgressionState?.unlockedBrooches || []).forEach(registerBrooch);
                (slotData?.globalMetaSummary?.brooches || []).forEach(registerBrooch);
                (slotData?.brooches || []).forEach(registerBrooch);

                const broochesCount = hasSave 
                    ? (broochSet.size > 0 ? broochSet.size : (slotData?.globalMetaSummary?.brooches?.length ?? slotData?.brooches?.length ?? 0))
                    : 0;
                const dateStr = slotData?.savedAt || slotData?.timestamp || '12/09 19:10';

                const isAutoSaveTarget = Boolean(saveId && systemFirstSlotBySaveId.get(saveId) === slot);
                const autoSaveBadgeHtml = isAutoSaveTarget ? `
                    <div class="ds-badge-autosave-container">
                        <span class="ds-badge-autosave">Auto-Save Ativo</span>
                        <div class="ds-floating-message">
                            <strong>Save Principal Vinculado:</strong><br>
                            Este save será sobreposto automaticamente pelas gravações contínuas desta jornada (saveId: <em>${saveId}</em>).
                        </div>
                    </div>
                ` : '';

                if (hasSave) {
                    card.innerHTML = `
                        <div class="ds-slot-ribbon">
                            <span class="ds-slot-ribbon-text">SLOT ${slot}</span>
                        </div>
                        
                        <div class="ds-cameo-frame">
                            <div class="ds-cameo-inner">
                                <svg class="ds-cameo-avatar" viewBox="0 0 100 120" fill="none">
                                    <circle cx="50" cy="40" r="24" fill="#c49a6c" stroke="#3a192a" stroke-width="2"/>
                                    <path d="M15 105 C15 70, 85 70, 85 105 Z" fill="#4e2c1d" stroke="#2b140b" stroke-width="2"/>
                                    <circle cx="43" cy="38" r="3.5" fill="#111"/>
                                    <circle cx="57" cy="38" r="3.5" fill="#111"/>
                                    <path d="M46 50 Q50 54 54 50" stroke="#222" stroke-width="2" stroke-linecap="round"/>
                                    ${defaultInfo.icon ? `<text x="50" y="85" font-size="20" text-anchor="middle">${defaultInfo.icon}</text>` : ''}
                                </svg>
                            </div>
                        </div>

                        <div class="ds-slot-body">
                            <div class="ds-slot-header-row">
                                <h3 class="ds-slot-title">${title}</h3>
                                <span class="ds-slot-badge-mode">Partida Salva</span>
                                ${isActiveSlot ? '<span class="ds-badge-active-slot">Save Ativo</span>' : ''}
                                ${autoSaveBadgeHtml}
                            </div>
                            
                            <div class="ds-slot-meta-row">
                                <span class="ds-meta-pill"><strong>Ciclo:</strong> ${cycle}</span>
                                <span class="ds-meta-pill"><strong>Local:</strong> ${world}</span>
                                <span class="ds-meta-pill"><strong>Broches:</strong> ${broochesCount}</span>
                                <span class="ds-meta-pill ds-date">${dateStr}</span>
                            </div>
                        </div>

                        <div class="ds-slot-actions">
                            ${!isActiveSlot ? `
                            <button class="btn-ds-set-active" data-slot="${slot}" title="Definir este save como ativo no Menu Principal">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                                <span>Tornar Ativo</span>
                            </button>` : ''}
                            <button class="btn-ds-load" data-slot="${slot}" title="Retomar a jornada deste ponto">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                                <span>Retomar</span>
                            </button>
                            <button class="btn-ds-new-in-slot" data-slot="${slot}" title="Iniciar um novo save limpo neste slot">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                <span>Novo Jogo</span>
                            </button>
                            <button class="btn-ds-save-here" data-slot="${slot}" title="Sobrescrever com o progresso atual">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path></svg>
                                <span>Salvar</span>
                            </button>
                            <button class="btn-ds-export" data-slot="${slot}" title="Exportar save deste slot">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                            </button>
                            <button class="btn-ds-delete" data-slot="${slot}" title="Apagar permanentemente este registro">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            </button>
                        </div>
                    `;

                    card.style.cursor = 'pointer';
                    card.onclick = async () => {
                        if (this.activeSlot !== slot) {
                            await this.setActiveSlot(slot, true);
                            await renderSlots();
                        }
                    };

                    const btnSetActive = card.querySelector('.btn-ds-set-active') as HTMLButtonElement;
                    if (btnSetActive) {
                        btnSetActive.onclick = async (e) => {
                            e.stopPropagation();
                            await this.setActiveSlot(slot, true);
                            await renderSlots();
                        };
                    }

                    const btnLoad = card.querySelector('.btn-ds-load') as HTMLButtonElement;
                    if (btnLoad) {
                        btnLoad.onclick = async (e) => {
                            e.stopPropagation();
                            await this.setActiveSlot(slot, false);
                            const cp = slotData?.activeCheckpoint || slotData?.checkpoint;
                            this.container.style.display = 'none';
                            if (cp) {
                                cp.slot = slot;
                                const p = cp.player || {};
                                this.onStartGameCallback(
                                    cp.mapId || 'vilgem',
                                    p.activeLoadout || p.classes?.activeLoadout || [],
                                    p.passiveLoadout || p.classes?.passiveLoadout || [],
                                    cp
                                );
                            } else {
                                this.onStartGameCallback('vilgem', [], [], { slot });
                            }
                        };
                    }

                    const btnNewInSlot = card.querySelector('.btn-ds-new-in-slot') as HTMLButtonElement;
                    if (btnNewInSlot) {
                        btnNewInSlot.onclick = async (e) => {
                            e.stopPropagation();
                            const confirmed = await ConfirmationModal.confirm({
                                title: 'Novo Registro',
                                message: `Deseja criar um novo save limpo no Slot ${slot}? O progresso atual gravado neste slot será substituído.`,
                                confirmText: 'Criar Novo Save',
                                cancelText: 'Cancelar',
                                variant: 'warning'
                            });
                            if (confirmed) {
                                await this.createAndPersistDefaultSlot(slot);
                                await this.setActiveSlot(slot, true);
                                await renderSlots();
                            }
                        };
                    }

                    const btnSaveHere = card.querySelector('.btn-ds-save-here') as HTMLButtonElement;
                    if (btnSaveHere) {
                        btnSaveHere.onclick = async (e) => {
                            e.stopPropagation();
                            await saveToSlot(slot);
                            await this.setActiveSlot(slot, true);
                            await renderSlots();
                        };
                    }

                    const btnExp = card.querySelector('.btn-ds-export') as HTMLButtonElement;
                    if (btnExp) {
                        btnExp.onclick = (e) => {
                            e.stopPropagation();
                            const str = btoa(JSON.stringify(slotData));
                            openExportDrawer(`Save - Slot ${slot}`, str);
                        };
                    }

                    const btnDel = card.querySelector('.btn-ds-delete') as HTMLButtonElement;
                    if (btnDel) {
                        btnDel.onclick = (e) => {
                            e.stopPropagation();
                            deleteSlot(slot);
                        };
                    }
                } else {
                    card.innerHTML = `
                        <div class="ds-slot-ribbon empty">
                            <span class="ds-slot-ribbon-text">SLOT ${slot}</span>
                        </div>
                        
                        <div class="ds-cameo-frame empty">
                            <div class="ds-cameo-inner">
                                <svg class="ds-cameo-avatar empty" viewBox="0 0 100 120" fill="none">
                                    <circle cx="50" cy="40" r="20" stroke="rgba(241, 198, 170, 0.4)" stroke-width="2" stroke-dasharray="4 4" fill="none"/>
                                    <path d="M30 95 C30 75, 70 75, 70 95" stroke="rgba(241, 198, 170, 0.4)" stroke-width="2" stroke-dasharray="4 4" fill="none"/>
                                    <text x="50" y="47" font-size="20" fill="rgba(241, 198, 170, 0.5)" text-anchor="middle" font-family="monospace">?</text>
                                </svg>
                            </div>
                        </div>

                        <div class="ds-slot-body">
                            <div class="ds-slot-header-row">
                                <h3 class="ds-slot-title empty">Slot Vazio</h3>
                                <span class="ds-slot-badge-mode empty">Disponível</span>
                                ${isActiveSlot ? '<span class="ds-badge-active-slot">Save Ativo</span>' : ''}
                            </div>
                            <p class="ds-slot-desc-empty">Nenhum progresso gravado neste slot. Crie um novo save limpo ou grave seu progresso aqui.</p>
                        </div>

                        <div class="ds-slot-actions">
                            ${!isActiveSlot ? `
                            <button class="btn-ds-set-active empty" data-slot="${slot}" title="Definir este slot vazio como ativo">
                                <span>Tornar Ativo</span>
                            </button>` : ''}
                            <button class="btn-ds-new" data-slot="${slot}" title="Criar novo save limpo do zero neste slot">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                <span>Criar Save</span>
                            </button>
                            <button class="btn-ds-save-here empty" data-slot="${slot}" title="Gravar a jornada atual da memória neste slot">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path></svg>
                                <span>Gravar Aqui</span>
                            </button>
                            <button class="btn-ds-import-here" data-slot="${slot}" title="Restaurar um save neste slot">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                <span>Importar</span>
                            </button>
                        </div>
                    `;

                    card.style.cursor = 'pointer';
                    card.onclick = async () => {
                        if (this.activeSlot !== slot) {
                            await this.setActiveSlot(slot, true);
                            await renderSlots();
                        }
                    };

                    const btnSetActiveEmpty = card.querySelector('.btn-ds-set-active') as HTMLButtonElement;
                    if (btnSetActiveEmpty) {
                        btnSetActiveEmpty.onclick = async (e) => {
                            e.stopPropagation();
                            await this.setActiveSlot(slot, true);
                            await renderSlots();
                        };
                    }

                    const btnNew = card.querySelector('.btn-ds-new') as HTMLButtonElement;
                    if (btnNew) {
                        btnNew.onclick = async (e) => {
                            e.stopPropagation();
                            await this.createAndPersistDefaultSlot(slot);
                            await this.setActiveSlot(slot, true);
                            await renderSlots();
                        };
                    }

                    const btnSaveHereEmpty = card.querySelector('.btn-ds-save-here') as HTMLButtonElement;
                    if (btnSaveHereEmpty) {
                        btnSaveHereEmpty.onclick = async (e) => {
                            e.stopPropagation();
                            await saveToSlot(slot);
                            await this.setActiveSlot(slot, true);
                            await renderSlots();
                        };
                    }

                    const btnImpHere = card.querySelector('.btn-ds-import-here') as HTMLButtonElement;
                    if (btnImpHere) {
                        btnImpHere.onclick = (e) => {
                            e.stopPropagation();
                            openImportDrawer(slot);
                        };
                    }
                }

                stack.appendChild(card);
            }
            this.updateActiveSlotBanner();
        };

        renderSlots();
    }

    private async setupModelManager(): Promise<void> {
        const activeDisplay = document.getElementById('llm-active-display');
        const pullInput = document.getElementById('llm-pull-input') as HTMLInputElement;
        const btnPull = document.getElementById('btn-pull-model') as HTMLButtonElement;
        const pullProgress = document.getElementById('llm-pull-progress');
        const btnRefresh = document.getElementById('btn-refresh-models');
        const progressContainer = document.getElementById('llm-pull-progress-container');
        const progressBar = document.getElementById('llm-pull-bar');
        const percentEl = document.getElementById('llm-pull-percent');
        const statusLabel = document.getElementById('ollama-status-label');
        const daemonChip = document.getElementById('ollama-daemon-status');
        const countBadge = document.getElementById('installed-models-count');
        const catalogGrid = document.getElementById('ollama-catalog-grid');
        const searchInput = document.getElementById('catalog-search-input') as HTMLInputElement;
        const btnRefreshCatalog = document.getElementById('btn-refresh-catalog');
        const catalogStatusBadge = document.getElementById('catalog-status-badge');

        interface CatalogModelItem {
            id: string;
            name: string;
            description: string;
            tags: string[];
            pulls?: string;
        }

        const DEFAULT_FALLBACK_CATALOG: CatalogModelItem[] = [
            {
                id: 'qwen2.5:0.5b',
                name: 'qwen2.5:0.5b',
                description: 'Ultraleve e instantâneo (~398 MB). Ideal para diálogos dinâmicos de NPCs sem perda de FPS.',
                tags: ['recomendado', '0.5b', 'latência <80ms'],
                pulls: '25.4M'
            },
            {
                id: 'qwen2.5:1.5b',
                name: 'qwen2.5:1.5b',
                description: 'Excelente equilíbrio entre raciocínio e velocidade (~986 MB). Respostas ricas para NPCs centrais.',
                tags: ['equilibrado', '1.5b', 'raciocínio'],
                pulls: '20.1M'
            },
            {
                id: 'llama3.2:1b',
                name: 'llama3.2:1b',
                description: 'Modelo moderno da Meta de baixo consumo (~1.3 GB). Vocabulário amplo e ótima interpretação.',
                tags: ['meta', '1b', 'compacto'],
                pulls: '55.2M'
            },
            {
                id: 'llama3.2:3b',
                name: 'llama3.2:3b',
                description: 'Expressividade narrativa de alta fidelidade (~2.0 GB). Ideal para lore complexa e interações BDI.',
                tags: ['meta', '3b', 'lore'],
                pulls: '42.8M'
            },
            {
                id: 'deepseek-r1:1.5b',
                name: 'deepseek-r1:1.5b',
                description: 'Destilado com forte capacidade de raciocínio lógico e cadeia de pensamento (Chain-of-Thought).',
                tags: ['thinking', '1.5b', 'raciocínio'],
                pulls: '78.9M'
            },
            {
                id: 'gemma2:2b',
                name: 'gemma2:2b',
                description: 'Modelo compacto do Google (~1.6 GB) com precisão cirúrgica de regras contextuais.',
                tags: ['google', '2b', 'alta precisão'],
                pulls: '31.5M'
            },
            {
                id: 'phi3:mini',
                name: 'phi3:mini',
                description: 'Modelo sintético da Microsoft (~2.2 GB) treinado para coerência e raciocínio condensado.',
                tags: ['microsoft', '3.8b', 'coerência'],
                pulls: '28.0M'
            },
            {
                id: 'qwen2.5:7b',
                name: 'qwen2.5:7b',
                description: 'O Rei Absoluto para High-End (~4.7 GB). Raciocínio tático cirúrgico, auto-regeneração de planos AgentSpeak (-!G) e resistência a jailbreak.',
                tags: ['high-end', '7b', 'rei absoluto', 'vram >= 8gb'],
                pulls: '45.1M'
            },
            {
                id: 'qwen2.5:14b',
                name: 'qwen2.5:14b',
                description: 'Nível de sofisticação comparável ao GPT-4o-mini (~9.0 GB). Indicado para GPUs com 16GB a 24GB de VRAM.',
                tags: ['entusiasta', '14b', 'vram >= 16gb'],
                pulls: '18.7M'
            },
            {
                id: 'hermes-3:8b',
                name: 'hermes-3:8b',
                description: 'Roleplay profundo e imersão narrativa teatral (~4.9 GB). Fidelidade extrema a personas e closed-world.',
                tags: ['roleplay', '8b', 'nous research', 'vram >= 8gb'],
                pulls: '12.4M'
            },
            {
                id: 'mistral-nemo:12b',
                name: 'mistral-nemo:12b',
                description: 'Parceria Mistral AI + NVIDIA (~7.1 GB). Contexto nativo amplo, tom conciso e excelente capacidade dedutiva.',
                tags: ['nvidia', '12b', 'narrativa', 'vram >= 12gb'],
                pulls: '16.9M'
            },
            {
                id: 'mistral:7b',
                name: 'mistral:7b',
                description: 'Padrão ouro clássico em roleplay e escrita narrativa (~4.1 GB). Recomendado para PCs com GPU dedicada.',
                tags: ['mistral', '7b', 'gpu dedicada'],
                pulls: '64.3M'
            },
            {
                id: 'hf.co/bartowski/Qwen2.5-1.5B-Instruct-GGUF:Q4_K_M',
                name: 'Qwen 2.5 (1.5B) [HF GGUF]',
                description: 'Hugging Face Oficial: Quantização Q4_K_M compacta e ultra rápida rodando direto via prefixo nativo hf.co/ do Ollama.',
                tags: ['huggingface', 'hf.co', 'gguf', 'q4_k_m', '1.5b'],
                pulls: 'HF Hub'
            },
            {
                id: 'hf.co/bartowski/Hermes-3-Llama-3.1-8B-GGUF:Q4_K_M',
                name: 'Hermes 3 (8B) [HF GGUF]',
                description: 'Hugging Face Oficial: Roleplay e narrativa teatral com persona adherence extrema compilada pela comunidade no Hugging Face Hub.',
                tags: ['huggingface', 'hf.co', 'gguf', 'roleplay', '8b'],
                pulls: 'HF Hub'
            },
            {
                id: 'hf.co/bartowski/Mistral-Nemo-Instruct-2407-GGUF:Q4_K_M',
                name: 'Mistral Nemo (12B) [HF GGUF]',
                description: 'Hugging Face Oficial: Parceria Mistral + NVIDIA quantizada em GGUF com contexto amplo e respostas táticas.',
                tags: ['huggingface', 'hf.co', 'gguf', 'nvidia', '12b'],
                pulls: 'HF Hub'
            }
        ];

        let catalogModels: CatalogModelItem[] = [];
        let installedModels: string[] = [];
        let activeCategoryFilter: string = 'all';
        let currentSearchQuery: string = '';

        const updateActiveDisplay = () => {
            if (!activeDisplay) return;
            const modelStr = typeof this.currentModel === 'string' ? this.currentModel : String(this.currentModel || 'qwen2.5:0.5b');
            const modelPrefix = modelStr.split(':')[0];
            const isInstalled = installedModels.some(m => typeof m === 'string' && (m === modelStr || m.split(':')[0] === modelPrefix));
            if (installedModels.length === 0) {
                activeDisplay.textContent = 'Nenhum baixado';
                activeDisplay.style.color = '#aaa';
            } else if (!isInstalled) {
                activeDisplay.textContent = `${modelStr} (Não instalado)`;
                activeDisplay.style.color = '#ffaa00';
            } else {
                activeDisplay.textContent = modelStr;
                activeDisplay.style.color = 'var(--accent-gold)';
            }
        };

        try {
            this.currentModel = await invoke<string>('get_active_model').catch(() => 'qwen2.5:0.5b');
            updateActiveDisplay();
        } catch (e) {
            console.error(e);
        }

        const renderCatalog = () => {
            if (!catalogGrid) return;

            const query = currentSearchQuery.toLowerCase().trim();
            const filtered = catalogModels.filter(item => {
                // Filtro por texto de busca
                const matchesSearch = !query || 
                    item.id.toLowerCase().includes(query) || 
                    item.description.toLowerCase().includes(query) || 
                    item.tags.some(t => t.toLowerCase().includes(query));

                if (!matchesSearch) return false;

                // Filtro por categoria / pill
                if (activeCategoryFilter === 'all') return true;
                if (activeCategoryFilter === 'highend') {
                    return item.tags.some(t => ['high-end', '7b', '8b', '12b', '14b', 'gpu dedicada', 'rei absoluto'].includes(t.toLowerCase())) ||
                           item.id.includes('7b') || item.id.includes('8b') || item.id.includes('12b') || item.id.includes('14b');
                }
                if (activeCategoryFilter === 'huggingface') {
                    return item.id.includes('hf.co') || item.id.includes('huggingface') || item.tags.some(t => ['huggingface', 'hf.co', 'gguf'].includes(t.toLowerCase()));
                }
                if (activeCategoryFilter === 'roleplay') {
                    return item.tags.some(t => ['roleplay', 'narrativa', 'lore'].includes(t.toLowerCase())) ||
                           item.id.includes('hermes') || item.id.includes('mistral');
                }
                if (activeCategoryFilter === 'light') {
                    return item.tags.some(t => ['0.5b', '1b', '1.5b', '2b', 'compacto', 'recomendado'].includes(t.toLowerCase())) ||
                           item.id.includes('0.5b') || item.id.includes('1b') || item.id.includes('1.5b') || item.id.includes('2b');
                }
                if (activeCategoryFilter === 'qwen') return item.id.toLowerCase().includes('qwen');
                if (activeCategoryFilter === 'llama') return item.id.toLowerCase().includes('llama');
                if (activeCategoryFilter === 'deepseek') return item.id.toLowerCase().includes('deepseek');
                if (activeCategoryFilter === 'mistral') return item.id.toLowerCase().includes('mistral');

                return true;
            });

            if (filtered.length === 0) {
                catalogGrid.innerHTML = `
                    <div class="catalog-loading-state">
                        <span>Nenhum modelo encontrado para o filtro "${currentSearchQuery || activeCategoryFilter}".</span>
                    </div>
                `;
                return;
            }

            catalogGrid.innerHTML = '';
            filtered.forEach(item => {
                // Correspondência de modelo instalado: id exato ou prefixado (ex: item 'qwen2.5:0.5b' ou 'qwen2.5' com tag instalada 'qwen2.5:0.5b')
                const matchedInstalled = installedModels.find(m => 
                    m === item.id || 
                    (item.id.includes(':') ? false : m.startsWith(`${item.id}:`))
                );
                const isInstalled = Boolean(matchedInstalled);
                // Um modelo SÓ pode ser ativo se ele estiver EFETIVAMENTE instalado na máquina
                const isActive = isInstalled && (
                    this.currentModel === item.id || 
                    (matchedInstalled !== undefined && this.currentModel === matchedInstalled) ||
                    (!item.id.includes(':') && this.currentModel.startsWith(`${item.id}:`))
                );

                const card = document.createElement('div');
                card.className = `catalog-model-card ${isInstalled ? 'installed' : ''} ${isActive ? 'active-model' : ''}`;

                const tagsHtml = item.tags.slice(0, 3).map(t => `<span class="tag-badge">${t}</span>`).join('');
                const pullsHtml = item.pulls ? `
                    <span class="catalog-pulls-badge">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                        ${item.pulls}
                    </span>
                ` : '';

                card.innerHTML = `
                    <div class="catalog-card-header">
                        <h4 class="catalog-model-title">${item.id}</h4>
                        ${pullsHtml}
                    </div>
                    <p class="catalog-card-desc">${item.description || 'Modelo neural disponível na biblioteca Ollama.'}</p>
                    <div class="catalog-tags-row">
                        ${tagsHtml}
                    </div>
                    <div class="catalog-card-footer">
                        <span style="font-size: 13px; color: #aaa;">
                            ${isInstalled ? (isActive ? 'Modelo Ativo' : 'Disponível localmente') : 'Ollama Library'}
                        </span>
                        <button class="btn-card-pull ${isActive ? 'btn-active' : isInstalled ? 'btn-installed' : ''}" data-model="${item.id}">
                            ${isActive ? 'Em Uso' : isInstalled ? 'Usar Modelo' : 'Baixar (Pull)'}
                        </button>
                    </div>
                `;

                const btnAction = card.querySelector('.btn-card-pull') as HTMLButtonElement;
                if (btnAction) {
                    if (isActive) {
                        btnAction.disabled = true;
                    } else if (isInstalled) {
                        btnAction.onclick = async () => {
                            // Ativa o modelo instalado correspondente
                            const targetModel = matchedInstalled || item.id;
                            await invoke('set_active_model', { model: targetModel }).catch(() => {});
                            this.currentModel = targetModel;
                            updateActiveDisplay();
                            this.unlockSonharBtn();
                            await ConfirmationModal.alert({
                                title: 'Modelo Ativado',
                                message: `Modelo '${targetModel}' ativado! O jogo aplicará as decisões cognitivas.`,
                                variant: 'success'
                            });
                            loadModels();
                        };
                    } else {
                        btnAction.onclick = () => {
                            // Se tiver tags como 0.5b ou 1b, sugere a versão leve
                            let targetId = item.id;
                            if (!targetId.includes(':')) {
                                const preferredTag = item.tags.find(t => ['0.5b', '1b', '1.5b', '2b'].includes(t.toLowerCase()));
                                if (preferredTag) {
                                    targetId = `${item.id}:${preferredTag.toLowerCase()}`;
                                }
                            }
                            if (pullInput) {
                                pullInput.value = targetId;
                                pullInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                pullInput.focus();
                            }
                            btnPull.click();
                        };
                    }
                }

                catalogGrid.appendChild(card);
            });
        };

        const parseOllamaHtmlInBrowser = (html: string): CatalogModelItem[] => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const links = doc.querySelectorAll('a[href*="/library/"]');
            const items: CatalogModelItem[] = [];
            links.forEach(a => {
                const href = a.getAttribute('href') || '';
                const match = href.match(/\/library\/([a-zA-Z0-9._-]+)/);
                if (!match || !match[1]) return;
                const id = match[1];
                if (items.some(m => m.id === id)) return;

                const titleEl = a.querySelector('h2') || a.querySelector('h3') || a.querySelector('span');
                const name = titleEl?.textContent?.trim() || id;

                const descEl = a.querySelector('p');
                const description = descEl?.textContent?.trim() || '';

                const tags: string[] = [];
                a.querySelectorAll('span').forEach(s => {
                    const txt = s.textContent?.trim() || '';
                    if (txt && txt.length < 25 && !txt.includes('\n') && !txt.includes('Pulls') && !txt.includes('Updated') && !txt.includes('Tag')) {
                        tags.push(txt);
                    }
                });

                let pulls = '';
                const allSpans = Array.from(a.querySelectorAll('span'));
                for (let i = 0; i < allSpans.length; i++) {
                    if (allSpans[i]?.textContent?.includes('Pull')) {
                        const prev = allSpans[i - 1];
                        if (prev && prev.textContent) {
                            pulls = prev.textContent.trim();
                        }
                        break;
                    }
                }

                items.push({ id, name, description, tags, pulls });
            });
            return items;
        };

        const fetchLibraryModels = async (): Promise<void> => {
            if (catalogStatusBadge) catalogStatusBadge.textContent = 'Buscando do site...';

            // 1. Tenta comando nativo do Tauri (bypassa CORS diretamente e consulta /search + /library)
            try {
                const tauriModels = await safeInvoke<CatalogModelItem[]>('fetch_ollama_library');
                if (tauriModels && tauriModels.length > 0) {
                    catalogModels = tauriModels;
                    if (catalogStatusBadge) catalogStatusBadge.textContent = `${catalogModels.length} modelos (ollama.com)`;
                    renderCatalog();
                    return;
                }
            } catch (e) {
                console.warn('[Ollama Library] Tauri fetch indisponível, tentando proxy web...');
            }

            // 2. Se estiver em ambiente web/Storybook, busca via proxy Vite (/ollama-search e /ollama-library)
            try {
                const searchRes = await fetch('/ollama-search').catch(() => null);
                if (searchRes && searchRes.ok) {
                    const html = await searchRes.text();
                    const parsed = parseOllamaHtmlInBrowser(html);
                    if (parsed.length > 0) {
                        const libRes = await fetch('/ollama-library').catch(() => null);
                        if (libRes && libRes.ok) {
                            const libHtml = await libRes.text();
                            const libParsed = parseOllamaHtmlInBrowser(libHtml);
                            libParsed.forEach(m => {
                                if (!parsed.some(existing => existing.id === m.id)) {
                                    parsed.push(m);
                                }
                            });
                        }
                        catalogModels = parsed;
                        if (catalogStatusBadge) catalogStatusBadge.textContent = `${catalogModels.length} modelos (ollama.com live)`;
                        renderCatalog();
                        return;
                    }
                }
            } catch (err) {
                console.warn('[Ollama Library] Falha ao consultar proxy web do site:', err);
            }

            // 3. Fallback de catálogo se estiver offline
            catalogModels = DEFAULT_FALLBACK_CATALOG;
            if (catalogStatusBadge) catalogStatusBadge.textContent = `${catalogModels.length} modelos (offline)`;
            renderCatalog();
        };

        // Filtros de categoria por clique
        const filterBtns = document.querySelectorAll('.filter-pill-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                activeCategoryFilter = btn.getAttribute('data-filter') || 'all';
                renderCatalog();
            });
        });

        // Campo de busca em tempo real com busca remota dinâmica
        let searchDebounceTimeout: any = null;
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                currentSearchQuery = searchInput.value;
                renderCatalog();

                clearTimeout(searchDebounceTimeout);
                const q = currentSearchQuery.trim();
                if (q.length >= 2) {
                    searchDebounceTimeout = setTimeout(async () => {
                        try {
                            const results = await safeInvoke<CatalogModelItem[]>('search_ollama_models', { query: q })
                                .catch(async () => {
                                    const res = await fetch(`/ollama-search?q=${encodeURIComponent(q)}`);
                                    if (res.ok) return parseOllamaHtmlInBrowser(await res.text());
                                    return [];
                                });
                            if (results && results.length > 0) {
                                results.forEach(item => {
                                    if (!catalogModels.some(m => m.id === item.id)) {
                                        catalogModels.push(item);
                                    }
                                });
                                renderCatalog();
                            }
                        } catch (e) {}
                    }, 400);
                }
            });
        }

        // Botão de recarregar catálogo
        if (btnRefreshCatalog) {
            btnRefreshCatalog.onclick = () => fetchLibraryModels();
        }

        const loadModels = async () => {
            const health = await checkOllamaHealth();
            installedModels = health.models;
            const list = (typeof document !== 'undefined') ? (this.container?.querySelector('#llm-models-list') as HTMLElement || document.getElementById('llm-models-list')) : null;
            if (list) list.innerHTML = '';

            // Atualiza status do daemon
            if (daemonChip && statusLabel) {
                const dot = daemonChip.querySelector('.status-dot');
                if (dot) {
                    dot.className = `status-dot ${health.online ? 'online' : 'offline'}`;
                }
                statusLabel.textContent = health.online 
                    ? 'Ollama: Online (127.0.0.1:11434)' 
                    : 'Ollama: Offline (Daemon inativo)';
            }

            if (countBadge) {
                countBadge.textContent = health.models.length.toString();
            }

            updateActiveDisplay();
            renderCatalog();

            if (!list) return;

            if (!health.online) {
                list.innerHTML = '<li style="color: #ff5555; padding: 16px; text-align: center; font-size: 14px;">Serviço Ollama não detectado em localhost:11434.<br><small style="color: var(--ui-text-primary); opacity: 0.7;">Inicie o comando "ollama serve" no seu terminal para ativar.</small></li>';
                return;
            }

            if (health.models.length === 0) {
                list.innerHTML = '<li style="color: var(--ui-text-primary); opacity: 0.6; padding: 18px; text-align: center; font-size: 14px; font-style: italic;">Nenhum modelo baixado ainda.<br>Escolha um modelo do catálogo abaixo para iniciar.</li>';
                return;
            }

            health.models.forEach(model => {
                const li = document.createElement('li');
                const isCurrent = model === this.currentModel;
                li.className = `model-list-item ${isCurrent ? 'is-active' : ''}`;

                li.innerHTML = `
                    <div class="model-item-info">
                        <span class="model-item-name">
                            ${model}
                            ${isCurrent ? '<span class="active-tag">Ativo</span>' : ''}
                        </span>
                        <span class="model-item-meta">Armazenamento Local</span>
                    </div>
                    <div class="model-item-actions">
                        ${!isCurrent ? `<button class="btn-retro-primary btn-use-model" data-model="${model}">Usar</button>` : ''}
                        <button class="btn-delete-retro" data-model="${model}" title="Excluir modelo">Excluir</button>
                    </div>
                `;

                const btnUse = li.querySelector('.btn-use-model') as HTMLButtonElement;
                if (btnUse) {
                    btnUse.onclick = async () => {
                        await invoke('set_active_model', { model }).catch(() => {});
                        this.currentModel = model;
                        updateActiveDisplay();
                        this.unlockSonharBtn();
                        loadModels();
                    };
                }

                const btnDel = li.querySelector('.btn-delete-retro') as HTMLButtonElement;
                if (btnDel) {
                    btnDel.onclick = async () => {
                        const confirmed = await ConfirmationModal.confirm({
                            title: 'Excluir Modelo',
                            message: `Tem certeza que deseja excluir permanentemente o modelo '${model}' do seu computador?`,
                            confirmText: 'Excluir Modelo',
                            cancelText: 'Cancelar',
                            variant: 'danger'
                        });
                        if (confirmed) {
                            try {
                                const res = await fetch('http://127.0.0.1:11434/api/delete', {
                                    method: 'DELETE',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ name: model })
                                });
                                if (res.ok) {
                                    loadModels();
                                } else {
                                    await ConfirmationModal.alert({
                                        title: 'Erro',
                                        message: 'Erro ao deletar modelo.',
                                        variant: 'danger'
                                    });
                                }
                            } catch (e) {
                                await ConfirmationModal.alert({
                                    title: 'Erro de Conexão',
                                    message: 'Erro na conexão com Ollama.',
                                    variant: 'danger'
                                });
                            }
                        }
                    };
                }

                list.appendChild(li);
            });
        };

        if (btnRefresh) {
            btnRefresh.onclick = () => loadModels();
        }
        
        if (btnPull && pullInput) {
            btnPull.onclick = async () => {
                let modelName = pullInput.value.trim();
                if (!modelName) return;

                // Normalização inteligente de links e repositórios Hugging Face para o prefixo nativo Ollama (hf.co/)
                if (modelName.includes('huggingface.co/')) {
                    modelName = modelName.replace(/^https?:\/\/huggingface\.co\//, 'hf.co/').replace(/^huggingface\.co\//, 'hf.co/');
                }

                btnPull.disabled = true;
                btnPull.textContent = 'Baixando...';
                if (progressContainer) progressContainer.style.display = 'flex';
                if (progressBar) progressBar.style.width = '0%';
                if (percentEl) percentEl.textContent = '0%';
                if (pullProgress) {
                    pullProgress.textContent = `Conectando para baixar '${modelName}'...`;
                    pullProgress.style.color = 'var(--accent-gold)';
                }

                try {
                    const response = await fetch('http://127.0.0.1:11434/api/pull', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name: modelName, stream: true })
                    });

                    if (!response.body) throw new Error('Sem corpo de resposta do Ollama');
                    
                    const reader = response.body.getReader();
                    const decoder = new TextDecoder();
                    
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        
                        const chunk = decoder.decode(value, { stream: true });
                        const lines = chunk.split('\n').filter(l => l.trim() !== '');
                        for (const line of lines) {
                            try {
                                const data = JSON.parse(line);
                                if (data.status && pullProgress) {
                                    pullProgress.textContent = data.status;
                                }
                                if (data.total && data.completed) {
                                    const pct = Math.min(100, Math.round((data.completed / data.total) * 100));
                                    if (progressBar) progressBar.style.width = `${pct}%`;
                                    if (percentEl) percentEl.textContent = `${pct}%`;
                                }
                                if (data.error && pullProgress) {
                                    pullProgress.textContent = `Erro: ${data.error}`;
                                    pullProgress.style.color = '#ff4444';
                                    btnPull.disabled = false;
                                    btnPull.textContent = 'Baixar (Pull)';
                                    return;
                                }
                            } catch (parseErr) {
                                // Chunk parcial ignorado
                            }
                        }
                    }
                    
                    if (progressBar) progressBar.style.width = '100%';
                    if (percentEl) percentEl.textContent = '100%';
                    if (pullProgress) {
                        pullProgress.textContent = 'Download concluído com sucesso!';
                        pullProgress.style.color = '#00ff88';
                    }
                    pullInput.value = '';
                    loadModels();
                } catch (error: any) {
                    if (pullProgress) {
                        pullProgress.textContent = `Erro: ${error.message}`;
                        pullProgress.style.color = '#ff4444';
                    }
                } finally {
                    btnPull.disabled = false;
                    btnPull.textContent = 'Baixar (Pull)';
                }
            };
        }

        // Botões de Presets de Hardware Recomendados
        const handlePresetClick = async (targetModel: string, presetName: string, settings: { num_ctx: number; timeout: number; temperature: number; max_tokens: number; stateless: boolean }) => {
            const isInstalled = installedModels.some(m => m === targetModel || m.startsWith(`${targetModel}:`) || targetModel.startsWith(m));
            if (isInstalled) {
                // Ativa o modelo diretamente
                const exactModel = installedModels.find(m => m === targetModel || m.startsWith(`${targetModel}:`) || targetModel.startsWith(m)) || targetModel;
                await invoke('set_active_model', { model: exactModel }).catch(() => {});
                await invoke('save_llm_settings', {
                    settings: {
                        llm_model: exactModel,
                        ...settings
                    }
                }).catch(() => {});
                this.currentModel = exactModel;
                updateActiveDisplay();
                this.unlockSonharBtn();
                loadModels();
            } else {
                // Não está instalado: preenche o campo de download e foca para baixar com 1 clique
                if (pullInput) {
                    pullInput.value = targetModel;
                    pullInput.focus();
                    pullInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                if (pullProgress) {
                    pullProgress.textContent = `Perfil ${presetName} requer o modelo '${targetModel}'. Clique em 'Baixar (Pull)' para instalar.`;
                    pullProgress.style.color = 'var(--accent-gold)';
                }
            }
        };

        const btnPresetEco = document.getElementById('hw-preset-eco');
        if (btnPresetEco) {
            btnPresetEco.onclick = () => handlePresetClick('qwen2.5:0.5b', 'Econômico', {
                num_ctx: 768,
                timeout: 600,
                temperature: 0.5,
                max_tokens: 32,
                stateless: true
            });
        }

        const btnPresetBal = document.getElementById('hw-preset-bal');
        if (btnPresetBal) {
            btnPresetBal.onclick = () => handlePresetClick('qwen2.5:1.5b', 'Equilibrado', {
                num_ctx: 1024,
                timeout: 180,
                temperature: 0.7,
                max_tokens: 96,
                stateless: false
            });
        }

        const btnPresetHigh = document.getElementById('hw-preset-high');
        if (btnPresetHigh) {
            btnPresetHigh.onclick = () => handlePresetClick('qwen2.5:7b', 'High-End', {
                num_ctx: 2048,
                timeout: 120,
                temperature: 0.65,
                max_tokens: 120,
                stateless: false
            });
        }

        // Toggle do Menu de Configurações e Presets Salvos
        const btnToggleConfig = document.getElementById('btn-toggle-config-menu');
        const customPresetContainer = document.getElementById('custom-preset-container');
        if (btnToggleConfig && customPresetContainer) {
            btnToggleConfig.onclick = () => {
                const isHidden = customPresetContainer.classList.contains('is-hidden');
                if (isHidden) {
                    customPresetContainer.classList.remove('is-hidden');
                    btnToggleConfig.classList.add('is-expanded');
                    customPresetContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                } else {
                    customPresetContainer.classList.add('is-hidden');
                    btnToggleConfig.classList.remove('is-expanded');
                }
            };
        }

        // --- 1. Integração do Preset Customizado do Jogador (JSON & Form) ---
        interface UserCustomPreset {
            name?: string;
            llm_model: string;
            timeout: number;
            num_ctx: number;
            temperature: number;
            max_tokens: number;
            stateless: boolean;
        }

        const defaultCustomPreset: UserCustomPreset = {
            llm_model: "qwen2.5:1.5b",
            timeout: 180,
            num_ctx: 1024,
            temperature: 0.65,
            max_tokens: 100,
            stateless: true
        };

        const factoryPresets: (UserCustomPreset & { name: string; isBuiltIn: boolean })[] = [
            {
                name: 'Econômico',
                llm_model: 'qwen2.5:0.5b',
                timeout: 600,
                num_ctx: 768,
                temperature: 0.5,
                max_tokens: 32,
                stateless: true,
                isBuiltIn: true
            },
            {
                name: 'Equilibrado',
                llm_model: 'qwen2.5:1.5b',
                timeout: 180,
                num_ctx: 1024,
                temperature: 0.7,
                max_tokens: 96,
                stateless: false,
                isBuiltIn: true
            },
            {
                name: 'High-End',
                llm_model: 'qwen2.5:7b',
                timeout: 120,
                num_ctx: 2048,
                temperature: 0.65,
                max_tokens: 120,
                stateless: false,
                isBuiltIn: true
            }
        ];

        const customModelInput = document.getElementById('custom-preset-model') as HTMLInputElement;
        const customCtxInput = document.getElementById('custom-preset-ctx') as HTMLInputElement;
        const customTimeoutInput = document.getElementById('custom-preset-timeout') as HTMLInputElement;
        const customTempInput = document.getElementById('custom-preset-temp') as HTMLInputElement;
        const customTokensInput = document.getElementById('custom-preset-tokens') as HTMLInputElement;
        const customStatelessInput = document.getElementById('custom-preset-stateless') as HTMLInputElement;
        const customJsonTextarea = document.getElementById('custom-preset-json') as HTMLTextAreaElement;
        const customSyncIndicator = document.getElementById('json-sync-indicator');
        const customStatusTag = document.getElementById('custom-preset-status');
        const btnSaveCustomPreset = document.getElementById('btn-save-custom-preset');
        const btnCopyCustomPreset = document.getElementById('btn-copy-custom-preset');
        const btnResetCustomPreset = document.getElementById('btn-reset-custom-preset');
        const btnPresetCustomTop = document.getElementById('hw-preset-custom');
        const savedPresetsPillsList = document.getElementById('saved-presets-pills-list');
        const inputNewPresetName = document.getElementById('input-new-preset-name') as HTMLInputElement;
        const btnSaveAsNewPreset = document.getElementById('btn-save-as-new-preset');

        // Carrega preset salvo ou inicializa com o template padrão solicitado
        let currentCustomPreset: UserCustomPreset = defaultCustomPreset;
        try {
            const rawSaved = localStorage.getItem('rpg_custom_llm_preset');
            if (rawSaved) {
                currentCustomPreset = { ...defaultCustomPreset, ...JSON.parse(rawSaved) };
            }
        } catch (e) {}

        const loadSavedPresets = (): UserCustomPreset[] => {
            try {
                const raw = localStorage.getItem('rpg_saved_llm_presets');
                if (raw) return JSON.parse(raw);
            } catch (e) {}
            return [];
        };

        const persistSavedPresets = (list: UserCustomPreset[]) => {
            localStorage.setItem('rpg_saved_llm_presets', JSON.stringify(list));
        };

        const updateCustomUIFromPreset = (p: UserCustomPreset) => {
            if (customModelInput) customModelInput.value = p.llm_model || 'qwen2.5:1.5b';
            if (customCtxInput) customCtxInput.value = String(p.num_ctx || 1024);
            if (customTimeoutInput) customTimeoutInput.value = String(p.timeout || 180);
            if (customTempInput) customTempInput.value = String(p.temperature ?? 0.65);
            if (customTokensInput) customTokensInput.value = String(p.max_tokens || 100);
            if (customStatelessInput) customStatelessInput.checked = Boolean(p.stateless);
            if (customJsonTextarea) {
                customJsonTextarea.value = JSON.stringify(p, null, 2);
            }
            if (customSyncIndicator) {
                customSyncIndicator.textContent = 'Sincronizado';
                customSyncIndicator.className = 'json-sync-ok';
            }
        };

        const getPresetFromInputs = (): UserCustomPreset => {
            return {
                llm_model: customModelInput?.value.trim() || 'qwen2.5:1.5b',
                timeout: parseInt(customTimeoutInput?.value || '180', 10),
                num_ctx: parseInt(customCtxInput?.value || '1024', 10),
                temperature: parseFloat(customTempInput?.value || '0.65'),
                max_tokens: parseInt(customTokensInput?.value || '100', 10),
                stateless: customStatelessInput ? customStatelessInput.checked : true
            };
        };

        // Renderiza as pills de presets salvos pelo usuário em Perfis Recomendados
        const renderSavedPresetsPills = () => {
            if (!savedPresetsPillsList) return;
            savedPresetsPillsList.innerHTML = '';

            const userPresets = loadSavedPresets();
            const hwSavedBar = document.getElementById('hw-saved-presets-bar');
            if (hwSavedBar) {
                hwSavedBar.style.display = userPresets.length > 0 ? 'flex' : 'none';
            }

            userPresets.forEach((p, idx) => {
                const pill = document.createElement('div');
                const isCurrent = currentCustomPreset.llm_model === p.llm_model &&
                                  currentCustomPreset.num_ctx === p.num_ctx &&
                                  currentCustomPreset.max_tokens === p.max_tokens;
                pill.className = `saved-preset-pill ${isCurrent ? 'active' : ''}`;
                pill.title = `Modelo: ${p.llm_model} | ctx: ${p.num_ctx} | timeout: ${p.timeout}s | temp: ${p.temperature} | max_tokens: ${p.max_tokens}`;

                const titleSpan = document.createElement('span');
                titleSpan.textContent = p.name || `Preset #${idx + 1}`;
                pill.appendChild(titleSpan);

                // Clique para usar o preset imediatamente
                titleSpan.onclick = () => {
                    currentCustomPreset = {
                        llm_model: p.llm_model,
                        timeout: p.timeout,
                        num_ctx: p.num_ctx,
                        temperature: p.temperature,
                        max_tokens: p.max_tokens,
                        stateless: p.stateless
                    };
                    updateCustomUIFromPreset(currentCustomPreset);
                    saveAndApplyCustomPreset();
                };

                // Botão de deletar para presets customizados criados pelo usuário
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'pill-delete-btn';
                deleteBtn.textContent = 'X';
                deleteBtn.title = 'Remover este preset';
                deleteBtn.onclick = (e) => {
                    e.stopPropagation();
                    const updated = loadSavedPresets().filter((_, i) => i !== idx);
                    persistSavedPresets(updated);
                    renderSavedPresetsPills();
                };
                pill.appendChild(deleteBtn);

                savedPresetsPillsList.appendChild(pill);
            });
        };

        const handleInputFormChange = () => {
            currentCustomPreset = getPresetFromInputs();
            if (customJsonTextarea) {
                customJsonTextarea.value = JSON.stringify(currentCustomPreset, null, 2);
            }
            if (customSyncIndicator) {
                customSyncIndicator.textContent = 'Sincronizado';
                customSyncIndicator.className = 'json-sync-ok';
            }
            if (customStatusTag) {
                customStatusTag.textContent = 'Modificado (Não salvo)';
                customStatusTag.style.color = '#ffaa00';
            }
        };

        [customModelInput, customCtxInput, customTimeoutInput, customTempInput, customTokensInput].forEach(input => {
            input?.addEventListener('input', handleInputFormChange);
        });
        customStatelessInput?.addEventListener('change', handleInputFormChange);

        if (customJsonTextarea) {
            customJsonTextarea.addEventListener('input', () => {
                try {
                    const parsed = JSON.parse(customJsonTextarea.value);
                    currentCustomPreset = { ...defaultCustomPreset, ...parsed };
                    if (customModelInput) customModelInput.value = currentCustomPreset.llm_model || '';
                    if (customCtxInput) customCtxInput.value = String(currentCustomPreset.num_ctx || 1024);
                    if (customTimeoutInput) customTimeoutInput.value = String(currentCustomPreset.timeout || 180);
                    if (customTempInput) customTempInput.value = String(currentCustomPreset.temperature ?? 0.65);
                    if (customTokensInput) customTokensInput.value = String(currentCustomPreset.max_tokens || 100);
                    if (customStatelessInput) customStatelessInput.checked = Boolean(currentCustomPreset.stateless);

                    if (customSyncIndicator) {
                        customSyncIndicator.textContent = 'JSON Válido';
                        customSyncIndicator.className = 'json-sync-ok';
                    }
                    if (customStatusTag) {
                        customStatusTag.textContent = 'Modificado (Não salvo)';
                        customStatusTag.style.color = '#ffaa00';
                    }
                } catch (err) {
                    if (customSyncIndicator) {
                        customSyncIndicator.textContent = 'JSON Inválido';
                        customSyncIndicator.className = 'json-sync-err';
                    }
                }
            });
        }

        updateCustomUIFromPreset(currentCustomPreset);
        renderSavedPresetsPills();

        // Salvar e Ativar Preset Customizado
        const saveAndApplyCustomPreset = async () => {
            currentCustomPreset = getPresetFromInputs();
            localStorage.setItem('rpg_custom_llm_preset', JSON.stringify(currentCustomPreset));
            
            await invoke('save_llm_settings', {
                settings: {
                    llm_model: currentCustomPreset.llm_model,
                    num_ctx: currentCustomPreset.num_ctx,
                    timeout: currentCustomPreset.timeout,
                    temperature: currentCustomPreset.temperature,
                    max_tokens: currentCustomPreset.max_tokens,
                    stateless: currentCustomPreset.stateless
                }
            }).catch(() => {});

            await invoke('set_active_model', { model: currentCustomPreset.llm_model }).catch(() => {});
            this.currentModel = currentCustomPreset.llm_model;
            
            // Propaga para o domínio de forma desacoplada
            if (this.domain && typeof (this.domain as any).updateLLMPreset === 'function') {
                (this.domain as any).updateLLMPreset(currentCustomPreset);
            }

            updateActiveDisplay();
            this.unlockSonharBtn();
            loadModels();
            renderSavedPresetsPills();

            if (customStatusTag) {
                customStatusTag.textContent = 'Ativo no Jogo';
                customStatusTag.style.color = '#00ff88';
            }
            const topCustomLabel = document.getElementById('hw-preset-custom-label');
            if (topCustomLabel) {
                topCustomLabel.textContent = currentCustomPreset.llm_model;
            }
        };

        if (btnSaveCustomPreset) {
            btnSaveCustomPreset.onclick = () => saveAndApplyCustomPreset();
        }

        // Salvar Novo Preset Nomeado
        if (btnSaveAsNewPreset && inputNewPresetName) {
            btnSaveAsNewPreset.onclick = () => {
                const name = inputNewPresetName.value.trim() || `Preset ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                const newPreset: UserCustomPreset = {
                    ...getPresetFromInputs(),
                    name
                };
                const userPresets = loadSavedPresets();
                userPresets.push(newPreset);
                persistSavedPresets(userPresets);
                inputNewPresetName.value = '';
                renderSavedPresetsPills();
            };
        }

        if (btnCopyCustomPreset) {
            btnCopyCustomPreset.onclick = async () => {
                const jsonStr = JSON.stringify(getPresetFromInputs(), null, 2);
                await navigator.clipboard.writeText(jsonStr).catch(() => {});
                const originalText = btnCopyCustomPreset.innerHTML;
                btnCopyCustomPreset.textContent = 'Copiado!';
                setTimeout(() => { btnCopyCustomPreset.innerHTML = originalText; }, 1500);
            };
        }

        if (btnResetCustomPreset) {
            btnResetCustomPreset.onclick = () => {
                currentCustomPreset = defaultCustomPreset;
                updateCustomUIFromPreset(defaultCustomPreset);
                if (customStatusTag) {
                    customStatusTag.textContent = 'Template Padrão';
                    customStatusTag.style.color = '#aaa';
                }
                renderSavedPresetsPills();
            };
        }

        if (btnPresetCustomTop) {
            btnPresetCustomTop.onclick = () => {
                const targetPanel = document.getElementById('custom-preset-container');
                if (targetPanel) {
                    targetPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    saveAndApplyCustomPreset();
                }
            };
        }

        // --- 2. Modding & Hugging Face Handlers ---
        document.querySelectorAll('.btn-apply-hf-example').forEach(btn => {
            btn.addEventListener('click', () => {
                const hfModel = btn.getAttribute('data-hf');
                if (hfModel && pullInput) {
                    pullInput.value = hfModel;
                    pullInput.focus();
                    pullInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            });
        });

        const btnOpenMods = document.getElementById('btn-open-mods-folder');
        if (btnOpenMods) {
            btnOpenMods.onclick = async () => {
                const res = await safeInvoke('open_mods_folder').catch(() => null);
                if (!res) {
                    await ConfirmationModal.alert({
                        title: 'Diretório de Mods',
                        message: 'Pasta local de mods: ./mods/models/\nColoque aqui arquivos .gguf ou Modelfiles customizados.',
                        variant: 'info'
                    });
                }
            };
        }

        const btnToggleModelfile = document.getElementById('btn-toggle-modelfile-creator');
        const drawerModelfile = document.getElementById('modelfile-creator-drawer');
        if (btnToggleModelfile && drawerModelfile) {
            btnToggleModelfile.onclick = () => {
                const isHidden = drawerModelfile.style.display === 'none';
                drawerModelfile.style.display = isHidden ? 'flex' : 'none';
                btnToggleModelfile.textContent = isHidden ? 'Ocultar Compilador' : 'Compilador Rápido';
            };
        }

        const btnSubmitModelfile = document.getElementById('btn-submit-modelfile');
        const modelfileStatus = document.getElementById('modelfile-status-label');
        if (btnSubmitModelfile) {
            btnSubmitModelfile.onclick = async () => {
                const nameInput = document.getElementById('modelfile-name-input') as HTMLInputElement;
                const fromInput = document.getElementById('modelfile-from-input') as HTMLInputElement;
                const systemInput = document.getElementById('modelfile-system-input') as HTMLTextAreaElement;

                const name = nameInput?.value.trim() || 'custom-npc-mod';
                const from = fromInput?.value.trim() || 'qwen2.5:1.5b';
                const system = systemInput?.value.trim() || '';

                const modelfileContent = `FROM ${from}\nSYSTEM """${system}"""\n`;

                if (modelfileStatus) {
                    modelfileStatus.textContent = `Compilando modelo '${name}' no Ollama...`;
                    modelfileStatus.style.color = 'var(--accent-gold)';
                }

                try {
                    await safeInvoke('create_ollama_model', {
                        name,
                        modelfile: modelfileContent
                    });
                    if (modelfileStatus) {
                        modelfileStatus.textContent = `Modelo '${name}' registrado com sucesso!`;
                        modelfileStatus.style.color = '#00ff88';
                    }
                    loadModels();
                } catch (e: any) {
                    if (modelfileStatus) {
                        modelfileStatus.textContent = `Comando enviado para Ollama. Atualizando lista...`;
                        modelfileStatus.style.color = 'var(--accent-gold)';
                    }
                    loadModels();
                }
            };
        }

        fetchLibraryModels();
        loadModels();
    }

    public switchSystemSubtab(subtab: 'saves' | 'models'): void {
        const btnSaves = this.container.querySelector('#btn-subtab-saves') as HTMLElement;
        const btnModels = this.container.querySelector('#btn-subtab-models') as HTMLElement;
        const contentSaves = this.container.querySelector('#system-content-saves') as HTMLElement;
        const contentModels = this.container.querySelector('#system-content-models') as HTMLElement;

        if (subtab === 'saves') {
            if (btnSaves) btnSaves.classList.add('active');
            if (btnModels) btnModels.classList.remove('active');
            if (contentSaves) {
                contentSaves.classList.add('active');
                contentSaves.style.display = 'flex';
            }
            if (contentModels) {
                contentModels.classList.remove('active');
                contentModels.style.display = 'none';
            }
            const broochesEl = this.container.querySelector('#save-stat-brooches-count');
            if (broochesEl) {
                broochesEl.textContent = (this.domain?.globalMetaSummary?.brooches?.length ?? 0).toString();
            }
        } else {
            if (btnModels) btnModels.classList.add('active');
            if (btnSaves) btnSaves.classList.remove('active');
            if (contentModels) {
                contentModels.classList.add('active');
                contentModels.style.display = 'flex';
            }
            if (contentSaves) {
                contentSaves.classList.remove('active');
                contentSaves.style.display = 'none';
            }
        }
    }

    private setupSystemSubtabs(): void {
        const btnSaves = this.container.querySelector('#btn-subtab-saves');
        const btnModels = this.container.querySelector('#btn-subtab-models');

        if (btnSaves) {
            btnSaves.addEventListener('click', () => this.switchSystemSubtab('saves'));
        }
        if (btnModels) {
            btnModels.addEventListener('click', () => this.switchSystemSubtab('models'));
        }

        // Padrão obrigatório: Sub-aba de Saves
        this.switchSystemSubtab('saves');
    }

    public unlockSonharBtn(): void {
        const sonharBtn = this.container ? (this.container.querySelector('#btn-sonhar') as HTMLButtonElement | null) : null;
        if (sonharBtn) {
            sonharBtn.disabled = false;
            sonharBtn.style.pointerEvents = 'auto';
            sonharBtn.textContent = 'Sonhar';
        }
    }

    private forceSetupModel() {
        const loadingScreen = this.container.querySelector('#loading-screen-container') as HTMLElement;
        const systemBtn = this.container.querySelector('.mm-nav-btn[data-target="mm-tab-5"]') as HTMLButtonElement;
        
        if (loadingScreen) loadingScreen.style.display = 'none';
        
        this.unlockSonharBtn();
        this.skipSubtabDefaultToSaves = true;
        if (systemBtn) systemBtn.click();
        this.switchSystemSubtab('models');
        
        ConfirmationModal.alert({
            title: 'Motor Cognitivo Recomendado',
            message: 'O Jogo recomenda um Motor Cognitivo (LLM) configurado para enriquecer os diálogos e decisões neurais dos NPCs.\nVocê pode definir ou baixar um modelo na aba Sistema.',
            variant: 'info'
        });
    }
}