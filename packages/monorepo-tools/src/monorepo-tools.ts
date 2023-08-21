/* eslint-disable no-console */
import { spawn } from 'child_process';
import { findMonorepoRoot } from './utils/find-monorepo-root';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import type { PackageInfo } from './utils/get-packages-in-topological-order';
import { getPackagesInTopologicalOrder } from './utils/get-packages-in-topological-order';
import chalk from 'chalk';
import { Duplex, PassThrough, Readable } from 'stream';
import readline from 'readline';

type YargsCommand = ReturnType<typeof yargs>;
type YargsOptionDefinition = Parameters<YargsCommand['options']>[0];
type CommandOptions<T> = { _: string[] } & T;

const getColorFn = (() => {
  let i = 0;
  const chalkColors = [
    chalk.red,
    chalk.green,
    chalk.yellow,
    chalk.blue,
    chalk.magenta,
    chalk.cyan,
    chalk.white,
    chalk.blackBright,
    chalk.redBright,
    chalk.greenBright,
    chalk.yellowBright,
    chalk.blueBright,
    chalk.magentaBright,
    chalk.cyanBright,
    chalk.whiteBright,
  ];

  return () => {
    i++;
    if (i >= chalkColors.length) {
      i = 0;
    }

    return chalkColors[i];
  };
})();

function split2(map: (l: string) => string) {
  const input = new PassThrough();
  return Duplex.from({
    writable: input,
    readable: Readable.from(
      (async function* () {
        for await (const line of readline.createInterface({ input }))
          yield map(line);
      })()
    ),
  });
}

const addPrefix = (
  prefix: string,
  colorFn: (l: string) => string = (line: string) => line
) => split2((line) => colorFn(`[${prefix}]:`) + ` ${line}\n`);

function spawnAsync(
  file: string,
  execFileArgs: string[],
  options: {
    cwd: string;
    signal: AbortSignal;
    prefix?: string;
  }
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(file, execFileArgs, {
      cwd: options.cwd,
      signal: options.signal,
      stdio: ['inherit', 'pipe', 'pipe'],
    });

    let childOut = child.stdout;
    let childErr = child.stderr;

    if (options.prefix) {
      const colorFn = getColorFn();
      childOut = childOut.pipe(addPrefix(options.prefix, colorFn));
      childErr = childErr.pipe(addPrefix(`${options.prefix}!`, colorFn));
    }

    childOut.pipe(process.stdout);
    childErr.pipe(process.stderr);

    child.on('error', (error) => {
      reject(error);
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${file} exited with code ${code ? code : '?'}`));
      }
    });
  });
}

const filterOptions: YargsOptionDefinition = {
  workspace: {
    alias: ['w', 'scope'],
    type: 'array',
    describe: 'Packages to include, defaults to all packages',
  },
  ignore: {
    type: 'array',
    describe: 'Packages to exclude',
  },
  private: {
    type: 'array',
    default: true,
    describe: 'Whether to include private packages',
  },
  'include-dependencies': {
    type: 'boolean',
    default: false,
    describe: 'Whether to include dependencies',
  },
  'include-dependents': {
    type: 'boolean',
    default: false,
    describe: 'Whether to include dependents',
  },
  where: {
    type: 'string',
    describe:
      'Filter packages with an js expression that uses package.json properties as global variables. Example: --where="devDependencies[\'webpack\'].startsWith("^3")"',
  },
  since: {
    type: 'string',
    describe: 'Include only packages changed since a specific commit',
  },
};

const execOptions: YargsOptionDefinition = {
  bail: {
    type: 'boolean',
    default: true,
    describe: 'Whether to bail on error',
  },
  parallel: {
    type: 'boolean',
    default: true,
    describe: 'Whether to run in parallel',
  },
  prefix: {
    type: 'boolean',
    default: true,
    describe: 'Whether to prefix the output with the package name',
  },
};

type ExecOptions = {
  bail: boolean;
  parallel: boolean;
  prefix: boolean;
  script?: string;
};

type FilterOptions = {
  workspace?: string[];
  includeDependencies: boolean;
  includeDependents: boolean;
  where?: string;
  since?: string;
  ignore?: string[];
  private: boolean;
};

async function handleExecCommand(
  cliOptions: CommandOptions<FilterOptions & ExecOptions>
) {
  const spawnCommand = cliOptions._[0];
  if (!spawnCommand || typeof spawnCommand !== 'string') {
    throw new Error('no command provided');
  }

  const spawnArgs: string[] = cliOptions._.slice(1);

  const monorepoRoot = await findMonorepoRoot();

  const packages = await getPackagesInTopologicalOrder(monorepoRoot, {
    include: cliOptions.workspace || [],
    exclude: cliOptions.ignore || [],
    excludePrivate: !cliOptions.private,
    since: cliOptions.since,
    includeDependencies: cliOptions.includeDependencies,
    includeDependents: cliOptions.includeDependents,
    where: cliOptions.where,
  });

  const abortController = new AbortController();

  const execOnePackage = async (packageInfo: PackageInfo) => {
    // only execute `run` scripts if present
    if (
      cliOptions.script &&
      !(cliOptions.script in packageInfo.packageJson.scripts ?? {})
    ) {
      return;
    }

    return await spawnAsync(spawnCommand, spawnArgs, {
      cwd: packageInfo.location,
      signal: abortController.signal,
      prefix: cliOptions.prefix ? packageInfo.name : undefined,
    });
  };

  if (cliOptions.parallel) {
    const promises = packages.map(execOnePackage);

    if (cliOptions.bail) {
      await Promise.all(promises).catch((e) => {
        abortController.abort();
        return Promise.reject(e);
      });
    } else {
      const results = await Promise.allSettled(promises);
      if (results.some((res) => res.status === 'rejected')) {
        process.exit(1);
      }
    }
  } else {
    let failed = false;
    for (const pkg of packages) {
      try {
        await execOnePackage(pkg);
      } catch (e) {
        failed = true;
        if (cliOptions.bail) {
          break;
        }
      }
    }

    if (failed) {
      process.exit(1);
    }
  }
}

async function handleLsCommand(cliOptions: CommandOptions<FilterOptions>) {
  const monorepoRoot = await findMonorepoRoot();

  const packages = await getPackagesInTopologicalOrder(monorepoRoot, {
    include: cliOptions.workspace || [],
    exclude: cliOptions.ignore || [],
    excludePrivate: !cliOptions.private,
    since: cliOptions.since,
    includeDependencies: cliOptions.includeDependencies,
    includeDependents: cliOptions.includeDependents,
    where: cliOptions.where,
  });

  for (const info of packages) {
    console.info(info.name);
  }
}

async function main() {
  // strips the command name from the `_` array, converts any positional argument to a string
  // and return the parsed options as CommandOptions type
  const toCommandOptions = <T>(opts: { _: (string | number)[] }) => {
    return {
      ...opts,
      _: opts._.slice(1).map((x) => `${x}`),
    } as unknown as CommandOptions<T>;
  };

  await yargs(hideBin(process.argv))
    .command('ls', 'List all the packages matching filters.', {
      builder: (command: YargsCommand) => {
        return command.options({ ...filterOptions, ...execOptions });
      },
      handler: (args) => handleLsCommand(toCommandOptions<FilterOptions>(args)),
    })
    .command(
      'run <script>',
      'Run an npm script in each package that contains that script. Pass any argument after --.',
      {
        builder: (command: YargsCommand) => {
          return command.options({ ...filterOptions, ...execOptions });
        },
        handler: (args) => {
          const commandOptions = toCommandOptions<
            FilterOptions & ExecOptions & { script: string }
          >(args);

          return handleExecCommand({
            ...commandOptions,
            _: ['npm', 'run', commandOptions.script, ...commandOptions._],
          });
        },
      }
    )
    .command(
      'exec',
      'Execute an arbitrary command in each package. Pass the command and any argument after --.',
      {
        builder: (command: YargsCommand) => {
          return command.options({ ...filterOptions, ...execOptions });
        },
        handler: (args) =>
          handleExecCommand(
            toCommandOptions<FilterOptions & ExecOptions>(args)
          ),
      }
    )
    .strict()
    .demandCommand(1)
    .help()
    .showHelpOnFail(false)
    .parseAsync();
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
