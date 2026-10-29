import MeleeWeapon from "./MeleeWeapon";
import type Entity from "../../../Entities/Entity";
import type Vector2D from "../../../../shared/Vector2D";
import type { IEventManager } from "../../../../eventDispacher/IGameEvents";
import Attack from "../../Attack";
import "./ScytheSlash"; // Força o Vite a ler o arquivo e registrar a fábrica no SpawnRegistry!

export default class Scythe extends MeleeWeapon {
    constructor() {
        super(
            25, 0.8, 'Foice das Almas', 'Uma arma macabra que drena a força vital dos inimigos.', 3, 'rare', 3, 150, 100, [], 1, {}, false, true, 'Necromante'
        );
        this.attackRange = 80;
        this.attackAngle = 180;
        this.weaponType = 'scythe';

        // A Mágica do Roubo de Vida (Vampirismo Zero-GC)!
        this.onHitActions.push((attacker, _target, damageDealt) => {
            const healAmount = damageDealt * 0.15; // 15% de roubo de vida
            attacker.attributes.hp += healAmount;
        });
    }

    public override attack(attacker: Entity, direction: Vector2D, eventManager: IEventManager): void {
        const scaledDamage = this.baseDamage + Math.floor(attacker.attributes.strength);
        const weaponAttack = new Attack(attacker, scaledDamage, 'physical', this.onHitActions);

        // Dispara a Entidade Física "ScytheSlash", que varrerá os polígonos quadro a quadro!
        eventManager.dispatch('spawn', {
            type: 'scytheSlash',
            coordinates: { x: attacker.coordinates.x, y: attacker.coordinates.y },
            direction: direction,
            attack: weaponAttack,
            attacker: attacker
        });
    }
}