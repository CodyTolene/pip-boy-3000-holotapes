/**
 * Small path helpers shared by the build scripts.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';

/** Directory under the repository root that holds every holotape. */
export const sectionName = 'holotapes';

/** Converts Windows separators to forward slashes. */
export function normalizePath(value: string): string {
  return value.replaceAll('\\', '/');
}

/**
 * Walks a directory tree, returning every file whose name passes the filter.
 */
export async function collectFiles(
  dir: string,
  matches: (name: string) => boolean,
): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const found: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      found.push(...(await collectFiles(fullPath, matches)));
    } else if (entry.isFile() && matches(entry.name)) {
      found.push(fullPath);
    }
  }

  return found;
}
