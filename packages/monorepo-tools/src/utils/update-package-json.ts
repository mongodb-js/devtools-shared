import path from 'path';
import { promises as fs } from 'fs';

export const skip = Symbol('skip');

export function insertAfter(obj, key, insertKey, insertValue) {
  const keys = Object.keys(obj);
  keys.splice(keys.indexOf(key) + 1, 0, insertKey);
  return Object.fromEntries(
    keys.map((key) => [key, key === insertKey ? insertValue : obj[key]])
  );
}

export async function updatePackageJson(packageDir, updateFn) {
  const pathToPkg = path.resolve(packageDir, 'package.json');
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
