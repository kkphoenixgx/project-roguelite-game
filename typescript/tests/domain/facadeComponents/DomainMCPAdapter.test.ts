import { describe, it, expect, vi, beforeEach } from 'vitest';
import DomainMCPAdapter from '../../../domain/facadeComponents/DomainMCPAdapter';
import type { IEventManager } from '../../../domain/eventDispacher/IGameEvents';
import type Player from '../../../domain/ObjectModule/Entities/Player/Player';

describe('DomainMCPAdapter', () => {
    let mockEventManager: IEventManager;
    let mockPlayer: Player;
    let mockObjectManager: any;
    let adapter: DomainMCPAdapter;

    beforeEach(() => {
        mockEventManager = {
            on: vi.fn(),
            dispatch: vi.fn(),
            removeListener: vi.fn(),
        } as unknown as IEventManager;

        mockPlayer = {
            coordinates: { x: 100, y: 100 },
            heal: vi.fn(),
            attributes: { hp: 50, maxHp: 100 }
        } as unknown as Player;

        mockObjectManager = {
            getEntities: vi.fn().mockReturnValue([])
        };

        adapter = new DomainMCPAdapter(mockPlayer, mockObjectManager, mockEventManager);
    });

    it('deve registrar o listener bdiAction no construtor', () => {
        expect(mockEventManager.on).toHaveBeenCalledWith('bdiAction', expect.any(Function));
    });

    it('deve lidar com mcp_domain_spawn', () => {
        const payload = { action: 'mcp_domain_spawn', content: '"slime", 200, 300, "amigavel"' };
        
        const callback = (mockEventManager.on as any).mock.calls.find((c: any) => c[0] === 'bdiAction')[1];
        callback(payload);

        expect(mockEventManager.dispatch).toHaveBeenCalledWith('spawn', {
            type: 'slime',
            coordinates: { x: 200, y: 300 }
        });
    });

    it('deve lidar com mcp_domain_heal', () => {
        const payload = { action: 'mcp_domain_heal', content: '42' };
        
        const callback = (mockEventManager.on as any).mock.calls.find((c: any) => c[0] === 'bdiAction')[1];
        callback(payload);

        expect(mockPlayer.heal).toHaveBeenCalledWith(42);
    });

    it('deve lidar com mcp_domain_damage e checar morte', () => {
        const payload = { action: 'mcp_domain_damage', content: '60' }; // hp é 50
        
        const callback = (mockEventManager.on as any).mock.calls.find((c: any) => c[0] === 'bdiAction')[1];
        callback(payload);

        expect(mockPlayer.attributes.hp).toBe(-10);
        expect(mockEventManager.dispatch).toHaveBeenCalledWith('playerDied', {});
    });

    it('deve lidar com mcp_domain_use_skill', () => {
        const mockExecuteSkill = vi.fn();
        const mockNpc = {
            agentName: 'molor',
            classManager: {
                executeActiveSkill: mockExecuteSkill
            }
        };
        mockObjectManager.getEntities.mockReturnValue([mockNpc]);

        const payload = { action: 'mcp_domain_use_skill', content: '"fireball", 100, 200', agent: 'molor' };
        
        const callback = (mockEventManager.on as any).mock.calls.find((c: any) => c[0] === 'bdiAction')[1];
        callback(payload);

        expect(mockExecuteSkill).toHaveBeenCalledWith('fireball', { x: 100, y: 200 });
        expect(mockEventManager.dispatch).toHaveBeenCalledWith('log', expect.objectContaining({ message: expect.stringContaining('molor usou a skill fireball') }));
    });
});
