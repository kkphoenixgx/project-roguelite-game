import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    include: ['typescript/tests/**/*.test.ts'],
    exclude: ['**/.stryker-tmp/**', '**/node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary', 'lcov'],
      reportsDirectory: './coverage',
      include: ['typescript/domain/**/*.ts', 'typescript/adapters/**/*.ts'],
      exclude: [
        'typescript/**/*.d.ts',
        'typescript/**/*.type.ts',
        'typescript/domain/ports/**',
        'typescript/tests/**',
        '**/*.stories.ts'
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70
      }
    },
  },
});