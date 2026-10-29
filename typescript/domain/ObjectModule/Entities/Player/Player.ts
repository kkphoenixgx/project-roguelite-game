import Vector2D from "../../../shared/Vector2D";
import Entity from "../Entity";
import Attributes from "../Attributes";
import type { IEventManager } from "../../../eventDispacher/IGameEvents";
import { HitBoxCircle } from "../../../hitBox/HitBoxCircle";
import type ObjectElement from "../../ObjectElement";
import { type DamageInfo } from "../Entity";
import { BindAction } from "../../../eventDispacher/ActionBindings";

import PlayerInventory from "./components/PlayerInventory";
import PlayerEquipment from "./components/PlayerEquipment";
import PlayerClassManager from "./components/PlayerClassManager";
import BroochRegistry from "./components/BroochRegistry";

import type { IPlayer } from "../../../ports/domain-contracts";
import type { PlayerSaveState } from "../../../ports/ISaveRepository";
import type Item from "../../Items/Item";
import type Class from "./Classes/Class";
import type { baseAttributes } from "../Attributes";

export type playerStates = 'idle' | 'walking' | 'dead' | 'roll' | 'dodge';

export default class Player extends Entity implements IPlayer {
  private movementSinceLastUpdate: boolean = false;
  private isDashing: boolean = false;
  private dashTimeRemaining: number = 0;

  public inventory: PlayerInventory;
  public equipmentManager: PlayerEquipment;
  public classManager: PlayerClassManager;

  public hasBeard: boolean = false; 
  private isLeftClickActiveThisFrame: boolean = false;
  private wasLeftClickActiveLastFrame: boolean = false;
  private attackCooldownTimer: number = 0;

  public facingDirection: Vector2D = new Vector2D(1, 0);

  // Delegated Brooch State inspection (Zero-GC, no state kept on Player)
  public get activeShieldCharges(): number { return BroochRegistry.getShieldCharges(); }
  public get fortuneBuffTimer(): number { return BroochRegistry.getFortuneBuffTimer(); }
  public get berserkTimer(): number { return BroochRegistry.getBerserkTimer(); }
  public get shadowStealthTimer(): number { return BroochRegistry.getShadowStealthTimer(); }
  public get dashSurgeTimer(): number { return BroochRegistry.getDashSurgeTimer(); }
  public get phoenixUsedThisRun(): boolean { return BroochRegistry.isPhoenixUsed(); }
  public get rerollChargesRemaining(): number { return BroochRegistry.getRerollCharges(); }

  // Getters for IPlayer compatibility
  public get backpack(): Item[] { return this.inventory.backpack; }
  public get coins(): number { return this.inventory.coins; }
  public set coins(val: number) { this.inventory.coins = val; }
  
  public get equipedItens(): Item[] { return this.equipmentManager.equipedItens; }
  public get equipment() { return this.equipmentManager.equipment; }

  public get activeLoadout(): (string | null)[] { return this.classManager.activeLoadout; }
  public get passiveLoadout(): (string | null)[] { return this.classManager.passiveLoadout; }
  public get globalActiveLoadout(): (string | null)[] { return this.classManager.globalActiveLoadout; }
  public get maxBackpackSize(): number { return this.equipmentManager.maxBackpackSize; }
  public get classes(): Class[] { return this.classManager.classes; }
  public get activeClass(): string | null { return this.classManager.activeClass; }
  public get unlockedClasses(): string[] { return this.classManager.unlockedClasses; }
  public get unlockedSkills(): Set<string> { return this.classManager.unlockedSkills; }

  public collectedWorldItems: Set<string> = new Set<string>();

  public collectWorldItem(pickupId: string): void {
    if (pickupId) {
      this.collectedWorldItems.add(pickupId);
    }
  }

  public hasCollectedWorldItem(pickupId: string): boolean {
    return this.collectedWorldItems.has(pickupId);
  }

  // Component delegates
  public equipItem(backpackIndex: number) { this.equipmentManager.equipItem(backpackIndex); }
  public unequipItem(slot: string, index?: number) { this.equipmentManager.unequipItem(slot, index); }
  public unequipBag(): boolean { return this.equipmentManager.unequipBag(); }
  public equipToolInBelt(backpackIndex: number, beltSlotIndex?: number): boolean { return this.equipmentManager.equipToolInBelt(backpackIndex, beltSlotIndex); }
  public unequipToolFromBelt(beltSlotIndex: number): boolean { return this.equipmentManager.unequipToolFromBelt(beltSlotIndex); }
  public setActiveTool(beltSlotIndex: number): boolean { return this.equipmentManager.setActiveTool(beltSlotIndex); }
  public getActiveTool() { return this.equipmentManager.getActiveTool(); }
  public consumeItem(backpackIndex: number) { this.inventory.consumeItem(backpackIndex); }
  public deleteItem(backpackIndex: number) { this.inventory.deleteItem(backpackIndex); }
  public addItem(item: Item): boolean { return this.inventory.addItem(item); }
  
  public registerClass(classInstance: import("./Classes/Class").default, autoUnlock: boolean = false) { this.classManager.registerClass(classInstance, autoUnlock); }
  public unlockClass(className: string) { this.classManager.unlockClass(className); }
  public setActiveClass(className: string) { this.classManager.setActiveClass(className); }
  public unlockSkill(skillId: string) { this.classManager.unlockSkill(skillId); }
  public equipSkillInLoadout(skillId: string, slotIndex: number) { this.classManager.equipSkillInLoadout(skillId, slotIndex); }
  public equipPassiveInLoadout(passiveId: string | null, slotIndex: number) { this.classManager.equipPassiveInLoadout(passiveId, slotIndex); }
  public equipGlobalActiveBrooch(broochId: string | null, slotIndex: number) { this.classManager.equipGlobalActiveBrooch(broochId, slotIndex); }
  public hasPassiveBrooch(broochId: string): boolean {
    return this.classManager.broochManager.hasPassive(broochId);
  }
  public resetDashCooldown(): void {
    this.isDashing = false;
    this.accelerator.resetMut();
  }
  public resetRun(): void {
    this.classManager.resetRun();
  }
  public executeActiveSkill(skillId: string, mouseCoordinates: {x: number, y: number}) { this.classManager.executeActiveSkill(skillId, mouseCoordinates); }
  public executePrimordialSkill(mouseCoordinates: {x: number, y: number}) { this.classManager.executePrimordialSkill(mouseCoordinates); }
  public executeActiveBrooch(broochId: string, mouseCoordinates: {x: number, y: number}) { this.classManager.executeActiveBrooch(broochId, mouseCoordinates); }
  public setSkillCooldown(skillId: string, durationMs: number) { this.classManager.setSkillCooldown(skillId, durationMs); }
  public isSkillOnCooldown(skillId: string): boolean { return this.classManager.isSkillOnCooldown(skillId); }
  public getActiveCooldowns() { return this.classManager.getActiveCooldowns(); }
  public gainXp(xpAmount: number) { this.classManager.gainXp(xpAmount); }

  public serializeState(): PlayerSaveState {
    const safeHp = this.attributes.hp <= 0 ? this.attributes.maxHp : this.attributes.hp;
    return {
      attributes: {
        level: this.attributes.level,
        currentXp: this.attributes.currentXp,
        availablePoints: this.attributes.availablePoints,
        maxHp: this.attributes.maxHp,
        hp: safeHp,
        mana: this.attributes.mana,
        strength: this.attributes.strength,
        constitution: this.attributes.constitution,
        dexterity: this.attributes.dexterity,
        intelligence: this.attributes.intelligence,
        wisdom: this.attributes.wisdom,
        charisma: this.attributes.charisma
      },
      coins: this.coins,
      coordinates: { x: this.coordinates.x, y: this.coordinates.y },
      backpack: this.inventory.serialize(),
      equipment: this.equipmentManager.serialize(),
      classes: this.classManager.serialize(),
      collectedWorldItems: Array.from(this.collectedWorldItems)
    };
  }

  public revive(): void {
    this.state = 'idle';
    this.movementSinceLastUpdate = false;
    this.isDashing = false;
    this.direction.resetMut();
    this.velocity.resetMut();
    this.accelerator.resetMut();
    this.activeStatuses.clear();
    this.activeStatusesList = [];
    this.currentSpeedModifier = 1;
    this.attackCooldownTimer = 0;
    this.attributes.hp = this.attributes.maxHp;
    BroochRegistry.resetAll();
  }

  public restoreState(state: any): void {
    if (!state) return;

    // Reseta estado motor e cinético para garantir que o jogador nunca nasça morto ou travado
    this.state = 'idle';
    this.movementSinceLastUpdate = false;
    this.isDashing = false;
    this.direction.resetMut();
    this.velocity.resetMut();
    this.accelerator.resetMut();
    this.activeStatuses.clear();
    this.activeStatusesList = [];
    this.currentSpeedModifier = 1;
    this.attackCooldownTimer = 0;
    BroochRegistry.resetAll();

    // 1. Atributos
    if (state.attributes && typeof this.attributes.restoreState === 'function') {
      this.attributes.restoreState(state.attributes);
    } else if (state.level !== undefined && typeof this.attributes.restoreState === 'function') {
      this.attributes.restoreState(state);
    }

    // Garante que o jogador nunca permaneça morto com 0 HP
    if (this.attributes.hp <= 0) {
      this.attributes.hp = this.attributes.maxHp;
    }

    // 2. Moedas
    if (state.coins !== undefined) {
      this.coins = state.coins;
    }

    // 3. Coordenadas
    if (state.coordinates) {
      this.coordinates.x = state.coordinates.x;
      this.coordinates.y = state.coordinates.y;
    }

    // 4. Mochila
    if (state.backpack && Array.isArray(state.backpack)) {
      this.inventory.restore(state.backpack);
    }

    // 5. Equipamentos
    if (state.equipment) {
      this.equipmentManager.restore(state.equipment);
    }

    // 6. Classes e Árvore de Habilidades
    if (state.classes) {
      this.classManager.restore(state.classes);
    } else {
      if (Array.isArray(state.unlockedClasses)) {
        state.unlockedClasses.forEach((c: string) => this.unlockClass(c));
      }
      if (state.activeClass) {
        this.setActiveClass(state.activeClass);
      }
      if (Array.isArray(state.unlockedSkills)) {
        state.unlockedSkills.forEach((s: string) => this.unlockSkill(s));
      }
      if (Array.isArray(state.activeLoadout)) {
        state.activeLoadout.forEach((id: string, i: number) => {
          if (id) {
            this.unlockSkill(id);
            this.equipSkillInLoadout(id, i);
          }
        });
      }
      if (Array.isArray(state.passiveLoadout)) {
        state.passiveLoadout.forEach((id: string, i: number) => id && this.equipPassiveInLoadout(id, i));
      }
      if (Array.isArray(state.globalActiveLoadout)) {
        state.globalActiveLoadout.forEach((id: string, i: number) => id && this.equipGlobalActiveBrooch(id, i));
      }
    }

    // 7. Itens coletados no mundo
    if (state.collectedWorldItems && Array.isArray(state.collectedWorldItems)) {
      this.collectedWorldItems = new Set(state.collectedWorldItems);
    }
  }

  constructor (
    id: number,
    coordinates : { x: number, y :number },
    attributes :Attributes,
    eventManager: IEventManager,
    state: playerStates = 'idle'
  ){
    const size = { width: 16, height: 16 }; 
    super(id, coordinates, size, 'player', attributes, eventManager, state);

    this.inventory = new PlayerInventory(this, eventManager);
    this.equipmentManager = new PlayerEquipment(this, eventManager);
    this.classManager = new PlayerClassManager(this, eventManager);

    this.hitboxes = [ ...this.setHitboxes() ];

    // [DECOUPLED] O Jogador escuta sozinho as intenções de UI de atributos
    this.eventManager.on('attributeAction', (payload) => {
        if (payload.action === 'allocate') {
            this.allocateAttribute(payload.payload.attribute as any);
        }
    });

    this.eventManager.on('rewardAction', (payload) => {
// claimLocal is now handled entirely by PlayerClassManager.ts
    });
  }

  private setHitboxes () :HitBoxCircle[]{
    return [new HitBoxCircle(
      { x: this.coordinates.x + this.size.width / 2, y: this.coordinates.y + this.size.height / 2 },
      0, 7,
      (otherElement: ObjectElement) => {
        if (otherElement.objectId === 'environmentCollider') {
            this.resolveEnvironmentCollision(otherElement, 7);
            return;
        }

        if (typeof (otherElement as any).onStrike === 'function'){
          const enemyAttack = (otherElement as any).onStrike();
          
          if (enemyAttack) {
            let directionToPlayer = new Vector2D(
              (this.coordinates.x + this.size.width / 2) - (otherElement.coordinates.x + otherElement.size.width / 2),
              (this.coordinates.y + this.size.height / 2) - (otherElement.coordinates.y + otherElement.size.height / 2)
            );
            
            if (directionToPlayer.x === 0 && directionToPlayer.y === 0) directionToPlayer.x = 1;
            
            directionToPlayer.normalizeMut();
            enemyAttack.execute(this, directionToPlayer);
          }
        }
      }
    )]
  }

  public update(deltaTime: number): void {
    if (this.state === 'dead' || this.attributes.hp <= 0) {
      this.state = 'dead';
      return;
    }

    this.updateStatuses(deltaTime);

    if (this.attackCooldownTimer > 0) this.attackCooldownTimer -= deltaTime;

    // Delegar ciclo de vida dos broches e habilidades de classe ativas (Zero-GC)
    this.classManager.update(deltaTime);

    this.move(deltaTime);
    if (!this.movementSinceLastUpdate && this.dashTimeRemaining <= 0)  this.state = 'idle';
    if (this.dashTimeRemaining <= 0 && (this.state === 'roll' || this.state === 'dodge')) {
      this.rotation = 0;
      this.state = (this.direction.x !== 0 || this.direction.y !== 0) ? 'walking' : 'idle';
    }
    
    this.movementSinceLastUpdate = false;
    this.wasLeftClickActiveLastFrame = this.isLeftClickActiveThisFrame;
    this.isLeftClickActiveThisFrame = false; 
    
    this.direction.resetMut()
  }

  public heal(amount: number): void { this.attributes.hp = Math.min(this.attributes.hp + amount, this.attributes.maxHp); }

  public override applyStatus(status: any): void {
    if (this.classManager.broochManager.onBeforeApplyStatus(status)) {
      return;
    }
    super.applyStatus(status);
  }
  
  public override takeDamage(damageInfo: DamageInfo): number {
    const broochResult = this.classManager.broochManager.onBeforeTakeDamage(damageInfo);
    if (broochResult.absorbed) {
      return 0;
    }

    let totalDodge = this.attributes.dodge + (broochResult.extraDodge || 0);
    if (this.activeStatuses.has('poison')) totalDodge -= 10;

    let totalDamageReduction = 0;

    const armorSlots: (keyof Player['equipment'])[] = ['helmet', 'chestplate', 'pants', 'boots', 'gloves', 'amulet'];
    for (const slot of armorSlots) {
      const item = this.equipment[slot] as any;
      if (item) {
        totalDodge += item.dodgePercent || 0;
        totalDamageReduction += item.damageReductionPercent || 0;
      }
    }
    
    for (const ring of [...this.equipment.leftHandRings, ...this.equipment.rightHandRings]) {
      totalDodge += ring.dodgePercent || 0;
      totalDamageReduction += ring.damageReductionPercent || 0;
    }

    if (Math.random() * 100 < totalDodge) {
      this.eventManager.dispatch('log', { channel: 'domain', message: 'Player esquivou do ataque!', params: [] });
      return 0; 
    }

    if (broochResult.overrideDamageReduction !== undefined) {
      totalDamageReduction = broochResult.overrideDamageReduction;
    } else {
      totalDamageReduction = Math.min(90, totalDamageReduction);
    }

    const reducedDamage = damageInfo.totalDamage * (1 - (totalDamageReduction / 100));
    const damageDealt = super.takeDamage({ ...damageInfo, totalDamage: reducedDamage });

    if (broochResult.cancelKnockback) {
      this.accelerator.resetMut();
    }

    if (this.attributes.hp <= 0) {
      if (broochResult.preventDeath) {
        return damageDealt;
      }
      this.eventManager.dispatch('playerDied', {});
    }

    return damageDealt;
  }

  private dashToDirection( direction:Vector2D ):void {
    if (!this.isDashing){
      const dashDir = (direction.x !== 0 || direction.y !== 0)
        ? direction.clone().normalizeMut()
        : (this.facingDirection.x !== 0 || this.facingDirection.y !== 0)
          ? this.facingDirection.clone().normalizeMut()
          : new Vector2D(1, 0);

      this.facingDirection.x = dashDir.x;
      this.facingDirection.y = dashDir.y;

      // Suporte aos 8 lados de rolagem: ângulo em radianos do vetor de deslocamento
      this.rotation = Math.atan2(dashDir.y, dashDir.x);

      this.accelerator.resetMut();
      this.accelerator.addMut(dashDir).multiplyMut(3);
      this.isDashing = true;
      this.dashTimeRemaining = 0.30; // 300ms de duração física e animação do dash
      this.state = 'roll';
      this.movementSinceLastUpdate = true;

      setTimeout(() => {
        if (this.dashTimeRemaining > 0) {
          this.dashTimeRemaining = 0;
          this.accelerator.resetMut();
          this.rotation = 0;
          if (this.state === 'roll' || this.state === 'dodge') {
            this.state = (this.direction.x !== 0 || this.direction.y !== 0) ? 'walking' : 'idle';
          }
        }
      }, 300);

      setTimeout(() => { 
        this.isDashing = false; 
      }, 1000);

      this.classManager.broochManager.onDash();
    }
  }

  public override move( deltaTime: number): void {
    if (this.state === 'dead' || this.attributes.hp <= 0) return;

    if (this.dashTimeRemaining > 0) {
      this.dashTimeRemaining -= deltaTime;
      if (this.dashTimeRemaining <= 0) {
        this.dashTimeRemaining = 0;
        this.accelerator.resetMut();
        this.rotation = 0;
        if (this.state === 'roll' || this.state === 'dodge') {
          this.state = (this.direction.x !== 0 || this.direction.y !== 0) ? 'walking' : 'idle';
        }
      }
    }

    if (this.dashTimeRemaining > 0) {
      this.state = 'roll';
      this.movementSinceLastUpdate = true;
    } else if (this.direction.x !== 0 || this.direction.y !== 0 || this.accelerator.x !== 0 || this.accelerator.y !== 0) {
      this.state = 'walking';
      this.movementSinceLastUpdate = true;
    }

    const displacement = this.attributes.speed * this.currentSpeedModifier * deltaTime;
    this.currentSpeedModifier = 1; 
    
    if (this.direction.x !== 0 || this.direction.y !== 0) {
      if (this.dashTimeRemaining <= 0) {
        this.facingDirection.x = this.direction.x;
        this.facingDirection.y = this.direction.y;
        this.facingDirection.normalizeMut();
      }
    }

    this.velocity.x = this.direction.x;
    this.velocity.y = this.direction.y;
    this.velocity.normalizeMut().multiplyMut(displacement).addMut(this.accelerator);
    
    this.updatePosition();
  }

  @BindAction('up')
  public onUpAction (): void { this.direction.y -= 1 }
  @BindAction('down')
  public onDownAction (): void { this.direction.y += 1 }
  @BindAction('left')
  public onLeftAction (): void { this.direction.x -= 1 }
  @BindAction('right')
  public onRightAction (): void { this.direction.x += 1 }
  
  @BindAction('shift')
  public onShiftAction (): void { this.dashToDirection(this.direction) }

  @BindAction('leftClick')
  public onLeftClickAction( mouseLastCoordinates: {x:number;y:number} ): void {
    if (this.activeStatuses.has('stun') || this.activeStatuses.has('paralyze')) return; 
    this.isLeftClickActiveThisFrame = true;

    if (this.activeClass === 'Mago') return; 

    const weapon = this.equipment.mainHand;
    if (!weapon) {
      if (!this.wasLeftClickActiveLastFrame) this.eventManager.dispatch('log', { channel: 'domain', message: "Cannot shoot without a weapon", params: [] });
      return;
    }

    if ((weapon.weaponType === 'melee' || weapon.weaponType === 'scythe') && this.wasLeftClickActiveLastFrame) return; 

    if (this.attackCooldownTimer <= 0) {
        const direction = new Vector2D(mouseLastCoordinates.x - (this.coordinates.x + this.size.width / 2), mouseLastCoordinates.y - (this.coordinates.y + this.size.height / 2));
        weapon.attack(this, direction, this.eventManager);
        this.attackCooldownTimer = weapon.attackSpeed > 0 ? weapon.attackSpeed : 0.7;
    }
  }

  @BindAction('rightClick')
  public onRightClickAction( mouseLastCoordinates: {x:number;y:number} ): void {
    const direction = new Vector2D(
      mouseLastCoordinates.x - (this.coordinates.x + this.size.width / 2),
      mouseLastCoordinates.y - (this.coordinates.y + this.size.height / 2)
    )
    this.dashToDirection(direction)
  }

  public swapWeapons(): void {
    this.equipmentManager.swapWeapons();
  }

  @BindAction('swapWeapons')
  public onSwapWeaponsAction(): void {
    this.swapWeapons();
  }

  public getState(): playerStates { return this.state as playerStates; }

  public allocateAttribute(attribute: keyof baseAttributes) {
    if(this.attributes.spendPoint(attribute)) {
      this.eventManager.dispatch('log', { channel: 'domain', message: `Allocated point to ${attribute}`, params: [] });
      this.eventManager.dispatch('attributeAllocated', { attribute });
    }
  }
}