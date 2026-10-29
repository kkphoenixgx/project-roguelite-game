import { describe, it, expect, vi, beforeEach } from 'vitest';
import Warrior from '../../../../../../domain/ObjectModule/Entities/Player/Classes/Warrior';
import DefaultXPTable from '../../../../../../domain/ObjectModule/Entities/DefaultXPTable';
import type { IEventManager } from '../../../../../../domain/eventDispacher/IGameEvents';

const mockEventManager: IEventManager = { on: vi.fn(), dispatch: vi.fn(), subscribe: vi.fn(), unsubscribe: vi.fn(), clear: vi.fn() } as any;
const mockPlayer = {
  id: 1,
  coordinates: { x: 100, y: 100 },
  size: { width: 32, height: 32 },
  attributes: { strength: 20, dexterity: 15, constitution: 14, maxHp: 200 },
  accelerator: { x: 0, y: 0 },
  heal: vi.fn()
} as any;
const xpTable = new DefaultXPTable();

describe('Warrior Class (Guerreiro) - Árvore de 12 Skills', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve inicializar a árvore completa com exatamente 12 habilidades canônicas', () => {
    const warrior = new Warrior(xpTable, mockPlayer, mockEventManager);
    
    expect(warrior.allSkills.length).toBe(12);

    // Valida todos os níveis de 1 a 12
    expect(warrior.getSkillForLevel(1)?.id).toBe('w_t1_strike');
    expect(warrior.getSkillForLevel(2)?.id).toBe('w_t1_heavy_blow');
    expect(warrior.getSkillForLevel(3)?.id).toBe('w_t1_iron_skin');
    expect(warrior.getSkillForLevel(4)?.id).toBe('w_t2_cleave');
    expect(warrior.getSkillForLevel(5)?.id).toBe('w_t2_shield_bash');
    expect(warrior.getSkillForLevel(6)?.id).toBe('w_t3_berserk');
    expect(warrior.getSkillForLevel(7)?.id).toBe('w_t3_war_cry');
    expect(warrior.getSkillForLevel(8)?.id).toBe('w_t4_ground_slam');
    expect(warrior.getSkillForLevel(9)?.id).toBe('w_t3_colossus_vigor');
    expect(warrior.getSkillForLevel(10)?.id).toBe('w_t5_blade_dance');
    expect(warrior.getSkillForLevel(11)?.id).toBe('w_t4_armor_breaker');
    expect(warrior.getSkillForLevel(12)?.id).toBe('w_t5_avatar_of_war');
    expect(warrior.getSkillForLevel(13)).toBeNull();
  });

  it('deve executar Pancada Pesada (Heavy Blow) via SweepingArcAttackTemplate', () => {
    const warrior = new Warrior(xpTable, mockPlayer, mockEventManager);
    warrior.executeSkill('w_t1_heavy_blow', { x: 150, y: 100 });

    expect(mockEventManager.dispatch).toHaveBeenCalledWith('log', expect.objectContaining({
      message: expect.stringContaining('[Guerreiro] Pancada Pesada desferida!')
    }));
    expect(mockEventManager.dispatch).toHaveBeenCalledWith('spawnVisual', expect.objectContaining({
      type: 'heavy-blow'
    }));

    warrior.update(0.016);
    expect(mockEventManager.dispatch).toHaveBeenCalledWith('requestNeighbors', expect.any(Object));
  });

  it('deve executar Turbilhão de Aço (Whirlwind) via OrbitalAttackTemplate', () => {
    const warrior = new Warrior(xpTable, mockPlayer, mockEventManager);
    warrior.executeSkill('w_t2_cleave', { x: 0, y: 0 });

    expect(mockEventManager.dispatch).toHaveBeenCalledWith('log', expect.objectContaining({
      message: expect.stringContaining('[Guerreiro] Turbilhão de Aço ativado!')
    }));
    expect(mockEventManager.dispatch).toHaveBeenCalledWith('spawnVisual', expect.objectContaining({
      type: 'cleave'
    }));

    warrior.update(0.016);
    expect(mockEventManager.dispatch).toHaveBeenCalledWith('requestNeighbors', expect.any(Object));
  });

  it('deve executar Investida com Escudo (Shield Bash) aplicando impulso e atordoamento', () => {
    const warrior = new Warrior(xpTable, mockPlayer, mockEventManager);
    warrior.executeSkill('w_t2_shield_bash', { x: 200, y: 100 });

    expect(mockEventManager.dispatch).toHaveBeenCalledWith('log', expect.objectContaining({
      message: expect.stringContaining('[Guerreiro] Investida com Escudo disparada!')
    }));
    expect(mockPlayer.accelerator.x).toBeGreaterThan(0);
    expect(mockEventManager.dispatch).toHaveBeenCalledWith('requestNeighbors', expect.objectContaining({
      radius: 48
    }));
  });

  it('deve executar Grito de Guerra (War Cry) com onda sonora expansiva', () => {
    const warrior = new Warrior(xpTable, mockPlayer, mockEventManager);
    warrior.executeSkill('w_t3_war_cry', { x: 0, y: 0 });

    expect(mockEventManager.dispatch).toHaveBeenCalledWith('log', expect.objectContaining({
      message: expect.stringContaining('[Guerreiro] Grito de Guerra ecoou pelo campo!')
    }));
    expect(mockEventManager.dispatch).toHaveBeenCalledWith('spawnVisual', expect.objectContaining({
      type: 'war-cry'
    }));

    warrior.update(0.016);
    expect(mockEventManager.dispatch).toHaveBeenCalledWith('requestNeighbors', expect.any(Object));
  });

  it('deve executar Impacto Sísmico (Ground Slam) via NovaBurstAttackTemplate', () => {
    const warrior = new Warrior(xpTable, mockPlayer, mockEventManager);
    warrior.executeSkill('w_t4_ground_slam', { x: 0, y: 0 });

    expect(mockEventManager.dispatch).toHaveBeenCalledWith('log', expect.objectContaining({
      message: expect.stringContaining('[Guerreiro] Impacto Sísmico estrondou o solo!')
    }));
    expect(mockEventManager.dispatch).toHaveBeenCalledWith('spawnVisual', expect.objectContaining({
      type: 'ground-slam'
    }));
    expect(mockEventManager.dispatch).toHaveBeenCalledWith('particle', expect.objectContaining({
      effect: 'rockShatter'
    }));

    warrior.update(0.016);
    expect(mockEventManager.dispatch).toHaveBeenCalledWith('requestNeighbors', expect.any(Object));
  });

  it('deve executar Dança das Lâminas do Colosso via SweepingArcAttackTemplate', () => {
    const warrior = new Warrior(xpTable, mockPlayer, mockEventManager);
    warrior.executeSkill('w_t5_blade_dance', { x: 200, y: 100 });

    expect(mockEventManager.dispatch).toHaveBeenCalledWith('log', expect.objectContaining({
      message: expect.stringContaining('[Guerreiro] Dança das Lâminas do Colosso desferida!')
    }));
    expect(mockEventManager.dispatch).toHaveBeenCalledWith('spawnVisual', expect.objectContaining({
      type: 'blade-dance'
    }));

    warrior.update(0.016);
    expect(mockEventManager.dispatch).toHaveBeenCalledWith('requestNeighbors', expect.any(Object));
  });

  it('deve despertar o Avatar da Guerra curando e emitindo efeitos visuais', () => {
    const warrior = new Warrior(xpTable, mockPlayer, mockEventManager);
    warrior.executeSkill('w_t5_avatar_of_war', { x: 0, y: 0 });

    expect(mockEventManager.dispatch).toHaveBeenCalledWith('log', expect.objectContaining({
      message: expect.stringContaining('[Guerreiro] Avatar da Guerra despertado!')
    }));
    expect(mockPlayer.heal).toHaveBeenCalledWith(50); // 25% de 200 HP
    expect(mockEventManager.dispatch).toHaveBeenCalledWith('spawnVisual', expect.objectContaining({
      type: 'avatar-of-war'
    }));
    expect(mockEventManager.dispatch).toHaveBeenCalledWith('particle', expect.objectContaining({
      effect: 'bloodSplatter'
    }));
  });

  it('deve respeitar cooldown ao tentar executar habilidades repetidamente', () => {
    const warrior = new Warrior(xpTable, mockPlayer, mockEventManager);
    warrior.executeSkill('w_t2_cleave', { x: 0, y: 0 });
    
    // Segunda chamada imediata
    warrior.executeSkill('w_t2_cleave', { x: 0, y: 0 });
    expect(mockEventManager.dispatch).toHaveBeenCalledWith('log', expect.objectContaining({
      message: expect.stringContaining('[Guerreiro] Habilidade em recarga!')
    }));
  });
});