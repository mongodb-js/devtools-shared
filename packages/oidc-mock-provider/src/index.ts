import { once } from 'events';
import type {
  IncomingMessage,
  ServerResponse,
  Server as HTTPServer,
} from 'http';
import { createServer as createHTTPServer } from 'http';
import type { AddressInfo } from 'net';
import crypto from 'crypto';
import type { KeyPairKeyObjectResult } from 'crypto';
import { promisify } from 'util';
import { URLSearchParams } from 'url';

async function randomString(n: number, enc: BufferEncoding) {
  return (await promisify(crypto.randomBytes)(n)).toString(enc);
}
function toJSONtoUTF8toBase64Url(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj), 'utf8').toString('base64url');
}

export interface TokenMetadata {
  // Using lower_snake_case here for some of the standard OIDC
  // parameters that are defined this way.
  client_id: string;
  scope: string;
}

export type MaybePromise<T> = T | PromiseLike<T>;

export interface OIDCMockProviderConfig {
  /**
   * Return fields to be included in the generated Access and ID Tokens.
   * This should include e.g. `sub` and any other OIDC claims that are relevant.
   */
  getTokenPayload(
    metadata: TokenMetadata
  ): MaybePromise<{ expires_in: number; payload: Record<string, unknown> }>;

  /**
   * Allow override special handling for specific types of requests.
   */
  overrideRequestHandler?(
    url: string,
    req: IncomingMessage,
    res: ServerResponse
  ): MaybePromise<void>;

  /**
   * Optional port number for the server to listen on.
   */
  port?: number;

  /**
   * Optional hostname for the server to listen on.
   */
  hostname?: string;
}

/**
 * A mock OIDC authorization server (AS) implementation.
 *
 * This mock will happily give out valid tokens with arbitrary contents, so
 * it is absolutely unusable for usage outside of testing!
 */
export class OIDCMockProvider {
  public httpServer: HTTPServer;
  public issuer: string; // URL of the HTTP server

  // This provider only supports a single RSA key currently.
  private kid: string;
  private keys: KeyPairKeyObjectResult;

  private state = new Map<string, unknown>();
  private config: OIDCMockProviderConfig;

  private constructor(config: OIDCMockProviderConfig) {
    this.httpServer = createHTTPServer(
      (req, res) => void this.handleRequest(req, res)
    );
    this.config = config;

    // Initialized in .init().
    this.issuer = '';
    this.kid = '';
    this.keys = {} as unknown as typeof this.keys;
  }

  private async init(): Promise<this> {
    this.httpServer.listen(this.config.port ?? 0, this.config.hostname);
    await once(this.httpServer, 'listening');
    const { port } = this.httpServer.address() as AddressInfo;
    this.issuer = `http://${this.config.hostname ?? 'localhost'}:${port}`;
    this.kid = await randomString(8, 'hex');
    this.keys = await promisify(crypto.generateKeyPair)('rsa', {
      modulusLength: 2048,
    });
    return this;
  }

  public static async create(
    config: OIDCMockProviderConfig
  ): Promise<OIDCMockProvider> {
    return await new this(config).init();
  }

  public async close(): Promise<void> {
    this.httpServer.close();
    await once(this.httpServer, 'close');
  }

  private async handleRequest(
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> {
    res.setHeader('Content-Type', 'application/json');
    try {
      const url = new URL(req.url || '/', this.issuer);
      if (req.method === 'POST') {
        // For simplicity, just merge POST parameters with GET parameters...
        if (
          req.headers['content-type'] !== 'application/x-www-form-urlencoded'
        ) {
          throw new Error(
            'Only accepting application/x-www-form-urlencoded POST bodies'
          );
        }
        let body = '';
        for await (const chunk of req.setEncoding('utf8')) {
          body += chunk;
        }
        const parsed = new URLSearchParams(body);
        url.search = new URLSearchParams({
          ...Object.fromEntries(url.searchParams),
          ...Object.fromEntries(parsed),
        }).toString();
      }
      let result: unknown;
      await this.config.overrideRequestHandler?.(url.toString(), req, res);
      if (res.writableEnded) return;
      switch (url.pathname) {
        case '/.well-known/openid-configuration':
          result = {
            issuer: this.issuer,
            token_endpoint: new URL('/token', this.issuer).toString(),
            authorization_endpoint: new URL(
              '/authorize',
              this.issuer
            ).toString(),
            jwks_uri: new URL('/jwks', this.issuer).toString(),
            device_authorization_endpoint: new URL(
              '/device',
              this.issuer
            ).toString(),
          };
          break;
        case '/jwks':
          // Provide this server's public key in JWK format
          result = {
            keys: [
              {
                alg: 'RS256',
                kid: this.kid,
                ...this.keys.publicKey.export({ format: 'jwk' }),
              },
            ],
          };
          break;
        case '/authorize': {
          // Authorization code flow entry point, immediately redirect to client with success
          const {
            client_id,
            scope,
            response_type,
            redirect_uri,
            code_challenge,
            code_challenge_method,
            state,
          } = Object.fromEntries(url.searchParams);
          if (response_type !== 'code') {
            throw new Error(`unknown response_type ${response_type}`);
          }
          const redirectTo = new URL(redirect_uri);
          redirectTo.search = new URLSearchParams({
            code: await this.storeForSingleRetrieval({
              client_id,
              scope,
              code_challenge,
              code_challenge_method,
            }),
            state,
          }).toString();
          res.statusCode = 307;
          res.setHeader('Location', redirectTo.toString());
          res.end(`Moved to ${redirectTo.toString()}`);
          break;
        }
        case '/token': {
          // Provide a token after successful Auth Code Flow/Device Auth Flow
          const { code, code_verifier, device_code } = Object.fromEntries(
            url.searchParams
          );
          const {
            client_id,
            scope,
            code_challenge,
            code_challenge_method,
            isDeviceCode,
          } = this.retrieveFromStorage(device_code ?? code);

          if (!isDeviceCode) {
            // Verify the code challenge. Not strictly necessary here since
            // we assume the OIDC implementation we are using to be correct
            // and this server is test-only, but also not a lot of extra work
            // to add this.
            if (code_challenge_method !== 'S256') {
              throw new Error(
                `Unsupported code challenge method ${String(
                  code_challenge_method
                )}`
              );
            }

            const expectedChallenge = crypto
              .createHash('sha256')
              .update(code_verifier)
              .digest('hex');
            const actualChallenge = Buffer.from(
              // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
              code_challenge,
              'base64'
            ).toString('hex');
            if (expectedChallenge !== actualChallenge) {
              throw new Error('Challenge mismatch');
            }
          }

          const { access_token, id_token, expires_in } = await this.issueToken({
            client_id,
            scope,
          });

          // Issue a token response:
          result = {
            access_token: access_token,
            id_token: id_token,
            refresh_token: await this.storeForSingleRetrieval({
              id_token,
              access_token,
            }),
            token_type: 'Bearer',
            expires_in,
          };
          break;
        }
        case '/device': {
          const { client_id, scope } = Object.fromEntries(url.searchParams);
          const device_code = await this.storeForSingleRetrieval({
            client_id,
            scope,
            isDeviceCode: true,
          });
          result = {
            device_code,
            user_code: await randomString(8, 'hex'),
            verification_uri: new URL('/verify-device', this.issuer).toString(),
            expires_in: 3600,
            interval: 1,
          };
          break;
        }
        case '/verify-device':
          // The Device Auth Flow requires a URL to point users at.
          // We can just use this as a dummy endpoint.
          res.statusCode = 200;
          result = { status: 'Verified!' };
          break;
        default:
          res.statusCode = 404;
          result = { error: 'not found:' + url.pathname };
          break;
      }
      res.end(JSON.stringify(result));
    } catch (err) {
      res.statusCode = 500;
      res.end(
        JSON.stringify({
          error:
            typeof err === 'object' && err && 'message' in err
              ? (err as Error).message
              : String(err),
        })
      );
    }
  }

  private async issueToken(
    metadata: TokenMetadata
  ): Promise<{ expires_in: number; access_token: string; id_token: string }> {
    const { expires_in, payload } = await this.config.getTokenPayload(metadata);
    const currentTimeInSeconds = Math.floor(Date.now() / 1000);
    const header = {
      alg: 'RS256',
      typ: 'JWT',
      kid: this.kid,
    };
    const fullPayload = {
      jti: await randomString(8, 'hex'),
      iat: currentTimeInSeconds,
      exp: currentTimeInSeconds + expires_in,
      client_id: metadata.client_id,
      scope: metadata.scope,
      iss: this.issuer,
      aud: metadata.client_id,
      ...payload,
    };
    const makeToken = (payload: Record<string, unknown>) => {
      const signedMaterial =
        toJSONtoUTF8toBase64Url(header) +
        '.' +
        toJSONtoUTF8toBase64Url(payload);
      const signature = crypto
        .createSign('RSA-SHA256')
        .update(signedMaterial)
        .sign(this.keys.privateKey, 'base64url');
      return `${signedMaterial}.${signature}`;
    };
    return {
      expires_in,
      access_token: makeToken(fullPayload),
      // In an ID Token, aud === client_id, in an Access Token, not necessarily
      id_token: makeToken({ ...fullPayload, aud: metadata.client_id }),
    };
  }

  // Store a value for later re-use in another HTTP request/response pair.
  private async storeForSingleRetrieval(payload: unknown): Promise<string> {
    const id = await randomString(12, 'base64');
    this.state.set(id, payload);
    return id;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private retrieveFromStorage(id: string): any {
    const entry = this.state.get(id);
    this.state.delete(id);
    return entry;
  }
}
