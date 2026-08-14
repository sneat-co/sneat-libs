import { builtinModules, createRequire } from 'node:module';
import {
  existsSync,
  readdirSync,
  readFileSync,
  realpathSync,
  statSync,
} from 'node:fs';
import { dirname, extname, join, resolve, sep } from 'node:path';
import ts from 'typescript';

const workspaceRoot = process.cwd();
const distRoot = join(workspaceRoot, 'dist', 'libs');
const publicPackageName = '@sneat/app-public';
const packagesToAudit = [
  '@sneat/api-public',
  '@sneat/core-public',
  '@sneat/api-firebase-auth',
  '@sneat/app-public',
  '@sneat/app-auth',
  '@sneat/app-ionic',
  '@sneat/auth-core',
  '@sneat/auth-models',
  '@sneat/dto',
  '@sneat/logging',
  '@sneat/api',
  '@sneat/core',
  '@sneat/app',
];
const forbidden = [
  ['Ionic', (specifier) => specifier === '@ionic' || specifier.startsWith('@ionic/')],
  ['AngularFire', (specifier) => specifier === '@angular/fire' || specifier.startsWith('@angular/fire/')],
  ['Firebase', (specifier) => specifier === 'firebase' || specifier.startsWith('firebase/') || specifier.startsWith('@firebase/')],
  ['Sentry', (specifier) => specifier === '@sentry' || specifier.startsWith('@sentry/')],
  ['PostHog', (specifier) => specifier === 'posthog-js' || specifier.startsWith('posthog-js/')],
  ['authenticated bootstrap', (specifier) => specifier === '@sneat/app-auth' || specifier.startsWith('@sneat/app-auth/') || specifier === '@sneat/api-firebase-auth' || specifier.startsWith('@sneat/api-firebase-auth/')],
  ['Ionic bootstrap', (specifier) => specifier === '@sneat/app-ionic' || specifier.startsWith('@sneat/app-ionic/')],
  ['the logging/analytics barrel', (specifier) => specifier === '@sneat/logging' || specifier.startsWith('@sneat/logging/')],
  ['Angular animations', (specifier) => specifier === '@angular/animations' || specifier.startsWith('@angular/animations/') || specifier.startsWith('@angular/platform-browser/animations')],
  ['the broad @sneat/api barrel', (specifier) => specifier === '@sneat/api' || specifier.startsWith('@sneat/api/')],
  ['the broad @sneat/core barrel', (specifier) => specifier === '@sneat/core' || specifier.startsWith('@sneat/core/')],
];
const builtins = new Set([
  ...builtinModules,
  ...builtinModules.map((name) => `node:${name}`),
]);

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

function collectPackageDirectories(root) {
  const result = [];
  function visit(directory) {
    if (!existsSync(directory)) return;
    const packageJson = join(directory, 'package.json');
    if (existsSync(packageJson)) {
      result.push(directory);
      return;
    }
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory()) visit(join(directory, entry.name));
    }
  }
  visit(root);
  return result;
}

function packageRecord(directory, workspace = false) {
  const packageJsonPath = join(directory, 'package.json');
  return {
    directory: realpathSync(directory),
    manifest: readJson(packageJsonPath),
    packageJsonPath,
    workspace,
  };
}

const workspacePackages = new Map(
  collectPackageDirectories(distRoot).map((directory) => {
    const record = packageRecord(directory, true);
    return [record.manifest.name, record];
  }),
);

function packageNameOf(specifier) {
  if (specifier.startsWith('@')) return specifier.split('/').slice(0, 2).join('/');
  return specifier.split('/')[0];
}

function checkForbidden(specifier, chain) {
  for (const [label, matches] of forbidden) {
    if (matches(specifier)) {
      throw new Error(
        `Public bootstrap graph reached forbidden ${label}: ${specifier}\n` +
          `Import chain: ${chain.join(' -> ')}`,
      );
    }
  }
}

function emittedJavaScriptFiles(directory) {
  const result = [];
  function visit(current) {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const file = join(current, entry.name);
      if (entry.isDirectory()) visit(file);
      else if (entry.isFile() && ['.js', '.mjs', '.cjs'].includes(extname(file))) {
        result.push(file);
      }
    }
  }
  visit(directory);
  return result;
}

function staticImports(file) {
  const source = ts.createSourceFile(
    file,
    readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    false,
    ts.ScriptKind.JS,
  );
  const imports = [];
  for (const statement of source.statements) {
    if (
      (ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)) &&
      statement.moduleSpecifier &&
      ts.isStringLiteral(statement.moduleSpecifier)
    ) {
      imports.push(statement.moduleSpecifier.text);
    } else if (
      ts.isImportEqualsDeclaration(statement) &&
      ts.isExternalModuleReference(statement.moduleReference) &&
      statement.moduleReference.expression &&
      ts.isStringLiteral(statement.moduleReference.expression)
    ) {
      imports.push(statement.moduleReference.expression.text);
    }
  }
  return imports;
}

function dependencyNames(manifest) {
  return new Set([
    ...Object.keys(manifest.dependencies ?? {}),
    ...Object.keys(manifest.peerDependencies ?? {}),
    ...Object.keys(manifest.optionalDependencies ?? {}),
  ]);
}

function validateManifestImport(record, specifier, file) {
  if (
    specifier.startsWith('.') ||
    specifier.startsWith('/') ||
    specifier.startsWith('#') ||
    builtins.has(specifier)
  ) {
    return;
  }
  const importedPackage = packageNameOf(specifier);
  if (importedPackage === record.manifest.name) return;
  if (!dependencyNames(record.manifest).has(importedPackage)) {
    throw new Error(
      `${record.manifest.name} emits an undeclared runtime import ` +
        `${specifier} in ${file.slice(record.directory.length + 1)}`,
    );
  }
}

for (const name of packagesToAudit) {
  const record = workspacePackages.get(name);
  if (!record) throw new Error(`Build output missing for manifest audit: ${name}`);
  for (const file of emittedJavaScriptFiles(record.directory)) {
    for (const specifier of staticImports(file)) {
      validateManifestImport(record, specifier, file);
    }
  }
}

function resolveLocalFile(fromFile, specifier) {
  const base = resolve(dirname(fromFile), specifier);
  const candidates = [
    base,
    `${base}.js`,
    `${base}.mjs`,
    `${base}.cjs`,
    join(base, 'index.js'),
    join(base, 'index.mjs'),
    join(base, 'index.cjs'),
  ];
  const found = candidates.find(
    (candidate) => existsSync(candidate) && statSync(candidate).isFile(),
  );
  if (!found) {
    throw new Error(`Unable to resolve emitted import ${specifier} from ${fromFile}`);
  }
  return realpathSync(found);
}

function pickExport(value) {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    for (const candidate of value) {
      const selected = pickExport(candidate);
      if (selected) return selected;
    }
    return undefined;
  }
  if (!value || typeof value !== 'object') return undefined;
  for (const condition of [
    'es2022',
    'esm2022',
    'browser',
    'import',
    'module',
    'default',
  ]) {
    const selected = pickExport(value[condition]);
    if (selected) return selected;
  }
  return undefined;
}

function packageSubpath(packageName, specifier) {
  return specifier === packageName
    ? '.'
    : `.${specifier.slice(packageName.length)}`;
}

function entryFromManifest(record, specifier) {
  const subpath = packageSubpath(record.manifest.name, specifier);
  let relative;
  if (record.manifest.exports) {
    const exportValue =
      subpath === '.' && !record.manifest.exports['.']
        ? record.manifest.exports
        : record.manifest.exports[subpath];
    relative = pickExport(exportValue);
  }
  if (!relative && subpath === '.') {
    relative =
      record.manifest.module ?? record.manifest.es2022 ?? record.manifest.main;
  }
  if (!relative) return undefined;
  return resolveLocalFile(join(record.directory, 'package.json'), relative);
}

const externalPackageCache = new Map();

function findExternalPackage(specifier, fromFile) {
  const name = packageNameOf(specifier);
  const cacheKey = `${dirname(fromFile)}\0${name}`;
  if (externalPackageCache.has(cacheKey)) {
    return externalPackageCache.get(cacheKey);
  }
  const require = createRequire(fromFile);
  let packageJsonPath;
  try {
    packageJsonPath = require.resolve(`${name}/package.json`);
  } catch {
    let entry;
    try {
      entry = require.resolve(name);
    } catch (error) {
      throw new Error(`Unable to resolve package ${name} imported by ${fromFile}`, {
        cause: error,
      });
    }
    let current = dirname(realpathSync(entry));
    while (current !== dirname(current)) {
      const candidate = join(current, 'package.json');
      if (existsSync(candidate) && readJson(candidate).name === name) {
        packageJsonPath = candidate;
        break;
      }
      current = dirname(current);
    }
  }
  if (!packageJsonPath) {
    throw new Error(`Unable to locate package.json for ${name}`);
  }
  const record = packageRecord(dirname(packageJsonPath));
  externalPackageCache.set(cacheKey, record);
  return record;
}

const visitedFiles = new Set();
const visitedPackages = new Set();

function visitPackageDependencies(record, chain) {
  const identity = record.packageJsonPath;
  if (visitedPackages.has(identity)) return;
  visitedPackages.add(identity);
  const productionDependencies = {
    ...(record.manifest.dependencies ?? {}),
    ...(record.manifest.optionalDependencies ?? {}),
  };
  for (const dependency of Object.keys(productionDependencies)) {
    checkForbidden(dependency, [...chain, `${record.manifest.name} dependency`]);
    const dependencyRecord =
      workspacePackages.get(dependency) ??
      findExternalPackage(dependency, join(record.directory, 'package.json'));
    const entry = entryFromManifest(dependencyRecord, dependency);
    if (entry) visitFile(entry, dependencyRecord, [...chain, dependency]);
    visitPackageDependencies(dependencyRecord, [...chain, dependency]);
  }
}

function resolvePackageImport(specifier, fromFile) {
  const name = packageNameOf(specifier);
  const record =
    workspacePackages.get(name) ?? findExternalPackage(specifier, fromFile);
  const entry = entryFromManifest(record, specifier);
  if (entry) return { entry, record };
  const require = createRequire(fromFile);
  try {
    return { entry: realpathSync(require.resolve(specifier)), record };
  } catch (error) {
    throw new Error(`Unable to resolve ${specifier} from ${fromFile}`, {
      cause: error,
    });
  }
}

function visitFile(file, owner, chain) {
  file = realpathSync(file);
  if (visitedFiles.has(file)) return;
  visitedFiles.add(file);
  if (!['.js', '.mjs', '.cjs'].includes(extname(file))) return;
  for (const specifier of staticImports(file)) {
    checkForbidden(specifier, [...chain, specifier]);
    if (specifier.startsWith('.') || specifier.startsWith('/')) {
      const target = resolveLocalFile(file, specifier);
      if (!target.startsWith(`${owner.directory}${sep}`)) {
        throw new Error(`Relative import escaped ${owner.manifest.name}: ${target}`);
      }
      visitFile(target, owner, [...chain, specifier]);
      continue;
    }
    if (specifier.startsWith('#')) {
      const require = createRequire(file);
      visitFile(realpathSync(require.resolve(specifier)), owner, [
        ...chain,
        specifier,
      ]);
      continue;
    }
    if (builtins.has(specifier)) continue;
    if (owner.workspace) validateManifestImport(owner, specifier, file);
    const resolved = resolvePackageImport(specifier, file);
    visitFile(resolved.entry, resolved.record, [...chain, specifier]);
    visitPackageDependencies(resolved.record, [...chain, specifier]);
  }
  visitPackageDependencies(owner, chain);
}

const publicPackage = workspacePackages.get(publicPackageName);
if (!publicPackage) {
  throw new Error(`Build output missing for ${publicPackageName}`);
}
const publicEntry = entryFromManifest(publicPackage, publicPackageName);
if (!publicEntry) {
  throw new Error(`No emitted JavaScript entrypoint for ${publicPackageName}`);
}
visitFile(publicEntry, publicPackage, [publicPackageName]);

console.log(
  `Audited emitted imports for ${packagesToAudit.length} built package manifests. ` +
    `Verified ${visitedFiles.size} emitted/static JavaScript files across ` +
    `${visitedPackages.size} production packages; the ${publicPackageName} ` +
    'closure is Firebase-, Ionic-, analytics-, Sentry-, PostHog-, and animations-free.',
);
