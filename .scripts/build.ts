/**
 * Holotape build pipeline.
 *
 * For every TypeScript source under `holotapes/`, this script:
 *
 *   1. Strips the type annotations with ts-blank-space. The stripper only
 *      blanks out type syntax, so the emitted JavaScript keeps the exact
 *      statement structure of the source; nothing is transpiled, polyfilled,
 *      or reordered, which matters because the target is an Espruino
 *      interpreter rather than a modern JS engine.
 *   2. Formats the stripped output with the repository Prettier config so the
 *      generated `.js` is readable on its own.
 *   3. Minifies it with the same Terser settings the Pip-Boy.com "create
 *      holotape" page uses.
 *   4. Pretokenises the minified output into Espruino's compact byte format
 *      and writes it as `.min.js`.
 *
 * Generated files are written to `dist/pip-boy-3000-holotapes`. They are
 * release artifacts only and are never committed to the source tree.
 *
 * It then builds the production registry inside that artifact (see
 * `build/registry.ts`).
 *
 * What this script does NOT touch: `metadata.json`, assets, `README.md`, and
 * `ChangeLog`. Those are yours to write and keep up to date. Adding a new
 * script file to a holotape means adding its `storage` entry by hand, because
 * only you know what the file should be called on the device and whether it is
 * required or optional.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import prettier from 'prettier';
import blankSpace from 'ts-blank-space';

import { minifyEspruino } from './build/espruino-minify.ts';
import { tokenizeEspruino } from './build/espruino-tokenize.ts';
import { collectFiles, normalizePath, sectionName } from './build/paths.ts';
import { buildRegistry } from './build/registry.ts';

const rootDir = process.cwd();
const distRoot = path.join(rootDir, 'dist');
const artifactRoot = path.join(distRoot, 'pip-boy-3000-holotapes');

/**
 * Derives the emitted JavaScript paths for a TypeScript source.
 *
 * File name casing is preserved because it is part of the on-device storage
 * convention: `storage/APP.ts` emits `storage/APP.JS` and
 * `storage/APP.MIN.JS`.
 */
function outputPaths(tsPath: string): { js: string; min: string } {
  const dir = path.dirname(tsPath);
  const base = path.basename(tsPath).replace(/\.ts$/i, '');
  const upper = base === base.toUpperCase() && /[A-Z]/.test(base);

  return {
    js: path.join(dir, `${base}${upper ? '.JS' : '.js'}`),
    min: path.join(dir, `${base}${upper ? '.MIN.JS' : '.min.js'}`),
  };
}

/**
 * Type-strips and formats a single holotape source, returning the JavaScript
 * that will be written next to it.
 */
async function compileSource(
  tsPath: string,
  source: string,
  prettierOptions: prettier.Options | null,
): Promise<string> {
  const errors: string[] = [];
  // A UTF-8 BOM is valid TypeScript whitespace but is not safe to send to the
  // Espruino lexer as the first bytes of an evaluated holotape file.
  const stripped = blankSpace(source.replace(/^\uFEFF/, ''), (node) => {
    const { line } = node
      .getSourceFile()
      .getLineAndCharacterOfPosition(node.getStart());
    errors.push(
      `${normalizePath(path.relative(rootDir, tsPath))}:${line + 1}: ` +
        'unsupported TypeScript syntax (only erasable type syntax is allowed)',
    );
  });

  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
  }

  return prettier.format(stripped, {
    ...prettierOptions,
    filepath: tsPath.replace(/\.ts$/i, '.js'),
    parser: 'babel',
  });
}

/**
 * Rewrites script `source` paths in dist metadata from `.ts` to `.MIN.JS` so
 * check-files and installers resolve production artifacts, not TypeScript.
 */
async function rewriteDistMetadataSources(
  artifactSectionDir: string,
): Promise<void> {
  const metadataFiles = await collectFiles(
    artifactSectionDir,
    (name) => name === 'metadata.json',
  );

  for (const metaPath of metadataFiles) {
    const raw = await fs.readFile(metaPath, 'utf8');
    const metadata = JSON.parse(raw) as Record<string, unknown>;
    let changed = false;

    for (const key of ['storage', 'storageOptional'] as const) {
      const list = metadata[key];
      if (!Array.isArray(list)) continue;
      for (const entry of list) {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry))
          continue;
        const record = entry as Record<string, unknown>;
        if (typeof record.source !== 'string') continue;
        const next = record.source.replace(/\.ts$/, '.MIN.JS');
        if (next !== record.source) {
          record.source = next;
          changed = true;
        }
      }
    }

    if (changed) {
      await fs.writeFile(
        metaPath,
        `${JSON.stringify(metadata, null, 2)}\n`,
        'utf8',
      );
    }
  }
}

async function buildHolotapes(): Promise<number> {
  const sectionDir = path.join(rootDir, sectionName);
  const artifactSectionDir = path.join(artifactRoot, sectionName);

  await fs.rm(distRoot, { recursive: true, force: true });
  await fs.mkdir(artifactSectionDir, { recursive: true });
  await fs.cp(sectionDir, artifactSectionDir, {
    recursive: true,
    filter: (source) => {
      const name = path.basename(source);

      return (
        !name.toLowerCase().endsWith('.ts') &&
        !name.endsWith('.js') &&
        !name.endsWith('.JS') &&
        name !== 'registry.json'
      );
    },
  });

  const sources = (
    await collectFiles(
      sectionDir,
      (name) =>
        name.toLowerCase().endsWith('.ts') &&
        !name.toLowerCase().endsWith('.d.ts'),
    )
  ).sort();
  const prettierOptions = await prettier.resolveConfig(
    path.join(rootDir, 'prettier.config.cjs'),
  );

  for (const tsPath of sources) {
    const source = await fs.readFile(tsPath, 'utf8');
    const js = await compileSource(tsPath, source, prettierOptions);
    const outputSource = path.join(
      artifactSectionDir,
      path.relative(sectionDir, tsPath),
    );
    const { js: jsPath, min: minPath } = outputPaths(outputSource);

    await fs.mkdir(path.dirname(jsPath), { recursive: true });
    await fs.writeFile(jsPath, js, 'utf8');
    await fs.writeFile(minPath, tokenizeEspruino(await minifyEspruino(js)));
  }

  await rewriteDistMetadataSources(artifactSectionDir);

  return sources.length;
}

async function main(): Promise<void> {
  const built = await buildHolotapes();

  process.stdout.write(
    `Built ${built} script${built === 1 ? '' : 's'} (.js + .min.js) in ` +
      `${normalizePath(path.relative(rootDir, artifactRoot))}.\n`,
  );

  // The registry step runs second so a metadata problem cannot stop the
  // scripts from building. Its message says which file needs editing.
  const registered = await buildRegistry(rootDir, artifactRoot);

  process.stdout.write(
    `Wrote ${registered} holotape${registered === 1 ? '' : 's'} to ` +
      `${normalizePath(path.relative(rootDir, artifactRoot))}/` +
      `${sectionName}/registry.json.\n`,
  );
}

main().catch((error: unknown) => {
  const message =
    error instanceof Error ? (error.message ?? String(error)) : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
