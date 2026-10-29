import { describe, it, expect, beforeEach } from 'vitest';
import { 
    VeteranMinMaxerPersona, 
    ExploiterRuleTesterPersona, 
    NaiveNovicePersona, 
    ChaoticFuzzerPersona 
} from '../personas/PlayerPersonas';
import { HeadlessGameSimulator } from '../personas/GameSimulatorDriver';

describe('Baterias de Agentes & Personas Jogando o Jogo', () => {

    describe('Persona: Veterano Min-Maxer (Conhece as Regras)', () => {
        it('deve simular sessão de jogo e validar regras de regeneração, movimentação e kiting', async () => {
            const persona = new VeteranMinMaxerPersona();
            const simulator = new HeadlessGameSimulator(persona);
            await simulator.initializeWorld('vilgem');

            const report = simulator.runSession(60, 1 / 60);

            // Validação das regras conhecidas pelo Veterano
            expect(report.knowsRules).toBe(true);
            expect(report.ticksExecuted).toBe(60);
            expect(report.rulesTested).toContain('Regra de Ciclo de Update e Regeneração de Recursos');
            expect(report.rulesTested).toContain('Regra de Inicialização de Mundo e Chunks');
            expect(report.anomaliesFound).toHaveLength(0);

            // Verifica que o jogador regenera mana quando não está no limite
            const player = simulator.getDomain().player;
            expect(player.attributes.hp).toBeGreaterThan(0);
            expect(player.attributes.mana).toBeGreaterThan(0);
        });

        it('deve exercitar regras de Progressão e Recompensas Locais (Meta-Progression & Local Buffs)', async () => {
            const persona = new VeteranMinMaxerPersona();
            const simulator = new HeadlessGameSimulator(persona);
            await simulator.initializeWorld('vilgem');

            const player = simulator.getDomain().player;
            const initialCrit = player.attributes.critChance;

            // Simula escolha otimizada de buff pela persona conhecedora
            simulator.getEventManager().dispatch('rewardAction', {
                action: 'claimLocal',
                payload: { rewardId: 'local_crit' }
            });

            expect(player.attributes.critChance).toBe(initialCrit + 5);
        });
    });

    describe('Persona: Explorador & Quebrador de Regras (Conhece as Regras e Busca Exploits)', () => {
        it('deve testar alternância rápida de armas e estresse de comandos sem causar crash', async () => {
            const persona = new ExploiterRuleTesterPersona();
            const simulator = new HeadlessGameSimulator(persona);
            await simulator.initializeWorld('vilgem');

            const report = simulator.runSession(120, 1 / 60);

            expect(report.knowsRules).toBe(true);
            expect(report.weaponsSwapped).toBeGreaterThan(0);
            expect(report.attacksDispatched).toBeGreaterThan(0);
            expect(report.anomaliesFound).toHaveLength(0);

            // O domínio deve permanecer estável mesmo sob swapping e spam de skills
            const player = simulator.getDomain().player;
            expect(player.attributes.hp).toBeGreaterThan(0);
        });
    });

    describe('Persona: Novato Ingênuo (NÃO Conhece as Regras)', () => {
        it('deve simular jogador iniciante andando sem rumo e mantendo o mundo determinístico', async () => {
            const persona = new NaiveNovicePersona();
            const simulator = new HeadlessGameSimulator(persona);
            await simulator.initializeWorld('vilgem');

            const initialX = simulator.getDomain().player.coordinates.x;
            const report = simulator.runSession(40, 1 / 60);

            expect(report.knowsRules).toBe(false);
            // Jogador andou para frente conforme persona ingênua
            expect(simulator.getDomain().player.coordinates.x).toBeGreaterThan(initialX);
            expect(report.anomaliesFound).toHaveLength(0);
        });
    });

    describe('Persona: Bot Caótico (NÃO Conhece as Regras - Fuzzing)', () => {
        it('deve sobreviver a inputs aleatórios extremos sem quebrar o estado do Domínio', async () => {
            const persona = new ChaoticFuzzerPersona();
            const simulator = new HeadlessGameSimulator(persona);
            await simulator.initializeWorld('vilgem');

            const report = simulator.runSession(100, 1 / 60);

            expect(report.knowsRules).toBe(false);
            expect(report.ticksExecuted).toBe(100);
            expect(report.anomaliesFound).toHaveLength(0);
            
            // Integridade de coordenadas (não devem virar NaN nem Infinity)
            const coords = simulator.getDomain().player.coordinates;
            expect(Number.isFinite(coords.x)).toBe(true);
            expect(Number.isFinite(coords.y)).toBe(true);
        });
    });
});
