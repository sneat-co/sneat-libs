import { ViteUserConfig } from 'vitest/config';
import angular from '@analogjs/vite-plugin-angular';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { join } from 'path';

export interface BaseViteConfigOptions {
  dirname: string;
  name: string;
  reportsDirectory?: string;
}

export function createBaseViteConfig(
  options: BaseViteConfigOptions,
): ViteUserConfig {
  const { dirname, name, reportsDirectory } = options;

  // Better way to calculate relative path to root based on distance from root
  const rootPath = process.cwd();
  const relativeToRoot = join(
    dirname,
    Array(dirname.replace(rootPath, '').split('/').filter(Boolean).length)
      .fill('..')
      .join('/'),
    'node_modules/.vite',
    dirname.replace(rootPath, ''),
  );
  const coverageDir = join(
    dirname,
    Array(dirname.replace(rootPath, '').split('/').filter(Boolean).length)
      .fill('..')
      .join('/'),
    'coverage',
    dirname.replace(rootPath, ''),
  );

  return {
    root: dirname,
    cacheDir: relativeToRoot,
    resolve: {
      dedupe: [
        '@angular/core',
        '@angular/common',
        '@angular/common/http',
        '@angular/platform-browser',
        '@angular/platform-browser-dynamic',
        '@angular/router',
        '@angular/cdk',
        '@angular/material',
        'rxjs',
      ],
      alias: [
        //				{
        //					find: '@ionic/core/components',
        //					replacement: '@ionic/core/components/index.js',
        //				},
        // TRANSITIONAL — see the 0.27.0 `@angular/fire` removal.
        //
        // sneat-libs itself no longer imports `@angular/fire` anywhere, and the
        // package is gone from every package.json. One npm dependency still
        // does: the precompiled `@sneat/extension-contactus-ui` bundle (0.13.9,
        // the newest published, still peer-depends on `@angular/fire@^20`) does
        // `import { Firestore } from '@angular/fire/firestore'` and then
        // `inject(Firestore)`.
        //
        // @angular/fire's `Firestore` is a pure pass-through DI shim —
        // `class Firestore { constructor(firestore) { return firestore; } }` —
        // over the modular SDK's real `Firestore` class, so pointing the
        // specifier straight at `firebase/firestore` hands that bundle the same
        // class sneat-libs now provides. That makes the DI token identical
        // instead of merely similar, which is what lets its `inject(Firestore)`
        // resolve against `provideSneatFirebase()`.
        //
        // This alias only covers THIS workspace's builds and tests. Consuming
        // apps that use @sneat/extension-contactus-ui need the same alias in
        // their own bundler config until a fire-free contactus-ui is published
        // — which is the real fix. See the PR body.
        {
          find: /^@angular\/fire\/firestore$/,
          replacement: 'firebase/firestore',
        },
      ],
    },
    plugins: [
      angular({
        // AOT (jit: false) so that precompiled Angular packages consumed from
        // npm (e.g. @sneat/extension-contactus-*, shipped as ɵɵngDeclare partial
        // declarations) are linked consistently with workspace source libs.
        // Under jit: true their factory defs clash with analog-JIT base classes
        // ("Cannot set property ɵfac which has only a getter").
        jit: false,
        tsconfig: './tsconfig.spec.json',
      }),
      nxViteTsPaths(),
    ],
    test: {
      name,
      watch: false,
      globals: true,
      pool: 'vmThreads',
      environment: 'happy-dom',
      include: ['src/**/*.spec.ts'],
      setupFiles: [join(dirname, 'src/test-setup.ts')],
      reporters: ['default'],
      // Suppress console traces to avoid verbose debug output in CI logs
      printConsoleTrace: false,
      coverage: {
        enabled: true,
        reportsDirectory: reportsDirectory || coverageDir,
        provider: 'v8' as const,
        reporter: ['text', 'json', 'json-summary', 'html', 'lcov'],

        include: ['src/**/*.ts'],
        exclude: [
          'src/**/*.spec.ts',
          'src/**/test-setup.ts',
          'src/**/*.stories.ts',
          'src/**/index.ts',
        ],
        // Coverage thresholds set to (min across all projects - 1%) as of Feb 2026
        // Worst: scrumspace/dailyscrum (lines: 19.57%, stmts: 20.52%, funcs: 10%)
        //        debtus/shared & logist-app (branches: 0%)
        // TODO: Gradually increase these thresholds as test coverage improves
        // Target: lines: 35%, functions: 35%, branches: 30%, statements: 35%
        thresholds: {
          lines: 18,
          statements: 19,
          branches: 0,
          functions: 9,
        },
      },
      server: {
        deps: {
          inline: [
            '@ionic/angular',
            /@angular\//,
            /@stencil\//,
            /tslib/,
            // Inline the precompiled @sneat/extension-contactus-* packages
            // consumed from npm so Vite (via nxViteTsPaths) resolves their
            // `@sneat/*` workspace imports; otherwise Node's resolver fails on
            // the externalized .mjs ("Cannot find package '@sneat/core'").
            /@sneat\/extension-contactus-/,
          ],
        },
      },
    },
  } as ViteUserConfig;
}
