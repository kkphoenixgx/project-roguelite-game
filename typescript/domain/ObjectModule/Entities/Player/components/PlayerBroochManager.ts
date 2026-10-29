import type { IEventManager } from "../../../../eventDispacher/IGameEvents";
import type { BroochDamageHookResult } from "../../../../templates/BroochTemplate";
import BroochRegistry from "./BroochRegistry";

/**
 * ==============================================================================
 * GERENCIADOR DE BROCHES DO JOGADOR (PlayerBroochManager)
 * ==============================================================================
 * Centraliza e delega os efeitos de combate, ciclo de vida e estado interno de
 * todos os Broches Ancestrais equipados pelo jogador.
 * 
 * Princípio da Responsabilidade Única (SRP) e OCP:
 * O `Player` não contém nenhum atributo de broches específicos.
 * O gerenciador apenas invoca os hooks do `BroochRegistry` e computa o resultado
 * sem alocar memória (Zero-GC) no loop de 60 FPS.
 * ==============================================================================
 */
export default class PlayerBroochManager {
  public passiveLoadout: (string | null)[] = [null, null, null, null];
  public globalActiveLoadout: (string | null)[] = [null, null, null, null];
  private _activeExecutedBrooches: Set<string> = new Set();

  // Estrutura reutilizável para Zero-GC no hot path de takeDamage
  private _cachedDamageResult: BroochDamageHookResult = {
    absorbed: false,
    extraDodge: 0,
    overrideDamageReduction: undefined,
    cancelKnockback: false,
    preventDeath: false
  };

  constructor(private player: any, private eventManager: IEventManager) {}

  public equipPassive(passiveId: string | null, slotIndex: number): void {
    if (slotIndex < 0 || slotIndex >= 4) return;
    if (passiveId) {
      const def = BroochRegistry.get(passiveId);
      if (def && def.type !== 'passivo') {
        this.eventManager.dispatch('log', {
          channel: 'error',
          message: `'${passiveId}' não é um broche passivo.`,
          params: []
        });
        return;
      }
      if (!def && !passiveId.startsWith('brooch_')) {
        this.eventManager.dispatch('log', {
          channel: 'error',
          message: `'${passiveId}' não é um broche ancestral válido.`,
          params: []
        });
        return;
      }
      const existingPassive = this.passiveLoadout.indexOf(passiveId);
      if (existingPassive !== -1) this.passiveLoadout[existingPassive] = null;
      const existingActive = this.globalActiveLoadout.indexOf(passiveId);
      if (existingActive !== -1) this.globalActiveLoadout[existingActive] = null;
    }
    this.passiveLoadout[slotIndex] = passiveId;

    if (passiveId) {
      const def = BroochRegistry.get(passiveId);
      if (def && def.onAttach) def.onAttach(this.player);
      this.eventManager.dispatch('log', {
        channel: 'domain',
        message: `Broche Passivo '${passiveId}' equipado no slot ${slotIndex + 1}.`,
        params: []
      });
    } else {
      this.eventManager.dispatch('log', {
        channel: 'domain',
        message: `Slot passivo ${slotIndex + 1} desequipado.`,
        params: []
      });
    }
    this.eventManager.dispatch('broochEquipped', { broochId: passiveId, slotIndex, type: 'passive' });
  }

  public equipActive(broochId: string | null, slotIndex: number): void {
    if (slotIndex < 0 || slotIndex >= 4) return;
    if (broochId) {
      const existingActive = this.globalActiveLoadout.indexOf(broochId);
      if (existingActive !== -1) this.globalActiveLoadout[existingActive] = null;
      const existingPassive = this.passiveLoadout.indexOf(broochId);
      if (existingPassive !== -1) this.passiveLoadout[existingPassive] = null;
    }
    this.globalActiveLoadout[slotIndex] = broochId;

    if (broochId) {
      const def = BroochRegistry.get(broochId);
      if (def && def.onAttach) def.onAttach(this.player);
      this.eventManager.dispatch('log', {
        channel: 'domain',
        message: `Broche Ativo '${broochId}' equipado no slot ${slotIndex + 5}.`,
        params: []
      });
    } else {
      this.eventManager.dispatch('log', {
        channel: 'domain',
        message: `Slot ativo ${slotIndex + 5} desequipado.`,
        params: []
      });
    }
    this.eventManager.dispatch('broochEquipped', { broochId, slotIndex, type: 'active' });
  }

  public hasPassive(broochId: string): boolean {
    const targetId = BroochRegistry.getCanonicalId(broochId);
    for (let i = 0; i < this.passiveLoadout.length; i++) {
      const equipped = this.passiveLoadout[i];
      if (equipped && BroochRegistry.getCanonicalId(equipped) === targetId) {
        return true;
      }
    }
    return false;
  }

  public hasEquipped(broochId: string): boolean {
    const targetId = BroochRegistry.getCanonicalId(broochId);
    return this.hasPassive(targetId) || this.globalActiveLoadout.some(b => b && BroochRegistry.getCanonicalId(b) === targetId);
  }

  public executeActive(broochId: string, mouseCoords: { x: number; y: number }): boolean {
    const ctx = {
      player: this.player,
      eventManager: this.eventManager,
      mouseCoords,
      broochId
    };
    const executed = BroochRegistry.executeActive(broochId, ctx);
    if (executed) {
      this._activeExecutedBrooches.add(BroochRegistry.getCanonicalId(broochId));
    }
    return executed;
  }

  public update(deltaTime: number): void {
    const ctx = { player: this.player, eventManager: this.eventManager };
    for (let i = 0; i < 4; i++) {
      const activeId = this.globalActiveLoadout[i];
      if (activeId) {
        const def = BroochRegistry.get(activeId);
        if (def && def.onUpdate) def.onUpdate(deltaTime, ctx);
      }
      const passiveId = this.passiveLoadout[i];
      if (passiveId) {
        const def = BroochRegistry.get(passiveId);
        if (def && def.onUpdate) def.onUpdate(deltaTime, ctx);
      }
    }

    // Executa updates de broches ativos disparados diretamente
    for (const extraId of this._activeExecutedBrooches) {
      if (!this.globalActiveLoadout.some(b => b && BroochRegistry.getCanonicalId(b) === extraId)) {
        const def = BroochRegistry.get(extraId);
        if (def && def.onUpdate) def.onUpdate(deltaTime, ctx);
      }
    }
  }

  public onBeforeTakeDamage(damageInfo: any): BroochDamageHookResult {
    const res = this._cachedDamageResult;
    res.absorbed = false;
    res.extraDodge = 0;
    res.overrideDamageReduction = undefined;
    res.cancelKnockback = false;
    res.preventDeath = false;

    const ctx = { player: this.player, eventManager: this.eventManager };

    // Executa hooks de broches ativos e passivos equipados
    for (let i = 0; i < 4; i++) {
      const activeId = this.globalActiveLoadout[i];
      if (activeId) {
        const def = BroochRegistry.get(activeId);
        if (def && def.onBeforeTakeDamage) {
          const r = def.onBeforeTakeDamage(damageInfo, ctx);
          if (r) this.mergeDamageResult(res, r);
        }
      }
      const passiveId = this.passiveLoadout[i];
      if (passiveId) {
        const def = BroochRegistry.get(passiveId);
        if (def && def.onBeforeTakeDamage) {
          const r = def.onBeforeTakeDamage(damageInfo, ctx);
          if (r) this.mergeDamageResult(res, r);
        }
      }
    }

    // Executa hooks de broches ativos disparados diretamente
    for (const extraId of this._activeExecutedBrooches) {
      if (!this.globalActiveLoadout.some(b => b && BroochRegistry.getCanonicalId(b) === extraId)) {
        const def = BroochRegistry.get(extraId);
        if (def && def.onBeforeTakeDamage) {
          const r = def.onBeforeTakeDamage(damageInfo, ctx);
          if (r) this.mergeDamageResult(res, r);
        }
      }
    }

    return res;
  }

  private mergeDamageResult(target: BroochDamageHookResult, incoming: BroochDamageHookResult): void {
    if (incoming.absorbed) target.absorbed = true;
    if (incoming.extraDodge) target.extraDodge = (target.extraDodge || 0) + incoming.extraDodge;
    if (incoming.overrideDamageReduction !== undefined) target.overrideDamageReduction = incoming.overrideDamageReduction;
    if (incoming.cancelKnockback) target.cancelKnockback = true;
    if (incoming.preventDeath) target.preventDeath = true;
  }

  public onBeforeApplyStatus(status: any): boolean {
    const ctx = { player: this.player, eventManager: this.eventManager };
    for (let i = 0; i < 4; i++) {
      const activeId = this.globalActiveLoadout[i];
      if (activeId) {
        const def = BroochRegistry.get(activeId);
        if (def && def.onBeforeApplyStatus) {
          const r = def.onBeforeApplyStatus(status, ctx);
          if (r && r.block) return true;
        }
      }
      const passiveId = this.passiveLoadout[i];
      if (passiveId) {
        const def = BroochRegistry.get(passiveId);
        if (def && def.onBeforeApplyStatus) {
          const r = def.onBeforeApplyStatus(status, ctx);
          if (r && r.block) return true;
        }
      }
    }

    for (const extraId of this._activeExecutedBrooches) {
      if (!this.globalActiveLoadout.some(b => b && BroochRegistry.getCanonicalId(b) === extraId)) {
        const def = BroochRegistry.get(extraId);
        if (def && def.onBeforeApplyStatus) {
          const r = def.onBeforeApplyStatus(status, ctx);
          if (r && r.block) return true;
        }
      }
    }
    return false;
  }

  public onAfterAttack(target: any, isCritical: boolean, damageDealt: number): void {
    const ctx = { player: this.player, eventManager: this.eventManager };
    for (let i = 0; i < 4; i++) {
      const activeId = this.globalActiveLoadout[i];
      if (activeId) {
        const def = BroochRegistry.get(activeId);
        if (def && def.onAfterAttack) def.onAfterAttack(target, isCritical, damageDealt, ctx);
      }
      const passiveId = this.passiveLoadout[i];
      if (passiveId) {
        const def = BroochRegistry.get(passiveId);
        if (def && def.onAfterAttack) def.onAfterAttack(target, isCritical, damageDealt, ctx);
      }
    }
  }

  public getDamageMultiplier(): number {
    let mult = 1.0;
    const ctx = { player: this.player, eventManager: this.eventManager };
    for (let i = 0; i < 4; i++) {
      const activeId = this.globalActiveLoadout[i];
      if (activeId) {
        const def = BroochRegistry.get(activeId);
        if (def && def.onComputeDamageMultiplier) {
          const m = def.onComputeDamageMultiplier(ctx);
          if (typeof m === 'number') mult *= m;
        }
      }
      const passiveId = this.passiveLoadout[i];
      if (passiveId) {
        const def = BroochRegistry.get(passiveId);
        if (def && def.onComputeDamageMultiplier) {
          const m = def.onComputeDamageMultiplier(ctx);
          if (typeof m === 'number') mult *= m;
        }
      }
    }
    for (const extraId of this._activeExecutedBrooches) {
      if (!this.globalActiveLoadout.some(b => b && BroochRegistry.getCanonicalId(b) === extraId)) {
        const def = BroochRegistry.get(extraId);
        if (def && def.onComputeDamageMultiplier) {
          const m = def.onComputeDamageMultiplier(ctx);
          if (typeof m === 'number') mult *= m;
        }
      }
    }
    return mult;
  }

  public onDash(): void {
    const ctx = { player: this.player, eventManager: this.eventManager };
    for (let i = 0; i < 4; i++) {
      const activeId = this.globalActiveLoadout[i];
      if (activeId) {
        const def = BroochRegistry.get(activeId);
        if (def && def.onDash) def.onDash(ctx);
      }
      const passiveId = this.passiveLoadout[i];
      if (passiveId) {
        const def = BroochRegistry.get(passiveId);
        if (def && def.onDash) def.onDash(ctx);
      }
    }
  }

  public resetRun(): void {
    this._activeExecutedBrooches.clear();
    const ctx = { player: this.player, eventManager: this.eventManager };
    for (let i = 0; i < 4; i++) {
      const activeId = this.globalActiveLoadout[i];
      if (activeId) {
        const def = BroochRegistry.get(activeId);
        if (def && def.onReset) def.onReset(ctx);
      }
      const passiveId = this.passiveLoadout[i];
      if (passiveId) {
        const def = BroochRegistry.get(passiveId);
        if (def && def.onReset) def.onReset(ctx);
      }
    }
  }
}
