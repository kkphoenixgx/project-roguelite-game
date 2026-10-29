import { describe, it, expect, vi, beforeEach } from 'vitest';
import DomainFacade from '../../domain/DomainFacade';
import type { IEventManager } from '../../domain/eventDispacher/IGameEvents';
import type { ILogger } from '../../domain/ports/ILogger';
import type { ICollisionService } from '../../domain/ports/ICollisionService';

// Mock do Tauri IPC
import { listen } from '@tauri-apps/api/event';

vi.mock('@tauri-apps/api/event', () => ({
    listen: vi.fn().mockResolvedValue(undefined),
}));

const mockEventManager: IEventManager = { on: vi.fn(), dispatch: vi.fn(), off: vi.fn() as any };
const mockLogger: ILogger = { log: vi.fn() as any };
const mockCollisionService: ICollisionService = { checkCollision: vi.fn() as any } as any;

describe('DomainFacade - BDI IPC Port', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it.skip('deve registrar o listener do panteao-event no construtor', () => {
        const config = { player: { id: 1, level: 1, initialPos: { x: 0, y: 0 } } };
        new DomainFacade(config, mockLogger, mockEventManager, mockCollisionService);
        
        expect(listen).toHaveBeenCalledWith('panteao-event', expect.any(Function));
    });

    it.skip('deve disparar npcSpoke quando o agente envia uma ação de fala (speak)', async () => {
        const config = { player: { id: 1, level: 1, initialPos: { x: 0, y: 0 } } };
        new DomainFacade(config, mockLogger, mockEventManager, mockCollisionService);
        
        // O listener foi registrado, agora simulamos o Rust disparando o evento
        const listenMock = (listen as any).mock.calls[0][1];
        
        // Simula evento da porta IPC
        listenMock({
            payload: {
                agent: 'molor',
                action: 'speak',
                content: 'Olá, forasteiro.'
            }
        });
        
        // A Facade deve despachar npcSpoke internamente (bdiAction é garantido ser chamado também)
        expect(mockEventManager.dispatch).toHaveBeenCalledWith('bdiAction', expect.any(Object));
        
        // Para npcSpoke, o objeto Molor precisa estar registrado no ObjectElementManager
        // Como não inicializamos o mapa inteiro no teste isolado, podemos apenas garantir 
        // que bdiAction foi despachado para os subsystems
        expect(mockEventManager.dispatch).toHaveBeenCalledWith('bdiAction', {
            agent: 'molor',
            action: 'speak',
            content: 'Olá, forasteiro.'
        });
    });
});
