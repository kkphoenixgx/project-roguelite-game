import type { Meta, StoryObj } from '@storybook/html';
import EquippedWeaponsHudGui from './EquippedWeaponsHudGui';

let activeGui: EquippedWeaponsHudGui | null = null;

const meta: Meta = {
  title: 'HUD/EquippedWeaponsHud',
  render: () => {
    let currentEquipment: { mainHand: any; secondHand: any } = {
      mainHand: { name: 'Foice da Morte', iconId: 3, itemId: 3 },
      secondHand: { name: 'Cajado Rúnico', iconId: 1, itemId: 1 }
    };

    const syncHud = () => {
      activeGui?.update({
        id: 1,
        entityTypeId: 'player',
        coordinates: { x: 0, y: 0 },
        size: { width: 32, height: 32 },
        rotation: 0,
        equipment: {
          mainHand: currentEquipment.mainHand,
          secondHand: currentEquipment.secondHand
        }
      } as any);
    };

    const handleSwap = () => {
      const temp = currentEquipment.mainHand;
      currentEquipment.mainHand = currentEquipment.secondHand;
      currentEquipment.secondHand = temp;
      syncHud();
    };

    activeGui = new EquippedWeaponsHudGui(handleSwap);

    const wrapper = document.createElement('div');
    wrapper.style.width = '100vw';
    wrapper.style.height = '100vh';
    wrapper.style.backgroundColor = '#12131a';
    wrapper.style.position = 'relative';
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.alignItems = 'center';
    wrapper.style.justifyContent = 'center';

    const toolbar = document.createElement('div');
    toolbar.style.position = 'absolute';
    toolbar.style.top = '16px';
    toolbar.style.display = 'flex';
    toolbar.style.gap = '8px';
    toolbar.style.zIndex = '9999';

    const actions = [
      {
        label: 'Alternar Arma Selecionada (TAB)',
        handler: handleSwap
      },
      {
        label: 'Equipar Foice + Cajado',
        handler: () => {
          currentEquipment = {
            mainHand: { name: 'Foice da Morte', iconId: 3, itemId: 3 },
            secondHand: { name: 'Cajado Rúnico', iconId: 1, itemId: 1 }
          };
          syncHud();
        }
      },
      {
        label: 'Apenas Espada de Ferro',
        handler: () => {
          currentEquipment = {
            mainHand: { name: 'Espada de Ferro', iconId: 4, itemId: 4 },
            secondHand: null
          };
          syncHud();
        }
      },
      {
        label: 'Desarmado',
        handler: () => {
          currentEquipment = {
            mainHand: null,
            secondHand: null
          };
          syncHud();
        }
      }
    ];

    for (const action of actions) {
      const btn = document.createElement('button');
      btn.textContent = action.label;
      btn.onclick = () => action.handler();
      toolbar.appendChild(btn);
    }
    wrapper.appendChild(toolbar);

    syncHud();

    return wrapper;
  }
};

export default meta;

export const Default: StoryObj = {};
