import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import GameAdapter from '../../adapters/web/components/GameAdapter';
import { setPauseGame, isGamePaused } from '../../adapters/web/components/Game';

describe('Integration - Pause CPU Leak & Animation Verification', () => {
    let mockDomain: any;
    let mockSceneManager: any;
    let mockUiManager: any;
    let mockInputGateway: any;
    let mockViewport: any;

    beforeEach(() => {
        setPauseGame(false); // Garante estado limpo
        
        mockDomain = {
            update: vi.fn(),
            getRenderState: vi.fn(() => ({
                world: {},
                renderables: [
                    { 
                        id: 1, 
                        entityTypeId: 'player',
                        coordinates: { x: 0, y: 0 }, 
                        size: { width: 32, height: 32 },
                        spellElements: ['fire', 'water'] // Isso forçaria a emissão de partículas!
                    }
                ]
            }))
        };

        mockSceneManager = {
            updateAnimations: vi.fn(),
            syncRenderables: vi.fn()
        };

        mockUiManager = { update: vi.fn() };
        mockInputGateway = { 
            handleInteractions: vi.fn(),
            inputManager: {
                consumeAction: vi.fn(() => false),
                mouseLastCoordinates: { x: 0, y: 0 }
            }
        };
        mockViewport = { screenToWorld: vi.fn(), worldToScreen: vi.fn() };
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('deve verificar se syncRenderables NÃO é chamado continuamente quando o jogo está pausado (CPU Leak)', () => {
        const mockEventManager = { dispatch: vi.fn(), on: vi.fn() };
        const mockTelemetryAdapter = { 
            getTelemetryUI: vi.fn(), 
            getSnapshot: vi.fn(), 
            incrementEvent: vi.fn(),
            endFrame: vi.fn(),
            beginFrame: vi.fn(),
            setActiveEntities: vi.fn(),
            incrementCollisionCheck: vi.fn(),
            incrementResolvedCollision: vi.fn(),
            captureLog: vi.fn(),
            recordSubsystemTime: vi.fn(),
            recordFileTiming: vi.fn(),
            setSpatialInfo: vi.fn(),
            incrementError: vi.fn(),
            updateUI: vi.fn()
        };
        
        const adapter = new GameAdapter(
            mockDomain, mockEventManager, mockTelemetryAdapter
        );
        
        // Inject internal dependencies since we bypass initialize()
        (adapter as any).sceneManager = mockSceneManager;
        (adapter as any).inputGateway = mockInputGateway;
        (adapter as any).uiManager = mockUiManager;
        (adapter as any).viewportTransformer = mockViewport;
        (adapter as any).webWindowManager = { updateTelemetryUI: vi.fn() };
        (adapter as any).currentFrameState = { renderables: [] };

        // Simulando frame normal
        (adapter as any).update(0.016);
        expect(mockDomain.update).toHaveBeenCalledTimes(1);
        expect(mockSceneManager.syncRenderables).toHaveBeenCalledTimes(1);

        // PAUSANDO O JOGO
        setPauseGame(true);
        expect(isGamePaused()).toBe(true);

        // Simulando dezenas de frames com o jogo pausado (O Canvas requestAnimationFrame ainda roda)
        for(let i = 0; i < 60; i++) {
            (adapter as any).update(0.016);
        }

        // Verifica se o Domain Physics parou
        expect(mockDomain.update).toHaveBeenCalledTimes(1); // Não deve ter subido de 1
        
        // Verifica se a atualização de animações parou
        expect(mockSceneManager.updateAnimations).toHaveBeenCalledTimes(1);

        // VERIFICAÇÃO CRÍTICA DO LEAK DE CPU/PARTÍCULAS:
        // O syncRenderables estava sendo chamado FORA do bloco de pause, criando milhares de partículas de magias infinitamente!
        expect(mockSceneManager.syncRenderables).toHaveBeenCalledTimes(1); // DEVE FALHAR AQUI NA ARQUITETURA ATUAL!
    });
});
