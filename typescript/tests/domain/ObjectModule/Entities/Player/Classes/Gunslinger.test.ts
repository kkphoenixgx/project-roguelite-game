import { describe, it, expect, vi, beforeEach } from 'vitest';
import Gunslinger from '../../../../../../domain/ObjectModule/Entities/Player/Classes/Gunslinger';
import DefaultXPTable from '../../../../../../domain/ObjectModule/Entities/DefaultXPTable';
import type Player from '../../../../../../domain/ObjectModule/Entities/Player/Player';
import type { IEventManager } from '../../../../../../domain/eventDispacher/IGameEvents';

const mockEventManager: IEventManager = { on: vi.fn(), dispatch: vi.fn(), subscribe: vi.fn(), unsubscribe: vi.fn(), clear: vi.fn() } as any;
const mockPlayer = { coordinates: { x: 0, y: 0 }, size: { width: 16, height: 16 }, attributes: { strength: 10, agility: 10 } } as any;
const xpTable = new DefaultXPTable();

describe('Gunslinger Class', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve inicializar skills corretamente e interceptar Fan the Hammer', () => {
    const gunslinger = new Gunslinger(xpTable, mockPlayer, mockEventManager);
    expect(gunslinger.allSkills.length).toBe(3);
    expect(gunslinger.getSkillForLevel(4)?.id).toBe('gs_t2_fanhammer');
    
    gunslinger.executeSkill('gs_t2_fanhammer', { x: 10, y: 10 });
    expect(mockEventManager.dispatch).toHaveBeenCalledWith('log', expect.objectContaining({
      message: expect.stringContaining('Fan the Hammer ativado no alvo')
    }));
  });

  it('deve ter a flag requiresMainHandWeapon configurada nas habilidades do atirador', () => {
    const gunslinger = new Gunslinger(xpTable, mockPlayer, mockEventManager);
    const quickdraw = gunslinger.getSkillForLevel(1);
    const fanhammer = gunslinger.getSkillForLevel(4);

    expect(quickdraw?.requiresMainHandWeapon).toBe(true);
    expect(fanhammer?.requiresMainHandWeapon).toBe(true);
  });
});