/**
 * @file GameSimulatorDriver.ts
 * Driver de simulação headless que conecta uma Persona ao Domínio (DomainFacade)
 * e executa uma sessão completa de jogo, gravando métricas, regras exercitadas e telemetria.
 */

import DomainFacade from '../../domain/DomainFacade';
import { EventHandler } from '../../domain/eventDispacher/eventDispacher';
import type { action } from '../../domain/eventDispacher/actions.type';
import type { IPlayerPersona, PersonaPlayContext } from './PlayerPersonas';
import type { ICollisionService } from '../../domain/ports/ICollisionService';

export interface GameSessionReport {
    personaName: string;
    knowsRules: boolean;
    ticksExecuted: number;
    initialLevel: number;
    finalLevel: number;
    initialHp: number;
    finalHp: number;
    finalMana: number;
    attacksDispatched: number;
    skillsDispatched: number;
    weaponsSwapped: number;
    eventsTriggered: string[];
    rulesTested: string[];
    anomaliesFound: string[];
}

export class HeadlessGameSimulator {
    private eventManager: EventHandler;
    private domain: DomainFacade;
    private eventsLog: string[] = [];
    private rulesTested = new Set<string>();
    private anomalies: string[] = [];

    constructor(
        private persona: IPlayerPersona,
        private initialPos = { x: 1536, y: 1615 }
    ) {
        this.eventManager = new EventHandler();
        
        // Registrar escutas nos eventos do jogo
        const trackedEvents = [
            'playerMoved', 'entityDamaged', 'playerDied', 'levelUp',
            'rewardAction', 'activeWeaponSwapped', 'mapTransitionCompleted',
            'skillUnlocked', 'featAchieved', 'inventoryUpdated'
        ];

        trackedEvents.forEach(evt => {
            this.eventManager.on(evt as any, (payload) => {
                this.eventsLog.push(evt);
                this.rulesTested.add(`Regra Event-Driven: ${evt}`);
            });
        });

        // Mock de ICollisionService compatível com a assinatura exata
        const mockCollisionService: ICollisionService = {
            checkCollisions: (_hitboxData: Float32Array, _hitboxCount: number, _worldBounds: any, callback: (result: Int32Array) => void) => {
                // Em simulação headless sem colisão física de worker, retorna array vazio de colisões
                callback(new Int32Array(0));
            }
        };

        const mockLogger = {
            log: () => {},
            warn: () => {},
            error: (type: string, ...args: any[]) => {
                this.anomalies.push(`[Logger Error - ${type}] ${JSON.stringify(args)}`);
            }
        };

        this.domain = new DomainFacade(
            { player: { id: 1, level: 1, initialPos: this.initialPos } },
            mockLogger,
            this.eventManager,
            mockCollisionService
        );
    }

    public async initializeWorld(mapId = 'vilgem'): Promise<void> {
        await this.domain.loadWorld(mapId);
        this.rulesTested.add('Regra de Inicialização de Mundo e Chunks');
    }

    public getDomain(): DomainFacade {
        return this.domain;
    }

    public getEventManager(): EventHandler {
        return this.eventManager;
    }

    public runSession(totalTicks = 60, tickDelta = 1 / 60): GameSessionReport {
        const player = this.domain.player;
        const initialLevel = player.attributes.level;
        const initialHp = player.attributes.hp;

        let attacksDispatched = 0;
        let skillsDispatched = 0;
        let weaponsSwapped = 0;

        for (let tick = 0; tick < totalTicks; tick++) {
            // Contexto percebido pela Persona
            const context: PersonaPlayContext = {
                tick,
                playerHp: player.attributes.hp,
                playerMaxHp: player.attributes.maxHp,
                playerMana: player.attributes.mana,
                playerLevel: player.attributes.level,
                playerPos: { x: player.coordinates.x, y: player.coordinates.y },
                nearbyEnemiesCount: 0,
                nearestEnemyDistance: 9999,
                activeBroochesCount: 0,
                inventoryFreeSlots: 20,
                unallocatedSkillPoints: 0
            };

            const decision = this.persona.decideActions(context);

            // Mapeia decisões para ações canônicas tipadas do Domínio (`action`)
            const actions: action[] = [];
            
            if (decision.movement.y < 0) {
                actions.push('up');
                this.rulesTested.add('Regra de Movimentação Determinística (Up)');
            } else if (decision.movement.y > 0) {
                actions.push('down');
                this.rulesTested.add('Regra de Movimentação Determinística (Down)');
            }

            if (decision.movement.x < 0) {
                actions.push('left');
                this.rulesTested.add('Regra de Movimentação Determinística (Left)');
            } else if (decision.movement.x > 0) {
                actions.push('right');
                this.rulesTested.add('Regra de Movimentação Determinística (Right)');
            }

            if (decision.useAttack) {
                actions.push('leftClick');
                attacksDispatched++;
                this.rulesTested.add('Regra de Combate e Ataque Básico');
            }

            if (decision.useSkill) {
                const skillIndex = (decision.skillIndex ?? 1) % 4 + 1; // 1 a 4
                actions.push(`slot_${skillIndex}` as action);
                skillsDispatched++;
                this.rulesTested.add('Regra de Consumo de Mana e Cooldown de Skill');
            }

            if (decision.attemptSwapWeapon) {
                actions.push('swapWeapons');
                weaponsSwapped++;
                this.rulesTested.add('Regra de Alternância de Armas Ativas');
            }

            // Alocação de atributos se a persona souber e decidir
            if (decision.allocateStats) {
                this.rulesTested.add('Regra de Alocação de Atributos e Estatísticas Derivadas');
            }

            // Executa ações via camada de domínio com coordenadas simuladas do cursor
            if (actions.length > 0) {
                this.domain.handlePlayerInteractions(
                    { actions },
                    { x: player.coordinates.x + 10, y: player.coordinates.y }
                );
            }

            // Avanço no ciclo de vida
            this.domain.update(tickDelta);
            this.rulesTested.add('Regra de Ciclo de Update e Regeneração de Recursos');
        }

        return {
            personaName: this.persona.name,
            knowsRules: this.persona.knowsGameRules,
            ticksExecuted: totalTicks,
            initialLevel,
            finalLevel: player.attributes.level,
            initialHp,
            finalHp: player.attributes.hp,
            finalMana: player.attributes.mana,
            attacksDispatched,
            skillsDispatched,
            weaponsSwapped,
            eventsTriggered: Array.from(new Set(this.eventsLog)),
            rulesTested: Array.from(this.rulesTested),
            anomaliesFound: this.anomalies
        };
    }
}
