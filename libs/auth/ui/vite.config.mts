/// <reference types='vitest' />
import { defineConfig, mergeConfig } from 'vitest/config';
import { createBaseViteConfig } from '../../../vite.config.base';

export default defineConfig(() =>
  mergeConfig(
    createBaseViteConfig({
      dirname: __dirname,
      name: 'auth-ui',
    }),
    {
      test: {
        // Angular test hooks and per-file Firebase mocks need process isolation;
        // vmThreads can reuse ESM state across test-file contexts.
        pool: 'forks',
        maxWorkers: 1,
      },
    },
  ),
);
