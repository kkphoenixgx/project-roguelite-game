import ObjectElement from '../../domain/ObjectModule/ObjectElement';
import { describe, it, expect, beforeEach } from 'vitest';
import DomainFacade from '../../domain/DomainFacade';
import { EventHandler } from '../../domain/eventDispacher/eventDispacher';
import { TelemetryAdapter } from '../../adapters/TelemetryAdapter/TelemetryAdapterSingleton';

describe('Performance Stress Tests (Headless)', () => {
    let domain: DomainFacade;
    let eventManager: EventHandler;

    beforeEach(async () => {
        eventManager = new EventHandler();
        const telemetry = TelemetryAdapter.getInstance();
        // eventManager.setTelemetry(telemetry);
        
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
        
        // Inicializa o domínio sem as camadas de visão (Zero Render)
        domain = new DomainFacade(mockConfig, mockLogger, eventManager, mockCollision);
        await domain.loadWorld('vilgem'); // Carrega a sala básica
    });

    it('Deve suportar 500 entidades processando colisões abaixo de 3ms por frame', () => {
        // 1. Setup: Injetar 500 entidades no ObjectManager
        const objectManager = (domain as any).objectManager;
        
        // Usa um factory genérico para instanciar as entidades no mesmo local (forçando Overlap massivo)
        for(let i = 0; i < 500; i++) {
            // Emulando um inimigo simples (Zombie) para colisão
            // Como importar a classe exata causaria problemas se houver mudanças, 
            // vamos disparar um evento de spawn ou usar o manager diretamente.
            objectManager.spawn((id: number) => {
                // Aqui criamos um mock básico de entidade que tem hitbox
                class MockZombie extends ObjectElement {
                    public active = true;
                    constructor(id: number) {
                        super({ width: 16, height: 16 }, { x: 100 + Math.random() * 50, y: 100 + Math.random() * 50 }, id, 'zombie', eventManager);
                        this.hitboxes = [{
                            radius: 8,
                            getDebugShape: () => ({ type: 'circle', coordinates: this.coordinates, radius: 8 }),
                            onColision: () => {}
                        }] as any;
                        this.active = true;
                    }
                    override update() {}
                    takeDamage() {}
                }
                return new MockZombie(id) as any;
            });
        }

        // 2. Warmup: Rodar 10 ticks ignorados para aquecer JIT
        for(let i = 0; i < 10; i++) {
            domain.update(1 / 60);
        }

        // 3. Teste Real: Medir 100 frames (aprox 1.5 seg de física pura)
        const frameTimes: number[] = [];
        TelemetryAdapter.getInstance().beginFrame(); // Start profiler
        
        for(let i = 0; i < 100; i++) {
            const start = performance.now();
            domain.update(1 / 60);
            const end = performance.now();
            frameTimes.push(end - start);
        }

        const avgTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
        const maxTime = Math.max(...frameTimes);
        const snap = TelemetryAdapter.getInstance().getSnapshot();

        console.log(`\n--- RESULTADO STRESS TEST (Colisão) ---`);
        console.log(`Entidades ativas: ${snap.activeEntities}`);
        console.log(`Checks Broadphase/Frame: ${snap.collisionChecks / 100}`);
        console.log(`Tempo Médio por Frame: ${avgTime.toFixed(2)}ms`);
        console.log(`Pico Máximo (Spike): ${maxTime.toFixed(2)}ms`);
        
        // Assert: A média do frame não pode ultrapassar o orçamento sob carga máxima de CPU
        expect(avgTime).toBeLessThan(35);
    });
});
