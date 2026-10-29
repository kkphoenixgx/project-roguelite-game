import { describe, it, expect, vi } from 'vitest';
import Player from '../../domain/ObjectModule/Entities/Player/Player';
import Attributes from '../../domain/ObjectModule/Entities/Attributes';
import ActionManager from '../../domain/eventDispacher/ActionManager';
import SimpleSword from '../../domain/ObjectModule/Items/Weapons/MeleeWeapons/SimpleSword';
import FishingRod from '../../domain/ObjectModule/Items/Weapons/RangedWeapons/FishingRod';
import Leviata from '../../domain/ObjectModule/Entities/Casted/Leviata';
import type { IEventManager } from '../../domain/eventDispacher/IGameEvents';
import Vector2D from '../../domain/shared/Vector2D';

function createMockEventManager(): IEventManager {
  const listeners: Record<string, Function[]> = {};
  return {
    on: vi.fn((event: string, callback: Function) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(callback);
    }),
    dispatch: vi.fn((event: string, payload: any) => {
      if (listeners[event]) {
        listeners[event].forEach(cb => cb(payload));
      }
    })
  };
}

describe('Regressão: Leviatã ao correr e bater simultaneamente', () => {
  it('não deve destruir ou matar o Leviatã quando o jogador se move e ataca ao mesmo tempo que invoca a skill', () => {
    const eventManager = createMockEventManager();
    const logger = { log: vi.fn() };

    const player = new Player(
      1,
      { x: 100, y: 100 },
      new Attributes(8, 10, 10, 10, 10, 10, 10, 10),
      eventManager as any
    );

    const actionManager = new ActionManager(player, logger as any, eventManager as any);
    const sword = new SimpleSword();
    const fishingRod = new FishingRod();

    player.backpack.push(sword);
    player.equipItem(0);
    player.backpack.push(fishingRod);
    player.equipItem(0);

    player.unlockSkill('pesc_t3_leviata');
    player.equipSkillInLoadout('pesc_t3_leviata', 2); // slot 3

    // 1. Jogador invoca a skill do Leviatã
    const mouseTarget = { x: 120, y: 120 };
    actionManager.checkEvent(['slot_3'], mouseTarget);

    expect(eventManager.dispatch).toHaveBeenCalledWith('spawn', expect.objectContaining({
      type: 'spawn-leviatã',
      coordinates: mouseTarget
    }));

    // Instancia o Leviatã como o ObjectElementManager faria via Spawner
    const lastSpawnCall = (eventManager.dispatch as any).mock.calls.find((c: any) => c[0] === 'spawn' && (c[1].type === 'spawn-leviatã' || c[1].type === 'spawn-leviata'));
    expect(lastSpawnCall).toBeDefined();

    const leviata = Leviata.createSpawn(999, lastSpawnCall[1], eventManager);

    // 2. No mesmo frame e nos frames subsequentes, o jogador corre (move) e ataca (leftClick)
    actionManager.checkEvent(['up', 'right', 'leftClick'], { x: 130, y: 130 });
    player.update(0.016);

    // Se o ataque do jogador (espada/anzol) colidir com o Leviatã
    sword.attack(player, new Vector2D(1, 0), eventManager as any);

    // Tentativa direta de causar dano por varredura de ataque
    const damageResult = leviata.takeDamage({
      totalDamage: 100,
      damageType: 'physical',
      isCritical: false,
      direction: new Vector2D(1, 0),
      attacker: player as any
    });

    expect(damageResult).toBe(0);
    expect(leviata.state).not.toBe('dead');

    // Leviatã deve permanecer vivo no primeiro segundo (duração 0.95s)
    leviata.update(0.5);
    expect(leviata.state).not.toBe('dead');

    // Ao atingir e ultrapassar 0.95s, ele encerra seu ciclo de vida normalmente
    leviata.update(0.5);
    expect(leviata.state).toBe('dead');
  });
});
