import type { StorybookConfig } from '@storybook/html-vite';
import path from 'path';

const config: StorybookConfig = {
  stories: ['../typescript/adapters/**/*.stories.@(ts|js)'],
  addons: ['@storybook/addon-essentials'],
  framework: {
    name: '@storybook/html-vite',
    options: {},
  },

  staticDirs: [{ from: '../typescript/adapters/web/assets', to: '/assets' }],
  async viteFinal(config) {
    config.server = config.server || {};
    config.server.proxy = {
      ...config.server.proxy,
      '/ollama-search': {
        target: 'https://ollama.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/ollama-search/, '/search'),
      },
      '/ollama-library': {
        target: 'https://ollama.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/ollama-library/, '/library'),
      },
      '/ollama-api': {
        target: 'https://ollama.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/ollama-api/, '/api'),
      },
    };
    return config;
  },
};

export default config;