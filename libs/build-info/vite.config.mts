/// <reference types='vitest' />
// Bespoke, minimal vitest config — this project is plain ESM Node (no
// Angular/DOM surface), so it deliberately does not use the workspace's
// shared createBaseViteConfig() (vite.config.base.ts), which wires the
// Angular AOT/JIT plugin and a happy-dom environment neither of which apply
// here. Specs live next to the script as bin/*.spec.mjs rather than under
// src/**/*.spec.ts because the thing under test is the published .mjs bin
// itself, not a TypeScript source that gets compiled away.
import { defineConfig } from 'vitest/config';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';

export default defineConfig({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/libs/build-info',
  plugins: [nxViteTsPaths()],
  test: {
    name: 'build-info',
    watch: false,
    globals: true,
    environment: 'node',
    include: ['bin/**/*.spec.mjs'],
    reporters: ['default'],
    coverage: {
      enabled: true,
      reportsDirectory: '../../coverage/libs/build-info',
      provider: 'v8',
      reporter: ['text', 'json', 'json-summary', 'html', 'lcov'],
      include: ['bin/**/*.mjs'],
      exclude: ['bin/**/*.spec.mjs'],
      thresholds: {
        lines: 18,
        statements: 19,
        branches: 0,
        functions: 9,
      },
    },
  },
});
