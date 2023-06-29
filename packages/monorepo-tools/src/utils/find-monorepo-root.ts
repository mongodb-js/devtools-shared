import findUp from 'find-up';
import path from 'path';

export async function findMonorepoRoot() {
  const packagePath = await findUp('package-lock.json');
  return path.dirname(packagePath);
}
