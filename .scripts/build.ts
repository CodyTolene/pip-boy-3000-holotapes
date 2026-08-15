import { promises as fs } from 'node:fs';
import path from 'node:path';

import type { RawMetadata, StorageEntry } from './types.ts';

const rootDir = process.cwd();
const sectionName = 'holotapes';
const registryFileName = 'registry.json';

function normalizePath(value: string): string {
  return value.replaceAll('\\', '/');
}

function joinWebPath(...parts: string[]): string {
  return normalizePath(parts.join('/').replaceAll(/\/+/g, '/'));
}

function isRelativeAssetPath(value: string): boolean {
  return value.length > 0 && !value.startsWith('/') && !/^[a-z]+:/i.test(value);
}

// Overload so that undefined is preserved as a return type, it is a valid
// input and output value for optional fields.
function prefixAssetPath(value: string, entryDir: string): string;
function prefixAssetPath(
  value: string | undefined,
  entryDir: string,
): string | undefined;
function prefixAssetPath(
  value: string | undefined,
  entryDir: string,
): string | undefined {
  if (value === undefined || !isRelativeAssetPath(value)) {
    return value;
  }

  return joinWebPath(entryDir, value);
}

function rewriteStorage(
  storage: StorageEntry[] | undefined,
  entryDir: string,
): StorageEntry[] | undefined {
  if (!storage) {
    return storage;
  }

  return storage.map((item) => {
    if (!item || typeof item.url !== 'string') {
      return item;
    }

    return {
      ...item,
      url: prefixAssetPath(item.url, entryDir),
    };
  });
}

async function findMetadataFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(
      async (entry: {
        name: string;
        isDirectory: () => boolean;
        isFile: () => boolean;
      }) => {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          return findMetadataFiles(fullPath);
        }

        return entry.isFile() && entry.name === 'metadata.json'
          ? [fullPath]
          : [];
      },
    ),
  );

  return files.flat();
}

function byNameOrId(a: RawMetadata, b: RawMetadata): number {
  const left = (a.name ?? a.id ?? '').toLowerCase();
  const right = (b.name ?? b.id ?? '').toLowerCase();
  return left.localeCompare(right);
}

function validateType(type: string | undefined, sourceFile: string): void {
  if (type !== 'app' && type !== 'game') {
    throw new Error(
      `Invalid "type" value "${String(type)}" in ${sourceFile}. ` +
        `Expected "app" or "game".`,
    );
  }
}

async function buildRegistry(): Promise<number> {
  const sectionDir = path.join(rootDir, sectionName);
  const metadataFiles = await findMetadataFiles(sectionDir);
  const entries = await Promise.all(
    metadataFiles.map(async (filePath) => {
      const raw = await fs.readFile(filePath, 'utf8');
      const metadata: RawMetadata = JSON.parse(raw);
      const relativeSource = normalizePath(path.relative(rootDir, filePath));

      validateType(metadata.type, relativeSource);

      const entryDir = normalizePath(
        path.relative(sectionDir, path.dirname(filePath)),
      );

      return {
        ...metadata,
        icon: prefixAssetPath(metadata.icon, entryDir),
        previews: metadata.previews?.map((preview) =>
          prefixAssetPath(preview, entryDir),
        ),
        readme: prefixAssetPath(metadata.readme, entryDir),
        storage: rewriteStorage(metadata.storage, entryDir),
        storageOptional: rewriteStorage(metadata.storageOptional, entryDir),
        customFirmwareFiles: rewriteStorage(
          metadata.customFirmwareFiles,
          entryDir,
        ),
      } satisfies RawMetadata;
    }),
  );

  await fs.writeFile(
    path.join(sectionDir, registryFileName),
    `${JSON.stringify(entries.sort(byNameOrId), null, 2)}\n`,
    'utf8',
  );

  return entries.length;
}

async function main(): Promise<void> {
  const count = await buildRegistry();

  process.stdout.write(
    `Wrote ${count} holotape${count === 1 ? '' : 's'} to ` +
      `${sectionName}/${registryFileName}.\n`,
  );
}

main().catch((error: unknown) => {
  const message =
    error instanceof Error ? (error.stack ?? error.message) : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
