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

const [expr, ...args] = process.argv.slice(2);

const [execCommandArgs, opts] = splitOptionsFromArgs(args, [
  '--lerna-exec',
  '--include-dependencies',
  '--no-bail',
]);

type WhereOptions = {
  useLernaExec: boolean;
  includeDependencies: boolean;
  noBail: boolean;
};

function splitOptionsFromArgs(
  args: string[],
  knownOptions: string[]
): [string[], Record<string, any>] {
  const filteredArgs: string[] = [];
  const opts: Record<string, any> = {};

  for (const arg of args) {
    if (knownOptions.includes(arg)) {
      opts[arg] = true;
    } else {
      filteredArgs.push(arg);
    }
  }

  return [filteredArgs, opts];
}

type PackagesByName = Record<string, Record<string, any>>;

function addInternalDeps(
  name: string,
  packagesPlusDeps: string[],
  internalPackages: PackagesByName
) {
  if (packagesPlusDeps.includes(name)) {
    return;
  }

  packagesPlusDeps.push(name);

  const packageJson = internalPackages[name];
  for (const grouping of [
    'dependencies',
    'devDependencies',
    'optionalDependencies',
    'peerDependencies',
  ]) {
    const deps = packageJson[grouping];
    if (!deps) {
      continue;
    }
    for (const dep of Object.keys(deps)) {
      if (internalPackages[dep]) {
        addInternalDeps(dep, packagesPlusDeps, internalPackages);
      }
    }
  }
}

async function filterPackagesByExpression(
  expression: string,
  includeDependencies?: boolean
): Promise<string[]> {
  const packageOrder: string[] = [];
  const internalPackages: PackagesByName = {};

  const packages: string[] = [];

  for await (const { packageJson } of listAllPackages()) {
    // cache so we can re-use this when processing includeDependencies below
    packageOrder.push(packageJson.name);
    internalPackages[packageJson.name] = packageJson;

    try {
      if (runInContext(expression, createContext(packageJson)))
        packages.push(packageJson.name);
    } catch {
      /* skip */
    }
  }

  if (includeDependencies) {
    const packagesPlusDeps: string[] = [];
    for (const name of packages) {
      addInternalDeps(name, packagesPlusDeps, internalPackages);
    }

    return packageOrder.filter((name) => packagesPlusDeps.includes(name));
  }

  return packages;
}

function reAddArgs(originalArgs: string[], options: WhereOptions) {
  const args = originalArgs.slice();
  if (options.includeDependencies) {
    args.unshift('--include-dependencies');
  }
  if (options.noBail) {
    args.unshift('--no-bail');
  }
  return args;
}

async function lernaExec(packages: string[], options: WhereOptions) {
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

  execFileSync(
    lernaBin,
    ['exec', ...scope, ...reAddArgs(execCommandArgs, options)],
    {
      stdio: 'inherit',
    }
  );
}

// eslint-disable-next-line @typescript-eslint/require-await
async function npmWorkspaces(packages: string[], options: WhereOptions) {
  const npmVersion = execFileSync('npm', ['-v']).toString();

  if (Number(npmVersion.substr(0, 2)) < 7) {
    throw Error(
      `"npm run where" relies on npm@7 features, using npm@${npmVersion}. Update npm to 7 or use the command with --lerna-exec instead`
    );
  }

  if (packages.length === 0) {
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

  if (options.noBail) {
    for (const name of packages) {
      try {
        execFileSync('npm', [`--workspace=${name}`, ...execCommandArgs], {
          stdio: 'inherit',
        });
      } catch (err: any) {
        console.error(err.stack);
      }
    }
  } else {
    const workspaces = packages.map((name) => `--workspace=${name}`);

    execFileSync('npm', [...workspaces, ...execCommandArgs], {
      stdio: 'inherit',
    });
  }
}

async function main() {
  const options = {
    useLernaExec: !!opts['--lerna-exec'],
    includeDependencies: !!opts['--include-dependencies'],
    noBail: !!opts['--no-bail'],
  };

  if (options.useLernaExec) {
    const packages = await filterPackagesByExpression(expr);
    await lernaExec(packages, options);
  } else {
    const packages = await filterPackagesByExpression(
      expr,
      options.includeDependencies
    );
    await npmWorkspaces(packages, options);
  }
}

process.on('unhandledRejection', (err: Error) => {
  console.error();
  console.error(err?.stack || err?.message || err);
  process.exitCode = 1;
});

main().catch((err) => {
  process.nextTick(() => {
    throw err;
  });
});
