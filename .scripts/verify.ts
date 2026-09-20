/**
 * Project verification entry point (`npm run verify`).
 *
 * Runs every check contributors and CI need:
 *   1. Holotape layout + icon rules
 *   2. TypeScript typecheck (holotapes + `.scripts`)
 *   3. ESLint
 *   4. Prettier check
 *   5. metadata.json schema validation
 *   6. Production build (needed before the artifact file check)
 *   7. Dist artifact file / id checks
 *
 * Pre-commit (husky) and GitHub Actions both call `npm run verify`.
 * Failures exit non-zero so hooks and CI stop the commit / job.
 */
import process from 'node:process';

import { runFormatCheck } from './verify/format-check.ts';
import { runLint } from './verify/lint.ts';
import { runNodeScript } from './verify/run-command.ts';
import { runTypecheck } from './verify/typecheck.ts';
import { runValidateMetadata } from './verify/validate-metadata.ts';

async function main(): Promise<void> {
  await runNodeScript('check-layout', '.scripts/verify/check-layout.ts');
  await runTypecheck();
  await runLint();
  await runFormatCheck();
  await runValidateMetadata();
  await runNodeScript('toolchain', '.scripts/verify/toolchain.ts');
  // Build is also `npm run build`. Verify runs it so check-files can inspect dist/.
  await runNodeScript('build', '.scripts/build.ts');
  await runNodeScript('check-files', '.scripts/verify/check-files.ts');
  process.stdout.write('\nVerify passed.\n');
}

main().catch((error: unknown) => {
  const message =
    error instanceof Error ? (error.stack ?? error.message) : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
