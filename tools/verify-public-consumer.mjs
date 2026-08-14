import { spawnSync } from 'node:child_process';
import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const workspaceRoot = process.cwd();
const temporaryRoot = mkdtempSync(join(tmpdir(), 'sneat-public-consumer-'));
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
    '@sneat/app-public': pack('app-public', 'app-public.tgz'),
    '@sneat/core-public': pack('core-public', 'core-public.tgz'),
  };
  writeFileSync(
    join(consumer, 'package.json'),
    `${JSON.stringify(
      {
        name: 'sneat-public-bootstrap-consumer',
        version: '0.0.0',
        private: true,
        type: 'module',
        packageManager: 'pnpm@10.30.3',
        dependencies: {
          '@angular/common': '21.2.0',
          '@angular/core': '21.2.0',
          '@angular/platform-browser': '21.2.0',
          '@angular/router': '21.2.0',
          ...localPackages,
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
import { SneatApiService } from '@sneat/api-public';
import { provideAppInfo, provideSneatPublicBootstrap } from '@sneat/app-public';

@Component({ selector: 'sneat-public-test', standalone: true, template: 'Public' })
class PublicConsumerComponent {
  constructor(readonly api: SneatApiService) {}
}

void bootstrapApplication(PublicConsumerComponent, {
  providers: [
    provideRouter([]),
    provideSneatPublicBootstrap(),
    provideAppInfo({ appId: 'consumer', appTitle: 'Public consumer' }),
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
    'Packed, installed, and Angular-compiled a clean temporary public consumer.',
  );
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}
