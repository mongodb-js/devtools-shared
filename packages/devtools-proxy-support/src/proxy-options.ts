import type { ConnectionOptions } from 'tls';
import type { TunnelOptions } from './socks5';
import type { ClientRequest } from 'http';

// Should be an opaque type, but TS does not support those.
export type DevtoolsProxyOptionsSecrets = string;

export interface DevtoolsProxyOptions {
  // Can be an ssh://, socks5://, http://, https:// or pac<...>://  URL
  // Everything besides ssh:// gets forwarded to the `proxy-agent` npm package
  proxy?: string;
  // With the semantics of the NO_PROXY environment variable,
  // defaults to `localhost,127.0.0.1,::1`
  noProxyHosts?: string;
  // Takes effect if `proxy` was not specified.
  useEnvironmentVariableProxies?: boolean;
  sshOptions?: {
    identityKeyFile?: string;
    identityKeyPassphrase?: string;
  };

  // Not being honored by the translate-to-electron functionality
  // This will be merged with the system CA list and the Node.js built-in CA list
  ca?: ConnectionOptions['ca'];

  // Mostly intended for testing, defaults to `process.env`.
  // This should usually not be stored, and secrets will not be
  // redacted from this option.
  env?: Record<string, string | undefined>;
}

// https://www.electronjs.org/docs/latest/api/structures/proxy-config
interface ElectronProxyConfig {
  mode?: 'direct' | 'auto_detect' | 'pac_script' | 'fixed_servers' | 'system';
  pacScript?: string;
  proxyRules?: string;
  proxyBypassRules?: string;
}

// Reads through all environment variables and gathers proxy settings from them
export function proxyConfForEnvVars(env: Record<string, string | undefined>): {
  map: Map<string, string>;
  noProxy: string;
} {
  const map = new Map<string, string>();
  let noProxy = '';
  for (const [_key, value] of Object.entries(env)) {
    if (value === undefined) continue;
    const key = _key.toUpperCase();
    if (key.endsWith('_PROXY') && key !== 'NO_PROXY') {
      map.set(key.replace(/_PROXY$/, '').toLowerCase(), value || 'direct://');
    }
    if (key === 'NO_PROXY') noProxy = value;
  }
  return { map, noProxy };
}

// Whether a given URL should be proxied or not, according to `noProxy`
function shouldProxy(noProxy: string, url: URL): boolean {
  if (!noProxy) return true;
  if (noProxy === '*') return false;
  for (const noProxyItem of noProxy.split(/[\s,]/)) {
    let { host, port } =
      noProxyItem.match(/(?<host>.+)(:(?<port>\d+)$)?/)?.groups ?? {};
    if (!host) {
      host = noProxyItem;
      port = '';
    }
    if (port && url.port !== port) continue;
    if (
      host === url.hostname ||
      (host.startsWith('*') && url.hostname.endsWith(host.substring(1)))
    )
      return false;
  }
  return true;
}

// Create a function which returns the proxy URL for a given target URL,
// based on the proxy config passed to it.
export function proxyForUrl(
  proxyOptions: DevtoolsProxyOptions,
  target: string,
  req?: ClientRequest & { overrideProtocol?: string }
): string {
  if (proxyOptions.proxy) {
    const proxyUrl = proxyOptions.proxy;
    if (new URL(proxyUrl).protocol === 'direct:') return '';
    if (shouldProxy(proxyOptions.noProxyHosts || '', new URL(target))) {
      return proxyUrl;
    }
    return '';
  }

  if (proxyOptions.useEnvironmentVariableProxies) {
    const { map, noProxy } = proxyConfForEnvVars(
      proxyOptions.env ?? process.env
    );
    const url = new URL(target);
    const protocol = (req?.overrideProtocol ?? url.protocol).replace(/:$/, '');
    const combinedNoProxyRules = [noProxy, proxyOptions.noProxyHosts]
      .filter(Boolean)
      .join(',');
    const proxyForProtocol = map.get(protocol) || map.get('all');
    if (proxyForProtocol && shouldProxy(combinedNoProxyRules, url)) {
      return proxyForProtocol;
    }
    return '';
  }

  return '';
}

function validateElectronProxyURL(url: URL | string): string {
  url = new URL(url.toString());
  // ssh and authenticated proxies are not supported by Electron/Chromium currently.
  // (See https://issues.chromium.org/issues/40829748, https://bugs.chromium.org/p/chromium/issues/detail?id=1309413
  // and related tickets for history.)
  // If we do want to support them at some point, a possible way to achieve this would be
  // to use a local in-application Socks5 proxy server which reaches out to the
  // actual target proxy (or directly connects, depending on the configuration),
  // and then passing the local proxy's information to Electron.
  // A core downside with this approach, however, is that because the proxy cannot be
  // authenticated, it would be available to any local application, which is problematic
  // when running on multi-user machine where the proxy would then be available to
  // arbitraty users.
  if (url.protocol === 'ssh:') {
    throw new Error(
      `Using ssh:// proxies for generic browser proxy usage is not supported (translating '${redactUrl(
        url
      )}')`
    );
  }
  if (url.username || url.password) {
    throw new Error(
      `Using authenticated proxies for generic browser proxy usage is not supported (translating '${redactUrl(
        url
      )}')`
    );
  }
  if (
    url.protocol !== 'http:' &&
    url.protocol !== 'https:' &&
    url.protocol !== 'socks5:'
  ) {
    throw new Error(
      `Unsupported proxy protocol (translating '${redactUrl(url)}')`
    );
  }
  if (url.search || url.hash) {
    throw new Error(
      `Unsupported URL extensions in proxy specification (translating '${redactUrl(
        url
      )}')`
    );
  }
  if (url.pathname === '') return url.toString();
  if (url.pathname !== '/') {
    throw new Error(
      `Unsupported URL pathname in proxy specification (translating '${redactUrl(
        url
      )}')`
    );
  }
  return url.toString().replace(/\/$/, '');
}

// Convert our own `DevtoolsProxyOptions` to the format used by Electron.
export function translateToElectronProxyConfig(
  proxyOptions: DevtoolsProxyOptions
): ElectronProxyConfig {
  if (proxyOptions.proxy) {
    let url = proxyOptions.proxy;
    // https://en.wikipedia.org/wiki/Proxy_auto-config
    if (new URL(url).protocol.startsWith('pac+')) {
      url = url.replace('pac+', '');
      return {
        mode: 'pac_script',
        pacScript: url.toString(),
        proxyBypassRules: proxyOptions.noProxyHosts,
      };
    }
    return {
      mode: 'fixed_servers',
      proxyRules: validateElectronProxyURL(url),
      proxyBypassRules: proxyOptions.noProxyHosts,
    };
  }

  if (proxyOptions.useEnvironmentVariableProxies) {
    const proxyRulesList: string[] = [];
    const proxyBypassRulesList = [proxyOptions.noProxyHosts];
    const { map, noProxy } = proxyConfForEnvVars(
      proxyOptions.env ?? process.env
    );
    for (const key of ['http', 'https', 'ftp']) {
      // supported protocols for Electron proxying
      const value = map.get(key) || map.get('all');
      if (!value) continue;
      proxyRulesList.push(`${key}=${validateElectronProxyURL(value)}`);
    }
    proxyBypassRulesList.push(noProxy);

    const proxyRules = proxyRulesList.join(';');
    const proxyBypassRules =
      proxyBypassRulesList.filter(Boolean).join(',') || undefined;

    if (!proxyRules) {
      if (!proxyBypassRules) return {};
      else return { proxyBypassRules };
    }

    return {
      mode: 'fixed_servers',
      proxyBypassRules,
      proxyRules,
    };
  }

  return {};
}

// Return the Socks5 tunnel configuration, if proxyOptions always resolves to one.
// This is used by createSocks5Tunnel() to avoid creating a local Socks5 tunnel
// that would just forward to another Socks5 tunnel anyway.
export function getSocks5OnlyProxyOptions(
  proxyOptions: DevtoolsProxyOptions,
  target?: string
): TunnelOptions | undefined {
  let proxyUrl: string | undefined;
  if (target !== undefined) proxyUrl = proxyForUrl(proxyOptions, target);
  else if (!proxyOptions.noProxyHosts) proxyUrl = proxyOptions.proxy;
  if (!proxyUrl) return undefined;
  const url = new URL(proxyUrl);
  if (url.protocol !== 'socks5:') return undefined;
  return {
    proxyHost: decodeURIComponent(url.hostname),
    proxyPort: +(url.port || 1080),
    proxyUsername: decodeURIComponent(url.username) || undefined,
    proxyPassword: decodeURIComponent(url.password) || undefined,
  };
}

interface DevtoolsProxyOptionsSecretsInternal {
  username?: string;
  password?: string;
  sshIdentityKeyPassphrase?: string;
}

// These mirror our secrets extraction/merging logic in Compass.
// They do *not* extract secrets from env vars, since the `.env`
// property is generally intended for testing/not for storage.
export function extractProxySecrets(
  proxyOptions: Readonly<DevtoolsProxyOptions>
): {
  proxyOptions: DevtoolsProxyOptions;
  secrets: DevtoolsProxyOptionsSecrets;
} {
  const secrets: DevtoolsProxyOptionsSecretsInternal = {};
  if (proxyOptions.proxy) {
    const proxyUrl = new URL(proxyOptions.proxy);
    secrets.password = proxyUrl.password;
    proxyUrl.password = '';
    proxyOptions = { ...proxyOptions, proxy: proxyUrl.toString() };
  }
  if (proxyOptions.sshOptions) {
    secrets.sshIdentityKeyPassphrase =
      proxyOptions.sshOptions.identityKeyPassphrase;
    proxyOptions = {
      ...proxyOptions,
      sshOptions: {
        ...proxyOptions.sshOptions,
        identityKeyPassphrase: undefined,
      },
    };
  }
  return {
    secrets: JSON.stringify(secrets),
    proxyOptions: proxyOptions,
  };
}

export function mergeProxySecrets({
  proxyOptions,
  secrets,
}: {
  proxyOptions: Readonly<DevtoolsProxyOptions>;
  secrets: DevtoolsProxyOptionsSecrets;
}): DevtoolsProxyOptions {
  const parsedSecrets: DevtoolsProxyOptionsSecretsInternal = JSON.parse(
    secrets || '{}'
  );
  if (
    (parsedSecrets.username || parsedSecrets.password) &&
    proxyOptions.proxy
  ) {
    const proxyUrl = new URL(proxyOptions.proxy);
    proxyUrl.password = parsedSecrets.password || '';
    proxyOptions = { ...proxyOptions, proxy: proxyUrl.toString() };
  }
  if (parsedSecrets.sshIdentityKeyPassphrase) {
    proxyOptions = {
      ...proxyOptions,
      sshOptions: {
        ...proxyOptions.sshOptions,
        identityKeyPassphrase: parsedSecrets.sshIdentityKeyPassphrase,
      },
    };
  }
  return proxyOptions;
}

export function redactUrl(urlOrString: URL | string): string {
  const url = new URL(urlOrString.toString());
  if (url.password) url.password = '(credential)';
  return url.toString();
}
