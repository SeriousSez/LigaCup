import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';

await mkdir('.angular/scheduling-tests', { recursive: true });
await build({
  entryPoints: ['tests/scheduling.test.ts'],
  outfile: '.angular/scheduling-tests/tests.mjs',
  bundle: true,
  platform: 'node',
  format: 'esm',
  packages: 'external',
  tsconfig: 'tsconfig.json',
});
const result = spawnSync(process.execPath, ['--import', '@angular/compiler', '--test', '.angular/scheduling-tests/tests.mjs'], {
  stdio: 'inherit',
  env: { ...process.env, TZ: 'Europe/Copenhagen' },
});
process.exitCode = result.status ?? 1;
