import { cp, mkdir, rm } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const { convertTerrain } = await import('./convert-terrain.mjs');
const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const output = resolve(root, 'dist');
// Bake the authored Tiled terrain into the runtime layout before copying assets.
convertTerrain();
if (output !== root + sep + 'dist') throw new Error('Refusing to clean a path outside the project build directory.');
await rm(output, { recursive: true, force: true });
await mkdir(output);
await cp(resolve(root, 'index.html'), resolve(output, 'index.html'));
await cp(resolve(root, 'src'), resolve(output, 'src'), { recursive: true });
await cp(resolve(root, 'public/assets'), resolve(output, 'assets'), { recursive: true });
await cp(resolve(root, 'ASSET-CREDITS.md'), resolve(output, 'ASSET-CREDITS.md'));
await cp(resolve(root, 'licenses'), resolve(output, 'licenses'), { recursive:true });
await mkdir(resolve(output,'docs'),{recursive:true});
await cp(resolve(root,'docs/RENEWAL-SYSTEM.md'),resolve(output,'docs/RENEWAL-SYSTEM.md'));
console.log('Built dist/: index, modules, local assets, asset credits, and third-party notices.');
