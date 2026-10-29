import type { Meta, StoryObj } from '@storybook/html';
import MainMenuGui from './MainMenuGui';
import type { WorldConfig } from './MainMenuGui';
import type { IGameDomain } from '../../../../domain/ports/domain-contracts';

import MetaProgressionManager from '../../../../domain/facadeComponents/MetaProgressionManager';

const dummyLogger = { log: (ch: string, msg: string, ...args: any[]) => console.log(`[${ch}] ${msg}`, ...args) };
const mpmInstance = new MetaProgressionManager(dummyLogger);

const mockDomain: IGameDomain = {
    get unlockedGlobalNodes() { return mpmInstance.getUnlockedNodes(); },
    get globalNodesMap() { return mpmInstance.getAvailableNodesMap(); },
    get globalMetaSummary() { return mpmInstance.getAggregatedMetaStats(); },
    metaProgressionManager: mpmInstance,
    update: () => {},
    loadWorld: async () => {},
    transitionWorld: async () => {},
    handlePlayerInteractions: () => {},
    getRenderState: () => ({ world: { width: 1000, height: 1000, mapId: 'test' }, renderables: [] }),
    sendDialogue: () => {},
    getAvailableWorlds: () => [],
    notifyPauseState: () => {},
    generateLocalRewards: () => [],
    updateLLMPreset: () => {}
};

const mockWorlds: WorldConfig[] = [
    {
        id: 'vilgem',
        name: 'Ilha de Vilgem',
        cx: 300,
        cy: 300,
        scale: 1,
        path: ''
    },
    {
        id: 'cemii',
        name: 'Floresta de Cemii',
        cx: 600,
        cy: 400,
        scale: 1.2,
        path: ''
    },
    {
        id: 'alun',
        name: 'Ruínas de Alun',
        cx: 450,
        cy: 600,
        scale: 0.8,
        path: ''
    }
];

interface StoryArgs {}

export const Default: StoryObj<StoryArgs> = {
  args: {},
};

const meta: Meta<StoryArgs> = {
  title: 'HUD/MainMenuGui',
  render: () => {
  const existing = document.getElementById('main-menu-container') || document.querySelector('main-menu-container');
  if (existing && existing.parentElement === document.body) existing.remove();

    // Clear previous instances attached to the body by the GUI
    const previousInstances = document.querySelectorAll('#main-menu-container');
    previousInstances.forEach((el) => {
      if (el.parentElement === document.body) el.remove();
    });

    const onStartGameCallback = (mapId: string) => {
      console.log(`Starting game in map: ${mapId}`);
    };

    // MainMenuGui attaches itself to document.body in its constructor
    new MainMenuGui(mockDomain, onStartGameCallback, mockWorlds);

    // Return an empty div because MainMenuGui mounts itself globally
    return document.createElement('div');
  },
};


export const ProgressoAberta: StoryObj<StoryArgs> = {
  args: {},
  render: () => {
    const existing = document.getElementById('main-menu-container') || document.querySelector('main-menu-container');
    if (existing && existing.parentElement === document.body) existing.remove();
    
    new MainMenuGui(mockDomain, () => {}, mockWorlds);
    
    setTimeout(() => {
        const progBtn = document.getElementById('nav-progressao');
        if (progBtn) progBtn.click();
    }, 100);
    
    return document.createElement('div');
  }
};

export const ConfiguracoesAberta: StoryObj<StoryArgs> = {
  args: {},
  render: () => {
    const existing = document.getElementById('main-menu-container') || document.querySelector('main-menu-container');
    if (existing && existing.parentElement === document.body) existing.remove();
    
    new MainMenuGui(mockDomain, () => {}, mockWorlds);
    
    setTimeout(() => {
        const cfgBtn = document.getElementById('nav-config');
        if (cfgBtn) cfgBtn.click();
    }, 100);
    
    return document.createElement('div');
  }
};

export const SistemaAberta: StoryObj<StoryArgs> = {
  args: {},
  render: () => {
    const existing = document.getElementById('main-menu-container') || document.querySelector('#main-menu-container');
    if (existing && existing.parentElement === document.body) existing.remove();
    
    new MainMenuGui(mockDomain, () => {}, mockWorlds);
    
    setTimeout(() => {
        const systemBtn = document.querySelector('.mm-nav-btn[data-target="mm-tab-5"]') as HTMLButtonElement;
        if (systemBtn) systemBtn.click();
    }, 100);
    
    return document.createElement('div');
  }
};

export default meta;
