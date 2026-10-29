import type { Meta, StoryObj } from '@storybook/html';
import SkillTreeGui from './SkillTreeGUI';
import type { EntityRenderableState, SkillNodeDTO } from '../../../../domain/ports/domain-contracts';

const mockNodes: SkillNodeDTO[] = [
    { id: 'fireball', name: 'Bola de Fogo', description: 'Atira uma bola de fogo explosiva.', type: 'active', tier: 1, unlocked: true, canUnlock: false },
    { id: 'dash', name: 'Investida', description: 'Avança rapidamente.', type: 'active', tier: 1, unlocked: true, canUnlock: false },
    { id: 'hp_boost', name: 'Vitalidade', description: 'Aumenta o HP máximo.', type: 'passive', tier: 2, unlocked: false, canUnlock: true }
];

const mockState: EntityRenderableState = {
    id: 1,
    coordinates: { x: 0, y: 0 },
    size: { width: 32, height: 32 },
    rotation: 0,
    entityTypeId: 'player',
    activeClass: 'Mago',
    classes: [
        { name: 'Mago', isActive: true, isUnlocked: true },
        { name: 'Guerreiro', isActive: false, isUnlocked: true }
    ],
    skillTree: mockNodes,
    activeLoadout: ['fireball', null, 'dash', null],
    unlockedActiveSkills: [mockNodes[0]!, mockNodes[1]!]
};

interface StoryArgs {}

export const Default: StoryObj<StoryArgs> = {
  args: {},
};

const meta: Meta<StoryArgs> = {
  title: 'HUD/SkillTreeGui',
  render: () => {
  const existing = document.getElementById('skill-tree-container') || document.querySelector('skill-tree-container');
  if (existing && existing.parentElement === document.body) existing.remove();

    const previousInstances = document.querySelectorAll('#skill-tree-container');
    previousInstances.forEach((el) => {
      if (el.parentElement === document.body) el.remove();
    });

    const gui = new SkillTreeGui(
        () => console.log('Toggle pause'),
        (action, payload) => console.log('Skill action:', action, payload)
    );

    // Força abrir no storybook
    gui.toggle();
    gui.update(mockState);

    return document.createElement('div');
  },
};

export default meta;
