import type { ConnectionOptions } from 'tls';

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
  // TODO(COMPASS-8077): Integrate system CA here
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

export function proxyForUrl(
  proxyOptions: DevtoolsProxyOptions
): (url: string) => string {
  if (proxyOptions.proxy) {
    const proxyUrl = proxyOptions.proxy;
    if (new URL(proxyUrl).protocol === 'direct:') return () => '';
    return (target: string) => {
      if (shouldProxy(proxyOptions.noProxyHosts || '', new URL(target))) {
        return proxyUrl;
      }
      return '';
    };
  }

  if (proxyOptions.useEnvironmentVariableProxies) {
    const { map, noProxy } = proxyConfForEnvVars(
      proxyOptions.env ?? process.env
    );
    return (target: string) => {
      const url = new URL(target);
      const protocol = url.protocol.replace(/:$/, '');
      const combinedNoProxyRules = [noProxy, proxyOptions.noProxyHosts]
        .filter(Boolean)
        .join(',');
      const proxyForProtocol = map.get(protocol);
      if (proxyForProtocol && shouldProxy(combinedNoProxyRules, url)) {
        return proxyForProtocol;
      }
      return '';
    };
  }

  return () => '';
}

function validateElectronProxyURL(url: URL | string): string {
  url = new URL(url.toString());
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

export function translateToElectronProxyConfig(
  proxyOptions: DevtoolsProxyOptions
): ElectronProxyConfig {
  if (proxyOptions.proxy) {
    let url = proxyOptions.proxy;
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
    for (const [key, value] of map)
      proxyRulesList.push(`${key}=${validateElectronProxyURL(value)}`);
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
  const parsedSecrets: DevtoolsProxyOptionsSecretsInternal =
    JSON.parse(secrets);
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
