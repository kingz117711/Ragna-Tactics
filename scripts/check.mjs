import { readdirSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
const files = readdirSync('src', { recursive: true }).filter(f => f.endsWith('.js')).map(f => resolve('src', f));
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (result.status) process.exit(result.status);
  const source = readFileSync(file, 'utf8');
  for (const [, path] of source.matchAll(/from\s+['"](\.[^'"]+)['"]/g)) {
    try { readFileSync(new URL(path, 'file:///' + file.replaceAll('\\', '/'))); } catch { console.error('Missing import', file, path); process.exit(1); }
  }
}
console.log(`Syntax and imports checked for ${files.length} modules.`);
