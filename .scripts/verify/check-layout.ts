import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { execFileSync } from 'node:child_process';
import { PNG } from 'pngjs';

interface StorageEntry {
  pipboy?: unknown;
  source?: unknown;
  previewMp3?: unknown;
  previewMp4?: unknown;
}

interface Metadata {
  icon?: unknown;
  previews?: unknown;
  storage?: unknown;
  storageOptional?: unknown;
}

const rootDirectory = process.cwd();
const holotapesDirectory = path.join(rootDirectory, 'holotapes');
// Git does not preserve empty directories. Optional and preview directories
// are therefore enforced by their metadata paths when they contain files.
const requiredDirectories = ['storage'];

function relative(filePath: string): string {
  return path.relative(rootDirectory, filePath).replaceAll('\\', '/');
}

async function collectFiles(directory: string): Promise<string[]> {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectFiles(fullPath)));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

async function existsExact(
  baseDirectory: string,
  relativePath: string,
): Promise<boolean> {
  const segments = relativePath.split('/').filter(Boolean);
  let currentDirectory = baseDirectory;

  for (const segment of segments) {
    const entries = await fs.readdir(currentDirectory).catch(() => undefined);

    if (!entries?.includes(segment)) {
      return false;
    }
    currentDirectory = path.join(currentDirectory, segment);
  }

  return segments.length > 0;
}

function storageEntries(value: unknown): StorageEntry[] {
  return Array.isArray(value)
    ? value.filter(
        (entry): entry is StorageEntry =>
          typeof entry === 'object' && entry !== null,
      )
    : [];
}

function directChild(value: unknown, directory: string): value is string {
  return (
    typeof value === 'string' && new RegExp(`^${directory}/[^/]+$`).test(value)
  );
}

/** Content filenames use an uppercase stem and a lowercase extension. */
function hasValidSourceFilename(relativePath: string): boolean {
  const base = relativePath.split('/').pop() ?? '';
  if (base.endsWith('.d.ts')) {
    const declarationStem = base.slice(0, -'.d.ts'.length);
    return (
      declarationStem.length > 0 &&
      declarationStem === declarationStem.toUpperCase()
    );
  }
  const extension = path.extname(base);
  const stem = extension.length > 0 ? base.slice(0, -extension.length) : base;
  return (
    stem.length > 0 &&
    stem === stem.toUpperCase() &&
    extension === extension.toLowerCase()
  );
}

/** The final filename in an on-device path must be fully uppercase. */
function hasUppercaseDeviceFilename(devicePath: string): boolean {
  const base = devicePath.split('/').pop() ?? '';
  return base.length > 0 && base === base.toUpperCase();
}

/** Validate casing as recorded by Git, which can differ from disk on Windows. */
function validateTrackedFilenameCasing(problems: string[]): void {
  const trackedFiles = execFileSync(
    'git',
    ['ls-files', '-z', '--', 'holotapes'],
    { cwd: rootDirectory, encoding: 'utf8' },
  ).split('\0');

  for (const trackedFile of trackedFiles) {
    const segments = trackedFile.split('/');
    const contentDirectoryIndex = segments.findIndex((segment) =>
      ['storage', 'optional', 'previews'].includes(segment),
    );

    if (contentDirectoryIndex >= 0 && !hasValidSourceFilename(trackedFile)) {
      problems.push(
        `${trackedFile}: Git index filename must have an uppercase stem and lowercase extension (force a two-step rename on case-insensitive filesystems)`,
      );
    }
  }
}

async function validateIcon(
  holotapeDirectory: string,
  icon: string,
  problems: string[],
): Promise<void> {
  const iconPath = path.join(holotapeDirectory, icon);
  const buffer = await fs.readFile(iconPath);
  const extension = path.extname(icon).toLowerCase();

  if (extension === '.png') {
    const pngSignature = '89504e470d0a1a0a';
    if (
      buffer.length < 33 ||
      buffer.subarray(0, 8).toString('hex') !== pngSignature
    ) {
      problems.push(`${relative(iconPath)}: invalid PNG icon`);
      return;
    }

    let png: PNG;
    try {
      png = PNG.sync.read(buffer);
    } catch {
      problems.push(`${relative(iconPath)}: invalid PNG icon`);
      return;
    }

    const { width, height } = png;
    if (width !== 120 || height !== 120) {
      problems.push(
        `${relative(iconPath)}: icon is ${width}x${height}; expected 120x120`,
      );
    }
    let hasTransparentPixel = false;
    for (let index = 3; index < png.data.length; index += 4) {
      if (png.data[index] < 255) {
        hasTransparentPixel = true;
        break;
      }
    }
    if (!hasTransparentPixel) {
      problems.push(`${relative(iconPath)}: PNG icon has no transparency`);
    }
    return;
  }

  if (extension === '.img') {
    if (buffer.length < 4) {
      problems.push(`${relative(iconPath)}: invalid IMG icon`);
      return;
    }

    const width = buffer[0];
    const height = buffer[1];
    const bitsPerPixel = buffer[2] % 128;
    if (width !== 120 || height !== 120) {
      problems.push(
        `${relative(iconPath)}: icon is ${width}x${height}; expected 120x120`,
      );
    }
    if (buffer[2] < 128) {
      problems.push(`${relative(iconPath)}: IMG icon has no transparency`);
    }
    if (
      bitsPerPixel < 1 ||
      bitsPerPixel > 4 ||
      buffer.length !== 4 + Math.ceil((width * height * bitsPerPixel) / 8)
    ) {
      problems.push(`${relative(iconPath)}: invalid IMG icon payload`);
    }
    return;
  }

  problems.push(`${relative(iconPath)}: icon must be a transparent PNG or IMG`);
}

async function validateHolotape(
  holotapeDirectory: string,
  problems: string[],
): Promise<void> {
  const metadataPath = path.join(holotapeDirectory, 'metadata.json');
  const metadata = JSON.parse(
    await fs.readFile(metadataPath, 'utf8'),
  ) as Metadata;

  const assetsDirectory = path.join(holotapeDirectory, 'assets');
  const assetsStat = await fs.stat(assetsDirectory).catch(() => undefined);
  if (assetsStat?.isDirectory()) {
    problems.push(
      `${relative(assetsDirectory)}: assets/ is not allowed; put the metadata icon under storage/`,
    );
  }

  for (const directory of requiredDirectories) {
    const directoryPath = path.join(holotapeDirectory, directory);
    const directoryStat = await fs.stat(directoryPath).catch(() => undefined);
    if (!directoryStat?.isDirectory()) {
      problems.push(
        `${relative(directoryPath)}: required directory is missing`,
      );
    }
  }

  const required = storageEntries(metadata.storage);
  for (const entry of required) {
    if (!directChild(entry.source, 'storage')) {
      problems.push(
        `${relative(metadataPath)}: storage source must be storage/<FILE>: ${String(entry.source)}`,
      );
    } else if (!hasValidSourceFilename(entry.source)) {
      problems.push(
        `${relative(metadataPath)}: storage source filename must have an uppercase stem and lowercase extension: ${entry.source}`,
      );
    } else if (
      typeof entry.pipboy !== 'string' ||
      !hasUppercaseDeviceFilename(entry.pipboy)
    ) {
      problems.push(
        `${relative(metadataPath)}: storage pipboy filename must be fully uppercase: ${String(entry.pipboy)}`,
      );
    }
  }

  const optional = storageEntries(metadata.storageOptional);
  for (const entry of optional) {
    if (!directChild(entry.source, 'optional')) {
      problems.push(
        `${relative(metadataPath)}: storageOptional source must be optional/<FILE>: ${String(entry.source)}`,
      );
    } else if (!hasValidSourceFilename(entry.source)) {
      problems.push(
        `${relative(metadataPath)}: storageOptional source filename must have an uppercase stem and lowercase extension: ${entry.source}`,
      );
    } else if (
      typeof entry.pipboy !== 'string' ||
      !hasUppercaseDeviceFilename(entry.pipboy)
    ) {
      problems.push(
        `${relative(metadataPath)}: storageOptional pipboy filename must be fully uppercase: ${String(entry.pipboy)}`,
      );
    }
  }

  const previews = Array.isArray(metadata.previews) ? metadata.previews : [];
  for (const preview of previews) {
    if (!directChild(preview, 'previews')) {
      problems.push(
        `${relative(metadataPath)}: preview must be previews/<FILE>: ${String(preview)}`,
      );
    } else if (!hasValidSourceFilename(preview)) {
      problems.push(
        `${relative(metadataPath)}: preview filename must have an uppercase stem and lowercase extension: ${String(preview)}`,
      );
    }
  }

  for (const entry of [...required, ...optional]) {
    for (const field of ['previewMp3', 'previewMp4'] as const) {
      if (
        entry[field] !== undefined &&
        !directChild(entry[field], 'previews')
      ) {
        problems.push(
          `${relative(metadataPath)}: ${field} must be previews/<FILE>: ${String(entry[field])}`,
        );
      } else if (
        entry[field] !== undefined &&
        !hasValidSourceFilename(entry[field])
      ) {
        problems.push(
          `${relative(metadataPath)}: ${field} filename must have an uppercase stem and lowercase extension: ${String(entry[field])}`,
        );
      }
    }
  }

  if (!directChild(metadata.icon, 'storage')) {
    problems.push(
      `${relative(metadataPath)}: icon must be storage/<FILE>: ${String(metadata.icon)}`,
    );
  } else if (!hasValidSourceFilename(metadata.icon)) {
    problems.push(
      `${relative(metadataPath)}: icon filename must have an uppercase stem and lowercase extension: ${metadata.icon}`,
    );
  } else if (!(await existsExact(holotapeDirectory, metadata.icon))) {
    problems.push(`${relative(metadataPath)}: icon does not exist exactly`);
  } else {
    await validateIcon(holotapeDirectory, metadata.icon, problems);
  }

  const files = await collectFiles(holotapeDirectory);
  for (const filePath of files) {
    const holotapeRelative = relative(filePath).split('/').slice(2).join('/');
    const fileName = path.basename(filePath);
    const underSourceDirs =
      holotapeRelative.startsWith('storage/') ||
      holotapeRelative.startsWith('optional/') ||
      holotapeRelative.startsWith('previews/');

    if (/\.js$/i.test(fileName)) {
      problems.push(
        `${relative(filePath)}: generated JavaScript is not allowed in source`,
      );
    }

    if (underSourceDirs && !hasValidSourceFilename(fileName)) {
      problems.push(
        `${relative(filePath)}: filename must have an uppercase stem and lowercase extension`,
      );
    }

    if (/\.ts$/i.test(fileName)) {
      if (
        !holotapeRelative.startsWith('storage/') &&
        !holotapeRelative.startsWith('optional/')
      ) {
        problems.push(
          `${relative(filePath)}: TypeScript must be under storage/ or optional/`,
        );
      }
    }

    if (holotapeRelative.startsWith('assets/')) {
      problems.push(
        `${relative(filePath)}: assets/ is not allowed; put the metadata icon under storage/`,
      );
    }
  }
}

async function main(): Promise<void> {
  const problems: string[] = [];
  validateTrackedFilenameCasing(problems);
  const entries = await fs.readdir(holotapesDirectory, {
    withFileTypes: true,
  });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      await validateHolotape(
        path.join(holotapesDirectory, entry.name),
        problems,
      );
    }
  }

  if (problems.length > 0) {
    process.stderr.write(
      `Holotape layout validation failed:\n${problems
        .sort()
        .map((problem) => `  - ${problem}`)
        .join('\n')}\n`,
    );
    process.exitCode = 1;
    return;
  }

  process.stdout.write(
    `Validated layout and 120x120 transparent icons for ${entries.filter((entry) => entry.isDirectory()).length} holotapes.\n`,
  );
}

main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? error.stack : String(error)}\n`,
  );
  process.exitCode = 1;
});
