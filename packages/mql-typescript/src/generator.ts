import type { WriteStream } from 'fs';
import { createWriteStream } from 'fs';
import { StringWriter } from './utils';
import path from 'path';
import * as fs from 'fs/promises';
import * as yaml from 'js-yaml';
import * as bson from 'bson';
import { once } from 'events';

export type YamlFiles = ReturnType<GeneratorBase['listSourceYAMLFiles']>;

class BsonDate extends Date {
  constructor(value: string | number | Date) {
    if (typeof value === 'string') {
      const number = Number(value);
      if (!Number.isNaN(number)) {
        value = number;
      }
    }
    super(value);
  }

  toString(): string {
    if (this.getTime() === 0) {
      return '0';
    }

    return this.toISOString();
  }
}

export abstract class GeneratorBase {
  private outputBuffer: StringWriter | undefined;
  private outputStream?: WriteStream;

  constructor() {
    // The default YAML schema will represent BsonDate using the Date representation because
    // it's a subclass of Date. We find the implicit type for Date and modify it to use predicate
    // instead of instanceOf, so it will only match Date instances that are not BsonDate.
    if ('implicit' in yaml.DEFAULT_SCHEMA) {
      const implicit = yaml.DEFAULT_SCHEMA.implicit as yaml.Type[];
      const timestamp = implicit.find((type) => type.instanceOf === Date);
      if (timestamp) {
        timestamp.instanceOf = null;
        timestamp.predicate = (data) => {
          return data instanceof Date && !(data instanceof BsonDate);
        };
      }
    }
  }

  public static loadOptions: yaml.LoadOptions = {
    schema: yaml.DEFAULT_SCHEMA.extend([
      new yaml.Type('!bson_utcdatetime', {
        kind: 'scalar',
        construct(data: string) {
          return new BsonDate(data);
        },
        instanceOf: BsonDate,
        represent(data) {
          if (data instanceof BsonDate) {
            return data.toString();
          }
          throw new Error(`Expected Date, but got ${data.constructor.name}`);
        },
      }),
      new yaml.Type('!bson_objectId', {
        kind: 'scalar',
        construct(data: string) {
          return bson.ObjectId.createFromHexString(data);
        },
        predicate(data) {
          return data instanceof bson.ObjectId;
        },
        represent(data) {
          if (data instanceof bson.ObjectId) {
            return data.toHexString();
          }

          throw new Error(
            `Expected bson.ObjectId, but got ${data.constructor.name}`,
          );
        },
      }),
      new yaml.Type('!bson_uuid', {
        kind: 'scalar',
        construct(data: string) {
          return bson.UUID.createFromHexString(data);
        },
        predicate(data) {
          return data instanceof bson.UUID;
        },
        represent(data) {
          if (data instanceof bson.UUID) {
            return data.toHexString();
          }

          throw new Error(
            `Expected bson.UUID, but got ${data.constructor.name}`,
          );
        },
      }),
      new yaml.Type('!bson_regex', {
        kind: 'scalar',
        construct(data: string) {
          return new bson.BSONRegExp(data);
        },
        predicate(data) {
          return data instanceof bson.BSONRegExp && !data.options;
        },
        represent(data) {
          if (data instanceof bson.BSONRegExp) {
            return data.pattern;
          }

          throw new Error(
            `Expected bson.BSONRegExp, but got ${data.constructor.name}`,
          );
        },
      }),
      new yaml.Type('!bson_regex', {
        kind: 'sequence',
        construct([data, flags]: [string, string]) {
          return new bson.BSONRegExp(data, flags);
        },
        predicate(data) {
          return data instanceof bson.BSONRegExp && !!data.options;
        },
        represent(data) {
          if (data instanceof bson.BSONRegExp) {
            return [data.pattern, data.options];
          }

          throw new Error(
            `Expected bson.BSONRegExp, but got ${data.constructor.name}`,
          );
        },
      }),
      new yaml.Type('!bson_binary', {
        kind: 'scalar',
        construct(data: string) {
          return bson.Binary.createFromBase64(data);
        },
        predicate(data) {
          return data instanceof bson.Binary;
        },
        represent(data) {
          if (data instanceof bson.Binary) {
            return data.toString('base64');
          }

          throw new Error(
            `Expected bson.Binary, but got ${data.constructor.name}`,
          );
        },
      }),
      new yaml.Type('!bson_decimal128', {
        kind: 'scalar',
        construct(data: string) {
          return bson.Decimal128.fromString(data);
        },
        predicate(data) {
          return data instanceof bson.Decimal128;
        },
        represent(data) {
          if (data instanceof bson.Decimal128) {
            return data.toString();
          }

          throw new Error(
            `Expected bson.Decimal128, but got ${data.constructor.name}`,
          );
        },
      }),
      new yaml.Type('!bson_int64', {
        kind: 'scalar',
        construct(data: string) {
          return bson.Long.fromString(data);
        },
        predicate(data) {
          return data instanceof bson.Long;
        },
        represent(data) {
          if (data instanceof bson.Long) {
            return data.toString();
          }

          throw new Error(
            `Expected bson.Long, but got ${data.constructor.name}`,
          );
        },
      }),
    ]),
  };

  protected configDir = path.join(
    __dirname,
    '..',
    'mongo-php-library',
    'generator',
    'config',
  );

  private async *listCategories(
    filterRegex: RegExp | undefined,
  ): AsyncIterable<{
    category: string;
    folder: string;
  }> {
    for await (const folder of await fs.readdir(this.configDir, {
      withFileTypes: true,
    })) {
      if (folder.isDirectory() && filterRegex?.test(folder.name) !== false) {
        yield {
          category: folder.name,
          folder: path.join(folder.parentPath, folder.name),
        };
      }
    }
  }

  private async *listSourceYAMLFiles(
    categoryRegex: RegExp | undefined,
    operatorRegex: RegExp | undefined,
  ): AsyncIterable<{
    category: string;
    operators: () => AsyncIterable<{ yaml: unknown; path: string }>;
  }> {
    for await (const { category, folder } of this.listCategories(
      categoryRegex,
    )) {
      yield {
        category,
        operators: async function* () {
          for await (const file of await fs.readdir(folder, {
            withFileTypes: true,
          })) {
            if (
              file.isFile() &&
              file.name.endsWith('.yaml') &&
              operatorRegex?.test(file.name) !== false
            ) {
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

  protected async emitToFile(filePath: string): Promise<void> {
    await this.flushFile();

    this.outputStream = createWriteStream(filePath, { encoding: 'utf8' });
  }

  private async flushFile(): Promise<void> {
    if (this.outputStream) {
      this.outputStream.end();
      await once(this.outputStream, 'close');
    }
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

  public async generate(
    categoryFilter?: string,
    operatorFilter?: string,
  ): Promise<void> {
    const categoryRegex = categoryFilter
      ? new RegExp(categoryFilter)
      : undefined;
    const operatorRegex = operatorFilter
      ? new RegExp(operatorFilter)
      : undefined;

    const files = this.listSourceYAMLFiles(categoryRegex, operatorRegex);
    await this.generateImpl(files);

    await this.flushFile();
  }
}
