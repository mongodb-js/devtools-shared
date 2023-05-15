import { promises as fs } from 'fs';
import path from 'path';
import findUp from 'find-up';

// Type definitions for a subset of what package.json generally contains.
// (See also https://docs.npmjs.com/cli/v7/configuring-npm/package-json)
interface PackageJSON {
  name: string;
  version: string;
  description?: string;
  license?: string | { type: string };
  licenses?: { type: string }[];
  dependencies?: { [key: string]: string };
  optionalDependencies?: { [key: string]: string };
  author?: string | { name: string; email?: string; url?: string };
  contributors?: (string | { name: string; email?: string; url?: string })[];
  private?: boolean;
}

export interface Package extends PackageJSON {
  path: string;
  licenseFiles: { filename: string; content: string }[];
}

const licenseRegexp = /^(license|copyright|copying)/i;

// Is quite likely to encounter the same file multiple times, so we cache a promise
// for file reads (the module files are processed in parallel).
const fileCache: Record<string, Promise<string>> = {};
function readFileWithCache(filePath: string): Promise<string> {
  fileCache[filePath] ??= fs.readFile(filePath, 'utf-8');
  return fileCache[filePath];
}

const findPackageJson = async (
  modulePath: string
): Promise<{ path: string; content: PackageJSON } | undefined> => {
  const candidatePath = await findUp('package.json', {
    cwd: path.dirname(modulePath),
  });

  if (!candidatePath) {
    return;
  }

  try {
    const packageJson: PackageJSON = JSON.parse(
      await readFileWithCache(candidatePath)
    );

    if (
      typeof packageJson.name === 'string' &&
      typeof packageJson.version === 'string'
    ) {
      return { path: candidatePath, content: packageJson };
    }
  } catch (e) {
    //
  }

  // Some of the directories inside node_modules unfortunately contains package.json files
  // that are not actually node.js packages. For that reason we also validate the content, and if
  // is not valid we look in the parent folder.
  return await findPackageJson(path.dirname(candidatePath));
};

// Return information from package.json file and license files for a given package.
export async function getPackageInfo(modulePath: string): Promise<Package> {
  const packageJSONInfo = await findPackageJson(modulePath);

  if (!packageJSONInfo) {
    throw new Error(`package.json not found for ${modulePath}`);
  }

  const { path: packageJSONPath, content: packageJSON } = packageJSONInfo;

  const packagePath = path.dirname(packageJSONPath);

  // Normalize the 'contributors' list.
  packageJSON.contributors = [
    ...new Set([packageJSON.author, packageJSON.contributors].flat()),
  ].filter(Boolean) as any;

  const licenseFiles = await Promise.all(
    (
      await fs.readdir(packagePath)
    )
      .filter((filename) => licenseRegexp.test(filename))
      .sort()
      .map(async (filename) => ({
        filename,
        content: await readFileWithCache(path.join(packagePath, filename)),
      }))
  );

  return {
    name: packageJSON.name,
    version: packageJSON.version,
    license: packageJSON.license,
    licenses: packageJSON.licenses,
    path: packagePath,
    licenseFiles,
  };
}
