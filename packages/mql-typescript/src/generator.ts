/* eslint-disable @typescript-eslint/restrict-template-expressions */
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

  public static loadOptions: yaml.LoadOptions = {
    // js-yaml >=5 replaced the `Type` / `DEFAULT_SCHEMA.extend()` API with tag
    // definitions composed onto a schema via `Schema.withTags()`. We extend the
    // core schema with the custom BSON tags used by the MQL specification
    // fixtures. `timestampTag`/`mergeTag` are kept for parity with the previous
    // default schema. This generator only loads YAML, so the `represent`/
    // `identify` handlers exist purely for round-trip completeness.
    schema: yaml.CORE_SCHEMA.withTags(
      yaml.timestampTag,
      yaml.mergeTag,
      yaml.defineScalarTag('!bson_utcdatetime', {
        resolve: (data) => new BsonDate(data),
        identify: (data) => data instanceof BsonDate,
        represent: (data) => {
          if (data instanceof BsonDate) {
            return data.toString();
          }
          throw new Error(`Expected Date, but got ${data.constructor.name}`);
        },
      }),
      yaml.defineScalarTag('!bson_objectId', {
        resolve: (data) => bson.ObjectId.createFromHexString(data),
        identify: (data) => data instanceof bson.ObjectId,
        represent: (data) => {
          if (data instanceof bson.ObjectId) {
            return data.toHexString();
          }
          throw new Error(
            `Expected bson.ObjectId, but got ${data.constructor.name}`,
          );
        },
      }),
      yaml.defineScalarTag('!bson_uuid', {
        resolve: (data) => bson.UUID.createFromHexString(data),
        identify: (data) => data instanceof bson.UUID,
        represent: (data) => {
          if (data instanceof bson.UUID) {
            return data.toHexString();
          }
          throw new Error(
            `Expected bson.UUID, but got ${data.constructor.name}`,
          );
        },
      }),
      yaml.defineScalarTag('!bson_regex', {
        resolve: (data) => new bson.BSONRegExp(data),
        identify: (data) => data instanceof bson.BSONRegExp && !data.options,
        represent: (data) => {
          if (data instanceof bson.BSONRegExp) {
            return data.pattern;
          }
          throw new Error(
            `Expected bson.BSONRegExp, but got ${data.constructor.name}`,
          );
        },
      }),
      yaml.defineSequenceTag('!bson_regex', {
        create: () => [] as string[],
        addItem: (carrier: string[], item) => {
          carrier.push(item as string);
        },
        finalize: (carrier: string[]) =>
          new bson.BSONRegExp(carrier[0], carrier[1]),
        identify: (data) => data instanceof bson.BSONRegExp && !!data.options,
        represent: (data) => {
          if (data instanceof bson.BSONRegExp) {
            return [data.pattern, data.options];
          }
          throw new Error(
            `Expected bson.BSONRegExp, but got ${data.constructor.name}`,
          );
        },
      }),
      yaml.defineScalarTag('!bson_binary', {
        resolve: (data) => bson.Binary.createFromBase64(data),
        identify: (data) => data instanceof bson.Binary,
        represent: (data) => {
          if (data instanceof bson.Binary) {
            return data.toString('base64');
          }
          throw new Error(
            `Expected bson.Binary, but got ${data.constructor.name}`,
          );
        },
      }),
      yaml.defineScalarTag('!bson_decimal128', {
        resolve: (data) => bson.Decimal128.fromString(data),
        identify: (data) => data instanceof bson.Decimal128,
        represent: (data) => {
          if (data instanceof bson.Decimal128) {
            return data.toString();
          }
          throw new Error(
            `Expected bson.Decimal128, but got ${data.constructor.name}`,
          );
        },
      }),
      yaml.defineScalarTag('!bson_int64', {
        resolve: (data) => bson.Long.fromString(data),
        identify: (data) => data instanceof bson.Long,
        represent: (data) => {
          if (data instanceof bson.Long) {
            return data.toString();
          }
          throw new Error(
            `Expected bson.Long, but got ${data.constructor.name}`,
          );
        },
      }),
    ),
  };

  protected configDir = path.join(
    __dirname,
    '..',
    'mql-specifications',
    'definitions',
  );

  // The `types` category describes closed-set types using a different schema
  // (schemas/type.json); those types are modeled directly in the generator's
  // type mappings. The `pipeline` category describes the top-level pipeline
  // containers, which are also modeled directly as type mappings.
  private static readonly ignoredCategories = new Set(['types', 'pipeline']);

  private async *listCategories(
    filterRegex: RegExp | undefined,
  ): AsyncIterable<{
    category: string;
    folder: string;
  }> {
    for await (const folder of await fs.readdir(this.configDir, {
      withFileTypes: true,
    })) {
      if (GeneratorBase.ignoredCategories.has(folder.name)) {
        continue;
      }
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
