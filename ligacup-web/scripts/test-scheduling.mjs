import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { mkdir, readdir } from 'node:fs/promises';
import ts from 'typescript';
import { constructorParametersDownlevelTransform } from '@angular/compiler-cli/private/tooling';

await mkdir('.angular/scheduling-tests', { recursive: true });
const tests = (await readdir('tests')).filter((file) => file.endsWith('.test.ts'));
// Angular's JIT transform supplies signal-input metadata, needed for rendered regression tests.
const config = ts.getParsedCommandLineOfConfigFile('tsconfig.json', {
  noEmit: false, declaration: false, sourceMap: false, module: ts.ModuleKind.ESNext,
}, { ...ts.sys, onUnRecoverableConfigFileDiagnostic: (error) => { throw new Error(ts.flattenDiagnosticMessageText(error.messageText, '\n')); } });
const program = ts.createProgram(tests.map((file) => `tests/${file}`), config.options);
await build({
  entryPoints: tests.map((file) => `tests/${file}`),
  outdir: '.angular/scheduling-tests',
  outExtension: { '.js': '.mjs' },
  bundle: true,
  platform: 'node',
  format: 'esm',
  packages: 'external',
  tsconfig: 'tsconfig.json',
  plugins: [{ name: 'angular-jit-tests', setup(build) {
    build.onLoad({ filter: /\.ts$/ }, ({ path }) => {
      const source = program.getSourceFile(path);
      if (!source) return;
      let contents;
      program.emit(source, (name, text) => { if (name.endsWith('.js')) contents = text; }, undefined, false,
        { before: [constructorParametersDownlevelTransform(program)] });
      return contents === undefined ? undefined : { contents, loader: 'js' };
    });
  } }],
});
const result = spawnSync(process.execPath, ['--import', '@angular/compiler', '--test',
  ...tests.map((file) => `.angular/scheduling-tests/${file.replace(/\.ts$/, '.mjs')}`)], {
  stdio: 'inherit',
  env: { ...process.env, TZ: 'Europe/Copenhagen' },
});
process.exitCode = result.status ?? 1;
