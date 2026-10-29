/**
 * @file BroochAndProgressionPersonaIntegration.test.ts
 * Bateria de Testes de Integração com Personas focada em:
 * 1. Meta-Progressão (Ganho de Essência/XP por fim de Run, compra de nós globais e desbloqueio de Broches).
 * 2. Equipamento e Execução de Broches Ancestrais (Passivos e Ativos).
 * 3. Aplicação cumulativa de bônus globais nos atributos do Jogador.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { VeteranMinMaxerPersona, ExploiterRuleTesterPersona, NaiveNovicePersona } from '../personas/PlayerPersonas';
import { HeadlessGameSimulator } from '../personas/GameSimulatorDriver';
import BroochRegistry from '../../domain/ObjectModule/Entities/Player/components/BroochRegistry';
import Attributes from '../../domain/ObjectModule/Entities/Attributes';
import Player from '../../domain/ObjectModule/Entities/Player/Player';
import { EventHandler } from '../../domain/eventDispacher/eventDispacher';

describe('Integração de Personas: Broches Ancestrais & Meta-Progressão', () => {
    let eventManager: EventHandler;

    beforeEach(() => {
        BroochRegistry.resetAll();
        eventManager = new EventHandler();
    });

    describe('Persona Veterano: Otimização de Meta-Progressão e Broches Ancestrais', () => {
        it('deve simular ciclo de run, acúmulo de essência e reivindicação de recompensa pós-morte', async () => {
            const persona = new VeteranMinMaxerPersona();
            const simulator = new HeadlessGameSimulator(persona);
            await simulator.initializeWorld('vilgem');

            const domain = simulator.getDomain();
            const metaManager = domain.metaProgressionManager;

            // Veterano alcança feitos durante a partida
            domain.metaProgressionManager.recordFeat('Primeiro Sangue', 150);
            domain.metaProgressionManager.recordFeat('Mestre dos Elementos', 300);

            // Simula fim de run por morte do jogador
            const initialEssence = metaManager.getGlobalState().globalEssence;
            const runReward = metaManager.calculateAndClaimRunReward(5); // nível final 5

            expect(runReward.totalReward).toBe((5 * 50) + 150 + 300); // 250 + 450 = 700
            expect(metaManager.getGlobalState().globalEssence).toBe(initialEssence + 700);
        });

        it('deve respeitar requisitos de dependência hierárquica na árvore global de habilidades', async () => {
            const persona = new VeteranMinMaxerPersona();
            const simulator = new HeadlessGameSimulator(persona);
            await simulator.initializeWorld('vilgem');

            const metaManager = simulator.getDomain().metaProgressionManager;
            const tree = metaManager.getAvailableNodesMap();

            const level1Node = tree.find(n => n.level === 1);
            const level2Node = tree.find(n => n.level === 2);
            expect(level1Node).toBeDefined();
            expect(level2Node).toBeDefined();

            // Tentativa inválida: desbloquear nível 2 sem antes ter o nível 1 correspondente
            metaManager.unlockNode(level2Node!.id);
            expect(metaManager.getUnlockedNodes()).not.toContain(level2Node!.id);

            // Desbloqueia o nó nível 1
            metaManager.unlockNode(level1Node!.id);
            expect(metaManager.getUnlockedNodes()).toContain(level1Node!.id);

            // Agora desbloqueia o nível 2 conectado
            const connectedLvl2 = tree.find(n => n.level === 2 && n.dependencies.includes(level1Node!.id));
            if (connectedLvl2) {
                metaManager.unlockNode(connectedLvl2.id);
                expect(metaManager.getUnlockedNodes()).toContain(connectedLvl2.id);
            }
        });

        it('deve equipar broche passivo no Player e ativar verificação no loadout', () => {
            const playerAttrs = new Attributes(1, 1, 10, 10, 10, 10, 10, 10);
            const player = new Player(1, { x: 0, y: 0 }, playerAttrs, eventManager);

            // Broche passivo canônico registrado: brooch_phoenix
            player.equipPassiveInLoadout('brooch_phoenix', 0);
            expect(player.hasPassiveBrooch('brooch_phoenix')).toBe(true);

            // Desequipar passando null
            player.equipPassiveInLoadout(null, 0);
            expect(player.hasPassiveBrooch('brooch_phoenix')).toBe(false);
        });
    });

    describe('Persona Explorador: Estresse de Limites e Rejeição de Invocações Inválidas', () => {
        it('deve impedir que mais de uma base de Nível 1 seja selecionada na mesma geração da árvore', async () => {
            const persona = new ExploiterRuleTesterPersona();
            const simulator = new HeadlessGameSimulator(persona);
            await simulator.initializeWorld('vilgem');

            const metaManager = simulator.getDomain().metaProgressionManager;
            const tree = metaManager.getAvailableNodesMap();
            const level1Nodes = tree.filter(n => n.level === 1);

            expect(level1Nodes.length).toBeGreaterThanOrEqual(2);

            // Tenta desbloquear primeira base
            metaManager.unlockNode(level1Nodes[0]!.id);
            expect(metaManager.getUnlockedNodes()).toContain(level1Nodes[0]!.id);

            // Tenta forçar o desbloqueio de uma segunda base (exploit proibido)
            metaManager.unlockNode(level1Nodes[1]!.id);
            // Segunda base não pode ter sido aceita
            expect(metaManager.getUnlockedNodes()).not.toContain(level1Nodes[1]!.id);
        });

        it('deve rejeitar slots de broche fora do intervalo [0..3]', () => {
            const playerAttrs = new Attributes(1, 1, 10, 10, 10, 10, 10, 10);
            const player = new Player(1, { x: 0, y: 0 }, playerAttrs, eventManager);

            player.equipPassiveInLoadout('brooch_phoenix', -1);
            player.equipPassiveInLoadout('brooch_phoenix', 4);

            expect(player.hasPassiveBrooch('brooch_phoenix')).toBe(false);
        });
    });

    describe('Persona Novato: Transparência e Não-Interferência', () => {
        it('não deve quebrar o estado do mundo caso nunca compre melhorias da árvore global', async () => {
            const persona = new NaiveNovicePersona();
            const simulator = new HeadlessGameSimulator(persona);
            await simulator.initializeWorld('vilgem');

            const domain = simulator.getDomain();
            const initialNodesCount = domain.metaProgressionManager.getUnlockedNodes().length;

            simulator.runSession(50, 1 / 60);

            // O novato não comprou nada e o estado continuou integro
            expect(domain.metaProgressionManager.getUnlockedNodes().length).toBe(initialNodesCount);
            expect(domain.player.state !== 'dead' ? domain.player.attributes.hp : 0).toBeGreaterThanOrEqual(0);
        });
    });
});
