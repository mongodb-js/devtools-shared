import { spawn } from 'child_process';
import { once } from 'events';
import { promises as fs, openSync, closeSync } from 'fs';
import path from 'path';
import { debug, uuid } from './util';

export interface DockerComposeProjectOptions {
  /**
   * Environment variables used for variable interpolation in the compose file.
   * Merged over the current process environment.
   */
  env?: Record<string, string>;
  /**
   * Compose project name (passed as `docker compose -p <name>`). Defaults to a
   * generated unique name so multiple projects from the same compose file can
   * coexist.
   */
  projectName?: string;
  /**
   * If set, the logs of all containers in the project are continuously
   * streamed (`docker compose logs --follow`) to a file in this directory
   * for the lifetime of the project. Streaming starts as soon as the project
   * is up, so the logs are preserved even if the current process dies before
   * the project is torn down, and are unaffected by Docker log rotation.
   */
  logDir?: string;
}

function dockerComposeArgs(
  composeFile: string,
  projectName: string,
  args: string[],
): string[] {
  return ['compose', '-f', composeFile, '-p', projectName, ...args];
}

async function runDockerCompose(
  composeFile: string,
  projectName: string,
  env: Record<string, string> | undefined,
  args: string[],
): Promise<{ code: number | null; stderr: string }> {
  const proc = spawn(
    'docker',
    dockerComposeArgs(composeFile, projectName, args),
    {
      stdio: ['inherit', 'pipe', 'pipe'],
      env: { ...process.env, ...env },
    },
  );
  await once(proc, 'spawn');
  debug('docker compose: spawned', { pid: proc.pid, args });
  let stderr = '';
  proc.stderr.setEncoding('utf8');
  proc.stderr.on('data', (chunk: string) => {
    stderr += chunk;
    for (const line of chunk.split('\n')) {
      if (line.trim()) debug('docker compose stderr:', line);
    }
  });
  proc.stdout.setEncoding('utf8');
  proc.stdout.on('data', (chunk: string) => {
    for (const line of chunk.split('\n')) {
      if (line.trim()) debug('docker compose stdout:', line);
    }
  });
  const [code] = await once(proc, 'exit');
  debug('docker compose: exited', { code });
  return { code: code as number | null, stderr };
}

/**
 * Start a detached `docker compose logs --follow` process whose output is
 * redirected directly to a file, so it keeps streaming (and survives) even if
 * the current process exits.
 */
async function startLogFollower(
  composeFile: string,
  projectName: string,
  env: Record<string, string> | undefined,
  logDir: string,
): Promise<{ pid: number | undefined; logFile: string }> {
  await fs.mkdir(logDir, { recursive: true });
  const logFile = path.join(logDir, `docker-compose-${projectName}.log`);
  const fd = openSync(logFile, 'a');
  try {
    const proc = spawn(
      'docker',
      dockerComposeArgs(composeFile, projectName, [
        'logs',
        '--follow',
        '--no-color',
        '--timestamps',
      ]),
      {
        // Output goes straight to the file descriptor; no pumping through
        // this process, so the follower is fully independent of it.
        stdio: ['ignore', fd, fd],
        env: { ...process.env, ...env },
        detached: true,
      },
    );
    await once(proc, 'spawn');
    proc.unref();
    debug('started docker compose log follower', {
      pid: proc.pid,
      logFile,
    });
    return { pid: proc.pid, logFile };
  } finally {
    closeSync(fd); // the child process holds its own copy
  }
}

export class DockerComposeProject {
  private constructor(
    private readonly composeFile: string,
    private readonly projectName: string,
    private readonly env?: Record<string, string>,
    private readonly logDir?: string,
    private readonly logFollowerPid?: number,
  ) {}

  static async start(
    composeFile: string,
    options: DockerComposeProjectOptions = {},
  ): Promise<DockerComposeProject> {
    const projectName =
      options.projectName ??
      options.env?.COMPOSE_PROJECT_NAME ??
      `mongodb-runner-${uuid()}`;
    debug('starting docker compose project', { composeFile, projectName });
    const { code, stderr } = await runDockerCompose(
      composeFile,
      projectName,
      options.env,
      ['up', '-d'],
    );
    if (code !== 0) {
      throw new Error(
        `docker compose up failed with exit code ${String(code)}: ${stderr}`,
      );
    }
    debug('docker compose project started');
    let logFollowerPid: number | undefined;
    if (options.logDir !== undefined) {
      try {
        ({ pid: logFollowerPid } = await startLogFollower(
          composeFile,
          projectName,
          options.env,
          options.logDir,
        ));
      } catch (err) {
        debug('failed to start docker compose log follower', err);
      }
    }
    return new DockerComposeProject(
      composeFile,
      projectName,
      options.env,
      options.logDir,
      logFollowerPid,
    );
  }

  /**
   * Write a snapshot of the logs of all containers in the project (including
   * stopped ones) to a file in `logDir`. Returns the path of the written file.
   */
  async dumpLogs(logDir: string): Promise<string> {
    await fs.mkdir(logDir, { recursive: true });
    const outFile = path.join(
      logDir,
      `docker-compose-${this.projectName}-${new Date()
        .toISOString()
        .replace(/[^-_a-zA-Z0-9.]/g, '')}.log`,
    );
    debug('dumping docker compose logs', { outFile });
    const fd = openSync(outFile, 'w');
    try {
      const proc = spawn(
        'docker',
        dockerComposeArgs(this.composeFile, this.projectName, [
          'logs',
          '--no-color',
          '--timestamps',
        ]),
        {
          stdio: ['ignore', fd, fd],
          env: { ...process.env, ...this.env },
        },
      );
      await once(proc, 'spawn');
      const [code] = await once(proc, 'exit');
      debug('dumped docker compose logs', { outFile, code });
    } finally {
      closeSync(fd);
    }
    return outFile;
  }

  private isLogFollowerRunning(): boolean {
    if (this.logFollowerPid === undefined) return false;
    try {
      process.kill(this.logFollowerPid, 0);
      return true;
    } catch {
      return false;
    }
  }

  async close(): Promise<void> {
    debug('stopping docker compose project', {
      composeFile: this.composeFile,
      projectName: this.projectName,
    });
    // If the log follower died (or was never started) while the project kept
    // running, fall back to a one-off snapshot before teardown destroys the
    // container logs.
    if (this.logDir !== undefined && !this.isLogFollowerRunning()) {
      try {
        await this.dumpLogs(this.logDir);
      } catch (err) {
        debug('failed to dump docker compose logs', err);
      }
    }
    const { code, stderr } = await runDockerCompose(
      this.composeFile,
      this.projectName,
      this.env,
      ['down', '--volumes'],
    );
    if (code !== 0) {
      debug('docker compose down failed', { code: String(code), stderr });
    }
    // The follower exits by itself once all containers are removed; the kill
    // is a fallback so we never leak the process.
    if (this.logFollowerPid !== undefined) {
      try {
        process.kill(this.logFollowerPid);
      } catch {
        /* already exited */
      }
    }
    debug('docker compose project stopped');
  }

  serialize(): unknown {
    return {
      composeFile: this.composeFile,
      projectName: this.projectName,
      env: this.env,
      logDir: this.logDir,
      logFollowerPid: this.logFollowerPid,
    };
  }

  static deserialize(serialized: any): DockerComposeProject {
    return new DockerComposeProject(
      serialized.composeFile,
      serialized.projectName,
      serialized.env,
      serialized.logDir,
      serialized.logFollowerPid,
    );
  }
}
