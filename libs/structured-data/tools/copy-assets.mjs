import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const destination = join(root, 'libs/structured-data/src/assets');
const assets = [
  { packageName: 'web-tree-sitter', version: '0.27.0', file: 'web-tree-sitter.js',
    sha256: '7c49e3c1d87e24e0bb4c2def909d17154dfde281f5f8280225450090bb4b8110' },
  { packageName: 'web-tree-sitter', version: '0.27.0', file: 'web-tree-sitter.wasm',
    sha256: 'c03bccdc3b448a32848f5ae327e209c982bbb0840d43eec8bc2d5759544a1ed3' },
  { packageName: '@tree-sitter-grammars/tree-sitter-hcl', version: '1.2.0', file: 'tree-sitter-hcl.wasm',
    sha256: '86bb80cd151bd3ab1e44ed431a9c1874978db31519c62055efb50f028a1d0118' },
];

await mkdir(destination, { recursive: true });
for (const asset of assets) {
  const packageRoot = join(root, 'node_modules', asset.packageName);
  const packageManifest = JSON.parse(await readFile(join(packageRoot, 'package.json'), 'utf8'));
  if (packageManifest.version !== asset.version) throw new Error(`Unexpected ${asset.packageName} version`);
  const source = join(packageRoot, asset.file);
  const bytes = await readFile(source);
  if (createHash('sha256').update(bytes).digest('hex') !== asset.sha256) {
    throw new Error(`Unexpected ${asset.packageName}/${asset.file} content`);
  }
  await copyFile(source, join(destination, asset.file));
}
