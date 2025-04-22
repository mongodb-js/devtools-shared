import { createWriteStream } from 'fs';
import { StringWriter } from './utils';
import path from 'path';
import * as fs from 'fs/promises';
import * as yaml from 'js-yaml';
import * as bson from 'bson';

export type YamlFiles = ReturnType<GeneratorBase['listSourceYAMLFiles']>;

export abstract class GeneratorBase {
  private outputBuffer: StringWriter | undefined;
  private outputStream?: NodeJS.WritableStream;

  public static loadOptions: yaml.LoadOptions = {
    schema: yaml.DEFAULT_SCHEMA.extend([
      new yaml.Type('!bson_utcdatetime', {
        kind: 'scalar',
        construct(data) {
          return new Date(data);
        },
      }),
      new yaml.Type('!bson_objectId', {
        kind: 'scalar',
        construct(data) {
          return bson.ObjectId.createFromHexString(data);
        },
      }),
      new yaml.Type('!bson_uuid', {
        kind: 'scalar',
        construct(data) {
          return bson.UUID.createFromHexString(data);
        },
      }),
      new yaml.Type('!bson_regex', {
        kind: 'scalar',
        construct(data) {
          return new bson.BSONRegExp(data);
        },
      }),
      new yaml.Type('!bson_regex', {
        kind: 'sequence',
        construct([data, flags]) {
          return new bson.BSONRegExp(data, flags);
        },
      }),
      new yaml.Type('!bson_binary', {
        kind: 'scalar',
        construct([data]) {
          return bson.Binary.createFromBase64(data);
        },
      }),
      new yaml.Type('!bson_decimal128', {
        kind: 'scalar',
        construct([data]) {
          return bson.Decimal128.fromString(data);
        },
      }),
    ]),
  };

  private async *listCategories(): AsyncIterable<{
    category: string;
    folder: string;
  }> {
    const configDir = path.join(
      __dirname,
      '..',
      'mongo-php-library',
      'generator',
      'config',
    );

    for await (const folder of await fs.readdir(configDir, {
      withFileTypes: true,
    })) {
      if (folder.isDirectory()) {
        yield {
          category: folder.name,
          folder: path.join(folder.parentPath, folder.name),
        };
      }
    }
  }

  private async *listSourceYAMLFiles(): AsyncIterable<{
    category: string;
    operators: () => AsyncIterable<{ yaml: unknown; path: string }>;
  }> {
    for await (const { category, folder } of this.listCategories()) {
      yield {
        category,
        operators: async function* () {
          for await (const file of await fs.readdir(folder, {
            withFileTypes: true,
          })) {
            if (file.isFile() && file.name.endsWith('.yaml')) {
              const filePath = path.join(file.parentPath, file.name);
              const content = await fs.readFile(filePath, 'utf8');
              const parsed = yaml.load(content, GeneratorBase.loadOptions);

              yield { yaml: parsed, path: filePath };
            }
          }
        },
      };
    }
  }

  protected emitToFile(filePath: string): void {
    this.outputStream = createWriteStream(filePath, { encoding: 'utf8' });
  }

  protected emit(str: string): void {
    (this.outputBuffer ?? this.outputStream ?? process.stdout).write(str);
  }

  protected toComment(str?: string, docsUrl?: string): string {
    if (!str) {
      return '';
    }

    return [
      '',
      '',
      '/**',
      ...str
        .replace(/\*\//g, '*//*')
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l)
        .map((l) => ` * ${l}`),
      ...(docsUrl ? [` * @see {@link ${docsUrl}}`] : []),
      ' */',
      '',
    ].join('\n');
  }

  protected emitComment(str: string, docsUrl?: string): void {
    this.emit(this.toComment(str, docsUrl));
  }

  protected getOutputOf(fn: () => void): string {
    this.outputBuffer = new StringWriter();
    fn();
    const output = this.outputBuffer.toString();
    this.outputBuffer = undefined;
    return output;
  }

  protected abstract generateImpl(iterable: YamlFiles): Promise<void>;

  public generate(): Promise<void> {
    const files = this.listSourceYAMLFiles();
    return this.generateImpl(files);
  }
}
