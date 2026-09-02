import { execFile as execFileCb } from 'child_process';
import { debug } from './util';

/** An Amazon ECR registry that SLS container images are pulled from. */
export interface EcrRegistry {
  /** Registry host, e.g. `664315256653.dkr.ecr.us-east-1.amazonaws.com`. */
  registry: string;
  /** AWS account ID owning the registry. */
  registryId: string;
  /** AWS region the registry lives in. */
  region: string;
}

const ECR_HOST_RE =
  /^(?<registryId>\d{12})\.dkr\.ecr\.(?<region>[a-z0-9-]+)\.amazonaws\.com$/;

/**
 * Identify the ECR registry a docker image repository refers to, or
 * `undefined` if the repository is not hosted on ECR.
 */
export function parseEcrRegistry(imageRepo: string): EcrRegistry | undefined {
  const [host] = imageRepo.split('/', 1);
  const match = ECR_HOST_RE.exec(host);
  if (!match?.groups) return undefined;
  const { registryId, region } = match.groups;
  return { registry: host, registryId, region };
}

/**
 * Injection point for tests. Exported because it appears in the signatures of
 * the exported functions below, but deliberately not re-exported from the
 * package entrypoint.
 */
export interface EcrLoginDeps {
  execFile: typeof execFileCb;
}

function manualLoginCommand(registry: EcrRegistry): string {
  return (
    `aws ecr get-authorization-token --region ${registry.region} ` +
    `--registry-ids ${registry.registryId} ` +
    `--query 'authorizationData[0].authorizationToken' --output text | ` +
    `base64 -d | cut -d: -f2- | ` +
    `docker login --username AWS --password-stdin ${registry.registry}`
  );
}

async function getAuthorizationToken(
  registry: EcrRegistry,
  execFile: typeof execFileCb,
): Promise<string> {
  return await new Promise((resolve, reject) => {
    execFile(
      'aws',
      [
        'ecr',
        'get-authorization-token',
        '--region',
        registry.region,
        // Scoping to the target account is essential. Without it -- as with
        // the more familiar `get-login-password` -- the token is minted for
        // the caller's own registry, and docker login rejects it with a bare
        // `status: 400 Bad Request`.
        '--registry-ids',
        registry.registryId,
        '--query',
        'authorizationData[0].authorizationToken',
        '--output',
        'text',
      ],
      (err, stdout) => {
        if (err) {
          if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
            return reject(
              new Error(
                `The AWS CLI is required to authenticate to ${registry.registry}. ` +
                  `Install it, or authenticate manually with:\n  ${manualLoginCommand(
                    registry,
                  )}\nIf you have already authenticated another way, pass --slsSkipEcrLogin.`,
              ),
            );
          }
          return reject(err);
        }
        resolve(String(stdout).trim());
      },
    );
  });
}

async function dockerLogin(
  registry: EcrRegistry,
  password: string,
  execFile: typeof execFileCb,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const proc = execFile(
      'docker',
      ['login', '--username', 'AWS', '--password-stdin', registry.registry],
      (err) => {
        if (err) {
          if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
            return reject(
              new Error(
                `docker is required to authenticate to ${registry.registry}, but was not found on PATH. ` +
                  `Install Docker, or pass --slsSkipEcrLogin if you have already authenticated another way.`,
              ),
            );
          }
          const stderr = String(
            (err as { stderr?: string }).stderr ?? '',
          ).trim();
          return reject(
            new Error(
              `docker login to ${registry.registry} failed: ${
                stderr || err.message
              }\nNote that minting a token only requires ecr:GetAuthorizationToken in your ` +
                `own AWS account, while pulling additionally requires ecr:BatchGetImage granted ` +
                `by a resource policy on the repositories in account ${registry.registryId}. ` +
                `A token that mints successfully but cannot pull means the latter is missing.`,
            ),
          );
        }
        resolve();
      },
    );
    // A failed spawn or an early exit makes this write emit EPIPE/ENOENT on the
    // stream; the execFile callback already reports the real failure, so
    // swallowing it here just keeps it from becoming an uncaught exception.
    proc.stdin?.on('error', () => undefined);
    proc.stdin?.write(password);
    proc.stdin?.end();
  });
}

/**
 * Authenticate the local docker daemon against an ECR registry so that SLS
 * images can be pulled.
 */
export async function dockerLoginToEcr(
  registry: EcrRegistry,
  deps: Partial<EcrLoginDeps> = {},
): Promise<void> {
  const execFile = deps.execFile ?? execFileCb;
  debug('logging in to ECR registry', registry);
  const token = await getAuthorizationToken(registry, execFile);
  const decoded = Buffer.from(token, 'base64').toString('utf8');
  // The token decodes to `AWS:<password>`. The password itself contains colons,
  // so only the first one separates the two fields. Check the username rather
  // than just finding a colon, so that non-token output from the AWS CLI (an
  // error string, a warning, `None`) is reported as such instead of being
  // sliced into a bogus password.
  const separator = decoded.indexOf(':');
  const password = separator === -1 ? '' : decoded.slice(separator + 1);
  if (decoded.slice(0, separator) !== 'AWS' || !password) {
    throw new Error(
      `Expected an ECR authorization token for ${registry.registry} of the form ` +
        `'AWS:<password>', but the AWS CLI returned something else. Run the ` +
        `command by hand to see what it produced:\n  ${manualLoginCommand(
          registry,
        )}`,
    );
  }
  await dockerLogin(registry, password, execFile);
  debug('ECR login succeeded', { registry: registry.registry });
}

/**
 * Log in to the registry backing `imageRepo`, if it is an ECR registry and
 * `enabled` is set. A no-op otherwise.
 */
export async function maybeLoginToEcr(
  imageRepo: string,
  enabled: boolean,
  deps: Partial<EcrLoginDeps> = {},
): Promise<void> {
  if (!enabled) {
    debug('skipping ECR login (disabled)');
    return;
  }
  const registry = parseEcrRegistry(imageRepo);
  if (!registry) {
    debug('skipping ECR login (not an ECR repository)', { imageRepo });
    return;
  }
  await dockerLoginToEcr(registry, deps);
}
