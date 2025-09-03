// Most mongoLogId() calls here come from code that was
// previously part of the MongoDB Compass monorepo, hence the specific
// values used here; in particular,
// https://github.com/mongodb-js/compass/tree/55a5a608713d7316d158dc66febeb6b114d8b40d/packages/ssh-tunnel/src

import type { AgentConnectOpts } from 'agent-base';
import type { ClientRequest } from 'http';
import type { SecureContextOptions } from 'tls';
import type { AgentWithInitialize } from './agent';

interface BaseSocks5RequestMetadata {
  srcAddr: string;
  srcPort: number;
  dstAddr: string;
  dstPort: number;
}

export interface ProxyEventMap {
  'socks5:authentication-complete': (ev: { success: boolean }) => void;
  'socks5:skip-auth-setup': () => void;
  'socks5:start-listening': (ev: {
    proxyHost: string;
    proxyPort: number;
  }) => void;
  'socks5:forwarding-error': (
    ev: { error: string } & Partial<BaseSocks5RequestMetadata>,
  ) => void;
  'socks5:agent-initialized': () => void;
  'socks5:closing-tunnel': () => void;
  'socks5:got-forwarding-request': (ev: BaseSocks5RequestMetadata) => void;
  'socks5:accepted-forwarding-request': (ev: BaseSocks5RequestMetadata) => void;
  'socks5:failed-forwarding-request': (
    ev: { error: string } & Partial<BaseSocks5RequestMetadata>,
  ) => void;
  'socks5:forwarded-socket-closed': (ev: BaseSocks5RequestMetadata) => void;

  'ssh:client-closed': () => void;
  'ssh:establishing-conection': (ev: {
    host: string | undefined;
    port: number | undefined;
    password: boolean;
    passphrase: boolean;
    privateKey: boolean;
  }) => void;
  'ssh:failed-connection': (ev: { error: string }) => void;
  'ssh:established-connection': () => void;
  'ssh:failed-forward': (ev: {
    error: string;
    host: string;
    retryableError: boolean;
    retriesLeft: number;
  }) => void;
  'proxy:connect': (ev: {
    agent: AgentWithInitialize;
    req: ClientRequest;
    opts: AgentConnectOpts & Partial<SecureContextOptions>;
  }) => void;
}

export type ProxyEventArgs<K extends keyof ProxyEventMap> =
  ProxyEventMap[K] extends (...args: infer P) => any ? P : never;

export interface ProxyLogEmitter {
  // TypeScript uses something like this itself for its EventTarget definitions.
  on<K extends keyof ProxyEventMap>(event: K, listener: ProxyEventMap[K]): this;
  off?<K extends keyof ProxyEventMap>(
    event: K,
    listener: ProxyEventMap[K],
  ): this;
  once<K extends keyof ProxyEventMap>(
    event: K,
    listener: ProxyEventMap[K],
  ): this;
  emit<K extends keyof ProxyEventMap>(
    event: K,
    ...args: ProxyEventArgs<K>
  ): unknown;
}

export interface MongoLogWriter {
  info(c: string, id: unknown, ctx: string, msg: string, attr?: unknown): void;
  warn(c: string, id: unknown, ctx: string, msg: string, attr?: unknown): void;
  error(c: string, id: unknown, ctx: string, msg: string, attr?: unknown): void;
  mongoLogId(this: void, id: number): unknown;
}

let idCounter = 0;
export function hookLogger(
  emitter: ProxyLogEmitter,
  log: MongoLogWriter,
  logCtx: string,
): void {
  logCtx = `${logCtx}-${idCounter++}`;
  const { mongoLogId } = log;

  emitter.on('socks5:authentication-complete', (ev) => {
    log.info(
      'DEVTOOLS-PROXY',
      mongoLogId(1_001_000_253),
      `socks5-${logCtx}`,
      'Validated auth parameters',
      { ...ev },
    );
  });

  emitter.on('socks5:skip-auth-setup', () => {
    log.info(
      'DEVTOOLS-PROXY',
      mongoLogId(1_001_000_254),
      `socks5-${logCtx}`,
      'Skipping auth setup',
    );
  });

  emitter.on('socks5:start-listening', (ev) => {
    log.info(
      'DEVTOOLS-PROXY',
      mongoLogId(1_001_000_255),
      `socks5-${logCtx}`,
      'Listening for Socks5 connections',
      { ...ev },
    );
  });

  emitter.on('socks5:forwarding-error', (ev) => {
    log.error(
      'DEVTOOLS-PROXY',
      mongoLogId(1_001_000_259),
      `socks5-${logCtx}`,
      'Failed to establish new outgoing connection from Socks5 proxy',
      { ...ev },
    );
  });

  emitter.on('socks5:agent-initialized', () => {
    log.info(
      'DEVTOOLS-PROXY',
      mongoLogId(1_001_000_259),
      `socks5-${logCtx}`,
      'Finished initializing agent',
    );
  });

  emitter.on('socks5:closing-tunnel', () => {
    log.info(
      'DEVTOOLS-PROXY',
      mongoLogId(1_001_000_256),
      `socks5-${logCtx}`,
      'Closing Socks5 tunnel',
    );
  });

  emitter.on('socks5:got-forwarding-request', (ev) => {
    log.info(
      'DEVTOOLS-PROXY',
      mongoLogId(1_001_000_260),
      `socks5-${logCtx}`,
      'Received Socks5 fowarding request',
      { ...ev },
    );
  });

  emitter.on('socks5:accepted-forwarding-request', (ev) => {
    log.info(
      'DEVTOOLS-PROXY',
      mongoLogId(1_001_000_262),
      `socks5-${logCtx}`,
      'Established outbound connection and accepting socks5 request',
      { ...ev },
    );
  });

  emitter.on('socks5:failed-forwarding-request', (ev) => {
    log.error(
      'DEVTOOLS-PROXY',
      mongoLogId(1_001_000_265),
      `socks5-${logCtx}`,
      'Error establishing outbound connection for socks5 request',
      { ...ev },
    );
  });

  emitter.on('socks5:forwarded-socket-closed', (ev) => {
    log.info(
      'DEVTOOLS-PROXY',
      mongoLogId(1_001_000_264),
      `socks5-${logCtx}`,
      'Socks5 stream socket closed',
      { ...ev },
    );
  });

  emitter.on('ssh:client-closed', () => {
    log.info(
      'DEVTOOLS-PROXY',
      mongoLogId(1_001_000_252),
      `ssh-${logCtx}`,
      'sshClient closed',
    );
  });

  emitter.on('ssh:establishing-conection', (ev) => {
    log.info(
      'DEVTOOLS-PROXY',
      mongoLogId(1_001_000_257),
      `ssh-${logCtx}`,
      'Establishing new SSH connection',
      { ...ev },
    );
  });
  emitter.on('ssh:failed-connection', (ev) => {
    log.info(
      'DEVTOOLS-PROXY',
      mongoLogId(1_001_000_258),
      `ssh-${logCtx}`,
      'Failed to establish new SSH connection',
      { ...ev },
    );
  });
  emitter.on('ssh:established-connection', () => {
    log.info(
      'DEVTOOLS-PROXY',
      mongoLogId(1_001_000_259),
      `ssh-${logCtx}`,
      'Finished establishing new SSH connection',
    );
  });

  emitter.on('ssh:failed-forward', (ev) => {
    log.error(
      'DEVTOOLS-PROXY',
      mongoLogId(1_001_000_261),
      `ssh-${logCtx}`,
      'Error forwarding outbound SSH connection, potentially retrying',
      {
        ...ev,
      },
    );
  });
}
