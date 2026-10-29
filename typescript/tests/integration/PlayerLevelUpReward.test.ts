import { describe, it, expect, beforeEach } from 'vitest';
import { EventHandler } from '../../domain/eventDispacher/eventDispacher';
import Player from '../../domain/ObjectModule/Entities/Player/Player';
import Attributes from '../../domain/ObjectModule/Entities/Attributes';

describe('Blackbox Integration - Player LevelUp & Local Rewards', () => {
    let eventManager: EventHandler;
    let player: Player;

    beforeEach(() => {
        eventManager = new EventHandler();
        // Setup minimo para o Player
        const attributes = new Attributes(1, 10, 10, 10, 10, 10, 10, 10);
        player = new Player(1, { x: 0, y: 0 }, attributes, eventManager);
    });

    it('Fluxo Completo de Recompensa: Player recebe buff local de Velocidade (local_speed)', () => {
        // 1. Verificamos o status inicial do jogador
        const initialSpeed = player.attributes.speed;

        // 2. Simulamos o Evento da UI (GameEventBinder -> UI) mandando a recompensa selecionada
        eventManager.dispatch('rewardAction', { 
            action: 'claimLocal', 
            payload: { rewardId: 'local_speed' } 
        });

        // 3. Verificamos a saída final do objeto Player
        expect(player.attributes.speed).toBeGreaterThan(initialSpeed);
        expect(player.attributes.speed).toBe(initialSpeed + 10);
    });

    it('Fluxo Completo de Recompensa: Player recebe buff local de Chance de Crítico (local_crit)', () => {
        const initialCrit = player.attributes.critChance;

        eventManager.dispatch('rewardAction', { 
            action: 'claimLocal', 
            payload: { rewardId: 'local_crit' } 
        });

        expect(player.attributes.critChance).toBeGreaterThan(initialCrit);
        expect(player.attributes.critChance).toBe(initialCrit + 5);
    });
    
    it('Fluxo Completo de Recompensa: Player recebe buff de Cura Total (local_heal)', () => {
        // Simulando dano antes da recompensa
        (player.attributes as any)._hp = 10; 
        expect(player.attributes.hp).toBeLessThan(player.attributes.maxHp);

        eventManager.dispatch('rewardAction', { 
            action: 'claimLocal', 
            payload: { rewardId: 'local_heal' } 
        });

        expect(player.attributes.hp).toBe(player.attributes.maxHp);
    });
});
