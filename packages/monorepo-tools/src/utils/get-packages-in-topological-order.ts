import { promises as fs } from 'fs';
import path from 'path';
import { glob } from 'glob';
import toposort from 'toposort';
import depthFirst from 'depth-first';
import { runInContext, createContext } from 'vm';

import { execFile as execFileCb } from 'child_process';
import { promisify } from 'util';
const execFile = promisify(execFileCb);

export interface PackageInfo {
  name: string;
  location: string;
  version: string;
  private: boolean;
  rootDir: string;
  packageJson: Record<string, any>;
}

function packageListArgAsSet(
  list: string[] | undefined,
  packageNames: Set<string>
) {
  list = list || [];
  const unknown = list.filter((name) => !packageNames.has(name));

  if (unknown.length) {
    throw new Error(`Unknown workspaces: ${unknown.join(', ')}`);
  }

  return new Set(list);
}

export async function getPackagesInTopologicalOrder(
  cwd: string,
  options?: {
    include?: string[];
    exclude?: string[];
    excludePrivate?: boolean;
    since?: string;
    includeDependencies?: boolean;
    includeDependents?: boolean;
    where?: string;
  }
): Promise<PackageInfo[]> {
  const internalPackages: PackageInfo[] = await getMonorepoPackages(cwd);

  const allPackageNames = new Set(internalPackages.map((pkg) => pkg.name));
  const includeSet = packageListArgAsSet(options?.include, allPackageNames);
  const excludeSet = packageListArgAsSet(options?.exclude, allPackageNames);

  // Scopes is a set of workspaces to include in the result.
  // The scopes set is used to filter the toposorted array of packages, hence if a workspace
  // is not present in the scopes it will not be included.
  //
  // The list of scopes is built starting from the workspaces specified as "include",
  // or with all the workspaces if none has been passed.
  //
  // This list is then restricted to the packages matching the `where` expression if one is passed and
  // then the changed workspaces if `since` is passed,
  // and is then augmented with dependencies and dependents if includeDependencies and includeDependents
  // are set.
  // Finally excluded packages (and private packages if excludePrivate is true) are removed from the scopes.
  //
  // For example with {workspace: [A, B], since: 'HEAD', includeDependencies: true}, where A has changes since HEAD:
  // It will start with [A, B], reduce the scopes to [A] and then include all the dependencies of A.
  //
  // This allows us to implement a command as such, which re-compiles `core-util` and all its dependents
  // only if `core-util` has changed:
  //
  // monorepo run compile --workspace core-util --since HEAD --include-dependents
  //
  // NOTE: this mimics lerna behavior but with some key differences:
  // - Same as lerna: dependents/dependencies of the packages included or found through `since` (and in this case also `where`) are always
  // added to the result if includeDependencies and includeDependents are passed, so since doesn't apply to dependencies.
  // - Difference 1: `includeDependents` must be set explicitly with `since`: an excludeDependents option is not necessary.
  // - Difference 2: unlike lerna's `--ignore` excluded packages are always removed from the result set.
  const scopes = includeSet.size ? includeSet : allPackageNames;

  // if where is specified restrict the scopes to matching packages
  if (options?.where) {
    const matchingPackages = filterWhere(internalPackages, options?.where);
    for (const scope of Array.from(scopes)) {
      if (!matchingPackages.has(scope)) {
        scopes.delete(scope);
      }
    }
  }

  // if since is specified restrict the scopes to changed packages
  if (options?.since) {
    const changedPackages = await filterSince(
      cwd,
      { since: options?.since },
      internalPackages
    );
    for (const scope of Array.from(scopes)) {
      if (!changedPackages.has(scope)) {
        scopes.delete(scope);
      }
    }
  }

  const edges: [string, string][] = getEdgeList(internalPackages);

  // if includeDependencies is specified augment the scopes with dependents
  if (options?.includeDependencies) {
    getDependencies(Array.from(scopes), edges).forEach((dep) =>
      scopes.add(dep)
    );
  }

  // if includeDependents is specified augment the scopes with dependencies
  if (options?.includeDependents) {
    getDependents(Array.from(scopes), edges).forEach((dep) => scopes.add(dep));
  }

  return (
    // the result is constructed by filtering the toposorted list of packages
    // so to return only the packages that are present in the scopes in topological order.
    toposort(edges)
      .slice(1) // remove .root
      .reverse()
      // filter scopes
      .filter((packageName) => scopes.has(packageName))
      // remove excluded
      .filter((packageName) => !excludeSet.has(packageName))
      .map((packageName) => {
        const pkg = internalPackages.find((p) => p.name === packageName);

        if (!pkg) {
          // results are filtered with scopes and scopes are validated to be
          // internalPackages, this situation should never occur.
          throw new Error(
            `Unexpected: could not find ${packageName} in results.`
          );
        }

        return pkg;
      })
      // remove private packages if excludePrivate
      .filter((packageInfo) => {
        return options?.excludePrivate ? !packageInfo.private : true;
      })
      .filter(Boolean)
  );
}

function isSubPath(parentPath: string, childPath: string) {
  const relative = path.relative(parentPath, childPath);
  return !!relative && !relative.startsWith('..') && !path.isAbsolute(relative);
}

async function filterSince(
  monorepoRoot: string,
  cliOptions: { since: string },
  packages: PackageInfo[]
): Promise<Set<string>> {
  const execGit = (...args: string[]) =>
    execFile('git', ['--no-pager', ...args], { cwd: monorepoRoot }).then(
      ({ stdout }) => stdout
    );

  // changes up to the HEAD of the current branch
  const changesTillHead = await execGit(
    'log',
    '--name-only',
    '--pretty=', // remove commit info, so only file names are present in the output
    `${cliOptions.since}..HEAD`
  );

  // Anything that has changed since the HEAD of the current branch is always included:
  const staged = await execGit('diff', '--name-only', '--cached');
  const unstaged = await execGit('diff', '--name-only');
  const untracked = await execGit('ls-files', '--others', '--exclude-standard');

  const anyChange = Array.from(
    new Set(
      [changesTillHead, staged, unstaged, untracked]
        .map((out) => out.split('\n'))
        .flat()
        .filter((line) => line)
        .map((line) => line.trim())
        .map((line) => path.resolve(monorepoRoot, line))
    )
  );

  const changedPackages = new Set<string>();

  for (const change of anyChange) {
    const changedPackage = packages.find((p) => {
      return isSubPath(p.location, change);
    });

    if (changedPackage) {
      changedPackages.add(changedPackage.name);
    }
  }

  return changedPackages;
}

function filterWhere(packages: PackageInfo[], expression: string): Set<string> {
  const filtered = new Set<string>();

  for (const pkg of packages) {
    try {
      if (runInContext(expression, createContext(pkg.packageJson)))
        filtered.add(pkg.name);
    } catch {
      /* skip */
    }
  }

  return filtered;
}

function getDependents(
  scopes: string[],
  edges: PackagesTreeEdgeList
): string[] {
  return scopes
    .map((scope) => depthFirst(edges, scope, { reverse: true }))
    .flat();
}

function getDependencies(
  scopes: string[],
  edges: PackagesTreeEdgeList
): string[] {
  return scopes.map((scope) => depthFirst(edges, scope)).flat();
}

type PackagesTreeEdgeList = [string, string][];

function getEdgeList(internalPackages: PackageInfo[]): PackagesTreeEdgeList {
  const packageNames = new Set(internalPackages.map((p) => p.name));
  const edges: [string, string][] = [];
  for (const internalPackage of internalPackages) {
    const anyInternalDependency = Object.keys({
      ...(internalPackage.packageJson?.dependencies || {}),
      ...(internalPackage.packageJson?.devDependencies || {}),
      ...(internalPackage.packageJson?.optionalDependencies || {}),
      ...(internalPackage.packageJson?.peerDependencies || {}),
    }).filter((dep) => packageNames.has(dep));

    edges.push(['.root', internalPackage.name]);

    if (anyInternalDependency.length) {
      for (const dep of anyInternalDependency) {
        edges.push([internalPackage.name, dep]);
      }
    }
  }
  return edges;
}

async function getMonorepoPackages(monorepoRoot: string) {
  const patterns: string[] =
    JSON.parse(
      await fs.readFile(path.join(monorepoRoot, `package.json`), 'utf8')
    ).workspaces || [];

  const packageJsonPaths = await glob(
    patterns.map((pattern) => path.join(pattern, 'package.json')),
    { cwd: monorepoRoot }
  );

  const info: PackageInfo[] = await Promise.all(
    packageJsonPaths.map(async (packageJsonPath) => {
      const packageJsonLocation = path.resolve(monorepoRoot, packageJsonPath);
      const packageJson = JSON.parse(
        await fs.readFile(packageJsonLocation, 'utf8')
      );
      return {
        name: packageJson.name,
        version: packageJson.version,
        location: path.dirname(packageJsonLocation),
        private: !!packageJson.private,
        packageJson,
        rootDir: monorepoRoot,
      };
    })
  );
  return info;
}
