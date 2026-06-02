import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/*.test.ts', '**/*.test.tsx'],
    exclude: ['node_modules/**', '.next/**', 'venv/**'],
  },
  resolve: {
    alias: [
      {
        // `server-only` throws on import and is not linked in node_modules;
        // Next.js swaps it for an empty module via the `react-server` export
        // condition. Vitest lacks that condition, so we alias to an empty stub.
        find: /^server-only$/,
        replacement: path.resolve(
          import.meta.dirname,
          './vitest.server-only.stub.ts',
        ),
      },
      {
        find: /^~\/config\/(.*)$/,
        replacement: path.resolve(import.meta.dirname, './config/$1'),
      },
      {
        find: /^~\/lib\/(.*)$/,
        replacement: path.resolve(import.meta.dirname, './lib/$1'),
      },
      {
        find: /^~\/components\/(.*)$/,
        replacement: path.resolve(import.meta.dirname, './components/$1'),
      },
      {
        find: /^~\/(.*)$/,
        replacement: path.resolve(import.meta.dirname, './app/$1'),
      },
    ],
  },
});
