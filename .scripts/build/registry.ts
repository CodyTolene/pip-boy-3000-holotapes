/**
 * Registry generator.
 *
 * Builds a production `holotapes/registry.json` from every holotape's
 * `metadata.json`.
 * The registry is the single index that pip-boy.com reads, so its asset paths
 * have to be relative to `holotapes/` rather than to each holotape directory.
 * That rewriting is the only transformation applied, and it happens on the way
 * out: the copy written to the registry is adjusted, never the source file.
 *
 * `metadata.json` is hand-maintained. This script only ever READS it. Nothing
 * in this repository writes a `metadata.json`, adds storage entries, or
 * invents asset paths: registering a holotape's files is the developer's job,
 * because only the developer knows which assets ship, which are optional, and
 * what they should be called on the device.
 *
 * A holotape with no `metadata.json` is simply not in the registry. Its
 * TypeScript still builds, so you can work on an app before you are ready to
 * register it.
 *
 * Invoked from `.scripts/build.ts` after the holotape scripts are emitted. You can still
 * run this file directly with Node if you only need to refresh registry.json
 * inside an existing dist/ tree.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { collectFiles, normalizePath, sectionName } from './paths.ts';

type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

/**
 * A holotape's registration entry, as written by hand in `metadata.json`.
 *
 * The index signature keeps any field the developer adds, so the registry
 * carries it through even if it is not listed here.
 */
interface Metadata {
  id?: string;
  name?: string;
  author?: string;
  version?: string;
  description?: string;
  icon?: string;
  previews?: string[];
  type?: string;
  readme?: string;
  storage?: JsonValue[];
  storageOptional?: JsonValue[];
  [key: string]: JsonValue | undefined;
}

const registryFileName = 'registry.json';

function joinWebPath(...parts: string[]): string {
  return normalizePath(parts.join('/').replaceAll(/\/+/g, '/'));
}

function isRelativeAssetPath(value: string): boolean {
  return value.length > 0 && !value.startsWith('/') && !/^[a-z]+:/i.test(value);
}

/**
 * Rewrites a holotape-relative asset path to be registry-relative.
 *
 * Absolute paths and URLs are returned untouched, as is `undefined`, so the
 * caller can pass an optional metadata field straight through.
 */
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

/**
 * Maps a repo source path to the artifact that ships in the production zip.
 * TypeScript scripts become the Espruino-tokenised `.MIN.JS`;
 * assets are left alone. The on-device destination stays in `pipboy`.
 */
function toProductionSource(source: string): string {
  return source.replace(/\.ts$/, '.MIN.JS');
}

function rewriteStorage(
  storage: JsonValue[] | undefined,
  entryDir: string,
): JsonValue[] | undefined {
  if (!storage) {
    return storage;
  }

  return storage.map((item) => {
    if (!item || Array.isArray(item) || typeof item !== 'object') {
      return item;
    }

    const source = item.source;
    if (typeof source !== 'string') {
      return item;
    }

    const rewritten: JsonValue = {
      ...item,
      source: prefixAssetPath(toProductionSource(source), entryDir),
    };
    return rewritten;
  });
}

/**
 * Reads one `metadata.json` and returns its registry entry.
 *
 * Problems are returned as messages rather than thrown, so a single bad file
 * does not hide the others.
 */
async function readEntry(
  filePath: string,
  rootDir: string,
  sectionDir: string,
): Promise<{ entry?: Metadata; problem?: string }> {
  const relativeSource = normalizePath(path.relative(rootDir, filePath));
  const raw = await fs.readFile(filePath, 'utf8');

  let metadata: Metadata;
  try {
    metadata = JSON.parse(raw) as Metadata;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return { problem: `${relativeSource}: not valid JSON (${detail})` };
  }

  if (metadata.type !== 'app' && metadata.type !== 'game') {
    return {
      problem:
        `${relativeSource}: "type" is ${JSON.stringify(metadata.type)}, ` +
        'expected "app" or "game"',
    };
  }

  const entryDir = normalizePath(
    path.relative(sectionDir, path.dirname(filePath)),
  );

  return {
    entry: {
      ...metadata,
      icon: prefixAssetPath(metadata.icon, entryDir),
      previews: metadata.previews?.map((preview) =>
        prefixAssetPath(preview, entryDir),
      ),
      readme: prefixAssetPath(metadata.readme, entryDir),
      storage: rewriteStorage(metadata.storage, entryDir),
      storageOptional: rewriteStorage(metadata.storageOptional, entryDir),
    },
  };
}

/**
 * Rebuilds `holotapes/registry.json` and returns how many holotapes it holds.
 *
 * Throws with every problem listed if any `metadata.json` cannot be used. The
 * fix is always to edit that file by hand.
 */
export async function buildRegistry(
  rootDir: string,
  outputRoot = rootDir,
): Promise<number> {
  const sectionDir = path.join(rootDir, sectionName);
  const outputSectionDir = path.join(outputRoot, sectionName);
  const metadataFiles = await collectFiles(
    sectionDir,
    (name) => name === 'metadata.json',
  );
  const results = await Promise.all(
    metadataFiles.map((filePath) => readEntry(filePath, rootDir, sectionDir)),
  );

  const problems = results
    .map((result) => result.problem)
    .filter((problem): problem is string => problem !== undefined);

  if (problems.length > 0) {
    throw new Error(
      `${problems.length} metadata problem(s). ` +
        'metadata.json is maintained by hand; fix these and run again:\n' +
        problems.map((problem) => `  - ${problem}`).join('\n'),
    );
  }

  const entries = results
    .map((result) => result.entry)
    .filter((entry): entry is Metadata => entry !== undefined);

  entries.sort((a, b) =>
    (a.name ?? a.id ?? '')
      .toLowerCase()
      .localeCompare((b.name ?? b.id ?? '').toLowerCase()),
  );

  await fs.mkdir(outputSectionDir, { recursive: true });
  await fs.writeFile(
    path.join(outputSectionDir, registryFileName),
    `${JSON.stringify(entries, null, 2)}\n`,
    'utf8',
  );

  return entries.length;
}

async function main(): Promise<void> {
  const rootDir = process.cwd();
  const outputRoot = path.join(rootDir, 'dist', 'pip-boy-3000-holotapes');
  const registered = await buildRegistry(rootDir, outputRoot);

  process.stdout.write(
    `Wrote ${registered} holotape${registered === 1 ? '' : 's'} to ` +
      `${normalizePath(path.relative(rootDir, outputRoot))}/` +
      `${sectionName}/${registryFileName}.\n`,
  );
}

// Only run when invoked directly, so build.ts can import buildRegistry.
if (process.argv[1] && import.meta.filename === path.resolve(process.argv[1])) {
  main().catch((error: unknown) => {
    const message =
      error instanceof Error ? (error.message ?? String(error)) : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
}
