import Class from "../Classes/Class";
import Warrior from "../Classes/Warrior";
import Mage from "../Classes/Mage";
import Gunslinger from "../Classes/Gunslinger";
import Necromancer from "../Classes/Necromancer";
import Pescador from "../Classes/Pescador";
import DefaultXPTable from "../../DefaultXPTable";
import type { IEventManager, LevelUpChoice } from "../../../../eventDispacher/IGameEvents";
import type IPlayerContext from "../IPlayerContext";
import BroochRegistry from "./BroochRegistry";
import PlayerBroochManager from "./PlayerBroochManager";
import type { PlayerClassSaveData } from "../../../../ports/ISaveRepository";

const defaultXpTable = new DefaultXPTable();

export type ClassFactory = (xpTable: DefaultXPTable, player: IPlayerContext, eventManager: IEventManager) => Class;

export default class PlayerClassManager {
  private static readonly _globalClassFactories: Map<string, ClassFactory> = new Map();

  public static registerGlobalClass(name: string, factory: ClassFactory): void {
    PlayerClassManager._globalClassFactories.set(name, factory);
  }

  public static clearGlobalClasses(): void {
    PlayerClassManager._globalClassFactories.clear();
  }

  private _unlockedClasses: string[] = [];
  private _activeClass: string | null = null;
  private _classes: Class[] = [];
  private _unlockedSkills: Set<string> = new Set();
  
  public activeLoadout: (string | null)[] = [null, null, null, null];
  public readonly broochManager: PlayerBroochManager;
  private skillCooldowns: Map<string, { totalMs: number; remainingMs: number }> = new Map();
  private lastAuthErrorLogTime: number = 0;

  public get passiveLoadout(): (string | null)[] { return this.broochManager.passiveLoadout; }
  public get globalActiveLoadout(): (string | null)[] { return this.broochManager.globalActiveLoadout; }

  constructor(private player: IPlayerContext, private eventManager: IEventManager) {
    this.broochManager = new PlayerBroochManager(player, eventManager);
    this._classes = [
      new Warrior(defaultXpTable, player as any, eventManager),
      new Mage(defaultXpTable, player as any, eventManager),
      new Gunslinger(defaultXpTable, player as any, eventManager),
      new Necromancer(defaultXpTable, player as any, eventManager),
      new Pescador(defaultXpTable, player as any, eventManager),
    ];

    for (const [_, factory] of PlayerClassManager._globalClassFactories.entries()) {
      try {
        const customClass = factory(defaultXpTable, player, eventManager);
        if (!this._classes.some(c => c.name === customClass.name)) {
          this._classes.push(customClass);
        }
      } catch (err) {
        console.error(`[PlayerClassManager] Falha ao carregar classe customizada:`, err);
      }
    }

    this.eventManager.on('rewardAction', (event) => {
      if (event.action === 'claimLocal' && event.payload && event.payload.rewardId) {
        this.applyLocalReward(event.payload.rewardId, event.payload.amount);
      }
    });
  }

  public get classes(): Class[] { return this._classes; }
  public get unlockedClasses(): string[] { return this._unlockedClasses; }
  public get activeClass(): string | null { return this._activeClass; }
  public get unlockedSkills(): Set<string> { return this._unlockedSkills; }

  private applyLocalReward(rewardId: string, amount?: number): void {
    if (!this.player.attributes) return;
    const attr = this.player.attributes;
    
    //? Fallback para compatibilidade com eventos legados onde payload continha amount em vez de value.
    const finalAmount = amount || 1; 
    
    switch(rewardId) {
      case 'stat_str': attr.strength += finalAmount; break;
      case 'stat_con': attr.constitution += finalAmount; break;
      case 'stat_int': attr.intelligence += finalAmount; break;
      case 'stat_dex': attr.dexterity += finalAmount; break;
      case 'stat_cha': attr.charisma += finalAmount; break;
      case 'stat_wis': attr.wisdom += finalAmount; break;
      
      //? Setters em Attributes acumulam bônus percentuais aditivos.
      case 'der_speed': attr.speed = finalAmount; break;
      case 'der_crit_chance': attr.critChance = finalAmount; break;
      case 'der_crit_dmg': attr.critDamage = finalAmount; break;
      case 'der_splash': attr.splashDamage = finalAmount; break;
      case 'der_def': attr.defence = finalAmount; break;
      case 'der_dodge': attr.dodge = finalAmount; break;
      case 'der_luck': attr.lucky = finalAmount; break;
      case 'der_pierce': attr.piercing = finalAmount; break;
      case 'der_lifesteal': attr.lifesteal = finalAmount; break;
      case 'der_area': attr.bonusArea = finalAmount; break;
      case 'der_recharge': attr.recharge = finalAmount; break;
      case 'der_tenacity': attr.tenacity = finalAmount; break;
      case 'der_vigor': attr.vigor = finalAmount; break;
      case 'der_insight': attr.insight = finalAmount; break;
      
      //? maxHp requer manipulação direta por não possuir setter de acúmulo relativo.
      case 'der_maxhp': 
        (attr as any)._maxHp += finalAmount; 
        attr.hp += finalAmount; 
        break;

      //? Aliases de compatibilidade para suítes de testes legadas.
      case 'local_speed': attr.speed = amount !== undefined ? amount : 10; break;
      case 'local_crit': attr.critChance = amount !== undefined ? amount : 5; break;
      case 'local_heal': attr.hp = attr.maxHp; break;
        
      default:
        this.eventManager.dispatch('log', { channel: 'error', message: `Reward ${rewardId} não implementada no Domínio.`, params: [] });
        return;
    }
    
    this.eventManager.dispatch('log', { channel: 'domain', message: `Local reward ${rewardId} applied with amount ${finalAmount}!`, params: [] });
  }

  public registerClass(classInstance: Class, autoUnlock: boolean = false): void {
    const existingIndex = this._classes.findIndex(c => c.name === classInstance.name);
    if (existingIndex !== -1) {
      this._classes[existingIndex] = classInstance;
    } else {
      this._classes.push(classInstance);
    }

    if (autoUnlock) {
      this.unlockClass(classInstance.name);
    }

    this.eventManager.dispatch('classRegistered', {
      className: classInstance.name,
      autoUnlocked: autoUnlock
    });
  }

  public unlockClass(className: string): void {
    if (!this._unlockedClasses.includes(className)) {
      this._unlockedClasses.push(className);
      this.eventManager.dispatch('log', { channel: 'domain', message: `Class unlocked: ${className}`, params: [] });
    }
  }

  public setActiveClass(className: string): void {
    if (this._unlockedClasses.includes(className)) {
      const oldClassInstance = this._classes.find(c => c.name === this._activeClass);
      this._activeClass = className;
      const newClassInstance = this._classes.find(c => c.name === className);
      this.eventManager.dispatch('classChanged', { oldClassInstance, newClassInstance });
      this.eventManager.dispatch('log', { channel: 'domain', message: `Class changed to: ${className}`, params: [] });
    }
  }

  public update(deltaTime: number): void {
    if (this.skillCooldowns.size > 0 && deltaTime > 0) {
      const deltaMs = deltaTime * 1000;
      for (const [skillId, cd] of this.skillCooldowns.entries()) {
        cd.remainingMs -= deltaMs;
        if (cd.remainingMs <= 0) {
          this.skillCooldowns.delete(skillId);
          delete this._cachedCooldowns[skillId];
        } else {
          if (!this._cachedCooldowns[skillId]) {
            this._cachedCooldowns[skillId] = { totalMs: cd.totalMs, remainingMs: cd.remainingMs };
          } else {
            this._cachedCooldowns[skillId]!.totalMs = cd.totalMs;
            this._cachedCooldowns[skillId]!.remainingMs = cd.remainingMs;
          }
        }
      }
    }
    this.broochManager.update(deltaTime);
    for (let i = 0; i < this._classes.length; i++) {
      const cls = this._classes[i];
      if (cls && typeof (cls as any).update === 'function') {
        (cls as any).update(deltaTime);
      }
    }
  }

  public unlockSkill(skillId: string): void {
    this._unlockedSkills.add(skillId);
    this.eventManager.dispatch('log', { channel: 'domain', message: `Skill unlocked: ${skillId}`, params: [] });

    const activeClassInstance = this._classes.find(c => c.name === this._activeClass);
    if (activeClassInstance) {
      const skill = activeClassInstance.allSkills.find(s => s.id === skillId);
      if (skill && skill.type === 'passive' && skill.effect) {
        skill.effect.apply(this.player as any);
      }
    }
  }

  public equipSkillInLoadout(skillId: string, slotIndex: number): void {
    if (slotIndex < 0 || slotIndex >= 4) {
        this.eventManager.dispatch('log', { channel: 'domain', message: `Slot ${slotIndex} inválido.`, params: [] });
        return;
    }
    if (!this._unlockedSkills.has(skillId)) {
        this.eventManager.dispatch('log', { channel: 'error', message: `Não é possível equipar uma habilidade bloqueada: ${skillId}`, params: [] });
        return;
    }
    
    const existingIndex = this.activeLoadout.indexOf(skillId);
    if (existingIndex !== -1) this.activeLoadout[existingIndex] = null;
    
    this.activeLoadout[slotIndex] = skillId;
    this.eventManager.dispatch('log', { channel: 'domain', message: `Habilidade/Broche Ativo ${skillId} equipada no slot ${slotIndex + 1}`, params: [] });
  }

  public equipPassiveInLoadout(passiveId: string | null, slotIndex: number): void {
    this.broochManager.equipPassive(passiveId, slotIndex);
  }

  public equipGlobalActiveBrooch(broochId: string | null, slotIndex: number): void {
    this.broochManager.equipActive(broochId, slotIndex);
  }

  public executeActiveSkill(skillId: string, mouseCoordinates: {x: number, y: number}): void {
      const targetClassInstance = this._classes.find(c => c.allSkills.some(s => s.id === skillId));
      
      if (!targetClassInstance) {
          this.eventManager.dispatch('log', { 
              channel: 'error', 
              message: `Habilidade '${skillId}' não encontrada em nenhuma classe registrada.`, 
              params: [] 
          });
          return;
      }

      //? Resolução de permissão de skill: aceita se pertencer à classe ativa atual ou às classes das armas em mainHand/secondHand.
      const equipment = (this.player as any).equipment;
      const mainHandClass = equipment?.mainHand?.unlocksClass;
      const secondHandClass = equipment?.secondHand?.unlocksClass;

      const isAuthorized = 
          this._activeClass === targetClassInstance.name ||
          mainHandClass === targetClassInstance.name ||
          secondHandClass === targetClassInstance.name;

      if (!isAuthorized) {
          const now = Date.now();
          if (now - this.lastAuthErrorLogTime > 1000) {
              this.lastAuthErrorLogTime = now;
              this.eventManager.dispatch('log', { 
                  channel: 'error', 
                  message: `Multiclasse: A habilidade '${skillId}' requer a classe '${targetClassInstance.name}'. Equipe uma arma dessa classe na mão principal ou secundária!`, 
                  params: [] 
              });
          }
          return;
      }

      const skill = targetClassInstance.allSkills.find(s => s.id === skillId);
      if (skill?.requiresMainHandWeapon) {
          const mainHand = equipment?.mainHand;
          const isMainHandClassMatch = mainHand && (mainHand.unlocksClass === targetClassInstance.name);
          if (!isMainHandClassMatch) {
              const now = Date.now();
              if (now - this.lastAuthErrorLogTime > 1000) {
                  this.lastAuthErrorLogTime = now;
                  this.eventManager.dispatch('log', {
                      channel: 'error',
                      message: `A habilidade '${skill.name || skillId}' requer a arma da classe '${targetClassInstance.name}' equipada na mão principal!`,
                      params: []
                  });
              }
              return;
          }
      }

      if (typeof (targetClassInstance as any).executeSkill === 'function') {
          (targetClassInstance as any).executeSkill(skillId, mouseCoordinates);
          this.eventManager.dispatch('log', { 
              channel: 'domain', 
              message: `[${targetClassInstance.name}] Habilidade ${skillId} executada com sucesso via loadout.`, 
              params: [] 
          });
      } else {
          this.eventManager.dispatch('log', { 
              channel: 'error', 
              message: `Skill ${skillId} falhou: A classe ${targetClassInstance.name} não implementa executeSkill.`, 
              params: [] 
          });
      }
  }

  public setSkillCooldown(skillId: string, durationMs: number): void {
      const rechargePercent = this.player.attributes?.recharge || 0;
      const finalDuration = Math.max(200, Math.round(durationMs * (1 - Math.min(0.75, rechargePercent / 100))));
      this.skillCooldowns.set(skillId, {
          totalMs: finalDuration,
          remainingMs: finalDuration
      });
      this._cachedCooldowns[skillId] = {
          totalMs: finalDuration,
          remainingMs: finalDuration
      };
      this.eventManager.dispatch('skillCooldownStarted', {
          skillId,
          totalMs: finalDuration,
          remainingMs: finalDuration
      });
  }

  public isSkillOnCooldown(skillId: string): boolean {
      const cd = this.skillCooldowns.get(skillId);
      if (!cd) return false;
      return cd.remainingMs > 0;
  }

  private _cachedCooldowns: Record<string, { totalMs: number; remainingMs: number }> = {};

  public getRemainingCooldown(skillId: string): number {
      const cd = this.skillCooldowns.get(skillId);
      if (!cd) return 0;
      return cd.remainingMs > 0 ? cd.remainingMs : 0;
  }

  public getActiveCooldowns(): Record<string, { totalMs: number; remainingMs: number }> {
      return this._cachedCooldowns;
  }

  public executePrimordialSkill(mouseCoordinates: { x: number, y: number }): void {
      const activeClassInstance = this._classes.find(c => c.name === this._activeClass);
      if (!activeClassInstance) return;

      const essentialSkill = activeClassInstance.allSkills.find(s => s.type === 'essential');
      if (!essentialSkill) {
          this.eventManager.dispatch('log', { channel: 'domain', message: `Nenhuma habilidade primordial encontrada para a classe ${this._activeClass}.`, params: [] });
          return;
      }

      if (this.isSkillOnCooldown(essentialSkill.id)) {
          this.eventManager.dispatch('log', { channel: 'domain', message: `[${this._activeClass}] Habilidade primordial '${essentialSkill.name}' em recarga!`, params: [] });
          return;
      }

      if (essentialSkill.requiresMainHandWeapon) {
          const equipment = (this.player as any).equipment;
          const mainHand = equipment?.mainHand;
          const isMainHandClassMatch = mainHand && (mainHand.unlocksClass === this._activeClass);
          if (!isMainHandClassMatch) {
              const now = Date.now();
              if (now - this.lastAuthErrorLogTime > 1000) {
                  this.lastAuthErrorLogTime = now;
                  this.eventManager.dispatch('log', {
                      channel: 'error',
                      message: `A habilidade primordial '${essentialSkill.name}' requer a arma da classe '${this._activeClass}' equipada na mão principal!`,
                      params: []
                  });
              }
              return;
          }
      }

      if (this._activeClass === 'Pescador' && typeof (activeClassInstance as any).onFishPetInput === 'function') {
          (activeClassInstance as any).onFishPetInput(mouseCoordinates);
      } else if (typeof (activeClassInstance as any).executeSkill === 'function') {
          (activeClassInstance as any).executeSkill(essentialSkill.id, mouseCoordinates);
      } else {
          this.setSkillCooldown(essentialSkill.id, 5000);
          this.eventManager.dispatch('log', { channel: 'domain', message: `Primordial ${essentialSkill.name} executada!`, params: [] });
      }
  }

  public executeActiveBrooch(broochId: string, mouseCoordinates: { x: number, y: number }): void {
      if (this.isSkillOnCooldown(broochId)) {
          this.eventManager.dispatch('log', { channel: 'domain', message: `Broche ativo '${broochId}' em recarga!`, params: [] });
          return;
      }

      const executed = this.broochManager.executeActive(broochId, mouseCoordinates);

      if (executed) {
          const cd = BroochRegistry.getCooldown(broochId);
          this.setSkillCooldown(broochId, cd);
      } else {
          this.setSkillCooldown(broochId, 15000);
          this.eventManager.dispatch('log', { channel: 'domain', message: `Broche ativo '${broochId}' ativado!`, params: [] });
      }
  }

  public resetAllCooldowns(): void {
      this.skillCooldowns.clear();
      this._cachedCooldowns = {};
      this.eventManager.dispatch('log', { channel: 'domain', message: 'Todos os cooldowns foram resetados!', params: [] });
  }

  public resetRun(): void {
      this._unlockedSkills.clear();
      this.activeLoadout = [null, null, null, null];
      this.resetAllCooldowns();
      this.broochManager.resetRun();
      this._lastLevelUpLevel = 0;
  }

  private _lastLevelUpLevel: number = 0;

  public rerollLevelUpChoices(): boolean {
      if (!this.broochManager.hasPassive('brooch_reroll_master')) {
          this.eventManager.dispatch('log', { channel: 'error', message: 'Você precisa equipar o Broche Ampulheta do Destino para roletar.', params: [] });
          return false;
      }
      if (BroochRegistry.getRerollCharges() <= 0) {
          this.eventManager.dispatch('log', { channel: 'error', message: 'Cargas de roletar esgotadas nesta jornada.', params: [] });
          return false;
      }

      BroochRegistry.useRerollCharge();
      this.processLevelUp(this._lastLevelUpLevel || this.player.attributes.level);
      this.eventManager.dispatch('log', { channel: 'domain', message: `[Ampulheta do Destino] Opções roletadas! (${BroochRegistry.getRerollCharges()} restantes)`, params: [] });
      return true;
  }

  public gainXp(xpAmount: number): void {
    const oldLevel = this.player.attributes.level;
    const activeClass = this._classes.find(c => c.name === this._activeClass);
    const xpTable = activeClass ? activeClass.xpTable : defaultXpTable;
    
    this.player.attributes.addXp(xpAmount, xpTable);
    const newLevel = this.player.attributes.level;

    for (let lvl = oldLevel + 1; lvl <= newLevel; lvl++) {
        this.processLevelUp(lvl);
    }
  }

  private possibleLocalRewards = [
      { id: 'stat_str', name: 'Força', description: 'Melhora Escalonamento Físico', baseAmount: 1, type: 'stat' },
      { id: 'stat_con', name: 'Constituição', description: 'Aumenta Vida Máxima e Regen', baseAmount: 1, type: 'stat' },
      { id: 'stat_int', name: 'Inteligência', description: 'Melhora Mana e Escalonamento Mágico', baseAmount: 1, type: 'stat' },
      { id: 'stat_dex', name: 'Destreza', description: 'Melhora Precisão, Esquiva e Velocidade', baseAmount: 1, type: 'stat' },
      { id: 'stat_cha', name: 'Carisma', description: 'Melhora Sorte Mágica', baseAmount: 1, type: 'stat' },
      { id: 'stat_wis', name: 'Sabedoria', description: 'Melhora XP e Sorte', baseAmount: 1, type: 'stat' },
      
      { id: 'der_speed', name: 'Velocidade', description: 'Aumenta Velocidade de Movimento', baseAmount: 5, type: 'stat' },
      { id: 'der_crit_chance', name: 'Chance Crítica', description: 'Chance Crítica Extra', baseAmount: 3, type: 'stat' },
      { id: 'der_crit_dmg', name: 'Dano Crítico', description: 'Dano Crítico Extra', baseAmount: 10, type: 'stat' },
      { id: 'der_splash', name: 'Splash Damage', description: 'Dano em Área Extra', baseAmount: 5, type: 'stat' },
      { id: 'der_def', name: 'Defesa', description: 'Defesa Extra', baseAmount: 2, type: 'stat' },
      { id: 'der_dodge', name: 'Esquiva', description: 'Esquiva Extra', baseAmount: 2, type: 'stat' },
      { id: 'der_luck', name: 'Sorte', description: 'Sorte Extra', baseAmount: 1, type: 'stat' },
      { id: 'der_pierce', name: 'Perfuração', description: 'Atravessa mais inimigos', baseAmount: 1, type: 'stat' },
      { id: 'der_maxhp', name: 'Vida Máxima', description: 'Aumenta a Vida Máxima', baseAmount: 10, type: 'stat' },
      { id: 'der_lifesteal', name: 'Roubo de Vida', description: 'Cura parte do dano causado', baseAmount: 2, type: 'stat' },
      { id: 'der_area', name: 'Área de Efeito', description: 'Aumenta tamanho e área dos ataques', baseAmount: 5, type: 'stat' },
      { id: 'der_recharge', name: 'Recarga', description: 'Reduz recarga de habilidades', baseAmount: 3, type: 'stat' },
      { id: 'der_tenacity', name: 'Tenacidade', description: 'Reduz tempo de controle de grupo', baseAmount: 5, type: 'stat' },
      { id: 'der_vigor', name: 'Vigor', description: 'Aumenta cura recebida', baseAmount: 5, type: 'stat' },
      { id: 'der_insight', name: 'Percepção', description: 'Aumenta ganho de experiência', baseAmount: 5, type: 'stat' },
  ];

  private processLevelUp(level: number): void {
      this._lastLevelUpLevel = level;
      const cx = this.player.coordinates.x + this.player.size.width / 2;
      const cy = this.player.coordinates.y + this.player.size.height / 2;
      this.eventManager.dispatch('levelUp', { newLevel: level, coordinates: { x: cx, y: cy } });
      this.eventManager.dispatch('log', { channel: 'domain', message: `Player leveled up to ${level}!`, params: [] });

      const rarities = [
          { name: 'comum', mult: 1, weight: 50 },
          { name: 'incomum', mult: 2, weight: 25 },
          { name: 'raro', mult: 3, weight: 15 },
          { name: 'epico', mult: 4, weight: 8 },
          { name: 'lendario', mult: 5, weight: 2 },
      ];

      const getRarity = () => {
          const totalWeight = rarities.reduce((sum, r) => sum + r.weight, 0);
          let random = Math.random() * totalWeight;
          for (const r of rarities) {
              if (random < r.weight) return r;
              random -= r.weight;
          }
          return rarities[0]!;
      };

      const shuffled = [...this.possibleLocalRewards].sort(() => 0.5 - Math.random());
      const rawChoices = shuffled.slice(0, 3);
      
      const choices: LevelUpChoice[] = rawChoices.map(c => {
          const rarity = getRarity();
          const finalAmount = c.baseAmount * rarity.mult;
          return {
              id: c.id,
              name: c.name,
              type: c.type as 'stat' | 'skill',
              rarity: rarity.name as any,
              value: finalAmount,
              description: `+${finalAmount} ${c.name} (${c.description})`
          };
      });

      this.eventManager.dispatch('showLevelUpRewards', { choices });

      const activeClass = this._classes.find(c => c.name === this._activeClass);
      const xpTable = activeClass ? activeClass.xpTable : defaultXpTable;
      const rewards = xpTable.getRewardsForLevel(level);

      for (const reward of rewards) {
          switch (reward) {
              case 'attribute_point':
                  this.player.attributes.grantAvailablePoint();
                  this.eventManager.dispatch('log', { channel: 'domain', message: `Gained an attribute point!`, params: [] });
                  break;
              case 'class_skill':
                  this.player.attributes.grantAvailablePoint();
                  this.eventManager.dispatch('log', { channel: 'domain', message: `Gained a skill point for your skill tree!`, params: [] });
                  break;
          }
      }
  }

  public serialize(): PlayerClassSaveData {
      return {
          unlockedClasses: [...this._unlockedClasses],
          activeClass: this._activeClass,
          unlockedSkills: Array.from(this._unlockedSkills),
          activeLoadout: [...this.activeLoadout],
          passiveLoadout: [...this.broochManager.passiveLoadout],
          globalActiveLoadout: [...this.broochManager.globalActiveLoadout]
      };
  }

  public restore(data: Partial<PlayerClassSaveData>): void {
      if (!data) return;

      if (Array.isArray(data.unlockedClasses)) {
          this._unlockedClasses = [...data.unlockedClasses];
      }
      if (data.activeClass) {
          this._activeClass = data.activeClass;
      }
      if (Array.isArray(data.unlockedSkills)) {
          this._unlockedSkills = new Set(data.unlockedSkills);
          for (const skillId of this._unlockedSkills) {
              for (const cls of this._classes) {
                  const skill = cls.allSkills?.find((s: any) => s.id === skillId);
                  if (skill && skill.type === 'passive' && skill.effect) {
                      skill.effect.apply(this.player as any);
                  }
              }
          }
      }
      if (Array.isArray(data.activeLoadout)) {
          this.activeLoadout = [null, null, null, null];
          data.activeLoadout.forEach((id, i) => {
              if (id && i >= 0 && i < 4) this.activeLoadout[i] = id;
          });
      }
      if (Array.isArray(data.passiveLoadout)) {
          data.passiveLoadout.forEach((id, i) => {
              if (id) this.broochManager.equipPassive(id, i);
          });
      }
      if (Array.isArray(data.globalActiveLoadout)) {
          data.globalActiveLoadout.forEach((id, i) => {
              if (id) this.broochManager.equipActive(id, i);
          });
      }
  }
}
