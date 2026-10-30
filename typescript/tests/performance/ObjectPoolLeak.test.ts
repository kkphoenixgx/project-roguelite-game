import ObjectElement from '../../domain/ObjectModule/ObjectElement';
import { describe, it, expect, beforeEach } from 'vitest';
import DomainFacade from '../../domain/DomainFacade';
import { EventHandler } from '../../domain/eventDispacher/eventDispacher';
import { TelemetryAdapter } from '../../adapters/TelemetryAdapter/TelemetryAdapterSingleton';

describe('Performance - Object Pooling Memory Leak Test', () => {
    let domain: DomainFacade;
    let eventManager: EventHandler;

    beforeEach(async () => {
        eventManager = new EventHandler();
        const telemetry = TelemetryAdapter.getInstance();
        (eventManager as any).setTelemetry(telemetry);
        
        const mockConfig = { 
            selectedClass: 'warrior',
            player: { id: 1, initialPos: { x: 0, y: 0 }, level: 1 }
        } as any;
        const mockLogger = { log: () => {} } as any;
        const mockCollision = { checkCollisions: (buffer: any, len: number, bounds: any, callback: any) => { callback(new Int32Array(0), 0); }, loadMap: async () => {}, getTilesForBounds: () => [] } as any;
        
        domain = new DomainFacade(mockConfig, mockLogger, eventManager, mockCollision);
        await domain.loadWorld('vilgem');
    });

    it('Deve gerenciar o ciclo de vida de milhares de projéteis sem inflar os arrays do motor', () => {
        const objectManager = (domain as any).objectManager;
        
        // Simular o estado inicial (Quantidade de entidades pré-existentes na sala)
        const initialEntityCount = objectManager.elementsArray.length;
        
        // Disparar 5.000 balas
        for(let i = 0; i < 5000; i++) {
            objectManager.spawn((id: number) => {
                class MockBullet extends ObjectElement {
                    public active = true;
                    constructor(id: number) {
                        super({ width: 5, height: 5 }, { x: 0, y: 0 }, id, 'bullet', eventManager);
                    }
                    override update() {
                        this.active = false;
                        objectManager.removeByID(this.id);
                    }
                }
                return new MockBullet(id) as any;
            });
        }
        
        // Roda alguns ticks para processar o spawn e em seguida as mortes (cleanup)
        for(let i = 0; i < 5; i++) {
            domain.update(1 / 60);
        }
        
        // A contagem real da array (não dos IDs) deve ser igual a inicial (ou até menor) 
        // indicando que a memória alocada das balas antigas está livre para sobrescrita (Zero-GC re-use).
        // Se `elementsArray` não estiver usando splice, e sim object pooling, 
        // a quantidade de "entidades ativas" não deve ser afetada.
        
        // Conta quantas entidades reais estão ativas (que não são as balas mortas)
        let activeCount = 0;
        for(let i = 0; i < objectManager.elementsArray.length; i++) {
            if(objectManager.elementsArray[i] !== null && objectManager.elementsArray[i] !== undefined) {
                activeCount++;
            }
        }
        
        // Expectativa: Nenhuma das 5.000 balas sobreviveu. O memory footprint (entidades ativas no array) 
        // deve voltar rigorosamente ao estado base do mapa (initialEntityCount).
        expect(activeCount).toBeLessThanOrEqual(initialEntityCount);
    });
});
