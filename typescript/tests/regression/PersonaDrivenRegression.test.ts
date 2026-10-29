import { describe, it, expect } from 'vitest';
import { VeteranMinMaxerPersona, ExploiterRuleTesterPersona } from '../personas/PlayerPersonas';
import { HeadlessGameSimulator } from '../personas/GameSimulatorDriver';
import Attributes from '../../domain/ObjectModule/Entities/Attributes';
import Player from '../../domain/ObjectModule/Entities/Player/Player';
import Scythe from '../../domain/ObjectModule/Items/Weapons/MeleeWeapons/Scythe';
import SimpleStaff from '../../domain/ObjectModule/Items/Weapons/RangedWeapons/Staffs/SimpleStaff';
import { EventHandler } from '../../domain/eventDispacher/eventDispacher';

describe('Suíte de Testes de Regressão Guiada por Personas', () => {

    it('REGRESSÃO: Regeneração passiva não deve exceder maxHp nem maxMana', async () => {
        const simulator = new HeadlessGameSimulator(new VeteranMinMaxerPersona());
        await simulator.initializeWorld('vilgem');
        const player = simulator.getDomain().player;

        // Força HP e Mana abaixo do máximo
        player.attributes.hp = 5;
        player.attributes.mana = 2;

        // Executa 300 ticks (~5 segundos virtuais)
        simulator.runSession(300, 1 / 60);

        // Deve ter regenerado, mas respeitando estritamente os caps
        expect(player.attributes.hp).toBeLessThanOrEqual(player.attributes.maxHp);
        expect(player.attributes.mana).toBeLessThanOrEqual(player.attributes.maxMana);
        expect(player.attributes.hp).toBeGreaterThan(5);
        expect(player.attributes.mana).toBeGreaterThan(2);
    });

    it('REGRESSÃO: Swap rápido de armas não deve duplicar nem corromper slots ativos', async () => {
        const simulator = new HeadlessGameSimulator(new ExploiterRuleTesterPersona());
        await simulator.initializeWorld('vilgem');
        const player = simulator.getDomain().player;

        // Equipa duas armas para permitir alternância
        player.equipment.mainHand = new Scythe();
        player.equipment.secondHand = new SimpleStaff();

        const initialInventoryCount = player.inventory.backpack.length;

        // Roda sessão de troca agressiva de armas
        const report = simulator.runSession(60, 1 / 60);

        expect(report.weaponsSwapped).toBeGreaterThan(0);
        // O inventário não pode ter itens duplicados fantasma nem itens vazados
        expect(player.inventory.backpack.length).toBe(initialInventoryCount);
        expect(player.equipment.mainHand).toBeDefined();
        expect(player.equipment.secondHand).toBeDefined();
    });

    it('REGRESSÃO: Jogador morto não deve continuar regenerando vida', () => {
        const eventManager = new EventHandler();
        const attrs = new Attributes(1, 1, 10, 10, 10, 10, 10, 10);
        const player = new Player(1, { x: 0, y: 0 }, attrs, eventManager);

        // Simula morte
        player.attributes.hp = 0;
        
        // Simula avanço de update manual
        player.update(1.0);

        // HP deve permanecer 0 e não regenerar após a morte
        expect(player.attributes.hp).toBe(0);
    });
});
