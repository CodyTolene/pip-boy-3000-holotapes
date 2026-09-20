/**
 * Shared helpers for verify steps: local bins and Node scripts.
 */
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const require = createRequire(import.meta.url);

/** Map CLI names to their package + package.json "bin" key. */
const BIN_PACKAGES: Record<string, { pkg: string; bin: string }> = {
  tsc: { pkg: 'typescript', bin: 'tsc' },
  eslint: { pkg: 'eslint', bin: 'eslint' },
  prettier: { pkg: 'prettier', bin: 'prettier' },
  ajv: { pkg: 'ajv-cli', bin: 'ajv' },
};

function resolveBinScript(command: string): string {
  const mapping = BIN_PACKAGES[command];
  if (!mapping) {
    throw new Error(`Unknown verify bin: ${command}`);
  }
  const pkgJsonPath = require.resolve(`${mapping.pkg}/package.json`);
  const pkg = require(pkgJsonPath) as {
    bin?: string | Record<string, string>;
  };
  const binField = pkg.bin;
  const relative =
    typeof binField === 'string' ? binField : binField?.[mapping.bin];
  if (!relative) {
    throw new Error(`No bin "${mapping.bin}" in ${mapping.pkg}`);
  }
  return path.join(path.dirname(pkgJsonPath), relative);
}

/**
 * Run a CLI from node_modules (tsc, eslint, prettier, ajv, ...).
 * Spawns Node on the package bin script so Windows needs no shell/.cmd shim.
 */
export function runBin(
  label: string,
  command: string,
  args: string[],
): Promise<void> {
  process.stdout.write(`\n==> ${label}\n`);
  const script = resolveBinScript(command);

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...args], {
      stdio: 'inherit',
      cwd: process.cwd(),
      env: process.env,
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${label} failed with exit code ${code ?? 1}`));
    });
  });
}

/**
 * Run a repository TypeScript script with the current Node binary.
 */
export function runNodeScript(
  label: string,
  scriptPath: string,
): Promise<void> {
  process.stdout.write(`\n==> ${label}\n`);

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath], {
      stdio: 'inherit',
      cwd: process.cwd(),
      env: process.env,
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${label} failed with exit code ${code ?? 1}`));
    });
  });
}
