import MeleeWeapon from "./MeleeWeapon";
import type Entity from "../../../Entities/Entity";
import type Vector2D from "../../../../shared/Vector2D";
import type { IEventManager } from "../../../../eventDispacher/IGameEvents";
import Attack from "../../Attack";
//? Garante import e registro do ScytheSlash no SpawnRegistry

import "./ScytheSlash";

export default class Scythe extends MeleeWeapon {
    constructor() {
        super(
            25, 0.8, 'Foice das Almas', 'Uma arma macabra que drena a força vital dos inimigos.', 3, 'rare', 3, 150, 100, [], 1, {}, false, true, 'Necromante'
        );
        this.attackRange = 80;
        this.attackAngle = 180;
        this.weaponType = 'scythe';

        this.onHitActions.push((attacker, _target, damageDealt) => {
            const healAmount = damageDealt * 0.15; //? 15% de roubo de vida convertido em cura ao portador
            attacker.attributes.hp += healAmount;
        });
    }

    public override attack(attacker: Entity, direction: Vector2D, eventManager: IEventManager): void {
        const scaledDamage = this.baseDamage + Math.floor(attacker.attributes.strength);
        const weaponAttack = new Attack(attacker, scaledDamage, 'physical', this.onHitActions);

    //? Instancia entidade física ScytheSlash para varredura de colisão dinâmica
        eventManager.dispatch('spawn', {
            type: 'scytheSlash',
            coordinates: { x: attacker.coordinates.x, y: attacker.coordinates.y },
            direction: direction,
            attack: weaponAttack,
            attacker: attacker
        });
    }
}