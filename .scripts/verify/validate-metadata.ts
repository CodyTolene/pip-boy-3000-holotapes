import { runBin } from './run-command.ts';

export async function runValidateMetadata(): Promise<void> {
  // Glob is for ajv-cli itself; do not let the shell expand it.
  await runBin('validate-metadata', 'ajv', [
    'validate',
    '-s',
    '.scripts/metadata.schema.json',
    '-d',
    'holotapes/*/metadata.json',
    '--all-errors',
  ]);
}
