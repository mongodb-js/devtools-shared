import type { ClientChannel, ConnectConfig, SFTPWrapper } from 'ssh2';
import { Client } from 'ssh2';
import { readFile } from 'fs/promises';
import { debug } from './utils';
import { promisify } from 'util';
import { once } from 'events';

export class SSHClient {
  private sshConnection: Client;
  private sftpConnection?: SFTPWrapper;

  private connected = false;

  constructor(private sshClientOptions: ConnectConfig) {
    this.sshConnection = new Client();
    this.setupEventListeners();
  }

  setupEventListeners() {
    this.sshConnection.on('ready', () => {
      debug('SSH: Connection established');
      this.connected = true;
    });
    this.sshConnection.on('error', (err) => {
      debug('SSH: Connection error', err);
      this.connected = false;
    });
    this.sshConnection.on('close', () => {
      debug('SSH: Connection closed');
      this.connected = false;
      this.sshConnection.destroy();
    });
  }

  async connect() {
    if (this.connected) {
      return;
    }
    const privateKey = this.sshClientOptions.privateKey
      ? await readFile(this.sshClientOptions.privateKey)
      : undefined;

    const ready = once(this.sshConnection, 'ready');
    this.sshConnection.connect({
      ...this.sshClientOptions,
      privateKey,
    });
    await ready;
  }

  disconnect() {
    this.sshConnection.end();
    this.connected = false;
  }

  async exec(command: string): Promise<string> {
    if (!this.connected) {
      throw new Error('Not connected to ssh server');
    }
    const stream: ClientChannel = await promisify(
      this.sshConnection.exec.bind(this.sshConnection)
    )(command);
    let data = '';
    stream.setEncoding('utf-8');
    stream.stderr.setEncoding('utf-8');
    stream.on('data', (chunk: string) => {
      data += chunk;
    });
    stream.stderr.on('data', (chunk: string) => {
      data += chunk;
    });
    const [code] = await once(stream, 'close');
    if (code !== 0) {
      throw new Error(
        `Command failed with code ${code as number}. Error: ${data}`
      );
    }

    return data;
  }

  private async getSftpConnection(): Promise<SFTPWrapper> {
    if (!this.connected) {
      throw new Error('Not connected to ssh server');
    }

    this.sftpConnection =
      this.sftpConnection ??
      (await promisify(this.sshConnection.sftp.bind(this.sshConnection))());
    return this.sftpConnection;
  }

  async copyFile(file: string, remotePath: string): Promise<void> {
    const sftpConnection = await this.getSftpConnection();
    return promisify(sftpConnection.fastPut.bind(sftpConnection))(
      file,
      remotePath
    );
  }

  async downloadFile(remotePath: string, file: string): Promise<void> {
    const sftpConnection = await this.getSftpConnection();
    return promisify(sftpConnection.fastGet.bind(sftpConnection))(
      remotePath,
      file
    );
  }

  async removeFile(remotePath: string): Promise<void> {
    const sftpConnection = await this.getSftpConnection();
    return promisify(sftpConnection.unlink.bind(sftpConnection))(remotePath);
  }
}
