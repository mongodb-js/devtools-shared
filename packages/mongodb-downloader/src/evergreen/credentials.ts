import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';

export const DEFAULT_EVERGREEN_BASE_URL = 'https://evergreen.mongodb.com';

export interface EvergreenCredentials {
  user: string;
  key: string;
}

export interface ResolvedEvergreenAuth {
  credentials: EvergreenCredentials;
  baseUrl: string;
}

export function credentialsFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): EvergreenCredentials | null {
  const user = env.EVERGREEN_API_USER;
  const key = env.EVERGREEN_API_KEY;
  if (user && key) return { user, key };
  return null;
}

function unquote(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

/**
 * Minimal parser for the flat scalar keys we need out of ~/.evergreen.yml
 * (`api_user`, `api_key`, `api_server_host`). Intentionally not a full YAML
 * parser — the CLI writes these as flat top-level `key: value` lines. The
 * `/api` suffix Evergreen writes on `api_server_host` is stripped so the base
 * URL is the bare host (REST paths are added by the client).
 */
export function parseEvergreenYml(contents: string): {
  user?: string;
  key?: string;
  baseUrl?: string;
} {
  const result: { user?: string; key?: string; baseUrl?: string } = {};
  for (const line of contents.split('\n')) {
    const match = /^([a-z_]+):\s*(.+?)\s*$/.exec(line);
    if (!match) continue;
    const [, rawKey, rawValue] = match;
    const value = unquote(rawValue);
    if (rawKey === 'api_user') result.user = value;
    else if (rawKey === 'api_key') result.key = value;
    else if (rawKey === 'api_server_host') {
      result.baseUrl = value.replace(/\/api\/?$/, '');
    }
  }
  return result;
}

export async function resolveEvergreenAuth(
  opts: {
    env?: NodeJS.ProcessEnv;
    configPath?: string;
    defaultBaseUrl?: string;
  } = {},
): Promise<ResolvedEvergreenAuth> {
  const env = opts.env ?? process.env;
  const configPath =
    opts.configPath ?? path.join(os.homedir(), '.evergreen.yml');
  const defaultBaseUrl = opts.defaultBaseUrl ?? DEFAULT_EVERGREEN_BASE_URL;

  const envCreds = credentialsFromEnv(env);
  if (envCreds) {
    return { credentials: envCreds, baseUrl: defaultBaseUrl };
  }

  let parsed: { user?: string; key?: string; baseUrl?: string } = {};
  try {
    parsed = parseEvergreenYml(await fs.readFile(configPath, 'utf8'));
  } catch {
    /* ignore: file missing/unreadable falls through to the error below */
  }
  if (parsed.user && parsed.key) {
    return {
      credentials: { user: parsed.user, key: parsed.key },
      baseUrl: parsed.baseUrl ?? defaultBaseUrl,
    };
  }

  throw new Error(
    'No Evergreen credentials found. Set EVERGREEN_API_USER and ' +
      'EVERGREEN_API_KEY, or configure api_user/api_key in ~/.evergreen.yml ' +
      '(see https://spruce.mongodb.com/preferences/cli).',
  );
}
