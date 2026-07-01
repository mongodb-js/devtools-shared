import { spawn } from 'child_process';
import { once } from 'events';
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
}

async function runDockerCompose(
  composeFile: string,
  projectName: string,
  env: Record<string, string> | undefined,
  args: string[],
): Promise<{ code: number | null; stderr: string }> {
  const proc = spawn(
    'docker',
    ['compose', '-f', composeFile, '-p', projectName, ...args],
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

export class DockerComposeProject {
  private constructor(
    private readonly composeFile: string,
    private readonly projectName: string,
    private readonly env?: Record<string, string>,
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
    return new DockerComposeProject(composeFile, projectName, options.env);
  }

  async close(): Promise<void> {
    debug('stopping docker compose project', {
      composeFile: this.composeFile,
      projectName: this.projectName,
    });
    const { code, stderr } = await runDockerCompose(
      this.composeFile,
      this.projectName,
      this.env,
      ['down', '--volumes'],
    );
    if (code !== 0) {
      debug('docker compose down failed', { code: String(code), stderr });
    }
    debug('docker compose project stopped');
  }

  serialize(): unknown {
    return {
      composeFile: this.composeFile,
      projectName: this.projectName,
      env: this.env,
    };
  }

  static deserialize(serialized: any): DockerComposeProject {
    return new DockerComposeProject(
      serialized.composeFile,
      serialized.projectName,
      serialized.env,
    );
  }
}
