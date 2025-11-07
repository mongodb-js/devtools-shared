import { spawn } from 'child_process';
import { once } from 'events';
import { parseCLIArgs, OIDCMockProvider } from '@mongodb-js/oidc-mock-provider';
import { debug } from './util';

if (process.env.RUN_OIDC_MOCK_PROVIDER !== undefined) {
  (async function main() {
    const uuid = crypto.randomUUID();
    debug('starting OIDC mock provider with UUID', uuid);
    const config = parseCLIArgs(process.env.RUN_OIDC_MOCK_PROVIDER);
    const sampleTokenConfig = await config.getTokenPayload({
      client_id: 'cid',
      scope: 'scope',
    });
    debug('sample OIDC token config', sampleTokenConfig, uuid);
    const audience = sampleTokenConfig.payload.aud;
    const provider = await OIDCMockProvider.create({
      ...config,
      overrideRequestHandler(url, req, res) {
        if (new URL(url).pathname === `/shutdown/${uuid}`) {
          res.on('close', () => {
            process.exit();
          });
          res.writeHead(200);
          res.end();
          return;
        }
        return config.overrideRequestHandler?.(url, req, res);
      },
    });
    debug('started OIDC mock provider with UUID', {
      issuer: provider.issuer,
      uuid,
      audience,
    });
    process.send?.({
      issuer: provider.issuer,
      uuid,
      audience,
    });
  })().catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Error starting OIDC mock identity provider server:', error);
    process.exitCode = 1;
  });
}

export class OIDCMockProviderProcess {
  pid?: number;
  issuer?: string;
  uuid?: string;
  audience?: string;

  serialize(): unknown /* JSON-serializable */ {
    return {
      pid: this.pid,
      issuer: this.issuer,
      uuid: this.uuid,
      audience: this.audience,
    };
  }

  static deserialize(serialized: any): OIDCMockProviderProcess {
    const process = new OIDCMockProviderProcess();
    process.pid = serialized.pid;
    process.issuer = serialized.issuer;
    process.uuid = serialized.uuid;
    process.audience = serialized.audience;
    return process;
  }

  private constructor() {
    /* see .start() */
  }

  static async start(args: string): Promise<OIDCMockProviderProcess> {
    const oidcProc = new this();
    debug('spawning OIDC child process', [process.execPath, __filename], args);
    const proc = spawn(process.execPath, [__filename], {
      stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
      env: {
        ...process.env,
        RUN_OIDC_MOCK_PROVIDER: args,
      },
      detached: true,
      serialization: 'advanced',
    });
    await once(proc, 'spawn');
    try {
      oidcProc.pid = proc.pid;
      const [msg] = await Promise.race([
        once(proc, 'message'),
        once(proc, 'exit').then(() => {
          throw new Error(
            `OIDC mock provider process exited before sending message (${String(proc.exitCode)}, ${String(proc.signalCode)})`,
          );
        }),
      ]);
      debug('received message from OIDC child process', msg);
      oidcProc.issuer = msg.issuer;
      oidcProc.uuid = msg.uuid;
      oidcProc.audience = msg.audience;
    } catch (err) {
      proc.kill();
      throw err;
    }
    proc.unref();
    proc.channel?.unref();
    debug('OIDC setup complete, uuid =', oidcProc.uuid);
    return oidcProc;
  }

  async close(): Promise<void> {
    try {
      if (this.pid) process.kill(this.pid, 0);
    } catch (e) {
      if (typeof e === 'object' && e && 'code' in e && e.code === 'ESRCH')
        return; // process already exited
    }

    if (!this.issuer || !this.uuid) return;
    await fetch(new URL(this.issuer, `/shutdown/${this.uuid}`));
    this.uuid = undefined;
  }
}
