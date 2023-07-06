#! /usr/bin/env node
/* eslint-disable no-console */

/**
 * Usage:
 *
 *   npm run where "<logical expression>" -- <... npm command>
 *   npm run where "<logical expression>" -- --lerna-exec <... shell script>
 *
 * Examples:
 *
 *   npm run where "scripts.test" -- run test
 *   npm run where "devDependencies['webpack'].startsWith("^3")" -- install webpack@4 --save --package-lock-only
 *
 * or (when npm@7 is not available):
 *
 *   npm run where "peerDependencies" -- --lerna-exec --stream --concurrency 1 -- echo "this package has peer deps"
 */

import path from 'path';
import util from 'util';
import { runInContext, createContext } from 'vm';
import { execFileSync } from 'child_process';
import { listAllPackages } from './utils/list-all-packages';
import { findMonorepoRoot } from './utils/find-monorepo-root';

const [expr, ...execCommandArgs] = process.argv.slice(2);
let useLernaExec = false;

if (execCommandArgs.includes('--lerna-exec')) {
  execCommandArgs.splice(execCommandArgs.indexOf('--lerna-exec'), 1);
  useLernaExec = true;
}

async function filterPackagesByExpression(
  expression: string
): Promise<string[]> {
  const packages: string[] = [];
  for await (const { packageJson } of listAllPackages()) {
    try {
      if (runInContext(expression, createContext(packageJson)))
        packages.push(packageJson.name);
    } catch {
      /* skip */
    }
  }
  return packages;
}

async function lernaExec(packages: string[]) {
  const scope = packages.map((name) => `--scope=${name}`);

  if (scope.length === 0) {
    console.info(`No packages matched filter "${expr}"`);
    return;
  }

  const lernaBin = path.resolve(
    await findMonorepoRoot(),
    'node_modules',
    '.bin',
    'lerna'
  );

  execFileSync(lernaBin, ['exec', ...scope, ...execCommandArgs], {
    stdio: 'inherit',
  });
}

// eslint-disable-next-line @typescript-eslint/require-await
async function npmWorkspaces(packages: string[]) {
  const npmVersion = execFileSync('npm', ['-v']).toString();

  if (Number(npmVersion.substr(0, 2)) < 7) {
    throw Error(
      `"npm run where" relies on npm@7 features, using npm@${npmVersion}. Update npm to 7 or use the command with --lerna-exec instead`
    );
  }

  const workspaces = packages.map((name) => `--workspace=${name}`);

  if (workspaces.length === 0) {
    console.info(`No packages matched filter "${expr}"`);
    return;
  }

  console.log();
  console.log(
    'Running "npm %s" for the following packages:',
    execCommandArgs.join(' ')
  );
  console.log();
  console.log(util.inspect(packages));
  console.log();

  execFileSync('npm', [...workspaces, ...execCommandArgs], {
    stdio: 'inherit',
  });
}

async function main() {
  const packages = await filterPackagesByExpression(expr);

  if (useLernaExec) {
    await lernaExec(packages);
  } else {
    await npmWorkspaces(packages);
  }
}

process.on('unhandledRejection', (err: Error) => {
  console.error();
  console.error(err?.stack || err?.message || err);
  process.exitCode = 1;
});

main().catch((err) =>
  process.nextTick(() => {
    throw err;
  })
);
