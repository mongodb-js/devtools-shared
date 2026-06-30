import semver from 'semver';
import { getHighestRange } from './semver-helpers';

const DEPENDENCY_GROUPS = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
] as const;

export function satisfiesHighest(
  range: string,
  highestVersion: string | null,
): boolean | null {
  if (!highestVersion) return null;
  if (!semver.validRange(range)) return null;
  try {
    const minVer = semver.minVersion(highestVersion);
    if (!minVer) return null;
    return semver.satisfies(minVer, range);
  } catch {
    return null;
  }
}

export function matchesAnyPattern(name: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    const regex = new RegExp(
      '^' +
        pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*') +
        '$',
    );
    return regex.test(name);
  });
}

export interface TransitiveDepsEntry {
  version: string;
  label: string;
}

// Returns a map from transitive dep name → all usages found across our packages
// and tracked external dependencies. Includes deps with only one unique version;
// callers decide whether to filter those out.
export async function gatherTransitiveDepsInfo({
  deps,
  ignoreDevDeps,
  packages,
  resolveExternal,
}: {
  deps: string[];
  ignoreDevDeps: boolean;
  packages:
    | AsyncIterable<{ packageJson: Record<string, any> }>
    | Iterable<{ packageJson: Record<string, any> }>;
  resolveExternal: (
    name: string,
    versionRange: string,
  ) => Promise<Record<string, any>>;
}): Promise<Map<string, TransitiveDepsEntry[]>> {
  const config = { deps };
  // transitiveDep → entries from our own packages that depend on it directly
  const ourDirectUsage = new Map<string, TransitiveDepsEntry[]>();

  // external dep name → set of version ranges used across our packages
  const trackedDepRanges = new Map<string, Set<string>>();

  // local package names → their package.json (to avoid npm lookups)
  const localPackages = new Map<string, Record<string, any>>();

  for await (const { packageJson } of packages) {
    const packageName: string = packageJson.name;
    localPackages.set(packageName, packageJson);
    const pkgDeps = getDepsFromPackageJson(packageJson, { ignoreDevDeps });

    for (const [depName, version] of pkgDeps) {
      if (matchesAnyPattern(depName, config.deps)) {
        let entry = ourDirectUsage.get(depName);
        if (!entry) {
          entry = [];
          ourDirectUsage.set(depName, entry);
        }
        entry.push({ version, label: packageName });
      }

      if (matchesAnyPattern(depName, config.deps)) {
        let ranges = trackedDepRanges.get(depName);
        if (!ranges) {
          ranges = new Set();
          trackedDepRanges.set(depName, ranges);
        }
        ranges.add(version);
      }
    }
  }

  // Packages that live in the monorepo are not external deps.
  for (const localPkgName of localPackages.keys()) {
    trackedDepRanges.delete(localPkgName);
  }

  // Start result with direct usages, then append indirect ones below.
  const result = new Map<string, TransitiveDepsEntry[]>();
  for (const [depName, entries] of ourDirectUsage) {
    result.set(depName, [...entries]);
  }

  for (const [trackedDepName, versionRanges] of trackedDepRanges) {
    const manifests: Array<{
      label: string;
      packageJson: Record<string, any>;
    }> = [];

    const localPkg = localPackages.get(trackedDepName);
    if (localPkg) {
      manifests.push({ label: trackedDepName, packageJson: localPkg });
    } else {
      for (const versionRange of versionRanges) {
        try {
          const packageJson = await resolveExternal(
            trackedDepName,
            versionRange,
          );
          manifests.push({
            label: `${trackedDepName}@${versionRange}`,
            packageJson,
          });
        } catch (e: any) {
          // eslint-disable-next-line no-console
          console.error(
            `Warning: could not resolve ${trackedDepName}@${versionRange}: ${e.message as string}`,
          );
        }
      }
    }

    for (const { label, packageJson } of manifests) {
      const deps = getDepsFromPackageJson(packageJson, { ignoreDevDeps });
      for (const [depName, version] of deps) {
        if (matchesAnyPattern(depName, config.deps)) {
          let entry = result.get(depName);
          if (!entry) {
            entry = [];
            result.set(depName, entry);
          }
          entry.push({ version, label: `via ${label}` });
        }
      }
    }
  }

  return result;
}

export function getDepsFromPackageJson(
  packageJson: Record<string, any>,
  { ignoreDevDeps = false }: { ignoreDevDeps?: boolean } = {},
): Map<string, string> {
  const deps = new Map<string, string>();
  for (const group of DEPENDENCY_GROUPS) {
    if (ignoreDevDeps && group === 'devDependencies') {
      continue;
    }
    for (const [name, version] of Object.entries(
      (packageJson[group] || {}) as Record<string, string>,
    )) {
      if (!deps.has(name)) {
        deps.set(name, version);
      }
    }
  }
  return deps;
}

export interface MismatchEntry {
  version: string;
  label: string;
  satisfiesHighest: boolean | null;
}

export interface Mismatch {
  name: string;
  highestVersion: string | null;
  entries: MismatchEntry[];
}

export function findMisalignments(
  groups: Map<string, TransitiveDepsEntry[]>,
): Mismatch[] {
  const mismatches: Mismatch[] = [];

  for (const name of [...groups.keys()].sort()) {
    const entries = groups.get(name);
    if (!entries) {
      continue;
    }
    const uniqueVersions = new Set(entries.map((e) => e.version));
    if (uniqueVersions.size <= 1) {
      continue;
    }

    const allVersions = entries.map((e) => e.version);
    const highestVersion = getHighestRange(allVersions);

    mismatches.push({
      name,
      highestVersion,
      entries: entries.map((e) => ({
        version: e.version,
        label: e.label,
        satisfiesHighest: satisfiesHighest(e.version, highestVersion),
      })),
    });
  }

  return mismatches;
}
