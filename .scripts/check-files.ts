import { promises as fs } from 'node:fs';
import path from 'node:path';

import type { Metadata } from './types.ts';

const rootDir = process.cwd();
const sectionName = 'holotapes';
const metadataFileName = 'metadata.json';

function referencedPaths(metadata: Metadata): string[] {
  const paths = [metadata.icon, metadata.readme, ...(metadata.previews ?? [])];

  for (const entry of metadata.storage) {
    paths.push(entry.url, entry.previewMp3, entry.previewMp4);
  }
  for (const entry of metadata.storageOptional ?? []) {
    paths.push(entry.url, entry.previewMp3, entry.previewMp4);
  }
  for (const entry of metadata.customFirmwareFiles ?? []) {
    paths.push(entry.url, entry.previewMp3, entry.previewMp4);
  }
  return paths.filter((value) => typeof value === 'string');
}

// Check the filepath exists
async function exists(filePath: string): Promise<boolean> {
  return fs
    .access(filePath)
    .then(() => true)
    .catch(() => false);
}

async function checkHolotape(metadataFile: string): Promise<string[]> {
  const raw = await fs.readFile(metadataFile, 'utf8');
  const metadata = JSON.parse(raw) as Metadata;
  const holotapeDir = path.dirname(metadataFile);
  const source = path.relative(rootDir, metadataFile);

  const missing = await Promise.all(
    referencedPaths(metadata).map(async (relativePath) =>
      (await exists(path.join(holotapeDir, relativePath)))
        ? []
        : [`${source}: ${relativePath}`],
    ),
  );

  return missing.flat();
}

async function main(): Promise<void> {
  const sectionDir = path.join(rootDir, sectionName);
  const entries = await fs.readdir(sectionDir, { withFileTypes: true });
  const candidates = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(sectionDir, entry.name, metadataFileName));

  const metadataFiles: string[] = [];

  for (const candidate of candidates) {
    if (await exists(candidate)) {
      metadataFiles.push(candidate);
    }
  }

  const missing = (await Promise.all(metadataFiles.map(checkHolotape))).flat();

  for (const entry of missing.sort()) {
    process.stderr.write(`Missing file: ${entry}\n`);
  }

  process.stdout.write(
    `Checked ${metadataFiles.length} holotape` +
      `${metadataFiles.length === 1 ? '' : 's'}, ` +
      `${missing.length} missing file${missing.length === 1 ? '' : 's'}.\n`,
  );

  if (missing.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  const message =
    error instanceof Error ? (error.stack ?? error.message) : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
