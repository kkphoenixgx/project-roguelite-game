import type { Preview } from '@storybook/html';

const preview: Preview = {
    decorators: [
    (Story) => {
      const elementsToClean = document.querySelectorAll(
        '#main-menu-container, #dialogue-container, #character-menu-container, #skill-tree-container, #weapon-hud-container, .floating-chat-container, #game-over-container, #levelup-reward-container, #pause-menu-overlay, #player-status-container, #custom-titlebar, #xp-hud-container'
      );
      elementsToClean.forEach(el => {
        if (el.parentElement === document.body) el.remove();
      });
      return Story();
    }
  ],
  parameters: {
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#121214' },
        { name: 'game-viewport', value: '#202024' },
      ],
    },
  },
};

export default preview;