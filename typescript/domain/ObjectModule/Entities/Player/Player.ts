//* import type World from "../../../World";
import Vector2D from "../../../shared/Vector2D";
import Entity from "../Entity";
import Attributes from "../Attributes";
import type { IEventManager } from "../../../eventDispacher/IGameEvents";
import { HitBoxCircle } from "../../../hitBox/HitBoxCircle";
import type ObjectElement from "../../ObjectElement";
import type Item from "../../Items/Item";
import type Weapon from "../../Items/Weapons/Weapon";
import type Bag from "../../Items/Storage/Bag";
import { type DamageInfo } from "../Entity";
import Class from "./Classes/Class";
import type { baseAttributes } from "../Attributes";
import DefaultXPTable from "../DefaultXPTable";
import Warrior from "./Classes/Warrior";
import Mage from "./Classes/Mage";
import Gunslinger from "./Classes/Gunslinger";
import Necromancer from "./Classes/Necromancer";
import Pescador from "./Classes/Pescador";
import { BindAction } from "../../../eventDispacher/ActionBindings";

import type Armor from "../../Items/Armors/Armor";

export type playerStates = 'idle' | 'walking' | 'dead'

const defaultXpTable = new DefaultXPTable();

export default class Player extends Entity {

  private movementSinceLastUpdate: boolean = false;
  private isDashing: boolean = false;

  public backpack: Item[] = [];
  public coins: number = 0; // A carteira do jogador!
  public equipedItens: Item[] = [];
  public equipment: { 
    mainHand?: Weapon | undefined;
    secondHand?: Weapon | undefined;
    helmet?: Armor | undefined;
    chestplate?: Armor | undefined;
    pants?: Armor | undefined;
    boots?: Armor | undefined;
    gloves?: Armor | undefined;
    amulet?: Armor | undefined;
    bag?: Bag | undefined;
    leftHandRings: Armor[];
    rightHandRings: Armor[];
  } = { leftHandRings: [], rightHandRings: [] };
  private isLeftClickActiveThisFrame: boolean = false;
  private wasLeftClickActiveLastFrame: boolean = false;
  private attackCooldownTimer: number = 0;
  public hasBeard: boolean = false; // Para validar a Regra de Negócio de Exceção Visual!

  // --- Sistema de Classes e Skills ---
  private _unlockedClasses: string[] = [];
  private _activeClass: string | null = null;
  private _classes: Class[] = [];
  private _unlockedSkills: Set<string> = new Set();
  // -----------------------------------
  
  /** Matriz de 4 posições contendo os IDs das habilidades ativas equipadas */
  public activeLoadout: (string | null)[] = [null, null, null, null];

  public facingDirection: Vector2D = new Vector2D(1, 0); // Direção para onde o mago atira

  /** Retorna a capacidade máxima dinâmica do inventário do jogador */
  public get maxBackpackSize(): number {
    return 24 + (this.equipment.bag?.capacityBonus || 0); // 24 slots base + Bônus da Bolsa equipada
  }

  constructor (
    id: number,
    coordinates : { x: number, y :number },
    attributes :Attributes,
    eventManager: IEventManager,
    state: playerStates = 'idle'
  ){
    const size = { width: 16, height: 16 }; //? jogador (16x16)
    super(id, coordinates, size, 'player', attributes, eventManager, state);

    // Instancia as classes diretamente no domínio, servindo como o banco de dados das "regras"
    this._classes = [
      new Warrior(defaultXpTable, this, eventManager),
      new Mage(defaultXpTable, this, eventManager),
      new Gunslinger(defaultXpTable, this, eventManager),
      new Necromancer(defaultXpTable, this, eventManager),
      new Pescador(defaultXpTable, this, eventManager),
    ];

    this.hitboxes = [ ...this.setHitboxes() ];
  }

  private setHitboxes () :HitBoxCircle[]{

    return [new HitBoxCircle(
      { x: this.coordinates.x + this.size.width / 2, y: this.coordinates.y + this.size.height / 2 },
      0,
      7,
      (otherElement: ObjectElement) => {
        // 1. Resolução Física (Obstáculos Sólidos)
        if (otherElement.objectId === 'environmentCollider') {
            // console.log(`[Física Domínio] O Player sofreu atrito com: ${(otherElement as any).tileType}`);
            this.resolveEnvironmentCollision(otherElement, 7);
            return;
        }

        // 2. Interação com Inimigos (Dano de Contato)
        // Verificação estrita: garante que é uma função antes de chamar
        if (typeof (otherElement as any).onStrike === 'function'){
          const enemyAttack = (otherElement as any).onStrike();
          
          if (enemyAttack) {
            let directionToPlayer = new Vector2D(
              (this.coordinates.x + this.size.width / 2) - (otherElement.coordinates.x + otherElement.size.width / 2),
              (this.coordinates.y + this.size.height / 2) - (otherElement.coordinates.y + otherElement.size.height / 2)
            );
            
            // Proteção Anti-NaN: Se estiverem exatamente no mesmo pixel, força uma direção arbitrária
            if (directionToPlayer.x === 0 && directionToPlayer.y === 0) {
              directionToPlayer.x = 1;
            }
            
            directionToPlayer.normalizeMut();
            enemyAttack.execute(this, directionToPlayer);
          }
        }
      }
    )]
  }

  /** Avança o estado interno do jogador. Chamado a cada frame pelo DomainFacade. */
  public update(deltaTime: number): void {
    if (this.state === 'dead' || this.attributes.hp <= 0) {
      this.state = 'dead';
      return;
    }

    this.updateStatuses(deltaTime);

    if (this.attackCooldownTimer > 0) {
      this.attackCooldownTimer -= deltaTime;
    }

    this.move(deltaTime)
    if (!this.movementSinceLastUpdate)  this.state = 'idle';
    
    this.movementSinceLastUpdate = false;

    this.wasLeftClickActiveLastFrame = this.isLeftClickActiveThisFrame;
    this.isLeftClickActiveThisFrame = false; // Reseta para a coleta do próximo frame
    
    this.direction.resetMut()
  }

  /**
   * Sobrescreve o método takeDamage para adicionar uma lógica específica do jogador:
   * disparar o evento 'playerDied' quando sua vida chega a zero.
   */
  public override takeDamage(damageInfo: DamageInfo): number {
    let totalDodge = this.attributes.dodge;
    if (this.activeStatuses.has('poison')) totalDodge -= 10;
    let totalDamageReduction = 0;

    // Soma os bônus defensivos de todas as armaduras equipadas
    const armorSlots: (keyof Player['equipment'])[] = ['helmet', 'chestplate', 'pants', 'boots', 'gloves', 'amulet'];
    for (const slot of armorSlots) {
      const item = this.equipment[slot] as Armor | undefined;
      if (item) {
        totalDodge += item.dodgePercent || 0;
        totalDamageReduction += item.damageReductionPercent || 0;
      }
    }
    // Soma os bônus acumulativos dos Senhores dos Anéis (Os 10 Dedos)
    for (const ring of [...this.equipment.leftHandRings, ...this.equipment.rightHandRings]) {
      totalDodge += ring.dodgePercent || 0;
      totalDamageReduction += ring.damageReductionPercent || 0;
    }

    // 1. Verifica Esquiva (Dodge)
    if (Math.random() * 100 < totalDodge) {
      this.eventManager.dispatch('log', { channel: 'domain', message: 'Player esquivou do ataque!', params: [] });
      return 0; // O jogador não toma nenhum dano!
    }

    // 2. Redução Percentual de Dano (Capado a 90% para não ficar totalmente imortal)
    totalDamageReduction = Math.min(90, totalDamageReduction);
    const reducedDamage = damageInfo.totalDamage * (1 - (totalDamageReduction / 100));

    // Aplica o dano reduzido na entidade base (que também deduzirá a Defesa plana)
    const damageDealt = super.takeDamage({ ...damageInfo, totalDamage: reducedDamage });

    if (this.attributes.hp <= 0) {
      this.eventManager.dispatch('playerDied', {});
    }

    return damageDealt;
  }

  //? ----------- Main actions -----------


  private dashToDirection( direction:Vector2D ):void {
  
    if (!this.isDashing){

      this.accelerator.addMut(direction.clone().normalizeMut()).multiplyMut(3)
      this.isDashing = true
      
      setTimeout(() => {
          this.accelerator.resetMut()
      }, 150);
      
      setTimeout(() => {
          this.isDashing = false
      }, 1000);
    }
  }

  public override move( deltaTime: number): void {
    if (this.state === 'dead' || this.attributes.hp <= 0) return;

    if (this.direction.x !== 0 || this.direction.y !== 0 || this.accelerator.x !== 0 || this.accelerator.y !== 0) {
      this.state = 'walking';
      this.movementSinceLastUpdate = true;
    }

    const displacement = this.attributes.speed * this.currentSpeedModifier * deltaTime;
    this.currentSpeedModifier = 1; // Reseta
    
    // Guarda a última direção virada para usar na magia
    if (this.direction.x !== 0 || this.direction.y !== 0) {
      this.facingDirection.x = this.direction.x;
      this.facingDirection.y = this.direction.y;
      this.facingDirection.normalizeMut();
    }

    this.velocity.x = this.direction.x;
    this.velocity.y = this.direction.y;
    this.velocity.normalizeMut().multiplyMut(displacement).addMut(this.accelerator);
        
    
    this.updatePosition();
  }

  //? ----------- On Input Handlers -----------

  @BindAction('up')
  public onUpAction (): void {
    this.direction.y -= 1
  }
  @BindAction('down')
  public onDownAction (): void {
    this.direction.y += 1
  }
  @BindAction('left')
  public onLeftAction (): void {
    this.direction.x -= 1
  }
  @BindAction('right')
  public onRightAction (): void {
    this.direction.x += 1
  }
  
  @BindAction('shift')
  public onShiftAction (): void {
    this.dashToDirection(this.direction)
  }

  @BindAction('leftClick')
  public onLeftClickAction( mouseLastCoordinates: {x:number;y:number} ): void {
    if (this.activeStatuses.has('stun') || this.activeStatuses.has('paralyze')) return; // Controle de Grupo o impede de atirar!
    this.isLeftClickActiveThisFrame = true;

    if (this.activeClass === 'Mago') return; // Mago não atira com o mouse!

    const weapon = this.equipment.mainHand;

    if (!weapon) {
      if (!this.wasLeftClickActiveLastFrame) this.eventManager.dispatch('log', { channel: 'domain', message: "Cannot shoot without a weapon", params: [] });
      return;
    }

    if (weapon.weaponType === 'melee' && this.wasLeftClickActiveLastFrame) return; 

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

  //? ----------- Helpers -----------

  /**
   * Adiciona experiência ao jogador.
   * @param xpAmount A quantidade de experiência a ser adicionada.
   */
  public gainXp(xpAmount: number): void {
    const oldLevel = this.attributes.level;
    const activeClass = this._classes.find(c => c.name === this._activeClass);
    const xpTable = activeClass ? activeClass.xpTable : defaultXpTable;
    
    this.attributes.addXp(xpAmount, xpTable);
    const newLevel = this.attributes.level;

    for (let lvl = oldLevel + 1; lvl <= newLevel; lvl++) {
        this.processLevelUp(lvl);
    }
  }

  private processLevelUp(level: number): void {
      const cx = this.coordinates.x + this.size.width / 2;
      const cy = this.coordinates.y + this.size.height / 2;
      this.eventManager.dispatch('levelUp', { newLevel: level, coordinates: { x: cx, y: cy } });
      this.eventManager.dispatch('log', { channel: 'domain', message: `Player leveled up to ${level}!`, params: [] });

      const activeClass = this._classes.find(c => c.name === this._activeClass);
      const xpTable = activeClass ? activeClass.xpTable : defaultXpTable;
      const rewards = xpTable.getRewardsForLevel(level);

      for (const reward of rewards) {
          switch (reward) {
              case 'attribute_point':
                  this.attributes.grantAvailablePoint();
                  this.eventManager.dispatch('log', { channel: 'domain', message: `Gained an attribute point!`, params: [] });
                  break;
              case 'class_skill':
                  if (activeClass) {
                      const newSkill = activeClass.getSkillForLevel(level);
                      if (newSkill) {
                          // Agora o destrave é apenas notificado, o jogador deve abrir a Árvore e gastar o ponto lá.
                          this.eventManager.dispatch('log', { channel: 'domain', message: `Nova habilidade liberada para compra: ${newSkill.name}!`, params: [] });
                      }
                  }
                  break;
          }
      }
  }
  /** Retorna o estado atual do jogador. */
  public getState(): 'idle' | 'walking' | 'dead' {
    return this.state as playerStates;
  }

  public allocateAttribute(attribute: keyof baseAttributes) {
    if(this.attributes.spendPoint(attribute)) {
      this.eventManager.dispatch('log', { channel: 'domain', message: `Allocated point to ${attribute}`, params: [] });
    }
  }

  //? ----------- Inventory Management -----------

  public equipItem(backpackIndex: number) {
    const item = this.backpack[backpackIndex];
    if (!item) return;

    const category = item.category ? item.category.toLowerCase() : '';
    
    this.eventManager.dispatch('log', { channel: 'domain', message: `Tentando equipar [${item.name}]. Categoria detectada: '${category}'`, params: [] });

    // Intercepta a tentativa de "equipar" consumíveis e redireciona para a função correta
    if (category === 'potion' || category === 'food' || category === 'currency' || category === 'quest') {
      this.consumeItem(backpackIndex);
      return;
    }

    if (category === 'storage') {
      const bag = item as Bag;
      if (this.equipment.bag) this.backpack.push(this.equipment.bag); // Joga a bolsa velha de volta na mochila
      this.equipment.bag = bag;
      this.backpack.splice(backpackIndex, 1); // Remove a nova da mochila
      this.eventManager.dispatch('log', { channel: 'domain', message: `Equipped ${bag.name} in slot [bag]`, params: [] });
      return;
    }

    if (category === 'weapon') {
      const weapon = item as Weapon;
      if (this.equipment.mainHand) {
        this.backpack.push(this.equipment.mainHand);
      }
      this.equipment.mainHand = weapon;
      this.backpack.splice(backpackIndex, 1);
      this.eventManager.dispatch('log', { channel: 'domain', message: `Equipped ${weapon.name}`, params: [] });

      if (weapon.unlocksClass) {
        this.unlockClass(weapon.unlocksClass);
        this.setActiveClass(weapon.unlocksClass);
      }
    } else if (category === 'armor') {
      const armor = item as any; // Cast flexível para absorver a ArmorType
      let slot = armor.armorType ? (armor.armorType as string).toLowerCase() : ''; // Força minúsculo (corrige 'Helmet' para 'helmet')
      
      this.eventManager.dispatch('log', { channel: 'domain', message: `ArmorType (Slot) detectado: '${slot}'`, params: [] });

      if (!slot) {
        this.eventManager.dispatch('log', { channel: 'error', message: `Erro ao equipar: O item '${item.name}' não possui um 'armorType' definido.`, params: [] });
        return;
      }
      
      if (slot === 'ring') {
        if (this.equipment.leftHandRings.length < 5) {
          this.equipment.leftHandRings.push(armor);
        } else if (this.equipment.rightHandRings.length < 5) {
          this.equipment.rightHandRings.push(armor);
        } else {
          // Arranca o anel do mindinho da mão esquerda e coloca na mochila se todos os 10 estiverem cheios
          const oldRing = this.equipment.leftHandRings.shift();
          if (oldRing) this.backpack.push(oldRing);
          this.equipment.leftHandRings.push(armor);
        }
        this.backpack.splice(backpackIndex, 1);
        this.eventManager.dispatch('log', { channel: 'domain', message: `Equipped ${armor.name} in rings`, params: [] });
        return;
      }

      if ((this.equipment as any)[slot]) {
        this.backpack.push((this.equipment as any)[slot]); // Joga o antigo de volta na bolsa
      }
      (this.equipment as any)[slot] = armor;

      this.backpack.splice(backpackIndex, 1);
      this.eventManager.dispatch('log', { channel: 'domain', message: `Equipped ${armor.name} in slot [${slot}]`, params: [] });
    } else {
      this.eventManager.dispatch('log', { channel: 'error', message: `Erro ao equipar: Categoria '${item.category}' não reconhecida no item '${item.name}'.`, params: [] });
    }
  }

  public unequipItem(slot: string, index?: number) {
    if (slot === 'leftHandRings' && index !== undefined) {
      const ring = this.equipment.leftHandRings.splice(index, 1)[0];
      if (ring) this.backpack.push(ring);
    } else if (slot === 'rightHandRings' && index !== undefined) {
      const ring = this.equipment.rightHandRings.splice(index, 1)[0];
      if (ring) this.backpack.push(ring);
    } else if (slot === 'bag' && this.equipment.bag) {
      // Regra de Ouro: Não dá pra desequipar uma mochila se o número de itens que você está carregando for maior que a mochila base (24)
      if (this.backpack.length >= 24) {
        this.eventManager.dispatch('log', { channel: 'error', message: `Mochila cheia demais para desequipar a bolsa!`, params: [] });
        return;
      }
      this.backpack.push(this.equipment.bag);
      this.equipment.bag = undefined;
    } else if (slot === 'mainHand' && this.equipment.mainHand) {
      this.backpack.push(this.equipment.mainHand);
      this.equipment.mainHand = undefined;
      this.eventManager.dispatch('log', { channel: 'domain', message: `Unequipped mainHand`, params: [] });
    } else if (slot !== 'mainHand' && (this.equipment as any)[slot]) {
      this.backpack.push((this.equipment as any)[slot]);
      (this.equipment as any)[slot] = undefined;
      this.eventManager.dispatch('log', { channel: 'domain', message: `Unequipped ${slot}`, params: [] });
    }
  }

  public consumeItem(backpackIndex: number): void {
    const item = this.backpack[backpackIndex];
    if (!item) return;

    if ('use' in item && typeof (item as any).use === 'function') {
      (item as any).use(this); // Aplica todos os efeitos do consumível
      
      this.backpack.splice(backpackIndex, 1);
      this.eventManager.dispatch('log', { channel: 'domain', message: `Consumed ${item.name}`, params: [] });
      
      // Efeito visual terapêutico genérico
      const centerX = this.coordinates.x + this.size.width / 2;
      const centerY = this.coordinates.y + this.size.height / 2;
      this.eventManager.dispatch('particle', { effect: 'magicAura', x: centerX, y: centerY, color: '#32CD32' }); // Verde cura
    } else {
      this.eventManager.dispatch('log', { channel: 'error', message: `O item ${item.name} não é consumível.`, params: [] });
    }
  }

  public deleteItem(backpackIndex: number): void {
    const item = this.backpack[backpackIndex];
    if (item) {
      this.backpack.splice(backpackIndex, 1);
      this.eventManager.dispatch('log', { channel: 'domain', message: `Deleted item: ${item.name}`, params: [] });
    }
  }

  //? ----------- Class & Skill Management -----------

  /** Desbloqueia permanentemente uma nova classe. Pode ser chamado quando pegar uma arma pela primeira vez. */
  public unlockClass(className: string): void {
    if (!this._unlockedClasses.includes(className)) {
      this._unlockedClasses.push(className);
      this.eventManager.dispatch('log', { channel: 'domain', message: `Class unlocked: ${className}`, params: [] });
    }
  }

  /** Define a classe ativa atual. */
  public setActiveClass(className: string): void {
    if (this._unlockedClasses.includes(className)) {
      const oldClassInstance = this._classes.find(c => c.name === this._activeClass);
      this._activeClass = className;
      const newClassInstance = this._classes.find(c => c.name === className);
      this.eventManager.dispatch('classChanged', { oldClassInstance, newClassInstance });
      this.eventManager.dispatch('log', { channel: 'domain', message: `Class changed to: ${className}`, params: [] });
    }
  }

  public get classes(): Class[] { return this._classes; }
  public get unlockedSkills(): Set<string> { return this._unlockedSkills; }
  
  public unlockSkill(skillId: string): void {
    // Opcional: A regra de negócio se o jogador tem pontos de skill suficientes entra aqui!
    this._unlockedSkills.add(skillId);
    this.eventManager.dispatch('log', { channel: 'domain', message: `Skill unlocked: ${skillId}`, params: [] });

    // Aplica o efeito imediatamente se for uma skill passiva
    const activeClassInstance = this._classes.find(c => c.name === this._activeClass);
    if (activeClassInstance) {
      const skill = activeClassInstance.allSkills.find(s => s.id === skillId);
      if (skill && skill.type === 'passive' && skill.effect) {
        skill.effect.apply(this);
      }
    }
  }

  public equipSkillInLoadout(skillId: string, slotIndex: number): void {
    if (slotIndex < 0 || slotIndex > 3) return;
    if (!this._unlockedSkills.has(skillId)) {
        this.eventManager.dispatch('log', { channel: 'error', message: `Não é possível equipar uma habilidade bloqueada: ${skillId}`, params: [] });
        return;
    }
    
    // Evita duplicatas removendo a skill do slot anterior se ela já estiver equipada
    const existingIndex = this.activeLoadout.indexOf(skillId);
    if (existingIndex !== -1) this.activeLoadout[existingIndex] = null;
    
    this.activeLoadout[slotIndex] = skillId;
    this.eventManager.dispatch('log', { channel: 'domain', message: `Habilidade ${skillId} equipada no slot ${slotIndex + 1}`, params: [] });
  }

  public executeActiveSkill(skillId: string, mouseCoordinates: {x: number, y: number}): void {
      const activeClassInstance = this._classes.find(c => c.name === this._activeClass);
      
      if (!activeClassInstance) return;

      // Restrição de Multiclasse: Só executa a skill se ela pertencer à classe do item da mão!
      const isFromActiveClass = activeClassInstance.allSkills.some(s => s.id === skillId);

      if (!isFromActiveClass) {
          this.eventManager.dispatch('log', { channel: 'error', message: `Multiclasse: A habilidade '${skillId}' não pertence à classe ativa (${this._activeClass}). Troque de arma para usá-la!`, params: [] });
          return;
      }

      if (typeof (activeClassInstance as any).executeSkill === 'function') {
          (activeClassInstance as any).executeSkill(skillId, mouseCoordinates);
      } else {
          this.eventManager.dispatch('log', { channel: 'error', message: `Skill ${skillId} falhou: A classe ${this._activeClass} não implementa executeSkill.`, params: [] });
      }
  }

  public get activeClass(): string | null { return this._activeClass; }
  public get unlockedClasses(): string[] { return this._unlockedClasses; }
}