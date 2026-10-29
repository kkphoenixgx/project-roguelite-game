import { describe, it, expect, vi, beforeEach } from 'vitest';
import Necromancer from '../../../../../../domain/ObjectModule/Entities/Player/Classes/Necromancer';
import DefaultXPTable from '../../../../../../domain/ObjectModule/Entities/DefaultXPTable';
import type { IEventManager } from '../../../../../../domain/eventDispacher/IGameEvents';

const mockEventManager: IEventManager = { on: vi.fn(), dispatch: vi.fn(), subscribe: vi.fn(), unsubscribe: vi.fn(), clear: vi.fn() } as any;
const mockPlayer = {
  id: 1,
  coordinates: { x: 100, y: 100 },
  size: { width: 32, height: 32 },
  attributes: { strength: 10, intelligence: 22, wisdom: 18, dexterity: 12 },
  heal: vi.fn()
} as any;
const xpTable = new DefaultXPTable();

describe('Necromancer Class (Necromante) - Árvore de 12 Skills', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve inicializar a árvore completa com exatamente 12 habilidades canônicas', () => {
    const necro = new Necromancer(xpTable, mockPlayer, mockEventManager);
    
    expect(necro.allSkills.length).toBe(12);

    // Valida todos os níveis de 1 a 12
    expect(necro.getSkillForLevel(1)?.id).toBe('n_t1_reap');
    expect(necro.getSkillForLevel(2)?.id).toBe('n_t1_death_aura');
    expect(necro.getSkillForLevel(3)?.id).toBe('n_t1_soul_leech');
    expect(necro.getSkillForLevel(4)?.id).toBe('n_t2_lifesteal');
    expect(necro.getSkillForLevel(5)?.id).toBe('n_t2_bone_spear');
    expect(necro.getSkillForLevel(6)?.id).toBe('n_t3_soul');
    expect(necro.getSkillForLevel(7)?.id).toBe('n_t3_grasp_of_dead');
    expect(necro.getSkillForLevel(8)?.id).toBe('n_t4_corpse_explosion');
    expect(necro.getSkillForLevel(9)?.id).toBe('n_t3_spectral_veil');
    expect(necro.getSkillForLevel(10)?.id).toBe('n_t5_wail_of_banshee');
    expect(necro.getSkillForLevel(11)?.id).toBe('n_t4_death_warden');
    expect(necro.getSkillForLevel(12)?.id).toBe('n_t5_dance_of_dead');
    expect(necro.getSkillForLevel(13)).toBeNull();
  });

  it('deve executar Colheita Sombria (Reap) via SweepingArcAttackTemplate', () => {
    const necro = new Necromancer(xpTable, mockPlayer, mockEventManager);
    necro.executeSkill('n_t1_reap', { x: 150, y: 100 });

    expect(mockEventManager.dispatch).toHaveBeenCalledWith('log', expect.objectContaining({
      message: expect.stringContaining('[Necromante] Colheita Sombria ceifou a área!')
    }));
    expect(mockEventManager.dispatch).toHaveBeenCalledWith('spawnVisual', expect.objectContaining({
      type: 'n_t1_reap'
    }));

    necro.update(0.016);
    expect(mockEventManager.dispatch).toHaveBeenCalledWith('requestNeighbors', expect.any(Object));
  });

  it('deve executar Lança de Ossos (Bone Spear) via ChanneledBeamAttackTemplate', () => {
    const necro = new Necromancer(xpTable, mockPlayer, mockEventManager);
    necro.executeSkill('n_t2_bone_spear', { x: 200, y: 100 });

    expect(mockEventManager.dispatch).toHaveBeenCalledWith('log', expect.objectContaining({
      message: expect.stringContaining('[Necromante] Lança de Ossos disparada!')
    }));
    expect(mockEventManager.dispatch).toHaveBeenCalledWith('spawnVisual', expect.objectContaining({
      type: 'n_t2_bone_spear'
    }));

    // O tick da lança de ossos dispara e consulta vizinhos
    necro.update(0.016);
    expect(mockEventManager.dispatch).toHaveBeenCalledWith('requestNeighbors', expect.any(Object));
  });

  it('deve executar Garras do Além (Grasp of the Dead) via SweepingArcAttackTemplate', () => {
    const necro = new Necromancer(xpTable, mockPlayer, mockEventManager);
    necro.executeSkill('n_t3_grasp_of_dead', { x: 150, y: 100 });

    expect(mockEventManager.dispatch).toHaveBeenCalledWith('log', expect.objectContaining({
      message: expect.stringContaining('[Necromante] Garras do Além rasgaram o plano mortal!')
    }));

    necro.update(0.016);
    expect(mockEventManager.dispatch).toHaveBeenCalledWith('requestNeighbors', expect.any(Object));
  });

  it('deve executar Explosão Sombria (Corpse Explosion) via NovaBurstAttackTemplate', () => {
    const necro = new Necromancer(xpTable, mockPlayer, mockEventManager);
    necro.executeSkill('n_t4_corpse_explosion', { x: 150, y: 150 });

    expect(mockEventManager.dispatch).toHaveBeenCalledWith('log', expect.objectContaining({
      message: expect.stringContaining('[Necromante] Explosão Sombria ativada no alvo')
    }));
    expect(mockEventManager.dispatch).toHaveBeenCalledWith('spawnVisual', expect.objectContaining({
      type: 'n_t4_corpse_explosion'
    }));

    necro.update(0.016);
    expect(mockEventManager.dispatch).toHaveBeenCalledWith('requestNeighbors', expect.any(Object));
  });

  it('deve executar Clamor da Banshee (Wail of the Banshee) com onda de choque e partículas', () => {
    const necro = new Necromancer(xpTable, mockPlayer, mockEventManager);
    necro.executeSkill('n_t5_wail_of_banshee', { x: 0, y: 0 });

    expect(mockEventManager.dispatch).toHaveBeenCalledWith('log', expect.objectContaining({
      message: expect.stringContaining('[Necromante] Clamor da Banshee ecoou')
    }));
    expect(mockEventManager.dispatch).toHaveBeenCalledWith('particle', expect.objectContaining({
      effect: 'darkPulse'
    }));

    necro.update(0.016);
    expect(mockEventManager.dispatch).toHaveBeenCalledWith('requestNeighbors', expect.any(Object));
  });

  it('deve evocar Dança das Almas Penadas (Soul Dance) via OrbitalAttackTemplate com puxão', () => {
    const necro = new Necromancer(xpTable, mockPlayer, mockEventManager);
    necro.executeSkill('n_t5_dance_of_dead', { x: 0, y: 0 });

    expect(mockEventManager.dispatch).toHaveBeenCalledWith('log', expect.objectContaining({
      message: expect.stringContaining('[Necromante] Dança das Almas Penadas evocada!')
    }));
    expect(mockEventManager.dispatch).toHaveBeenCalledWith('spawnVisual', expect.objectContaining({
      type: 'n_t5_dance_of_dead'
    }));

    necro.update(0.016);
    expect(mockEventManager.dispatch).toHaveBeenCalledWith('requestNeighbors', expect.any(Object));
  });

  it('deve respeitar cooldown ao tentar executar habilidades repetidamente', () => {
    const necro = new Necromancer(xpTable, mockPlayer, mockEventManager);
    necro.executeSkill('n_t4_corpse_explosion', { x: 0, y: 0 });

    // Segunda chamada imediata
    necro.executeSkill('n_t4_corpse_explosion', { x: 0, y: 0 });
    expect(mockEventManager.dispatch).toHaveBeenCalledWith('log', expect.objectContaining({
      message: expect.stringContaining('[Necromante] Habilidade em recarga!')
    }));
  });
});