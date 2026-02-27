import path from 'path';
import type { YamlFiles } from './generator';
import { GeneratorBase } from './generator';
import { Operator } from './metaschema';
import { capitalize } from './utils';

type ArgType =
  | (NonNullable<typeof Operator._type.arguments>[number]['type'][number] &
      string)
  | (NonNullable<typeof Operator._type.type>[number] & string);

function liftArgType(type: ArgType | { name: ArgType; generic?: string }): {
  name: ArgType;
  generic?: string;
} {
  if (typeof type === 'string') return { name: type };
  return type;
}

type SyntheticVariables = NonNullable<
  typeof Operator._type.arguments
>[number]['syntheticVariables'];

export class SchemaGenerator extends GeneratorBase {
  private schemaOutputFile = path.resolve(
    __dirname,
    '..',
    'out',
    'schema.d.ts',
  );

  private toTypeName(type: string): string {
    return this.trivialTypeMappings[type as ArgType] ?? capitalize(type);
  }

  private toTypeFieldTypeName(type: string): string {
    return '`$${AFieldPath<S, ' + this.toTypeName(type) + '>}`';
  }

  private trivialTypeMappings: Partial<Record<ArgType, string>> = {
    any: 'any',
    bool: 'boolean',
    date: 'Date',
    null: 'null',
    timestamp: 'bson.Timestamp',
    array: 'unknown[]',
    binData: 'bson.Binary',
    objectId: 'bson.ObjectId',
    object: 'Record<string, unknown>',
    string: 'string',
  };

  private typeMappings: Record<string, string[]> = {
    int: ['number', 'bson.Int32', '{ $numberInt: string }'],
    double: ['number', 'bson.Double', '{ $numberDouble: string }'],
    decimal: ['bson.Decimal128', '{ $numberDecimal: string }'],
    regex: [
      'RegExp',
      'bson.BSONRegExp',
      '{ pattern: string, options?: string }',
    ],
    long: ['bigint', 'bson.Long', '{ $numberLong: string }'],
    javascript: ['bson.Code', 'Function', 'string'],
    geometry_S: [
      '{type: "Point", coordinates: number[] }',
      '{type:"MultiPoint", coordinates: number[][] }',
      '{type:"LineString", coordinates: number[][] }',
      '{type:"MultiLineString", coordinates: number[][][] }',
      '{type:"Polygon", coordinates: number[][][] }',
      '{type:"MultiPolygon", coordinates: number[][][][] }',
    ],

    number: [
      this.toTypeName('int'),
      this.toTypeName('long'),
      this.toTypeName('double'),
      this.toTypeName('decimal'),
    ],
    bsonPrimitive: [
      this.toTypeName('number'),
      this.toTypeName('binData'),
      this.toTypeName('objectId'),
      'string',
      this.toTypeName('bool'),
      this.toTypeName('date'),
      this.toTypeName('null'),
      this.toTypeName('regex'),
      this.toTypeName('javascript'),
      this.toTypeName('timestamp'),
    ],

    // Can be improved:
    searchPath_S: [
      'UnprefixedFieldPath<S>',
      'UnprefixedFieldPath<S>[]',
      '{ wildcard: string }',
    ],
    bitwiseOperation: [
      '({ and: Int | Long } | { or: Int | Long } | { xor: Int | Long })',
    ],
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
      '"year"',
      '"quarter"',
      '"month"',
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
      this.toTypeName('ExpressionOperator<S, T>'),
      this.toTypeName('fieldPath<S, T>'),
      this.toTypeName('bsonPrimitive'),
      'FieldExpression<S, T>',
      'FieldPath<S>[]',
    ],
    expressionMap_S: [
      `{ [k: string]: ${this.toTypeName('Expression<S, T>')} | ${this.toTypeName('ExpressionMap<S, T>')} }`,
    ],
    stage_S: [this.toTypeName('StageOperator<S, T>')],
    updateStage_S: [],
    pipeline_S: [this.toTypeName('stage<S>[]')],
    updatePipeline_S: [this.toTypeName('UpdatePipeline<S>[]')],
    untypedPipeline: [this.toTypeName('Pipeline<any>')],
    query_S: [
      this.toTypeName('QueryOperator<S>'),
      'Partial<{ [k in keyof S]: Condition<S[k]> }>',
    ],
    accumulator_S: [],
    searchHighlight_S: [
      `{
        path:
          | UnprefixedFieldPath<S>
          | UnprefixedFieldPath<S>[]
          | { wildcard: string }
          | '*'
          | MultiAnalyzerSpec<S>
          | (UnprefixedFieldPath<S> | MultiAnalyzerSpec<S>)[];

        maxCharsToExamine?: number;
        maxNumPassages?: number;
      }`,
    ],

    // Need to be adjusted to match the real schema
    fieldPath_S: ['`$${AFieldPath<S, T>}`'],
    unprefixedFieldPath_S: ['AFieldPath<S, T>'],
    numberFieldPath_S: [this.toTypeFieldTypeName('number')],
    doubleFieldPath_S: [this.toTypeFieldTypeName('double')],
    stringFieldPath_S: [this.toTypeFieldTypeName('string')],
    objectFieldPath_S: [this.toTypeFieldTypeName('object')],
    arrayFieldPath_S: [this.toTypeFieldTypeName('array')],
    binDataFieldPath_S: [this.toTypeFieldTypeName('binData')],
    objectIdFieldPath_S: [this.toTypeFieldTypeName('objectId')],
    boolFieldPath_S: [this.toTypeFieldTypeName('bool')],
    dateFieldPath_S: [this.toTypeFieldTypeName('date')],
    nullFieldPath_S: [this.toTypeFieldTypeName('null')],
    regexFieldPath_S: [this.toTypeFieldTypeName('regex')],
    javascriptFieldPath_S: [this.toTypeFieldTypeName('javascript')],
    intFieldPath_S: [this.toTypeFieldTypeName('int')],
    timestampFieldPath_S: [this.toTypeFieldTypeName('timestamp')],
    longFieldPath_S: [this.toTypeFieldTypeName('long')],
    decimalFieldPath_S: [this.toTypeFieldTypeName('decimal')],

    resolvesToNumber_S: [
      this.toTypeName('resolvesToAny<S, Number>'),
      this.toTypeName('numberFieldPath<S>'),
      this.toTypeName('number'),
      this.toTypeName('resolvesToInt<S>'),
      this.toTypeName('resolvesToDouble<S>'),
      this.toTypeName('resolvesToLong<S>'),
      this.toTypeName('resolvesToDecimal<S>'),
    ],
    resolvesToDouble_S: [
      this.toTypeName('resolvesToAny<S, Double>'),
      this.toTypeName('doubleFieldPath<S>'),
      this.toTypeName('double'),
    ],
    resolvesToString_S: [
      this.toTypeName('resolvesToAny<S, string>'),
      this.toTypeName('stringFieldPath<S>'),
      this.toTypeName('string'),
    ],
    resolvesToObject_S: [
      "'$$ROOT'",
      this.toTypeName('resolvesToAny<S, Record<string, unknown>>'),
      this.toTypeName('objectFieldPath<S, T>'),
      this.toTypeName('object'),
    ],
    resolvesToArray_S: [
      this.toTypeName('resolvesToAny<S, ArrayOnly<T>>'),
      this.toTypeName('arrayFieldPath<S>'),
      this.toTypeName('ArrayOnly<T>'),
    ],
    resolvesToBinData_S: [
      this.toTypeName('resolvesToAny<S, bson.Binary>'),
      this.toTypeName('binDataFieldPath<S>'),
      this.toTypeName('binData'),
    ],
    resolvesToObjectId_S: [
      this.toTypeName('resolvesToAny<S, bson.ObjectId>'),
      this.toTypeName('objectIdFieldPath<S>'),
      this.toTypeName('objectId'),
    ],
    resolvesToBool_S: [
      this.toTypeName('resolvesToAny<S, boolean>'),
      this.toTypeName('boolFieldPath<S>'),
      this.toTypeName('bool'),
    ],
    resolvesToDate_S: [
      "'$$NOW'",
      this.toTypeName('resolvesToAny<S, Date>'),
      this.toTypeName('dateFieldPath<S>'),
      this.toTypeName('date'),
    ],
    resolvesToNull_S: [
      this.toTypeName('resolvesToAny<S, null>'),
      this.toTypeName('nullFieldPath<S>'),
      this.toTypeName('null'),
    ],
    resolvesToRegex_S: [
      this.toTypeName('resolvesToAny<S, RegExp>'),
      this.toTypeName('regexFieldPath<S>'),
      this.toTypeName('regex'),
    ],
    resolvesToJavascript_S: [
      this.toTypeName('resolvesToAny<S, Javascript>'),
      this.toTypeName('javascriptFieldPath<S>'),
      this.toTypeName('javascript'),
    ],
    resolvesToInt_S: [
      this.toTypeName('resolvesToAny<S, Int>'),
      this.toTypeName('intFieldPath<S>'),
      this.toTypeName('int'),
    ],
    resolvesToTimestamp_S: [
      this.toTypeName('resolvesToAny<S, bson.Timestamp>'),
      this.toTypeName('timestampFieldPath<S>'),
      this.toTypeName('timestamp'),
      "'$clusterTime'",
    ],
    resolvesToLong_S: [
      this.toTypeName('resolvesToAny<S, Long>'),
      this.toTypeName('longFieldPath<S>'),
      this.toTypeName('long'),
    ],
    resolvesToDecimal_S: [
      this.toTypeName('resolvesToAny<S, Decimal>'),
      this.toTypeName('decimalFieldPath<S>'),
      this.toTypeName('decimal'),
    ],
  };

  private emitHeader(): void {
    this.emit(`
      /* eslint-disable @typescript-eslint/no-unused-vars */
      /* eslint-disable @typescript-eslint/no-namespace */
      /* eslint-disable @typescript-eslint/ban-types */
      /* eslint-disable @typescript-eslint/no-explicit-any */

      import type * as bson from 'bson';
      import type { FilterOperators } from 'mongodb';

      type Condition<T> = AlternativeType<T> | FilterOperators<T> | QueryOperator<T>;
      type AlternativeType<T> =
        T extends ReadonlyArray<infer U> ? T | RegExpOrString<U> : RegExpOrString<T>;
      type RegExpOrString<T> = T extends string ? Regex | T : T;
      type KeysOfAType<T, Type> = {
        [k in keyof T]: Extract<T[k], Type> extends never ? never : k;
      }[keyof T]
      type RecordWithStaticFields<T extends Record<string, any>, TValue> = T & {
        [key: string]: TValue | T[keyof T];
      };

      // TBD: Nested fields
      type AFieldPath<S, Type> = KeysOfAType<S, Type> & string;
      type FieldExpression<S, T> = { [k: string]: FieldPath<S, T> };

      type MultiAnalyzerSpec<S> = {
        value: KeysOfAType<S, string>;
        multi: string;
      };

      type ArrayOnly<T> = T extends ReadonlyArray<infer U> ? U[] : never;
      `);
  }

  private getArgumentTypeName(
    type: { name: ArgType; generic?: string },
    syntheticVariables: SyntheticVariables | undefined,
  ): string | undefined {
    if (this.typeMappings[type.name]) {
      return this.toTypeName(type.name);
    }

    if (type.generic && this.typeMappings[`${type.name}_S`]) {
      return this.toTypeName(`${type.name}<S, ${type.generic}>`);
    }

    if (this.typeMappings[`${type.name}_S`]) {
      let genericArg = 'S';

      if (syntheticVariables) {
        // If we have synthetic variables for this argument, we need to construct a temporary type and merge it with S
        const syntheticFields = syntheticVariables
          .map((v) => `${this.toComment(v.description)}$${v.name}: any`)
          .join(';\n');

        genericArg = `S & { ${syntheticFields}; }`;
      }
      return this.toTypeName(`${type.name}<${genericArg}>`);
    }

    if (this.trivialTypeMappings[type.name]) {
      return this.trivialTypeMappings[type.name];
    }

    return undefined;
  }

  private emitArg(
    arg: NonNullable<typeof Operator._type.arguments>[number],
    named: boolean,
  ): void {
    if (named) {
      this.emit(`${arg.name}${arg.optional ? '?' : ''}: `);
    }

    const allowsArrays = arg.type.some((t) => liftArgType(t).name === 'array');
    const argTypes = arg.type
      .filter((t) => liftArgType(t).name !== 'array')
      .map((type) => {
        const lifted = liftArgType(type);
        const name = this.getArgumentTypeName(lifted, arg.syntheticVariables);
        if (!name) {
          throw new Error(`Unknown type ${lifted.name}`);
        }
        return name;
      })
      .join(' | ');

    if (allowsArrays) {
      if (arg.type.length > 1) {
        this.emit(`(${argTypes}) | (${argTypes})[]`);
      } else {
        this.emit('unknown[]');
      }
    } else {
      this.emit(argTypes);
    }
  }

  /**
   * This is explicitly handling the case of $slice where an argument in the middle of the array is optional.
   * This is not allowed by typescript, so we need to convert the array into a union of tuples.
   */
  private emitArrayWithOptionals(parsed: typeof Operator._type): boolean {
    if (!parsed.arguments) {
      return false;
    }
    let lastRequired,
      firstOptional: undefined | number = undefined;
    for (let i = 0; i < parsed.arguments.length; i++) {
      const arg = parsed.arguments[i];
      if (!arg.optional) {
        lastRequired = i;
      } else if (firstOptional === undefined) {
        firstOptional = i;
      }
    }

    if (
      firstOptional !== undefined &&
      lastRequired !== undefined &&
      firstOptional < lastRequired
    ) {
      const optionalArgs = parsed.arguments.filter((arg) => arg.optional);
      const totalCombinations = 1 << optionalArgs.length; // 2^n
      const optionalCombinations: Array<Record<string, boolean>> = [];

      // Generate the combinations of supplied optional arguments. For example,
      // if we have { a?, b, c? }, we generate:
      // {a: false, c: false}, {a: true, c: false}, {a: false, c: true}, {a: true, c: true}
      // which should produce the following, when merged with the required arguments:
      // [b] | [a, b] | [b, c] | [a, b, c]
      for (let i = 0; i < totalCombinations; i++) {
        const combination: Record<string, boolean> = Object.create(null);

        // For each optional parameter, check if it's included in this combination
        for (let j = 0; j < optionalArgs.length; j++) {
          // Check if bit j is set in i
          combination[optionalArgs[j].name] = !!(i & (1 << j));
        }

        optionalCombinations.push(combination);
      }

      for (const combination of optionalCombinations) {
        // Now, emit the union - for each combination, merge it with the required arguments and
        // emit the tuple. We don't care about trailing commas or leading pipes since prettier will
        // clean that up
        this.emit('| [');
        for (const arg of parsed.arguments) {
          if (!arg.optional || combination[arg.name]) {
            if (arg.description) {
              this.emitComment(arg.description);
            }

            this.emitArg({ ...arg, optional: false }, true);
            this.emit(',');
          }
        }
        this.emit(']\n');
      }

      return true;
    }

    return false;
  }

  protected override async generateImpl(yamlFiles: YamlFiles): Promise<void> {
    await this.emitToFile(this.schemaOutputFile);

    this.emitHeader();

    for await (const file of yamlFiles) {
      const namespace = `Aggregation.${capitalize(file.category)}`;
      this.emit(`export namespace ${namespace} {\n`);

      for await (const operator of file.operators()) {
        const parsed = Operator.parse(operator.yaml);
        const ifaceName = capitalize(parsed.name);

        this.emitComment(
          `A type describing the \`${parsed.name}\` operator.`,
          parsed.link,
        );
        let emittedTypeStart = false;
        let typeFinalizingTag = '';
        if (parsed.generic) {
          if (parsed.generic.length !== 1 || parsed.generic[0] !== 'T') {
            throw new Error(
              `Not currently supporting generics other than '[T]', received ${JSON.stringify(parsed.generic)}`,
            );
          }
          const genericSignatures = new Set(
            parsed.type.map((t) => liftArgType(t).generic),
          );
          if (genericSignatures.size !== 1) {
            throw new Error(
              `Not supporting matching on multiple different return types right now`,
            );
          }
          const [signature] = genericSignatures;
          if (signature && signature !== 'T') {
            this.emit(
              `export type ${ifaceName}<S, U> = U extends ${signature.replace(/\bT\b/g, '(infer T)')} ? {\n`,
            );
            emittedTypeStart = true;
            typeFinalizingTag = ' : never';
          }
        }
        if (!emittedTypeStart)
          this.emit(`export interface ${ifaceName}<S, T = any> {`);
        if (parsed.description) {
          this.emitComment(parsed.description, parsed.link);
        }
        this.emit(`${parsed.name}:`);
        for (const _type of parsed.type) {
          const type = liftArgType(_type);
          if (type.generic) {
            (this.typeMappings[`${type.name}_S`] ??= []).push(
              `${namespace}.${ifaceName}<S, T>`,
            );
          } else {
            (this.typeMappings[`${type.name}_S`] ??= []).push(
              `${namespace}.${ifaceName}<S>`,
            );
          }
        }

        (this.typeMappings[`${file.category}Operator_S`] ??= []).push(
          `${namespace}.${ifaceName}<S, T>`,
        );

        if (!parsed.arguments) {
          this.emit(`Record<string, never>`);
        } else {
          let encode = parsed.encode;
          if (encode === 'single') {
            if (parsed.arguments.length !== 1) {
              throw new Error(
                'encode: single should imply arguments.length === 1',
              );
            }
            if (parsed.arguments[0].variadic) {
              encode = parsed.arguments[0].variadic;
            }
          }
          switch (encode) {
            case 'array':
              if (this.emitArrayWithOptionals(parsed)) {
                break;
              }

            // eslint-disable-next-line no-fallthrough
            case 'object': {
              // We're temporarily switching to writing to an in-memory buffer in case we need to merge objects. Due to
              // limitations of merging objects with records, we need to use some type magic, requiring a helper type.
              // { foo: number } & { [key: string]: string } results in foo being a string due to the indexer. To avoid it
              // we need to use RecordWithStaticFields<{ foo: number}, string>
              const mergedArgs: (typeof parsed.arguments)[number][] = [];
              const objectType = this.getOutputOf(() => {
                this.emit(encode === 'array' ? '[' : '{');
                for (const arg of parsed.arguments ?? []) {
                  if (arg.mergeObject) {
                    mergedArgs.push(arg);
                    continue;
                  }

                  if (arg.description) {
                    this.emitComment(arg.description);
                  }

                  if (arg.variadic === 'array') {
                    for (let i = 0; i < (arg.variadicMin ?? 0); i++) {
                      this.emitArg(arg, false);
                      this.emit(',');
                    }
                    this.emit('...(');
                    this.emitArg(arg, false);
                    this.emit(')[]');
                  } else if (arg.variadic === 'object') {
                    this.emit(`} & { [${arg.name}: string]: `);
                    this.emitArg(arg, false);
                  } else {
                    this.emitArg(arg, true);
                  }
                  this.emit(',');
                }
                this.emit(encode === 'array' ? ']' : '}');
              });

              switch (mergedArgs.length) {
                case 0:
                  this.emit(objectType);
                  break;
                case 1:
                  {
                    const arg = mergedArgs[0];
                    switch (arg.variadic) {
                      case 'object':
                        if (objectType === '{}') {
                          this.emit(`{ [${arg.name}: string]: `);
                          this.emitArg(arg, false);
                          this.emit(`}`);
                        } else {
                          this.emit(
                            `RecordWithStaticFields<${objectType}, ${this.toComment(
                              arg.description,
                            )} ${arg.type
                              .map((t) => {
                                return this.getArgumentTypeName(
                                  liftArgType(t),
                                  undefined,
                                );
                              })
                              .join(' | ')}>`,
                          );
                        }
                        break;
                      case 'array':
                        throw new Error(
                          `invalid mergeObject combination: variadic=${arg.variadic}, encode=${parsed.encode}`,
                        );
                      case undefined:
                        this.emitArg(arg, false);
                        this.emit(' & ');
                        this.emit(objectType);
                        break;
                    }
                  }
                  break;
                default:
                  throw new Error(
                    `Unsupported number of mergeObject arguments: ${
                      mergedArgs.length
                    }, ${namespace}.${ifaceName}.{${mergedArgs
                      .map((a) => a.name)
                      .join(', ')}}`,
                  );
              }
              break;
            }
            case 'single':
              if (parsed.arguments.length !== 1) {
                throw new Error(
                  'encode: single should imply arguments.length === 1',
                );
              }
              this.emitArg(parsed.arguments[0], false);

              break;
            default:
              throw new Error(`unknown encode mode ${parsed.encode}`);
          }
        }
        this.emit(`} ${typeFinalizingTag};\n`);
      }

      this.emit('};\n');
    }

    for (const [type, interfaces] of Object.entries(this.typeMappings)) {
      if (type.endsWith('_S')) {
        const name = type.replace(/_S$/, '');
        this.emit(
          `\nexport type ${this.toTypeName(name)}<S, T = any> = ${[...new Set(interfaces)].join('|')};`,
        );
      } else {
        this.emit(
          `\nexport type ${this.toTypeName(type)} = ${[...new Set(interfaces)].join('|')};`,
        );
      }
    }
  }
}
