/* eslint-disable no-console */

import { promises as fs } from 'fs';
import path from 'path';
import { getPackagesInTopologicalOrder } from './utils/get-packages-in-topological-order';
import { findMonorepoRoot } from './utils/find-monorepo-root';

process.on('unhandledRejection', (err: Error) => {
  console.error();
  console.error(err?.stack || err?.message || err);
  process.exitCode = 1;
});

async function main() {
  const monorepoRoot = await findMonorepoRoot();
  const text = await fs.readFile(
    path.join(monorepoRoot, 'package.json'),
    'utf8'
  );
  const packageJSON = JSON.parse(text);
  const patterns: string[] = packageJSON.workspacesPatterns || [];
  const packages = await getPackagesInTopologicalOrder(monorepoRoot, patterns);

  packageJSON.workspaces = packages.map(({ location }) =>
    location.replace(`${monorepoRoot}/`, '')
  );

  await fs.writeFile(
    path.join(monorepoRoot, 'package.json'),
    JSON.stringify(packageJSON, null, 2) + '\n',
    'utf8'
  );
}

main().catch((err) =>
  process.nextTick(() => {
    throw err;
  })
);
