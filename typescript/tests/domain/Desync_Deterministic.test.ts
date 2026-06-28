import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as crypto from 'crypto';
import DomainFacade from '../../domain/DomainFacade';
import { EventHandler } from '../../domain/eventDispacher/eventDispacher';
import type { ICollisionService } from '../../domain/ports/ICollisionService';
import { logger } from '../../adapters/web/shared/Logger';
import Dice from '../../domain/shared/Dice';

// Mock restrito para garantir que o tempo de I/O do Worker não fure o isolamento síncrono do teste
class SyncCollisionFake implements ICollisionService {
    public checkCollisions(_h: Float32Array, _c: number, _w: any, callback: (res: Int32Array) => void) {
        callback(new Int32Array(0));
    }
}

describe('Determinismo Numérico e Prevenção de Desync (Sanity Check)', () => {
    beforeEach(() => {
        // Entropia Congelada: Elimina a aleatoriedade do V8 e do Motor de Drops
        vi.spyOn(Math, 'random').mockReturnValue(0.42);
        vi.spyOn(Dice, 'rollDice').mockReturnValue(5);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('deve computar a mesma topologia matemática bit-a-bit após 60 frames sofrendo input contínuo', async () => {
        const eventBus = new EventHandler();
        const collisionFake = new SyncCollisionFake();
        const domain = new DomainFacade(
            { player: { id: 1, level: 1, initialPos: { x: 500, y: 500 } } },
            logger,
            eventBus,
            collisionFake
        );

        await domain.loadWorld('vilgem');

        // Injeta inputs sintéticos milimetricamente calculados
        domain.handlePlayerInteractions({ actions: ['right'] }, { x: 600, y: 500 });
        domain.update(0.016); // Frame 1
        domain.handlePlayerInteractions({ actions: ['right', 'leftClick'] }, { x: 600, y: 500 }); // Frame 2: Atira

        // Avança o tempo de forma determinística
        for (let i = 0; i < 58; i++) {
            domain.update(0.016);
        }

        // DTO de saída - Fotografia exata da memória
        const state = domain.getRenderState();
        const stateString = JSON.stringify(state);
        const checksum = crypto.createHash('sha256').update(stateString).digest('hex');

        // Se a matemática da física/ataque for alterada no futuro, este snapshot acusará a quebra de contrato!
        expect(checksum).toMatchSnapshot("Falha de Checksum (Desync): Se a mudança matemática da Engine foi intencional e benéfica, pressione 'u' no terminal para atualizar o Hash de aprovação!"); 
    });
});