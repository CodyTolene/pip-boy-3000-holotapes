import { runBin } from './run-command.ts';

export async function runLint(): Promise<void> {
  await runBin('lint', 'eslint', ['.']);
}
