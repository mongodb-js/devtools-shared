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
}

// https://www.electronjs.org/docs/latest/api/structures/proxy-config
interface ElectronProxyConfig {
  mode?: 'direct' | 'auto_detect' | 'pac_script' | 'fixed_servers' | 'system';
  pacScript?: string;
  proxyRules?: string;
  proxyBypassRules?: string;
}

function proxyConfForEnvVars(
  env: Record<string, string | undefined> = process.env
): { map: Map<string, string>; noProxy: string } {
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
    const { map, noProxy } = proxyConfForEnvVars();
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

export function translateToElectronProxyConfig(
  proxyOptions: DevtoolsProxyOptions
): ElectronProxyConfig {
  if (proxyOptions.proxy) {
    const url = new URL(proxyOptions.proxy);
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
    if (url.protocol.startsWith('pac+')) {
      url.protocol = url.protocol.replace('pac+', '');
      return {
        mode: 'pac_script',
        pacScript: url.toString(),
        proxyBypassRules: proxyOptions.noProxyHosts,
      };
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
    return {
      mode: 'fixed_servers',
      proxyRules: url.toString(),
      proxyBypassRules: proxyOptions.noProxyHosts,
    };
  }

  if (proxyOptions.useEnvironmentVariableProxies) {
    const proxyRules: string[] = [];
    const proxyBypassRules = [proxyOptions.noProxyHosts];
    const { map, noProxy } = proxyConfForEnvVars();
    for (const [key, value] of map) proxyBypassRules.push(`${key}=${value}`);
    proxyBypassRules.push(noProxy);

    return {
      mode: 'fixed_servers',
      proxyBypassRules: proxyBypassRules.filter(Boolean).join(',') || undefined,
      proxyRules: proxyRules.join(';'),
    };
  }

  return {};
}

interface DevtoolsProxyOptionsSecretsInternal {
  username?: string;
  password?: string;
  sshIdentityKeyPassphrase?: string;
}

// These mirror our secrets extraction/merging logic in Compass
export function extractProxySecrets(
  proxyOptions: Readonly<DevtoolsProxyOptions>
): {
  proxyOptions: DevtoolsProxyOptions;
  secrets: DevtoolsProxyOptionsSecrets;
} {
  const secrets: DevtoolsProxyOptionsSecretsInternal = {};
  if (proxyOptions.proxy) {
    const proxyUrl = new URL(proxyOptions.proxy);
    ({ username: secrets.username, password: secrets.password } = proxyUrl);
    proxyUrl.username = proxyUrl.password = '';
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
    proxyUrl.username = parsedSecrets.username || '';
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

function redactUrl(urlOrString: URL | string): string {
  const url = new URL(urlOrString.toString());
  url.username = url.password = '(credential)';
  return url.toString();
}
