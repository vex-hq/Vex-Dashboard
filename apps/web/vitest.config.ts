import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    // Server-side loaders/actions (`*.test.ts`) run under 'node' — most of
    // this app's test suite is Postgres-backed and has no business paying
    // for a DOM. Client components need jsdom to render; rather than
    // flipping the whole suite over (which would change node-only globals
    // for every `pg`-backed test), opt individual `*.test.tsx` files in
    // with a `// @vitest-environment jsdom` docblock at the top of the file.
    environment: 'node',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/*.test.ts', '**/*.test.tsx'],
    exclude: ['node_modules/**', '.next/**', 'venv/**'],
  },
  resolve: {
    // Workspace packages (e.g. `@kit/ui`) are pnpm symlinks with no local
    // `react` of their own — they rely on the consuming app's copy. Without
    // this, Vite resolves the symlink to its real path under `packages/ui`
    // and then walks up from there for bare imports, missing `apps/web`'s
    // `node_modules/react` entirely.
    preserveSymlinks: true,
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
