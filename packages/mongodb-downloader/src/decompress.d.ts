declare module '@xhmikosr/decompress' {
  export interface DecompressFile {
    data: Buffer;
    mode: number;
    mtime: string;
    path: string;
    type: string;
  }

  export interface DecompressOptions {
    filter?: (file: DecompressFile) => boolean;
    map?: (file: DecompressFile) => DecompressFile;
    plugins?: unknown[];
    strip?: number;
  }

  export default function decompress(
    input: string | Buffer,
    output?: string,
    options?: DecompressOptions,
  ): Promise<DecompressFile[]>;
}
