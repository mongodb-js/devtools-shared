#! /usr/bin/env node
/* eslint-disable no-console */

import path from 'path';
import { pkgUp } from 'pkg-up';
import { promisify } from 'util';
import { execFile } from 'child_process';
import * as fs from 'fs/promises';
import findUp from 'find-up';
const execFileAsync = promisify(execFile);

async function main(fileList: string[]) {
  const monorepoGit = await findUp('.git', {
    cwd: __dirname,
    type: 'directory',
  });
  if (!monorepoGit) {
    throw new Error(
      `Could not find .git directory for monorepo starting from ${__dirname}`,
    );
  }
  const monorepoRoot = path.dirname(monorepoGit);

  const filesToPrettify: string[] = [];

  const submodules = [
    ...(
      await fs
        .readFile(path.resolve(monorepoRoot, '.gitmodules'), {
          encoding: 'utf8',
        })
        .catch(() => '')
    ).matchAll(/^\s+path = (?<submodulePath>.*)$/gm),
  ]
    .map((r) => r.groups?.submodulePath)
    .filter((p): p is string => !!p)
    .map((p) => path.resolve(monorepoRoot, p));

  await Promise.all(
    fileList.map(async (filePath) => {
      if (
        submodules.some((submodulePath) => filePath.startsWith(submodulePath))
      ) {
        console.log(`Skipping submodule ${filePath}`);
        return;
      }

      const packageJsonPath = await pkgUp({ cwd: path.dirname(filePath) });

      if (!packageJsonPath) {
        return;
      }

      const packageRoot = path.dirname(packageJsonPath);

      if (monorepoRoot === packageRoot) {
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const packageJson = require(packageJsonPath);

      // We are only prettifying files that are inside packages that already
      // have prettier set up
      if (packageJson.scripts?.prettier) {
        filesToPrettify.push(filePath);
      }
    }),
  );

  if (filesToPrettify.length === 0) {
    console.log('No files to re-format. Skipping ...');
    return;
  }

  console.log('Re-formatting following files ...');
  filesToPrettify.map((filePath) => {
    console.log(`  - ${path.relative(process.cwd(), filePath)}`);
  });

  await execFileAsync('npx', [
    'prettier',
    '--config',
    require.resolve('@mongodb-js/prettier-config-devtools/.prettierrc.json'),
    // Silently ignore files that are of format that is not supported by prettier
    '--ignore-unknown',
    '--write',
    ...filesToPrettify,
  ]);

  // Re-add potentially reformatted files
  await execFileAsync('git', ['add', ...filesToPrettify]);
}

const fileList = process.argv
  .slice(
    process.argv.findIndex((filename) => filename.includes('precommit')) + 1,
  )
  .filter((arg) => !arg.startsWith('-'))
  .map((filePath) => {
    return path.resolve(process.cwd(), filePath);
  });

main(fileList).catch((err) =>
  process.nextTick(() => {
    throw err;
  }),
);
