import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { rimraf } from 'rimraf';

export const importFixture = async (file: string) =>
  (await import(`./fixtures/${file}`)).default;

export async function withTempDir<T>(
  structure: Record<string, string>,
  fn: (tempPath: string) => Promise<T>
): Promise<T> {
  const tempDirPath = path.join(os.tmpdir(), `sbom-tools-${Date.now()}`);

  await fs.mkdir(tempDirPath, { recursive: true });

  try {
    for (const [entryPath, content] of Object.entries(structure)) {
      const absoluteEntryPath = path.join(tempDirPath, entryPath);
      await fs.mkdir(path.dirname(absoluteEntryPath), { recursive: true });
      await fs.writeFile(absoluteEntryPath, content);
    }

    return await fn(tempDirPath);
  } finally {
    await rimraf(tempDirPath);
  }
}
