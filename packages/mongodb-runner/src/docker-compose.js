import { spawn } from 'child_process';
import { once } from 'events';
import { debug } from './util';
export class DockerComposeProject {
  constructor(composeFile) {
    this.composeFile = composeFile;
  }
  static async start(composeFile) {
    debug('starting docker compose project', composeFile);
    const proc = spawn('docker', ['compose', '-f', composeFile, 'up', '-d'], {
      stdio: ['inherit', 'pipe', 'pipe'],
    });
    await once(proc, 'spawn');
    let stderr = '';
    proc.stderr.setEncoding('utf8');
    proc.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    proc.stdout.resume();
    const [code] = await once(proc, 'exit');
    if (code !== 0) {
      throw new Error(
        `docker compose up failed with exit code ${String(code)}: ${stderr}`,
      );
    }
    debug('docker compose project started');
    return new DockerComposeProject(composeFile);
  }
  async close() {
    debug('stopping docker compose project', this.composeFile);
    const proc = spawn('docker', ['compose', '-f', this.composeFile, 'down'], {
      stdio: ['inherit', 'pipe', 'pipe'],
    });
    await once(proc, 'spawn');
    let stderr = '';
    proc.stderr.setEncoding('utf8');
    proc.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    proc.stdout.resume();
    const [code] = await once(proc, 'exit');
    if (code !== 0) {
      debug('docker compose down failed', { code: String(code), stderr });
    }
    debug('docker compose project stopped');
  }
  serialize() {
    return { composeFile: this.composeFile };
  }
  static deserialize(serialized) {
    return new DockerComposeProject(serialized.composeFile);
  }
}
