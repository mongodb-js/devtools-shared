import findUp from 'find-up';
import path from 'path';

export async function findMonorepoRoot() {
  const packagePath = await findUp('package-lock.json');
  if (!packagePath) {
    throw new Error('Could not find monorepo root package-lock file');
  }
  return path.dirname(packagePath);
}
