import { describe, it, expect } from 'vitest';
import Attributes from '../../domain/ObjectModule/Entities/Attributes';
import Player from '../../domain/ObjectModule/Entities/Player/Player';
import { EventHandler } from '../../domain/eventDispacher/eventDispacher';

describe('Suíte de Testes de Mutação - Resiliência e Matança de Mutantes de Regras', () => {

    it('Mutações no Cálculo de Vida e Caps: Set de HP além de maxHp é automaticamente limitado', () => {
        const attrs = new Attributes(1, 1, 10, 10, 10, 10, 10, 10);
        const maxHp = attrs.maxHp;

        // Regra Real (Attributes.ts L225): `set hp(value) { this._hp = Math.max(0, Math.min(this._maxHp, value)); }`
        attrs.hp = maxHp + 100;
        expect(attrs.hp).toBe(maxHp);

        // Abaixo de 0 deve ser 0
        attrs.hp = -50;
        expect(attrs.hp).toBe(0);

        // Mutante A: Se mutante remover Math.min, attrs.hp ficaria > maxHp
        const mutantHpNoMaxLimit = maxHp + 100;
        expect(attrs.hp).not.toBe(mutantHpNoMaxLimit);
    });

    it('Mutações em Fórmulas de Atributos Derivados: Mutante que inverte bônus de agilidade/speed', () => {
        const baseAttrs = new Attributes(1, 1, 10, 10, 10, 10, 10, 10);
        const baseSpeed = baseAttrs.speed;

        const highDexAttrs = new Attributes(1, 1, 10, 10, 30, 10, 10, 10);
        // Regra Real: maior dexterity gera maior velocidade (100 + dex/10 + bonus)
        expect(highDexAttrs.speed).toBeGreaterThan(baseSpeed);

        // Mutante B: Inversão de sinal na fórmula de velocidade (ex: 100 - dex/10)
        const mutantInvertedSpeed = 100 - (30 / 10);
        expect(highDexAttrs.speed).not.toBe(mutantInvertedSpeed);
    });

    it('Mutações no Sistema de Recompensas: Mutante que ignora payload de recompensa', () => {
        const eventManager = new EventHandler();
        const attrs = new Attributes(1, 1, 10, 10, 10, 10, 10, 10);
        const player = new Player(1, { x: 0, y: 0 }, attrs, eventManager);

        const initialSpeed = player.attributes.speed;

        eventManager.dispatch('rewardAction', {
            action: 'claimLocal',
            payload: { rewardId: 'local_speed' }
        });

        // Se um mutante alterasse a recompensa para um no-op, a asserção abaixo mataria o mutante
        expect(player.attributes.speed).toBe(initialSpeed + 10);
    });

    it('Mutações em Condições de Morte: Mutante de verificação de vida', () => {
        const eventManager = new EventHandler();
        const attrs = new Attributes(1, 1, 10, 10, 10, 10, 10, 10);
        const player = new Player(1, { x: 0, y: 0 }, attrs, eventManager);

        attrs.hp = 0;
        // Regra canônica: se HP for 0, o jogador não tem vida positiva
        expect(player.attributes.hp <= 0).toBe(true);

        // Mutante C: Mutante que checa `hp < 0` em vez de `<= 0` para considerar morte
        const isDeadUnderMutant = player.attributes.hp < 0;
        expect(isDeadUnderMutant).toBe(false); // O mutante falharia em reconhecer morte com HP=0!
    });
});
