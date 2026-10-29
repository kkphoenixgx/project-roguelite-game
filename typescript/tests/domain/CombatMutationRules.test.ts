import { describe, it, expect } from 'vitest';
import Attributes from '../../domain/ObjectModule/Entities/Attributes';
import Player from '../../domain/ObjectModule/Entities/Player/Player';
import Attack from '../../domain/ObjectModule/Items/Attack';
import Vector2D from '../../domain/shared/Vector2D';
import { EventHandler } from '../../domain/eventDispacher/eventDispacher';

describe('Suíte Expandida de Testes de Mutação - Combate, Lifesteal, Escalonamento e Caps', () => {

    it('MUTAÇÃO: Escalonamento de Dano Físico por Força (Mutante que zera scaling de força)', () => {
        const eventManager = new EventHandler();
        // Atacante com força 10 vs Atacante com força 30
        const baseAttrs = new Attributes(1, 10, 10, 10, 10, 10, 10, 10);
        baseAttrs.critChance = -999; // Remove aleatoriedade estocástica de crítico
        const playerBase = new Player(1, { x: 0, y: 0 }, baseAttrs, eventManager);

        const highStrAttrs = new Attributes(1, 10, 30, 10, 10, 10, 10, 10);
        highStrAttrs.critChance = -999;
        const playerStrong = new Player(2, { x: 0, y: 0 }, highStrAttrs, eventManager);

        // Alvos com HP alto para suportar o golpe sem morrer imediatamente
        const targetAttrs1 = new Attributes(1, 10, 10, 10, 10, 10, 10, 10);
        targetAttrs1.dodge = -999;
        const dummyTarget1 = new Player(3, { x: 10, y: 0 }, targetAttrs1, eventManager);

        const targetAttrs2 = new Attributes(1, 10, 10, 10, 10, 10, 10, 10);
        targetAttrs2.dodge = -999;
        const dummyTarget2 = new Player(4, { x: 10, y: 0 }, targetAttrs2, eventManager);

        const attack1 = new Attack(playerBase, 10, 'physical');
        const attack2 = new Attack(playerStrong, 10, 'physical');

        const hpBefore1 = dummyTarget1.attributes.hp;
        attack1.execute(dummyTarget1, new Vector2D(1, 0));
        const dmg1 = hpBefore1 - dummyTarget1.attributes.hp;

        const hpBefore2 = dummyTarget2.attributes.hp;
        attack2.execute(dummyTarget2, new Vector2D(1, 0));
        const dmg2 = hpBefore2 - dummyTarget2.attributes.hp;

        // Regra Real: playerStrong com 30 de força causa mais dano do que playerBase com 10 de força
        expect(dmg2).toBeGreaterThan(dmg1);

        // Mutante: Se mutante remover `totalDamage += strength * 0.5`, dmg2 seria igual a dmg1
        expect(dmg2 === dmg1).toBe(false);
    });

    it('MUTAÇÃO: Sistema de Lifesteal (Mutante que não cura o atacante ao causar dano)', () => {
        const eventManager = new EventHandler();
        const attackerAttrs = new Attributes(1, 10, 10, 10, 10, 10, 10, 10);
        attackerAttrs.lifesteal = 50; // 50% de lifesteal
        attackerAttrs.critChance = -999;
        const attacker = new Player(1, { x: 0, y: 0 }, attackerAttrs, eventManager);

        // Deixa o atacante com vida reduzida
        attacker.attributes.hp = 10;
        const initialHp = attacker.attributes.hp;

        const targetAttrs = new Attributes(1, 10, 10, 10, 10, 10, 10, 10);
        targetAttrs.dodge = -999;
        const target = new Player(2, { x: 10, y: 0 }, targetAttrs, eventManager);

        const attack = new Attack(attacker, 20, 'physical');
        attack.execute(target, new Vector2D(1, 0));

        // Regra Real: lifesteal curou o atacante
        expect(attacker.attributes.hp).toBeGreaterThan(initialHp);

        // Mutante: Se o mutante anular o lifesteal (`attacker.attributes.hp += 0`)
        const mutantHp = initialHp;
        expect(attacker.attributes.hp).not.toBe(mutantHp);
    });

    it('MUTAÇÃO: Defesa do Alvo Reduzindo Dano Físico (Mutante que ignora armadura)', () => {
        const eventManager = new EventHandler();
        const attackerAttrs = new Attributes(1, 10, 10, 10, 10, 10, 10, 10);
        attackerAttrs.critChance = -999; // Determinismo: crítico desligado
        const attacker = new Player(1, { x: 0, y: 0 }, attackerAttrs, eventManager);

        // Target frágil com pouca constituição/defesa
        const squishyAttrs = new Attributes(1, 10, 10, 10, 10, 10, 10, 10);
        squishyAttrs.defence = 0;
        squishyAttrs.dodge = -999;
        const squishyTarget = new Player(2, { x: 10, y: 0 }, squishyAttrs, eventManager);

        // Target tank com bônus direto de defesa
        const tankAttrs = new Attributes(1, 10, 10, 10, 10, 10, 10, 10);
        tankAttrs.defence = 10;
        tankAttrs.dodge = -999;
        const tankTarget = new Player(3, { x: 10, y: 0 }, tankAttrs, eventManager);

        const attack1 = new Attack(attacker, 20, 'physical');
        const attack2 = new Attack(attacker, 20, 'physical');

        const squishyHpBefore = squishyTarget.attributes.hp;
        attack1.execute(squishyTarget, new Vector2D(1, 0));
        const squishyDmg = squishyHpBefore - squishyTarget.attributes.hp;

        const tankHpBefore = tankTarget.attributes.hp;
        attack2.execute(tankTarget, new Vector2D(1, 0));
        const tankDmg = tankHpBefore - tankTarget.attributes.hp;

        // O alvo com mais defesa deve sofrer menor dano
        expect(tankDmg).toBeLessThan(squishyDmg);

        // Mutante: Se a defesa for ignorada no takeDamage, ambos tomariam o mesmo dano
        expect(tankDmg === squishyDmg).toBe(false);
    });
});
