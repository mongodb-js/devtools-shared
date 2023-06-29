import path from 'path';
import { promises as fs } from 'fs';

export const skip = Symbol('skip');

type MaybePromise<T> = T | PromiseLike<T>;
export type UpdatePackageJsonFunction = (
  pkgJson: Record<string, any>,
  s: typeof skip
) => MaybePromise<typeof skip | Record<string, any>>;

export async function updatePackageJson(
  packageDir: string,
  updateFn: UpdatePackageJsonFunction
): Promise<void> {
  const pathToPkg = path.resolve(packageDir, 'package.json');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const pkgJson = require(pathToPkg);
  const updated = await updateFn(pkgJson, skip);

  if (updated === skip) {
    return;
  }

  if (!updated || typeof updated !== 'object') {
    const updatedStr = JSON.stringify(updated);
    throw new Error(
      `updatePackageJson updateFn should return a package.json object, got ${updatedStr}`
    );
  }

  await fs.writeFile(
    pathToPkg,
    JSON.stringify(updated, null, 2).trim() + '\n',
    'utf8'
  );
}
