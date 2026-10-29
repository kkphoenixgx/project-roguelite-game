import { describe, it, expect, vi } from 'vitest';
import ScytheSlash from '../../../../../domain/ObjectModule/Items/Weapons/MeleeWeapons/ScytheSlash';
import { DynamicProjectile } from '../../../../../domain/ObjectModule/Entities/projectiles/DynamicProjectile';
import { Fireball } from '../../../../../domain/ObjectModule/Entities/projectiles/Fireball';
import { SimpleBullet } from '../../../../../domain/ObjectModule/Entities/projectiles/SimpleBullet';
import Leviata from '../../../../../domain/ObjectModule/Entities/Casted/Leviata';
import FishPet from '../../../../../domain/ObjectModule/Entities/Casted/FishPet';
import Vector2D from '../../../../../domain/shared/Vector2D';

describe('ScytheSlash and Entity Self-Destruction Lifecycle Unit Tests', () => {
  it('ScytheSlash deve atualizar seus quadros e se auto-destruir ao atingir o tempo total da animação', () => {
    const despawnEvents: any[] = [];
    const eventManager = {
      dispatch: vi.fn((event, payload) => {
        if (event === 'despawn') despawnEvents.push(payload);
      }),
      on: vi.fn(),
      off: vi.fn()
    } as any;

    const attacker = {
      coordinates: { x: 100, y: 100 },
      size: { width: 32, height: 32 },
      attributes: { areaMultiplier: 1 }
    };

    const slash = ScytheSlash.createSpawn(42, {
      coordinates: { x: 100, y: 100 },
      direction: { x: 1, y: 0 },
      attack: { execute: vi.fn(), attacker },
      attacker
    }, eventManager);

    expect(slash.isDestroyed).toBe(false);
    expect(despawnEvents.length).toBe(0);

    // Frame duration é 3/60 = 0.05s por frame. Total 6 frames = 0.30s.
    // Avança 0.1s (passa por quadros intermediários sem destruir)
    slash.update(0.1);
    expect(slash.isDestroyed).toBe(false);
    expect(despawnEvents.length).toBe(0);

    // Avança mais 0.25s (total 0.35s > 0.30s), deve disparar despawn e marcar isDestroyed
    slash.update(0.25);
    expect(slash.isDestroyed).toBe(true);
    expect(despawnEvents.length).toBe(1);
    expect(despawnEvents[0]).toEqual({ objectId: 42 });

    // Chamadas subsequentes de update não devem redisparar despawn
    slash.update(0.05);
    expect(despawnEvents.length).toBe(1);
  });

  it('DynamicProjectile deve marcar isDestroyed ao expirar alcance máximo', () => {
    const despawnEvents: any[] = [];
    const eventManager = {
      dispatch: vi.fn((event, payload) => {
        if (event === 'despawn') despawnEvents.push(payload);
      }),
      on: vi.fn(),
      off: vi.fn()
    } as any;

    const proj = new DynamicProjectile(
      101,
      { x: 0, y: 0 },
      new Vector2D(1, 0),
      { execute: vi.fn() } as any,
      [],
      eventManager,
      []
    );

    expect(proj.isDestroyed).toBe(false);
    // Move além do alcance de 500 (com speed 300, 2s = 600px > 500px)
    proj.update(2.0);
    expect(proj.isDestroyed).toBe(true);
    expect(despawnEvents.length).toBe(1);
    expect(despawnEvents[0]).toEqual({ objectId: 101 });
  });

  it('Fireball deve marcar isDestroyed ao expirar alcance máximo', () => {
    const despawnEvents: any[] = [];
    const eventManager = {
      dispatch: vi.fn((event, payload) => {
        if (event === 'despawn') despawnEvents.push(payload);
      }),
      on: vi.fn(),
      off: vi.fn()
    } as any;

    const fireball = new Fireball(
      102,
      { x: 0, y: 0 },
      new Vector2D(1, 0),
      { execute: vi.fn(), attacker: { id: 999 } } as any,
      [],
      eventManager
    );

    expect(fireball.isDestroyed).toBe(false);
    fireball.update(2.0); // Anda mais de 350px
    expect(fireball.isDestroyed).toBe(true);
    expect(despawnEvents.length).toBe(1);
  });

  it('SimpleBullet deve marcar isDestroyed ao expirar alcance', () => {
    const despawnEvents: any[] = [];
    const eventManager = {
      dispatch: vi.fn((event, payload) => {
        if (event === 'despawn') despawnEvents.push(payload);
      }),
      on: vi.fn(),
      off: vi.fn()
    } as any;

    const bullet = new SimpleBullet(
      103,
      { x: 0, y: 0 },
      new Vector2D(1, 0),
      { execute: vi.fn(), attacker: { attributes: { piercing: 0 } } } as any,
      eventManager
    );

    expect(bullet.isDestroyed).toBe(false);
    bullet.update(2.0);
    expect(bullet.isDestroyed).toBe(true);
    expect(despawnEvents.length).toBe(1);
  });

  it('Leviata deve marcar isDestroyed quando a animação de spawn termina', () => {
    const despawnEvents: any[] = [];
    const eventManager = {
      dispatch: vi.fn((event, payload) => {
        if (event === 'despawn') despawnEvents.push(payload);
      }),
      on: vi.fn(),
      off: vi.fn()
    } as any;

    const leviata = new Leviata(104, { x: 50, y: 50 }, eventManager);
    expect(leviata.isDestroyed).toBe(false);

    // Leviata spawnLifeTime = 0.95s
    leviata.update(1.0);
    expect(leviata.isDestroyed).toBe(true);
    expect(despawnEvents.length).toBe(1);
  });

  it('FishPet deve marcar isDestroyed quando duration expira', () => {
    const despawnEvents: any[] = [];
    const eventManager = {
      dispatch: vi.fn((event, payload) => {
        if (event === 'despawn') despawnEvents.push(payload);
      }),
      on: vi.fn(),
      off: vi.fn()
    } as any;

    const pet = new FishPet(105, { x: 50, y: 50 }, eventManager);
    expect(pet.isDestroyed).toBe(false);

    // FishPet duration = 5s
    pet.update(6);
    expect(pet.isDestroyed).toBe(true);
    expect(despawnEvents.length).toBe(1);
  });
});
