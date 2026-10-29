import Dice from "../../shared/Dice";
import type IXPTable from "./IXPTable";

export type baseAttributes = {
  strength: number,
  constitution: number,
  dexterity: number,
  intelligence: number,
  wisdom: number,
  charisma: number,
}

export default class Attributes {

  private _hp: number = 0;
  private _maxHp: number = 0;
  private _mana: number = 0;
  private _currentXp: number = 0;
  private _xpToNextLevel: number = 0;
  private _manaRegen: number = 5;
  private _availablePoints: number = 1; //? Jogador inicia com 1 ponto de atributo disponível para liberar a primeira habilidade de classe imediatamente

  //? Modificação vai ser pelos bonus
  private _bonusSpeed: number = 0;
  private _bonusCritDamage: number = 0;
  private _bonusCritChance: number = 0;
  private _bonusSplashDamage: number = 0;
  private _bonusLucky: number = 0;
  private _bonusPiercing: number = 0;
  private _bonusAccuracy: number = 0;
  private _bonusRecharge: number = 0;
  private _bonusTenacity: number = 0;
  private _bonusVigor: number = 0;
  private _bonusDodge: number = 0;
  private _bonusDefence: number = 0;
  private _bonusInsight: number = 0;
  private _bonusLifesteal: number = 0;
  private _bonusArea: number = 0;

  constructor(
    private hpDiceFaces: number,
    private _level: number, 
    
    private _strength: number,
    private _constitution: number,
    private _dexterity: number,
    private _intelligence: number,
    private _wisdom: number,
    private _charisma: number,
  ){ 
    this.setHp();
    this._mana = this.maxMana;
  }
  
  //? ----------- Methods -----------
  
  private setHp(){
    this._maxHp = 0;
    for (let i = 0; i < this._level; i++) {
      this._maxHp += Math.max(1, Dice.rollDice(this.hpDiceFaces) + this._constitution);
    }
    this._hp = this._maxHp;
  }

  /**
   * Adiciona experiência e verifica se a entidade subiu de nível.
   * @param xpAmount A quantidade de experiência a ser adicionada.
   * @param xpTable A tabela de XP que define a curva de progressão.
   */
  public addXp(xpAmount: number, xpTable: IXPTable) {
    this._currentXp += xpAmount * (1 + (this.insight / 100)); //? Aplica bônus percentual de Insight ao ganho de experiência

    if (this._xpToNextLevel === 0) {
      this._xpToNextLevel = xpTable.fixedBase * Math.pow(xpTable.levelScale, this._level - 1);
    }

    while (this._currentXp >= this._xpToNextLevel) {
      this._currentXp -= this._xpToNextLevel;
      this._level++;
      this._xpToNextLevel = xpTable.fixedBase * Math.pow(xpTable.levelScale, this._level - 1);

      const hpGain = Math.max(1, Dice.rollDice(this.hpDiceFaces) + this._constitution);
      this._maxHp += hpGain;

      this._hp = this._maxHp;
      this._mana = this.maxMana;
    }
  }

  public spendPoint(attribute: keyof baseAttributes): boolean {
    if (this._availablePoints > 0) {
      this._availablePoints--;
      if (attribute === 'strength') this._strength++;
      else if (attribute === 'constitution') {
        this._constitution++;
        this._maxHp += this._level; //? Bônus retroativo de vida máxima proporcional ao nível acumulado do personagem
        this._hp += this._level;
      }
      else if (attribute === 'dexterity') this._dexterity++;
      else if (attribute === 'intelligence' || attribute === 'wisdom' || attribute === 'charisma') {
        const oldMaxMana = this.maxMana;
        if (attribute === 'intelligence') this._intelligence++;
        if (attribute === 'wisdom') this._wisdom++;
        if (attribute === 'charisma') this._charisma++;
        this._mana += Math.max(0, this.maxMana - oldMaxMana); //? Preserva ganho proporcional de mana atual ao expandir a reserva máxima
      }
      return true;
    }
    return false;
  }
  
  public grantAvailablePoint(): void {
    this._availablePoints++;
  }

  //? ----------- Helpers -----------

  private getBestAttributeOfAll() :number{
    return this.getBestAttribute(this.strength,  this.constitution, this.dexterity, this.intelligence, this.wisdom, this.charisma);
  }

  private getBestAttribute(...atributes :number[]) :number{
    let bestAttribute = 0;

    atributes.forEach(element => {
      if(element > bestAttribute) bestAttribute = element
    })

    return bestAttribute;
  }

  //? ----------- Atributos Complexos -----------
  
  /** Current Health Points. */
  public get hp(): number { return this._hp; }
  public get maxHp(): number { return this._maxHp; }
  
  /** Current Mana Points. */
  public get mana() :number { return this._mana; }
  /** Maximum Mana Points. Based on the best between Inteligence, Wisdom, and Charisma. */
  public get maxMana() :number {  return this.getBestAttribute(this.intelligence, this.wisdom, this.charisma) * 10 }
  
  /** |  (this.constitution / 10 ) + (this.dexterity / 10) + bônus  | @returns returns damage cap*/
  public get defence(){ return (this.constitution / 10 ) + (this.dexterity / 10) + this._bonusDefence; }

  /** The current level of the entity. */
  public get level(): number { return this._level; }
  /** The current experience points. */
  public get currentXp(): number { return this._currentXp; }
  /** The experience points needed to reach the next level. */
  public get xpToNextLevel(): number { return this._xpToNextLevel; }
  /** Available points to spend in attributes. */
  public get availablePoints(): number { return this._availablePoints; }


  /** Entity's movement speed modifier. Based on Dexterity. */
  public get speed(): number { return 100 + (this.dexterity / 10) + this._bonusSpeed; }
  public get speedDescription(): string { return "Entity velocity modifier"  }
  
  /** Critical hit damage multiplier. Base 150% + 1% per point of the best attribute. @returns percentage value */
  public get critDamage(): number { return 150 + (this.getBestAttributeOfAll() * 1) + this._bonusCritDamage; }
  public get critDamageDescription(): string { return "Crit damage multiplier. x1.5 + x0.01 for each point of your best attribute."  }
  
  /** The chance to land a critical hit, as a percentage. Formula: 3% base + (Best Attribute / 10) + Lucky. @returns percentage value */
  public get critChance(): number { return 3 + ( this.getBestAttributeOfAll() / 10 ) + this.lucky + this._bonusCritChance; }
  public get critChanceDescription(): string { return "Determines the probability of landing a critical hit. Base chance is 3%, increased by your best attribute and luck."  }

  /** Percentage of damage dealt in an area around the main target. Based on the best attribute. @returns percentage value */
  public get splashDamage(): number { return (this.getBestAttributeOfAll() * 0.2) + this._bonusSplashDamage; }
  public get splashDamageDescription(): string { return "Deals a percentage of damage to enemies around the target. 0.2% of best attribute."  }

  /** Modificador de coisas baseadas em chance acontecerem (drop de itens, crit) | (this.charisma + this.wisdown) /2 ) / 10 | @returns percentage value  */
  public get lucky(): number { return Math.floor( ( (this.charisma + this.wisdom) /2 ) / 10) + this._bonusLucky; }
  public get luckyDescription(): string { return "Increases the chance of fortunate events, such as finding better items or landing critical hits."  }
  
  /** Number of enemies a projectile can pierce. Based on Dexterity. */
  public get piercing(): number { return Math.floor(this.dexterity / 10) + this._bonusPiercing; }
  public get piercingDescription(): string { return "The number of enemies a projectile can pierce through." }

  /** Chance to magically hit a nearby target if the attack would otherwise miss. @returns percentage value */
  public get accuracy(): number { return (this.dexterity * 0.5) + this._bonusAccuracy; }
  public get accuracyDescription(): string { return "Chance to hit a nearby enemy even if you miss." }

  /** Reduces the cooldown of abilities. Based on Dexterity. @returns percentage value */
  public get recharge(): number { return (this.dexterity * 0.25) + this._bonusRecharge; }
  public get rechargeDescription(): string { return "Reduces the cooldown time of your abilities." }

  /** Reduces the duration of crowd control effects on you. Based on Constitution, Wisdom, and Inteligence. @returns percentage value */
  public get tenacity(): number { return this.getBestAttribute( this.constitution, this.wisdom, this.intelligence ) * 0.5; }
  public get tenacityDescription(): string { return "Reduces the duration of crowd control effects like stuns and slows." }

  /** Increases the effectiveness of healing received. Based on Constitution. @returns percentage value */
  public get vigor(): number { return this.constitution * 0.5; }
  public get vigorDescription(): string { return "Increases the amount of health recovered from all sources." }

  /** Chance to completely avoid an incoming attack. Based on Dexterity. @returns percentage value*/
  public get dodge(): number { return (this.dexterity * 0.2) + this._bonusDodge; }
  public get dodgeDescription(): string { return "The chance to completely avoid an incoming attack." }

  /** Regeneração de mana por segundo. Ex: 0.1 por ponto de inteligência. */
  public get manaRegen(): number { return this.intelligence * 0.1; }
  public get manaRegenDescription(): string { return "Amount of mana regenerated per second." }

  /** Regeneração de vida por segundo | 0.5 * constituição | */
  public get hpRegen(): number { return this.constitution * 0.5; }
  public get hpRegenDescription(): string { return "Amount of health regenerated per second." }

  /** Bonus to experience points gained. Based on Wisdom. @returns percentage value */
  public get insight(): number { return (this.wisdom / 10) + this._bonusInsight; }
  public get insightDescription(): string { return "Increases the amount of experience points gained." }

  /** Porcentagem do dano causado convertida em cura. @returns percentage value */
  public get lifesteal(): number { return this._bonusLifesteal; }
  public get lifestealDescription(): string { return "Cura o atacante em uma porcentagem do dano causado." }

  /** Multiplicador do tamanho e área de ataques e projéteis. */
  public get areaMultiplier(): number { return 1 + (this._bonusArea / 100); }
  public get areaMultiplierDescription(): string { return "Aumenta o tamanho e área de efeito dos ataques e projéteis." }


  public addBonusMaxHp(value: number) { this._maxHp += value; this._hp += value; }
  public set hp(value: number) { this._hp = Math.max(0, Math.min(this._maxHp, value)); }
  public set mana(value: number) { this._mana = Math.max(0, Math.min(this.maxMana, value)); }
  public set speed(value: number) { this._bonusSpeed += value; }
  public set critDamage(value: number) { this._bonusCritDamage += value; }
  public set critChance(value: number) { this._bonusCritChance += value; }
  public set splashDamage(value: number) { this._bonusSplashDamage += value; }
  public set lucky(value: number) { this._bonusLucky += value; }
  public set piercing(value: number) { this._bonusPiercing += value; }
  public set accuracy(value: number) { this._bonusAccuracy += value; }
  public set recharge(value: number) { this._bonusRecharge += value; }
  public set tenacity(value: number) { this._bonusTenacity += value; }
  public set vigor(value: number) { this._bonusVigor += value; }
  public set dodge(value: number) { this._bonusDodge += value; }
  public set defence(value: number) { this._bonusDefence += value; }
  public set insight(value: number) { this._bonusInsight += value; }
  public set lifesteal(value: number) { this._bonusLifesteal += value; }
  public set bonusArea(value: number) { this._bonusArea += value; }

  //? ----------- Atributos Primários -----------

  public get strength(): number { return this._strength; }
  public set strength(value: number) { this._strength = value; }

  public get constitution(): number { return this._constitution; }
  public set constitution(value: number) { this._constitution = value; }

  public get intelligence(): number { return this._intelligence; }
  public set intelligence(value: number) { this._intelligence = value; }

  public get dexterity(): number { return this._dexterity; }
  public set dexterity(value: number) { this._dexterity = value; }

  public get charisma(): number { return this._charisma; }
  public set charisma(value: number) { this._charisma = value; }

  public get wisdom(): number { return this._wisdom; }
  public set wisdom(value: number) { this._wisdom = value; }

  public restoreState(state: {
    level: number;
    currentXp?: number;
    availablePoints?: number;
    maxHp?: number;
    hp?: number;
    mana?: number;
    strength: number;
    constitution: number;
    dexterity: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
  }): void {
    this._level = state.level;
    this._currentXp = state.currentXp ?? 0;
    this._availablePoints = state.availablePoints ?? 0;
    this._strength = state.strength;
    this._constitution = state.constitution;
    this._dexterity = state.dexterity;
    this._intelligence = state.intelligence;
    this._wisdom = state.wisdom;
    this._charisma = state.charisma;
    if (state.maxHp !== undefined) this._maxHp = state.maxHp;
    if (state.hp !== undefined) {
      this._hp = state.hp <= 0 ? this._maxHp : Math.min(this._maxHp, state.hp);
    } else {
      this._hp = this._maxHp;
    }
    if (state.mana !== undefined) this._mana = Math.min(this.maxMana, state.mana);
  }
}
