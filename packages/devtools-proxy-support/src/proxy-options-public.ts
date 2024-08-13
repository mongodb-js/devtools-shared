// Seperate exports that can be loaded in a browser-only
// environment (e.g. compass-web).
export {
  DevtoolsProxyOptions,
  DevtoolsProxyOptionsSecrets,
  translateToElectronProxyConfig,
  extractProxySecrets,
  mergeProxySecrets,
} from './proxy-options';
