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
  mode: 'direct' | 'auto_detect' | 'pac_script' | 'fixed_servers' | 'system';
  pacScript?: string;
  proxyRules?: string;
  proxyBypassRules?: string;
}

export function translateToElectronProxyConfig(
  proxyOptions: DevtoolsProxyOptions
): ElectronProxyConfig {}

// These mirror our secrets extraction/merging logic in Compass
export function extractProxySecrets(proxyOptions: DevtoolsProxyOptions): {
  proxyOptions: Partial<DevtoolsProxyOptions>;
  secrets: DevtoolsProxyOptionsSecrets;
} {}

export function mergeProxySecrets({
  proxyOptions,
  secrets,
}: {
  proxyOptions: Partial<DevtoolsProxyOptions>;
  secrets: DevtoolsProxyOptionsSecrets;
}): DevtoolsProxyOptions {}
