export interface Tunnel {
  on(ev: 'forwardingError', cb: (err: Error) => void): void;
  on(ev: 'error', cb: (err: Error) => void): void;

  close(): Promise<void>;

  options: {
    // These can safely be assigned to driver MongoClientOptinos
    proxyHost: string;
    proxyPort: number;
    proxyUsername: string;
    proxyPassword: string;
  };
}

export function setupSocks5Tunnel(
  proxyOptions: DevtoolsProxyOptions,
  target = 'mongodb://'
): Promise<Tunnel | undefined> {}
