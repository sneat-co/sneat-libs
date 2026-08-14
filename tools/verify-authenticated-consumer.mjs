import { spawnSync } from 'node:child_process';
import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const workspaceRoot = process.cwd();
const temporaryRoot = mkdtempSync(join(tmpdir(), 'sneat-auth-consumer-'));
const artifacts = join(temporaryRoot, 'artifacts');
const consumer = join(temporaryRoot, 'consumer');
mkdirSync(artifacts);
mkdirSync(join(consumer, 'src'), { recursive: true });

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, CI: 'true' },
  });
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(' ')} failed in ${cwd}\n` +
        `${result.stdout ?? ''}${result.stderr ?? ''}`,
    );
  }
  return result.stdout;
}

function pack(project, archive) {
  const packageDirectory = join(workspaceRoot, 'dist', 'libs', project);
  const destination = join(artifacts, archive);
  run('pnpm', ['pack', '--out', destination], packageDirectory);
  return `file:${destination}`;
}

try {
  const localPackages = {
    '@sneat/api-public': pack('api-public', 'api-public.tgz'),
    '@sneat/api-firebase-auth': pack(
      'api-firebase-auth',
      'api-firebase-auth.tgz',
    ),
    '@sneat/api': pack('api', 'api.tgz'),
    '@sneat/app-public': pack('app-public', 'app-public.tgz'),
    '@sneat/app-auth': pack('app-auth', 'app-auth.tgz'),
    '@sneat/auth-models': pack('auth/models', 'auth-models.tgz'),
    '@sneat/auth-core': pack('auth/core', 'auth-core.tgz'),
    '@sneat/core-public': pack('core-public', 'core-public.tgz'),
    '@sneat/core': pack('core', 'core.tgz'),
    '@sneat/dto': pack('dto', 'dto.tgz'),
    '@sneat/logging': pack('logging', 'logging.tgz'),
  };
  writeFileSync(
    join(consumer, 'package.json'),
    `${JSON.stringify(
      {
        name: 'sneat-authenticated-bootstrap-consumer',
        version: '0.0.0',
        private: true,
        type: 'module',
        packageManager: 'pnpm@10.30.3',
        dependencies: {
          '@angular/animations': '21.2.0',
          '@angular/common': '21.2.0',
          '@angular/core': '21.2.0',
          '@angular/fire': '20.0.1',
          '@angular/platform-browser': '21.2.0',
          '@angular/router': '21.2.0',
          '@capacitor-firebase/authentication': '8.1.0',
          '@capacitor/core': '8.1.0',
          '@firebase/firestore-types': '3.0.3',
          '@ionic/angular': '8.7.18',
          '@ionic/core': '8.7.18',
          '@sentry/angular': '10.41.0',
          '@sentry/browser': '10.41.0',
          '@sneat/random': '0.0.4',
          ...localPackages,
          firebase: '12.10.0',
          'posthog-js': '1.357.0',
          rxjs: '7.8.2',
          tslib: '2.8.1',
        },
        devDependencies: {
          '@angular/compiler': '21.2.0',
          '@angular/compiler-cli': '21.2.0',
          typescript: '5.9.3',
        },
      },
      null,
      2,
    )}\n`,
  );
  writeFileSync(
    join(consumer, 'tsconfig.json'),
    `${JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          module: 'ES2022',
          moduleResolution: 'bundler',
          lib: ['ES2022', 'DOM'],
          outDir: 'dist',
          strict: true,
          skipLibCheck: false,
        },
        angularCompilerOptions: {
          strictInjectionParameters: true,
          strictTemplates: true,
        },
        files: ['src/main.ts'],
      },
      null,
      2,
    )}\n`,
  );
  writeFileSync(
    join(consumer, 'src', 'main.ts'),
    `import { Component } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideSneatAuthenticatedProviders } from '@sneat/app-auth';
import { provideAppInfo, provideSneatPublicBootstrap } from '@sneat/app-public';
import { IEnvironmentConfig } from '@sneat/core';

const environment: IEnvironmentConfig = {
  production: true,
  agents: {},
  firebaseConfig: {
    projectId: 'consumer',
    appId: 'consumer',
    apiKey: 'consumer',
  },
};

@Component({ selector: 'sneat-auth-test', standalone: true, template: 'Auth' })
class AuthenticatedConsumerComponent {}

void bootstrapApplication(AuthenticatedConsumerComponent, {
  providers: [
    provideRouter([]),
    provideSneatPublicBootstrap(),
    provideAppInfo({ appId: 'consumer', appTitle: 'Auth consumer' }),
    provideSneatAuthenticatedProviders(environment),
  ],
});
`,
  );

  run(
    'pnpm',
    [
      'install',
      '--prefer-offline',
      '--ignore-scripts',
      '--config.auto-install-peers=false',
    ],
    consumer,
  );
  run('pnpm', ['exec', 'ngc', '-p', 'tsconfig.json'], consumer);
  console.log(
    'Packed, installed, and Angular-compiled a clean temporary authenticated consumer.',
  );
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}
