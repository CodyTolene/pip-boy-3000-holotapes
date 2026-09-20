import process from 'node:process';

import { runBin } from './run-command.ts';

export async function runFormatCheck(): Promise<void> {
  try {
    await runBin('format:check', 'prettier', ['--check', '.']);
  } catch (error: unknown) {
    process.stderr.write(
      '\nFormatting check failed. Run `npm run format` to fix it, then commit again.\n',
    );
    throw error;
  }
}
