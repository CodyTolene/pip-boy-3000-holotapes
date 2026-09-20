import { runBin } from './run-command.ts';

export async function runTypecheck(): Promise<void> {
  await runBin('typecheck (holotapes)', 'tsc', ['--noEmit']);
  await runBin('typecheck (.scripts)', 'tsc', [
    '--noEmit',
    '--project',
    '.scripts/tsconfig.json',
  ]);
}
