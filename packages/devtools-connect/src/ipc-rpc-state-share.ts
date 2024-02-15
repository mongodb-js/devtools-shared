import type {
  MongoDBOIDCPlugin,
  IdPServerInfo,
  IdPServerResponse,
  OIDCCallbackContext,
} from '@mongodb-js/oidc-plugin';
import type { DevtoolsConnectionState } from './connect';
import { createServer as createHTTPServer, request } from 'http';
import type {
  Server as HTTPServer,
  IncomingMessage,
  ServerResponse,
} from 'http';
import { promisify } from 'util';
import crypto from 'crypto';
import os from 'os';
import { once, EventEmitter } from 'events';
import { promises as fs, rmSync } from 'fs';
import { PassThrough } from 'stream';
import type { Readable } from 'stream';
import { resolve as resolvePath } from 'path';

// Read data from `input` that has been signed with `sign()` and match
// the provided signature against the actual one.
export async function readSignedStream(
  input: Readable,
  signature: string | string[] | undefined,
  hmacKey: Uint8Array
): Promise<string> {
  if (!signature) throw new Error('Missing signature');
  if (Array.isArray(signature)) throw new Error('Multiple signatures');

  // Pipe the input stream into two streams, one for decoding it from UTF-8,
  // one for applying the HMAC to it.
  // (This is a bit different from the signing side because there we typically
  // start with a single string and not an input stream.)
  const verify = crypto.createHmac('sha256', hmacKey);
  const inputFromUtf8 = input.pipe(new PassThrough()).setEncoding('utf8');
  input.pipe(verify);
  const verifyFinish = once(verify, 'finish');

  let body = '';
  for await (const chunk of inputFromUtf8) {
    body += chunk;
  }
  await verifyFinish;

  if (verify.read().toString('base64') !== signature) {
    throw new Error('Signature mismatch');
  }
  return body;
}

// Sign a chunk of data using an HMAC key.
export function sign(
  payload: Uint8Array | string,
  hmacKey: Uint8Array
): string {
  return crypto.createHmac('sha256', hmacKey).update(payload).digest('base64');
}

// A generic server that provides RPC functionality over an IPC communication channel
// (UNIX socket or Named Pipe on Windows). Messages are authenticated between client
// and server through HMAC signing so that it is not possible to perform RPC calls
// without the HMAC secret key.
export abstract class RpcServer {
  private hmacKey: Buffer;
  private server: HTTPServer;
  private serverPathPrefix: string;
  private cleanupCallback?: () => void;
  static ctr = 0;

  protected constructor(serverPathPrefix: string) {
    this.serverPathPrefix = serverPathPrefix.replace(/[^a-zA-Z0-9]/g, '');
    // Initialized in _init()
    this.hmacKey = undefined as unknown as Buffer;
    this.server = undefined as unknown as HTTPServer;
  }

  // Returns an opaque string identifying the server's listening
  // address/path and the secret key used for authentication.
  public get handle(): string {
    return JSON.stringify([
      this.hmacKey.toString('base64'),
      this.server.address(),
    ]);
  }

  protected async _init(): Promise<void> {
    this.server = createHTTPServer((req, res) => this._handleRequest(req, res));
    this.hmacKey = await promisify(crypto.randomBytes)(16);
    await this._serverListen();
  }

  private async _serverListen(): Promise<void> {
    if (this.cleanupCallback) {
      throw new Error('RPC server already listening');
    }
    let path: string;
    const name = `${this.serverPathPrefix}_${
      process.pid
    }_ipc_${RpcServer.ctr++}_${Math.floor(Math.random() * 10000)}`;
    if (process.platform === 'win32') {
      path = `\\\\.\\pipe\\${name}`;
    } else {
      const tmpdir = process.env.XDG_RUNTIME_DIR ?? os.tmpdir();
      path = resolvePath(`${tmpdir}/${name}.sock`);
    }
    this.server.listen({ path, exclusive: true });
    await once(this.server, 'listening');
    // The race condition in applying chmod after listening is just inherent
    // to the Node.js API for sockets. We said we'd set the file mode to 0o600
    // in the design and it probably doesn't hurt to do this either way.
    await fs.chmod(path, 0o600);

    // In practice, mongosh and Compass may not always know when a connection
    // state fully closes, so we're adding a process 'exit' listener that cleans
    // up the file if it hasn't been closed so far.
    this.cleanupCallback = () => {
      if (process.platform !== 'win32') {
        try {
          rmSync(path);
        } catch {
          /* ignore */
        }
      }
    };
    process.on('exit', this.cleanupCallback);
  }

  private async _handleRequest(req: IncomingMessage, res: ServerResponse) {
    let response;
    try {
      const content = JSON.parse(
        await readSignedStream(req, req.headers['x-signature'], this.hmacKey)
      );

      response = { status: 200, ...(await this.handleRpc(content)) };
    } catch (err: unknown) {
      response = {
        status: 500,
        error:
          err && typeof err === 'object' && 'message' in err
            ? err.message
            : String(err),
      };
    }
    res.statusCode = response.status;
    const payload = new TextEncoder().encode(JSON.stringify(response));
    res.setHeader('content-type', 'application/json');
    res.setHeader('content-length', payload.length);
    res.setHeader('x-signature', sign(payload, this.hmacKey));
    res.end(payload);
  }

  public async close(): Promise<void> {
    this.server.close();
    await once(this.server, 'close');
    this.cleanupCallback?.();
    this.cleanupCallback = undefined;
  }

  protected abstract handleRpc(
    content: Record<string, unknown>
  ): Promise<Record<string, unknown>>;
}

// Client corresponding to RpcServer instances.
export class RpcClient {
  private hmacKey: Buffer;
  private serverAddress: string;

  constructor(handle: string) {
    const [hmacKeyBase64, serverAddr] = JSON.parse(handle);
    this.serverAddress = serverAddr;
    this.hmacKey = Buffer.from(hmacKeyBase64, 'base64');
  }

  public async makeRpcCall(
    reqData: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const payload = new TextEncoder().encode(JSON.stringify(reqData));
    const req = request({
      socketPath: this.serverAddress,
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'content-length': payload.length,
        'x-signature': sign(payload, this.hmacKey),
      },
    });
    req.end(payload);
    const [res] = (await once(req, 'response')) as [IncomingMessage];
    const content = JSON.parse(
      await readSignedStream(res, res.headers['x-signature'], this.hmacKey)
    );
    if (res.statusCode !== 200 || content.status !== 200) {
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      throw new Error(
        String(content.error ?? `${res.statusCode} ${res.statusMessage}`)
      );
    }
    return content;
  }
}

// An implementation of RpcServer that specifically provides RPC access
// for OIDC callbacks as used in MongoDB.
export class StateShareServer extends RpcServer {
  private state: DevtoolsConnectionState;
  private abortContexts = new Map<string, AbortController>();

  private constructor(state: DevtoolsConnectionState) {
    super(state.productName);
    this.state = state;
  }

  static async create(
    state: DevtoolsConnectionState
  ): Promise<StateShareServer> {
    const result = new this(state);
    await result._init();
    return result;
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  protected async handleRpc(content: any): Promise<Record<string, unknown>> {
    const oidcCallbacks =
      this.state.oidcPlugin.mongoClientOptions.authMechanismProperties;
    let oidcMethod: keyof typeof oidcCallbacks;
    switch (content.method) {
      case 'oidc:_abort':
        this.abortContexts.get(content.timeoutContextId)?.abort();
        return {};
      case 'oidc:REQUEST_TOKEN_CALLBACK':
        oidcMethod = 'REQUEST_TOKEN_CALLBACK';
      // fallthrough
      case 'oidc:REFRESH_TOKEN_CALLBACK': {
        oidcMethod ??= 'REFRESH_TOKEN_CALLBACK';

        const abortController = new AbortController();
        this.abortContexts.set(content.timeoutContextId, abortController);
        try {
          const result = await oidcCallbacks[oidcMethod](content.info, {
            ...content.context,
            timeoutContext: abortController.signal,
          });
          return { result };
        } finally {
          this.abortContexts.delete(content.timeoutContextId);
        }
      }
      default:
        throw new Error(`Unknown method ${JSON.stringify(content.method)}`);
    }
  }
}

// A client corresponding to StateShareServer.
export class StateShareClient extends RpcClient {
  public oidcPlugin: MongoDBOIDCPlugin;

  constructor(handle: string) {
    super(handle);

    this.oidcPlugin = {
      destroy() {
        return Promise.resolve();
      },
      serialize() {
        throw new Error(
          'serialize() not supported in devtools-connect state-share clients'
        );
      },
      logger: new EventEmitter(),
      mongoClientOptions: {
        authMechanismProperties: {
          REQUEST_TOKEN_CALLBACK: this._oidcCallback.bind(
            this,
            'oidc:REQUEST_TOKEN_CALLBACK'
          ),
          REFRESH_TOKEN_CALLBACK: this._oidcCallback.bind(
            this,
            'oidc:REFRESH_TOKEN_CALLBACK'
          ),
        },
      },
    };
  }

  private async _oidcCallback(
    method: string,
    info: IdPServerInfo,
    _context: OIDCCallbackContext
  ): Promise<IdPServerResponse> {
    const timeoutContextId = (await promisify(crypto.randomBytes)(16)).toString(
      'base64'
    );
    const { timeoutContext, ...context } = _context;
    const abort = async () => {
      await this.makeRpcCall({
        method: 'oidc:_abort',
        timeoutContextId,
      });
    };
    timeoutContext?.addEventListener('abort', abort);
    try {
      const { result } = await this.makeRpcCall({
        method,
        timeoutContextId,
        context,
        info,
      });
      return result as IdPServerResponse;
    } finally {
      timeoutContext?.removeEventListener('abort', abort);
    }
  }
}
