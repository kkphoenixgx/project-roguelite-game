import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    include: [
      'typescript/tests/domain/**/*.test.ts',
      'typescript/tests/adapters/**/*.test.ts',
      'typescript/tests/integration/**/*.test.ts',
      'typescript/tests/regression/**/*.test.ts'
    ],
    exclude: [
      '**/node_modules/**',
      '**/.stryker-tmp/**',
      '**/dist/**',
      '**/SystemModalInvocationRegression.test.ts',
      '**/GameExitCrashRegression.test.ts',
      '**/compliance/**',
      '**/ZeroGC_SystemIntegration.test.ts'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['typescript/domain/**/*.ts', 'typescript/adapters/web/**/*.ts'],
      exclude: [
        'typescript/**/*.d.ts',
        'typescript/**/*.type.ts',
        'typescript/domain/ports/**',
        'typescript/adapters/web/**/*.stories.ts'
      ],
    },
  },
});

