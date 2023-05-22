import fs from 'fs';
import path from 'path';
import os from 'os';
import { rimrafSync } from 'rimraf';

export const importFixture = async (file: string) =>
  (await import(`./fixtures/${file}`)).default;

export const toCleanup: string[] = [];

export function setupTempDir(structure: Record<string, string>): string {
  const tempDirPath = path.join(os.tmpdir(), `sbom-tools-${Date.now()}`);

  fs.mkdirSync(tempDirPath, { recursive: true });
  toCleanup.push(tempDirPath);

  for (const [entryPath, content] of Object.entries(structure)) {
    const absoluteEntryPath = path.join(tempDirPath, ...entryPath.split('/'));
    fs.mkdirSync(path.dirname(absoluteEntryPath), { recursive: true });
    fs.writeFileSync(absoluteEntryPath, content);
  }

  return tempDirPath;
}

export function cleanup(): void {
  toCleanup.forEach((tempPath) => rimrafSync(tempPath));
}
