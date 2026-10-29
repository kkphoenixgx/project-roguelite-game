import type { Meta, StoryObj } from '@storybook/html';
import DialogueGui from './DialogueGui';
import { RenderRegistry } from '../../shared/RenderRegistry'; 

RenderRegistry.spriteConfigs.set('idle', { 
  imageSrc: new URL('../../assets/entities/npc/Candelion/candelion-waiting.png', import.meta.url).href,
  frameCount: 1,
  animationSpeed: 20,
  frameWidth: 32,
  frameHeight: 32,
  atlasOffset: { x: 0, y: 0 },
  spriteSize: { width: 32, height: 32 } 
});

RenderRegistry.spriteConfigs.set('walking', { 
  imageSrc: new URL('../../assets/entities/npc/Candelion/candelion-walking.png', import.meta.url).href,
  frameCount: 1,
  animationSpeed: 10,
  frameWidth: 32,
  frameHeight: 32,
  atlasOffset: { x: 0, y: 0 },
  spriteSize: { width: 32, height: 32 } 
});

interface StoryArgs {
  npcName: string;
  text: string;
  npcId: number;
  entityTypeId: string;
}

const meta: Meta<StoryArgs> = {
  title: 'HUD/DialogueGui',
  argTypes: {
    npcName: { control: 'text' },
    text: { control: 'text' },
    entityTypeId: { control: 'select', options: ['candelion'] },
  },
};

export default meta;

const createGui = () => {
    const existing = document.getElementById('dialogue-container') || document.querySelector('#dialogue-container');
    if (existing && existing.parentElement === document.body) existing.remove();
    
    return new DialogueGui(
      (msg, id) => console.log(`[Player Reply - NPC ${id}]:`, msg),
      () => console.log('[Toggle Pause Triggered]')
    );
};

export const Padrao = {
  args: {
    npcName: 'Candelion',
    text: 'Olá viajante. A névoa está mais densa hoje.',
    npcId: 1,
    entityTypeId: 'candelion',
  },
  render: (args: StoryArgs) => {
    const gui = createGui();
    gui.show(args.npcName, args.text, args.npcId, args.entityTypeId);
    return gui['container'];
  }
};

export const WaitingForLLM = {
  args: {
    npcName: 'Candelion',
    text: '...',
    npcId: 1,
    entityTypeId: 'candelion',
  },
  render: (args: StoryArgs) => {
    const gui = createGui();
    gui.show(args.npcName, args.text, args.npcId, args.entityTypeId);
    return gui['container'];
  }
};

export const InternalThought = {
  args: {
    npcName: 'Candelion',
    text: '*(Ele parece estar escondendo algo de mim...)*',
    npcId: 1,
    entityTypeId: 'candelion',
  },
  render: (args: StoryArgs) => {
    const gui = createGui();
    gui.show(args.npcName, args.text, args.npcId, args.entityTypeId);
    return gui['container'];
  }
};

export const SystemError = {
  args: {
    npcName: 'Candelion',
    text: 'Connection timeout with Cognitive Engine. Token limit reached.',
    npcId: 1,
    entityTypeId: 'candelion',
  },
  render: (args: StoryArgs) => {
    const gui = createGui();
    gui.show(args.npcName, "Test", args.npcId, args.entityTypeId); // setup portrait
    gui.showSystemMessage(args.text);
    return gui['container'];
  }
};
