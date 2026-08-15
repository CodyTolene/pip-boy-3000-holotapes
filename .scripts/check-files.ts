import { promises as fs } from 'node:fs';
import path from 'node:path';

import type { HolotapeCheck, RawMetadata } from './types.ts';

const rootDir = process.cwd();
const sectionName = 'holotapes';
const metadataFileName = 'metadata.json';

function referencedPaths(metadata: RawMetadata): string[] {
  const paths = [metadata.icon, metadata.readme, ...(metadata.previews ?? [])];

  for (const entry of metadata.storage ?? []) {
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

// Check for case-sensitivity and that the filepath exists
async function existsExact(
  baseDir: string,
  relativePath: string,
): Promise<boolean> {
  const segments = relativePath.split(/[/\\]/).filter((s) => s.length > 0);

  if (segments.length === 0) {
    return false;
  }

  let currentDir = baseDir;

  for (const segment of segments) {
    const entries = await fs.readdir(currentDir).catch(() => undefined);

    if (!entries?.includes(segment)) {
      return false;
    }

    currentDir = path.join(currentDir, segment);
  }

  return true;
}

async function checkHolotape(metadataFile: string): Promise<HolotapeCheck> {
  const raw = await fs.readFile(metadataFile, 'utf8');
  const metadata: RawMetadata = JSON.parse(raw);
  const holotapeDir = path.dirname(metadataFile);
  const source = path.relative(rootDir, metadataFile);

  const missing = await Promise.all(
    referencedPaths(metadata).map(async (relativePath) =>
      (await existsExact(holotapeDir, relativePath))
        ? []
        : [`${source}: ${relativePath}`],
    ),
  );

  return { id: metadata.id, missing: missing.flat(), source };
}

// Check for duplicate ids
function duplicateIds(results: HolotapeCheck[]): string[] {
  const sourcesById = new Map<string, string[]>();

  for (const { id, source } of results) {
    if (id === undefined) {
      continue;
    }

    const sources = sourcesById.get(id);

    if (sources) {
      sources.push(source);
    } else {
      sourcesById.set(id, [source]);
    }
  }

  return [...sourcesById.entries()]
    .filter(([, sources]) => sources.length > 1)
    .map(([id, sources]) => `${id} (${sources.sort().join(', ')})`)
    .sort();
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

  const results = await Promise.all(metadataFiles.map(checkHolotape));
  const missing = results.flatMap((result) => result.missing);
  const duplicates = duplicateIds(results);

  for (const entry of missing.sort()) {
    process.stderr.write(`Missing file: ${entry}\n`);
  }

  for (const entry of duplicates) {
    process.stderr.write(`Duplicate id: ${entry}\n`);
  }

  process.stdout.write(
    `Checked ${metadataFiles.length} holotape` +
      `${metadataFiles.length === 1 ? '' : 's'}, ` +
      `${missing.length} missing file${missing.length === 1 ? '' : 's'}, ` +
      `${duplicates.length} duplicate id${duplicates.length === 1 ? '' : 's'}.\n`,
  );

  if (missing.length > 0 || duplicates.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  const message =
    error instanceof Error ? (error.stack ?? error.message) : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
