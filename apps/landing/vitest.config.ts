import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/*.test.ts', '**/*.test.tsx'],
    exclude: ['node_modules/**', '.next/**', 'venv/**'],
  },
  resolve: {
    alias: [
      { find: /^~\/lib\/(.*)$/, replacement: path.resolve(import.meta.dirname, './lib/$1') },
      { find: /^~\/components\/(.*)$/, replacement: path.resolve(import.meta.dirname, './components/$1') },
      { find: /^~\/(.*)$/, replacement: path.resolve(import.meta.dirname, './app/$1') },
    ],
  },
});
