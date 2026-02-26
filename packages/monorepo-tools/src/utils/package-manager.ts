import { promisify } from 'util';
import { execFile as execFileCallback, execFileSync } from 'child_process';

const execFile = promisify(execFileCallback);

/**
 * Get the package manager to use based on environment variable.
 * Defaults to 'npm' if USE_PNPM is not set or set to anything other than 'true'.
 *
 * Set USE_PNPM=true to use pnpm instead of npm.
 */
export function getPackageManager(): 'npm' | 'pnpm' {
  return process.env.MONOREPO_TOOLS_USE_PNPM === 'true' ? 'pnpm' : 'npm';
}

/**
 * Install dependencies using the configured package manager.
 * Equivalent to: npm install / pnpm install
 *
 * @param options.cwd Working directory (defaults to process.cwd())
 * @param options.packageLockOnly If true, only updates lock file without installing (defaults to false)
 */
export async function installDependencies(
  options: { cwd?: string; packageLockOnly?: boolean } = {},
): Promise<{ stdout: string; stderr: string }> {
  const { cwd, packageLockOnly = false } = options;
  const packageManager = getPackageManager();
  const args = ['install'];

  if (packageLockOnly) {
    // npm uses --package-lock-only, pnpm uses --lockfile-only
    args.push(
      packageManager === 'pnpm' ? '--lockfile-only' : '--package-lock-only',
    );
  }

  return await execFile(packageManager, args, { cwd });
}

/**
 * Get the version of the configured package manager.
 * Returns the version string (e.g., "9.0.0" for npm or "8.15.0" for pnpm).
 */
export async function getPackageManagerVersion(): Promise<string> {
  const packageManager = getPackageManager();
  const { stdout } = await execFile(packageManager, ['-v']);
  return stdout.trim();
}

/**
 * Run a package manager command for specific workspaces.
 * For npm: uses --workspace flags
 * For pnpm: uses --filter flags
 *
 * @param options.workspaces Array of workspace names to target
 * @param options.args Package manager command arguments (e.g., ['run', 'test'])
 * @param options.stdio stdio configuration for child process (defaults to 'inherit')
 */
export function runForWorkspaces(options: {
  workspaces: string[];
  args: string[];
  stdio?: 'inherit' | 'pipe' | 'ignore';
}): void {
  const { workspaces, args, stdio = 'inherit' } = options;
  const packageManager = getPackageManager();

  const workspaceArgs =
    packageManager === 'pnpm'
      ? workspaces.map((name) => `--filter=${name}`)
      : workspaces.map((name) => `--workspace=${name}`);

  execFileSync(packageManager, [...workspaceArgs, ...args], { stdio });
}

/**
 * Execute a package with the configured package executor (npx or pnpm dlx).
 *
 * @param options.packageName The package/command to execute
 * @param options.args Arguments to pass to the package
 * @param options.cwd Working directory (defaults to process.cwd())
 */
export async function executePackage(options: {
  packageName: string;
  args: string[];
  cwd?: string;
}): Promise<{ stdout: string; stderr: string }> {
  const { packageName, args, cwd } = options;
  const packageManager = getPackageManager();

  if (packageManager === 'pnpm') {
    return await execFile('pnpm', ['dlx', packageName, ...args], { cwd });
  }
  return await execFile('npx', [packageName, ...args], { cwd });
}
