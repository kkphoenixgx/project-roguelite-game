import { describe, it, expect, beforeEach } from 'vitest';
import DomainFacade from '../../domain/DomainFacade';
import { EventHandler } from '../../domain/eventDispacher/eventDispacher';
import { TelemetryAdapter } from '../../adapters/TelemetryAdapter/TelemetryAdapterSingleton';

describe('Stability Tests - Monkey Testing (Chaos)', () => {
    let domain: DomainFacade;
    let eventManager: EventHandler;

    beforeEach(async () => {
        eventManager = new EventHandler();
        const telemetry = TelemetryAdapter.getInstance();
        (eventManager as any).setTelemetry(telemetry);
        
        const mockConfig = { 
            selectedClass: 'warrior',
            player: {
                id: 1,
                initialPos: { x: 0, y: 0 },
                level: 1
            }
        } as any;
        const mockLogger = { log: () => {} } as any;
        const mockCollision = { checkCollisions: (buffer: any, len: number, bounds: any, callback: any) => { callback(new Int32Array(0), 0); }, loadMap: async () => {}, getTilesForBounds: () => [] } as any;
        
        domain = new DomainFacade(mockConfig, mockLogger, eventManager, mockCollision);
        await domain.loadWorld('vilgem');
    });

    it('Não deve explodir ou lançar exceção não tratada ao receber inputs randômicos frenéticos', () => {
        // Possíveis inputs
        const possibleActions = ['up', 'down', 'left', 'right', 'spell_1', 'spell_2', 'leftClick', 'shift'];
        
        const TICKS = 500; // Aproximadamente 1 minuto e meio de jogo (a 60fps)
        let crashes = 0;

        try {
            for(let i = 0; i < TICKS; i++) {
                // Sorteia uma ação aleatória
                const randomAction = possibleActions[Math.floor(Math.random() * possibleActions.length)];
                
                // Emite a ação via gerenciador de eventos
                // (O jogador real interage usando esses eventos de input no Adapter)
                eventManager.dispatch(randomAction as any, null);
                
                // Roda o tick da engine
                domain.update(1 / 60);
            }
        } catch(e) {
            console.error("CRASH NO MOTOR DURANTE MONKEY TESTING:", e);
            crashes++;
        }

        expect(crashes).toBe(0);
    }, 15000);
});
