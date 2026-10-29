// @ts-check
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  packageManager: 'npm',
  reporters: ['html', 'clear-text', 'progress'],
  testRunner: 'vitest',
  plugins: [
    '@stryker-mutator/vitest-runner'
  ],
  coverageAnalysis: 'perTest',
  mutate: [
    'typescript/adapters/web/components/GameAdapter.ts',
    'typescript/adapters/web/components/renderModule/scene/Map.ts',
    'typescript/adapters/web/components/keyboardModule/InputManager.ts',
    'typescript/adapters/web/GUIS/confirmationModalModule/ConfirmationModalGui.ts',
    'typescript/adapters/web/GUIS/equippedWeaponsHudModule/EquippedWeaponsHudGui.ts'
  ],
  vitest: {
    configFile: 'vitest.stryker.config.ts'
  },
  ignorePatterns: [
    'src-tauri/**',
    'target/**',
    'dist/**',
    'storybook-static/**',
    '.stryker-tmp/**'
  ],
  thresholds: {
    high: 80,
    low: 60,
    break: null
  },
  timeoutMS: 30000,
  concurrency: 8,
  incremental: true,
  ignoreStatic: true
};


