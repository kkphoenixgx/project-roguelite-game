import { describe, it, expect } from 'vitest';
import Skill from '../../../domain/Skills/Skill';
import type Effect from '../../../domain/ObjectModule/Items/Effects/Effect';

describe('Skill', () => {
  it('deve construir corretamente com todas as propriedades', () => {
    const mockEffect = {} as Effect;
    const skill = new Skill(
      'fireball',
      'Bola de Fogo',
      'Lança uma bola de fogo.',
      'active',
      1,
      'basic_magic',
      mockEffect,
      'slot_1'
    );

    expect(skill.id).toBe('fireball');
    expect(skill.name).toBe('Bola de Fogo');
    expect(skill.description).toBe('Lança uma bola de fogo.');
    expect(skill.type).toBe('active');
    expect(skill.tier).toBe(1);
    expect(skill.requiredSkillId).toBe('basic_magic');
    expect(skill.effect).toBe(mockEffect);
    expect(skill.keybind).toBe('slot_1');
  });

  it('deve construir com requiredSkillId sendo array e mesclar dependencies evitando duplicatas', () => {
    const skill = new Skill(
      'meteor',
      'Meteoro',
      'Invoca um meteoro.',
      'active',
      2,
      ['fireball', 'mana_surge'],
      undefined,
      undefined,
      ['fireball', 'cosmic_power']
    );

    expect(skill.id).toBe('meteor');
    expect(skill.dependencies).toEqual(['fireball', 'mana_surge', 'cosmic_power']);
    expect(skill.requiredSkillId).toBe('fireball');
    expect(skill.prerequisiteId).toBe('fireball');
  });

  it('deve lidar com requiredSkillId vazio ou não-array', () => {
    const skill = new Skill(
      'arcane_mind',
      'Mente Arcana',
      'Passiva mental.',
      'passive',
      1,
      '',
      undefined,
      undefined,
      ['focus']
    );

    expect(skill.dependencies).toEqual(['focus']);
    expect(skill.requiredSkillId).toBe('focus');
    expect(skill.prerequisiteId).toBe('focus');
  });

  it('deve armazenar a flag requiresMainHandWeapon corretamente', () => {
    const skill = new Skill(
      'fanhammer',
      'Fan the Hammer',
      'Rajada de tiros',
      'active',
      2,
      undefined,
      undefined,
      undefined,
      undefined,
      true
    );

    expect(skill.requiresMainHandWeapon).toBe(true);
  });
});