import Bullet from "./Bullet";
import type Vector2D from "../../../shared/Vector2D";
import type Attack from "../../Items/Attack";
import type Effect from "../../Items/Effects/Effect";
import type { IEventManager } from "../../../eventDispacher/IGameEvents";
import { HitBoxCircle } from "../../../hitBox/HitBoxCircle";
import type ObjectElement from "../../ObjectElement";
import { RegisterSpawner, type SpawnPayload } from "../../SpawnRegistry";
import FireEffect from "../../Items/Effects/ElementalEffects/FireEffect";
import WaterEffect from "../../Items/Effects/ElementalEffects/WaterEffect";
import GroundEffect from "../../Items/Effects/ElementalEffects/GroundEffect";
import DarkEffect from "../../Items/Effects/ElementalEffects/DarkEffect";
import LightEffect from "../../Items/Effects/ElementalEffects/LightEffect";
import MagicEffect from "../../Items/Effects/ElementalEffects/MagicEffect";
import PotenciaEffect from "../../Items/Effects/ElementalEffects/PotenciaEffect";
import IceEffect from "../../Items/Effects/ElementalEffects/IceEffect";
import LifeEffect from "../../Items/Effects/ElementalEffects/LifeEffect";
import AreaDamageEffect from "../../Items/Effects/AreaDamageEffect";
import OrdemEffect from "../../Items/Effects/ElementalEffects/OrdemEffect";
import AirEffect from "../../Items/Effects/ElementalEffects/AirEffect";
import MagmaEffect from "../../Items/Effects/ElementalEffects/MagmaEffect";
import InfernousEffect from "../../Items/Effects/ElementalEffects/InfernousEffect";
import ThunderEffect from "../../Items/Effects/ElementalEffects/ThunderEffect";
import NatureEffect from "../../Items/Effects/ElementalEffects/NatureEffect";
import AbysEffect from "../../Items/Effects/ElementalEffects/AbysEffect";
import HolyEffect from "../../Items/Effects/ElementalEffects/HolyEffect";
import DecayEffect from "../../Items/Effects/ElementalEffects/DecayEffect";
import CrystalEffect from "../../Items/Effects/ElementalEffects/CrystalEffect";
import NegationEffect from "../../Items/Effects/ElementalEffects/NegationEffect";

@RegisterSpawner('dynamicSpell')
export class DynamicProjectile extends Bullet {
    private speed: number = 300;
    private distanceTraveled: number = 0;
    private hitTargets: Set<number> = new Set();
    
    public effects: Effect[];
    public attack: Attack;
    public spellElements: string[]; //? Essências elementais combinadas que determinam o comportamento e apresentação
    
    public static readonly BASE_SIZE = { width: 10, height: 10 };

    constructor(
        id: number, coordinates: { x: number; y: number; }, direction: Vector2D,
        attack: Attack, effects: Effect[] = [], eventManager: IEventManager,
        elements: string[] = [],
        size: { width: number, height: number } = DynamicProjectile.BASE_SIZE
    ) {
        super(id, coordinates, size, 'dynamicSpell' as any, eventManager, 'travelling');
        this.direction = direction;
        this.attack = attack;
        this.effects = effects;
        this.spellElements = elements;
        this.hitboxes = [...this.setHitboxes(DynamicProjectile.BASE_SIZE)];
        this.rotation = this.direction.angle();
    }

    private setHitboxes(size: { width: number, height: number }): HitBoxCircle[] {
        return [new HitBoxCircle({ x: this.coordinates.x + size.width / 2, y: this.coordinates.y + size.height / 2 }, 0, size.width / 2, (otherElement: ObjectElement) => {
            if ('takeDamage' in otherElement && otherElement.id !== this.attack.attacker.id) {
                if (this.hitTargets.has(otherElement.id)) return;
                this.hitTargets.add(otherElement.id);
                this.attack.execute(otherElement as any, this.direction);
                this.effects.forEach(effect => effect.apply(otherElement as any));
                super.destroy();
            }
        })];
    }

    public update(deltaTime: number): void {
        const displacement = this.speed * deltaTime;
        this.distanceTraveled += displacement;
        if (this.distanceTraveled >= 500) super.destroy(); //? Alcance máximo de deslocamento de 500px
        this.velocity = this.direction.clone().normalizeMut().multiplyMut(displacement);
        this.rotation = this.direction.angle();
        super.updatePosition();
        this.hitboxes?.forEach(hb => hb.updatePosition({ x: this.coordinates.x + this.size.width / 2, y: this.coordinates.y + this.size.height / 2 }));
    }

    public static createSpawn(id: number, payload: SpawnPayload, eventManager: IEventManager): DynamicProjectile {
        const areaMult = payload.attack?.attacker?.attributes?.areaMultiplier || 1;
        const size = { 
            width: DynamicProjectile.BASE_SIZE.width * areaMult, 
            height: DynamicProjectile.BASE_SIZE.height * areaMult 
        };
        
        const centeredCoordinates = { x: payload.coordinates.x - size.width / 2, y: payload.coordinates.y - size.height / 2 };
        
        const elementalEffects: Effect[] = [];
        const source = payload.attack?.attacker;
        
        if (source && payload.spellElements) {
            for (const el of payload.spellElements) {
                if (el === 'fire') elementalEffects.push(new FireEffect(source));
                if (el === 'water') elementalEffects.push(new WaterEffect());
                if (el === 'ground') elementalEffects.push(new GroundEffect(source));
                if (el === 'dark') elementalEffects.push(new DarkEffect(source));
                if (el === 'light') elementalEffects.push(new LightEffect(source));
                if (el === 'magic') elementalEffects.push(new MagicEffect());
                
                if (el === 'potencia') elementalEffects.push(new PotenciaEffect(source));
                if (el === 'ice') elementalEffects.push(new IceEffect());
                if (el === 'life') elementalEffects.push(new LifeEffect(source));
                //? Elemento Caos gera dano radial em área

                if (el === 'caos') elementalEffects.push(new AreaDamageEffect(eventManager, 120, payload.attack!));
                if (el === 'ordem') elementalEffects.push(new OrdemEffect(source, payload.attack!, payload.spellElements!));
                if (el === 'air') elementalEffects.push(new AirEffect());
                if (el === 'magma') elementalEffects.push(new MagmaEffect(source));
                if (el === 'infernous') elementalEffects.push(new InfernousEffect());
                if (el === 'thunder') elementalEffects.push(new ThunderEffect());
                if (el === 'nature') elementalEffects.push(new NatureEffect());
                if (el === 'abys') elementalEffects.push(new AbysEffect());
                if (el === 'holy') elementalEffects.push(new HolyEffect(source, payload.attack!));
                if (el === 'decay') elementalEffects.push(new DecayEffect(source));
                if (el === 'crystal') elementalEffects.push(new CrystalEffect(eventManager, source, payload.attack!, payload.spellElements!));
                if (el === 'negation') elementalEffects.push(new NegationEffect(eventManager, 3));
            }
        }
        
        return new DynamicProjectile(id, centeredCoordinates, payload.direction!, payload.attack!, elementalEffects, eventManager, payload.spellElements || [], size);
    }
}