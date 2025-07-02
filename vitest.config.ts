import { defineConfig } from 'vitest/config';
import path from 'path';
import { readFileSync } from 'fs';

// Read version from package.json
const packageJson = JSON.parse(
  readFileSync(path.join(__dirname, 'package.json'), 'utf-8')
);

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData.ts',
        'test/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
    __APP_NAME__: JSON.stringify(packageJson.name),
  },
});