import * as yaml from 'js-yaml';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as bson from 'bson';
import { Operator } from './metaschema';
import { StringWriter } from './utils';

type ArgType = NonNullable<
  typeof Operator._type.arguments
>[number]['type'][number];

const loadOptions: yaml.LoadOptions = {
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

async function* listCategories(): AsyncIterable<{
  category: string;
  folder: string;
}> {
  const configDir = path.join(
    __dirname,
    '..',
    'mongo-php-library',
    'generator',
    'config'
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

async function* listSourceYAMLFiles(): AsyncIterable<{
  category: string;
  operators: () => AsyncIterable<{ yaml: unknown }>;
}> {
  for await (const { category, folder } of listCategories()) {
    yield {
      category,
      operators: async function* () {
        for await (const file of await fs.readdir(folder, {
          withFileTypes: true,
        })) {
          if (file.isFile() && file.name.endsWith('.yaml')) {
            const filePath = path.join(file.parentPath, file.name);
            const content = await fs.readFile(filePath, 'utf8');
            const parsed = yaml.load(content, loadOptions);
            yield { yaml: parsed };
          }
        }
      },
    };
  }
}

function toComment(str?: string, docsUrl?: string): string {
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

function emitComment(str: string, docsUrl?: string): void {
  emit(toComment(str, docsUrl));
}

function getArgumentTypeName(type: ArgType): string | undefined {
  if (typeMappings[type]) {
    return toTypeName(type);
  }

  if (typeMappings[`${type}_S`]) {
    return toTypeName(`${type}<S>`);
  }

  if (trivialTypeMappings[type]) {
    return trivialTypeMappings[type];
  }

  return undefined;
}

function toTypeName(type: string): string {
  return trivialTypeMappings[type as ArgType] ?? capitalize(type);
}

function toTypeFieldTypeName(type: string): string {
  return '`$${AFieldPath<S, ' + toTypeName(type) + '>}`';
}

let outputBuffer: StringWriter | undefined;
function emit(str: string): void {
  (outputBuffer ?? process.stdout).write(str);
}

function getOutputOf(fn: () => void): string {
  outputBuffer = new StringWriter();
  fn();
  const output = outputBuffer.toString();
  outputBuffer = undefined;
  return output;
}

function emitHeader(): void {
  emit(`
    import type * as bson from 'bson';

    // from Node.js driver
    type Condition<T> = AlternativeType<T>; // misses FilterOperators
    type AlternativeType<T> =
      T extends ReadonlyArray<infer U> ? T | RegExpOrString<U> : RegExpOrString<T>;
    type RegExpOrString<T> = T extends string ? bson.BSONRegExp | RegExp | T : T;
    type KeysOfAType<T, Type> = {
      [k in keyof T]: NonNullable<T[k]> extends Type ? k : never;
    }[keyof T];
    type RecordWithStaticFields<T extends Record<string, any>, TValue> = T & {
      [key: string]: TValue | T[keyof T];
    };

    // TBD: Nested fields
    type AFieldPath<S, Type> = KeysOfAType<S, Type> & string;
    `);
}

const trivialTypeMappings: Partial<Record<ArgType, string>> = {
  any: 'any',
  bool: 'boolean',
  date: 'Date',
  null: 'null',
  timestamp: 'bson.Timestamp',
  decimal: 'bson.Decimal128',
  array: 'unknown[]',
  binData: 'bson.Binary',
  objectId: 'bson.ObjectId',
  object: 'Record<string, unknown>',
  string: 'string',
};

const typeMappings: Record<string, string[]> = {
  int: ['number', 'bson.Int32'],
  double: ['number', 'bson.Double'],
  regex: ['RegExp', 'bson.BSONRegExp'],
  long: ['bigint', 'bson.Long'],
  javascript: ['bson.Code', 'Function'],

  number: [
    toTypeName('int'),
    toTypeName('long'),
    toTypeName('double'),
    toTypeName('decimal'),
  ],
  bsonPrimitive: [
    toTypeName('number'),
    toTypeName('binData'),
    toTypeName('objectId'),
    'string',
    toTypeName('bool'),
    toTypeName('date'),
    toTypeName('null'),
    toTypeName('regex'),
    toTypeName('javascript'),
    toTypeName('timestamp'),
  ],

  // Can be improved:
  searchPath: ['string', 'string[]'],
  searchScore: ['unknown'],
  granularity: ['string'],
  fullDocument: ['string'],
  fullDocumentBeforeChange: ['string'],
  accumulatorPercentile: ['string'],
  range: ['unknown'],
  sortBy: ['unknown'],
  geoPoint: ['unknown'],
  sortSpec: ['-1', '1'],
  timeUnit: [
    '"week"',
    '"day"',
    '"hour"',
    '"minute"',
    '"second"',
    '"millisecond"',
  ],
  outCollection: ['unknown'],
  whenMatched: ['string'],
  whenNotMatched: ['string'],

  expression_S: [
    toTypeName('C_expression<S>'),
    toTypeName('fieldPath<S>'),
    toTypeName('bsonPrimitive'),
  ],
  stage_S: [toTypeName('C_stage<S>')],
  pipeline_S: [toTypeName('stage<S>[]')],
  query_S: [
    toTypeName('C_query<S>'),
    'Partial<{ [k in keyof S]: Condition<S[k]> }>',
  ],
  accumulator_S: [],
  searchOperator_S: [],
  geometry_S: [],

  // Need to be adjusted to match the real schema
  fieldPath_S: ['`$${AFieldPath<S, any>}`'],
  numberFieldPath_S: [toTypeFieldTypeName('number')],
  doubleFieldPath_S: [toTypeFieldTypeName('double')],
  stringFieldPath_S: [toTypeFieldTypeName('string')],
  objectFieldPath_S: [toTypeFieldTypeName('object')],
  arrayFieldPath_S: [toTypeFieldTypeName('array')],
  binDataFieldPath_S: [toTypeFieldTypeName('binData')],
  objectIdFieldPath_S: [toTypeFieldTypeName('objectId')],
  boolFieldPath_S: [toTypeFieldTypeName('bool')],
  dateFieldPath_S: [toTypeFieldTypeName('date')],
  nullFieldPath_S: [toTypeFieldTypeName('null')],
  regexFieldPath_S: [toTypeFieldTypeName('regex')],
  javascriptFieldPath_S: [toTypeFieldTypeName('javascript')],
  intFieldPath_S: [toTypeFieldTypeName('int')],
  timestampFieldPath_S: [toTypeFieldTypeName('timestamp')],
  longFieldPath_S: [toTypeFieldTypeName('long')],
  decimalFieldPath_S: [toTypeFieldTypeName('decimal')],

  resolvesToNumber_S: [toTypeName('numberFieldPath<S>'), toTypeName('number')],
  resolvesToDouble_S: [toTypeName('doubleFieldPath<S>'), toTypeName('double')],
  resolvesToString_S: [toTypeName('stringFieldPath<S>'), toTypeName('string')],
  resolvesToObject_S: [toTypeName('objectFieldPath<S>'), toTypeName('object')],
  resolvesToArray_S: [toTypeName('arrayFieldPath<S>'), toTypeName('array')],
  resolvesToBinData_S: [
    toTypeName('binDataFieldPath<S>'),
    toTypeName('binData'),
  ],
  resolvesToObjectId_S: [
    toTypeName('objectIdFieldPath<S>'),
    toTypeName('objectId'),
  ],
  resolvesToBool_S: [toTypeName('boolFieldPath<S>'), toTypeName('bool')],
  resolvesToDate_S: [toTypeName('dateFieldPath<S>'), toTypeName('date')],
  resolvesToNull_S: [toTypeName('nullFieldPath<S>'), toTypeName('null')],
  resolvesToRegex_S: [toTypeName('regexFieldPath<S>'), toTypeName('regex')],
  resolvesToJavascript_S: [
    toTypeName('javascriptFieldPath<S>'),
    toTypeName('javascript'),
  ],
  resolvesToInt_S: [toTypeName('intFieldPath<S>'), toTypeName('int')],
  resolvesToTimestamp_S: [
    toTypeName('timestampFieldPath<S>'),
    toTypeName('timestamp'),
  ],
  resolvesToLong_S: [toTypeName('longFieldPath<S>'), toTypeName('long')],
  resolvesToDecimal_S: [
    toTypeName('decimalFieldPath<S>'),
    toTypeName('decimal'),
  ],
};

function capitalize(str: string): string {
  return str[0].toUpperCase() + str.slice(1);
}

function emitArg(
  arg: NonNullable<typeof Operator._type.arguments>[number],
  named: boolean
): void {
  if (named) {
    emit(`${arg.name}${arg.optional ? '?' : ''}: `);
  }

  for (const type of arg.type) {
    const name = getArgumentTypeName(type);

    if (!name) {
      throw new Error(`Unknown type ${type}`);
    }

    emit(`| ${name}`);
  }
}

async function emitTypes(): Promise<void> {
  for await (const file of listSourceYAMLFiles()) {
    const namespace = `${capitalize(file.category)}Operators`;
    emit(`export namespace ${namespace} {\n`);

    for await (const operator of file.operators()) {
      const parsed = Operator.parse(operator.yaml);
      const ifaceName = capitalize(parsed.name);

      emitComment(
        `A type describing the \`${parsed.name}\` operator.`,
        parsed.link
      );
      emit(`export interface ${ifaceName}<S> {`);
      if (parsed.description) {
        emitComment(parsed.description, parsed.link);
      }
      emit(`${parsed.name}:`);
      for (const type of parsed.type) {
        (typeMappings[`${type}_S`] ??= []).push(`${namespace}.${ifaceName}<S>`);
      }
      for (const type of parsed.type) {
        // TODO: why?
        (typeMappings[`C_${file.category}_S`] ??= []).push(
          `${namespace}.${ifaceName}<S>`
        );
      }
      if (!parsed.arguments) {
        emit(`Record<string, never>`);
      } else {
        let encode = parsed.encode;
        if (encode === 'single') {
          if (parsed.arguments.length !== 1) {
            throw new Error(
              'encode: single should imply arguments.length === 1'
            );
          }
          if (parsed.arguments[0].variadic) {
            encode = parsed.arguments[0].variadic;
          }
        }
        switch (encode) {
          case 'array':
          case 'object':
            // We're temporarily switching to writing to an in-memory buffer in case we need to merge objects. Due to
            // limitations of merging objects with records, we need to use some type magic, requiring a helper type.
            // { foo: number } & { [key: string]: string } results in foo being a string due to the indexer. To avoid it
            // we need to use RecordWithStaticFields<{ foo: number}, string>
            const mergedArgs: typeof parsed.arguments[number][] = [];
            const objectType = getOutputOf(() => {
              emit(encode === 'array' ? '[' : '{');
              for (const arg of parsed.arguments!) {
                if (arg.mergeObject) {
                  mergedArgs.push(arg);
                  continue;
                }
                if (arg.description) {
                  emitComment(arg.description);
                }

                if (arg.variadic === 'array') {
                  for (let i = 0; i < (arg.variadicMin ?? 0); i++) {
                    emitArg(arg, false);
                    emit(',');
                  }
                  emit('...(');
                  emitArg(arg, false);
                  emit(')[]');
                } else if (arg.variadic === 'object') {
                  emit(`} & { [${arg.name}: string]: `);
                  emitArg(arg, false);
                } else {
                  emitArg(arg, true);
                }
                emit(',');
              }
              emit(encode === 'array' ? ']' : '}');
            });

            switch (mergedArgs.length) {
              case 0:
                emit(objectType);
                break;
              case 1:
                const arg = mergedArgs[0];
                switch (arg.variadic) {
                  case 'object':
                    if (objectType === '{}') {
                      emit(`{ [${arg.name}: string]: `);
                      emitArg(arg, false);
                      emit(`}`);
                    } else {
                      emit(
                        `RecordWithStaticFields<${objectType}, ${toComment(
                          arg.description
                        )} ${arg.type
                          .map((t) => getArgumentTypeName(t))
                          .join(' | ')}>`
                      );
                    }
                    break;
                  case 'array':
                    throw new Error(
                      `invalid mergeObject combination: variadic=${arg.variadic}, encode=${parsed.encode}`
                    );
                  case undefined:
                    emitArg(arg, false);
                    break;
                }
                break;
              default:
                throw new Error(
                  `Unsupported number of mergeObject arguments: ${
                    mergedArgs.length
                  }, ${namespace}.${ifaceName}.{${mergedArgs
                    .map((a) => a.name)
                    .join(', ')}}`
                );
            }
            break;
          case 'single':
            if (parsed.arguments.length !== 1) {
              throw new Error(
                'encode: single should imply arguments.length === 1'
              );
            }
            emitArg(parsed.arguments[0], false);

            break;
          default:
            throw new Error(`unknown encode mode ${parsed.encode}`);
        }
      }
      emit('};\n');
    }

    emit('};\n');
  }

  for (const [type, interfaces] of Object.entries(typeMappings)) {
    const isTemplated = type.endsWith('_S');
    const name = isTemplated ? type.replace(/_S$/, '') : type;
    emit(
      `\nexport type ${toTypeName(name)}${isTemplated ? '<S>' : ''} = |` +
        interfaces
          .map((i) => `(${i}${i.endsWith('_S') ? '<S>' : ''})`)
          .join('|') +
        ';'
    );
  }
}

async function main(): Promise<void> {
  emitHeader();
  await emitTypes();
}

main();
