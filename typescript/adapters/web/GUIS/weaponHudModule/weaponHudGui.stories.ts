import type { Meta, StoryObj } from '@storybook/html';
import WeaponHudGui from './WeaponHudGui';
import type { EntityRenderableState } from '../../../../domain/ports/domain-contracts';

const mockState: EntityRenderableState = {
    id: 1,
    coordinates: { x: 0, y: 0 },
    size: { width: 32, height: 32 },
    rotation: 0,
    entityTypeId: 'player',
    equipment: {
        mainHand: { iconId: 1 } // Assumindo que 1 seja um iconId válido para arma
    }
};

interface StoryArgs {}

export const Default: StoryObj<StoryArgs> = {
  args: {},
};

const meta: Meta<StoryArgs> = {
  title: 'HUD/WeaponHudGui',
  render: () => {
  const existing = document.getElementById('weapon-hud') || document.querySelector('weapon-hud');
  if (existing && existing.parentElement === document.body) existing.remove();

    const previousInstances = document.querySelectorAll('#weapon-hud-container');
    previousInstances.forEach((el) => {
      if (el.parentElement === document.body) el.remove();
    });

    const gui = new WeaponHudGui();

    // Cria um background pra ficar visível a UI que é branca/translúcida
    const wrapper = document.createElement('div');
    wrapper.style.width = '100vw';
    wrapper.style.height = '100vh';
    wrapper.style.backgroundColor = '#1a1a1a';
    wrapper.style.position = 'relative';

    const container = document.getElementById('weapon-hud-container');
    if (container) wrapper.appendChild(container);
    
    gui.update(mockState, { x: window.innerWidth / 2, y: window.innerHeight / 2 }, { x: (window.innerWidth / 2) + 100, y: (window.innerHeight / 2) - 50 });

    return wrapper;
  },
};

export default meta;
