import path from 'path';
import { GeneratorBase, YamlFiles } from './generator';
import { Operator } from './metaschema';
import { capitalize } from './utils';

type ArgType = NonNullable<
  typeof Operator._type.arguments
>[number]['type'][number];

export class SchemaGenerator extends GeneratorBase {
  constructor() {
    super();
    this.emitToFile(path.resolve(__dirname, '..', 'out', 'schema.ts'));
  }

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
    decimal: 'bson.Decimal128',
    array: 'unknown[]',
    binData: 'bson.Binary',
    objectId: 'bson.ObjectId',
    object: 'Record<string, unknown>',
    string: 'string',
  };

  private typeMappings: Record<string, string[]> = {
    int: ['number', 'bson.Int32'],
    double: ['number', 'bson.Double'],
    regex: ['RegExp', 'bson.BSONRegExp'],
    long: ['bigint', 'bson.Long'],
    javascript: ['bson.Code', 'Function'],

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
      this.toTypeName('C_expression<S>'),
      this.toTypeName('fieldPath<S>'),
      this.toTypeName('bsonPrimitive'),
      'FieldExpression<S>',
      'FieldPath<S>[]',
    ],
    stage_S: [this.toTypeName('C_stage<S>')],
    pipeline_S: [this.toTypeName('stage<S>[]')],
    query_S: [
      this.toTypeName('C_query<S>'),
      'Partial<{ [k in keyof S]: Condition<S[k]> }>',
    ],
    accumulator_S: [],
    searchOperator_S: [],
    geometry_S: [],

    // Need to be adjusted to match the real schema
    fieldPath_S: ['`$${AFieldPath<S, any>}`'],
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
      this.toTypeName('numberFieldPath<S>'),
      this.toTypeName('number'),
    ],
    resolvesToDouble_S: [
      this.toTypeName('doubleFieldPath<S>'),
      this.toTypeName('double'),
    ],
    resolvesToString_S: [
      this.toTypeName('stringFieldPath<S>'),
      this.toTypeName('string'),
    ],
    resolvesToObject_S: [
      this.toTypeName('objectFieldPath<S>'),
      this.toTypeName('object'),
    ],
    resolvesToArray_S: [
      this.toTypeName('arrayFieldPath<S>'),
      this.toTypeName('array'),
    ],
    resolvesToBinData_S: [
      this.toTypeName('binDataFieldPath<S>'),
      this.toTypeName('binData'),
    ],
    resolvesToObjectId_S: [
      this.toTypeName('objectIdFieldPath<S>'),
      this.toTypeName('objectId'),
    ],
    resolvesToBool_S: [
      this.toTypeName('boolFieldPath<S>'),
      this.toTypeName('bool'),
    ],
    resolvesToDate_S: [
      this.toTypeName('dateFieldPath<S>'),
      this.toTypeName('date'),
    ],
    resolvesToNull_S: [
      this.toTypeName('nullFieldPath<S>'),
      this.toTypeName('null'),
    ],
    resolvesToRegex_S: [
      this.toTypeName('regexFieldPath<S>'),
      this.toTypeName('regex'),
    ],
    resolvesToJavascript_S: [
      this.toTypeName('javascriptFieldPath<S>'),
      this.toTypeName('javascript'),
    ],
    resolvesToInt_S: [
      this.toTypeName('intFieldPath<S>'),
      this.toTypeName('int'),
    ],
    resolvesToTimestamp_S: [
      this.toTypeName('timestampFieldPath<S>'),
      this.toTypeName('timestamp'),
    ],
    resolvesToLong_S: [
      this.toTypeName('longFieldPath<S>'),
      this.toTypeName('long'),
    ],
    resolvesToDecimal_S: [
      this.toTypeName('decimalFieldPath<S>'),
      this.toTypeName('decimal'),
    ],
  };

  private emitHeader(): void {
    this.emit(`
      import type * as bson from 'bson';
      import { FilterOperators } from 'mongodb';

      type Condition<T> = AlternativeType<T> | FilterOperators<T>;
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
      type FieldExpression<T> = { [k: string]: FieldPath<T> };
      `);
  }

  private getArgumentTypeName(type: ArgType): string | undefined {
    if (this.typeMappings[type]) {
      return this.toTypeName(type);
    }

    if (this.typeMappings[`${type}_S`]) {
      return this.toTypeName(`${type}<S>`);
    }

    if (this.trivialTypeMappings[type]) {
      return this.trivialTypeMappings[type];
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

    for (const type of arg.type) {
      const name = this.getArgumentTypeName(type);

      if (!name) {
        throw new Error(`Unknown type ${type}`);
      }

      this.emit(`| ${name}`);
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
        const combination: Record<string, boolean> = {};

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
    this.emitHeader();

    for await (const file of yamlFiles) {
      const namespace = `${capitalize(file.category)}Operators`;
      this.emit(`export namespace ${namespace} {\n`);

      for await (const operator of file.operators()) {
        const parsed = Operator.parse(operator.yaml);
        const ifaceName = capitalize(parsed.name);

        this.emitComment(
          `A type describing the \`${parsed.name}\` operator.`,
          parsed.link,
        );
        this.emit(`export interface ${ifaceName}<S> {`);
        if (parsed.description) {
          this.emitComment(parsed.description, parsed.link);
        }
        this.emit(`${parsed.name}:`);
        for (const type of parsed.type) {
          (this.typeMappings[`${type}_S`] ??= []).push(
            `${namespace}.${ifaceName}<S>`,
          );
        }
        for (const type of parsed.type) {
          // TODO: why?
          (this.typeMappings[`C_${file.category}_S`] ??= []).push(
            `${namespace}.${ifaceName}<S>`,
          );
        }
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

            case 'object':
              // We're temporarily switching to writing to an in-memory buffer in case we need to merge objects. Due to
              // limitations of merging objects with records, we need to use some type magic, requiring a helper type.
              // { foo: number } & { [key: string]: string } results in foo being a string due to the indexer. To avoid it
              // we need to use RecordWithStaticFields<{ foo: number}, string>
              const mergedArgs: (typeof parsed.arguments)[number][] = [];
              const objectType = this.getOutputOf(() => {
                this.emit(encode === 'array' ? '[' : '{');
                for (const arg of parsed.arguments!) {
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
                            .map((t) => this.getArgumentTypeName(t))
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
                      break;
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
        this.emit('};\n');
      }

      this.emit('};\n');
    }

    for (const [type, interfaces] of Object.entries(this.typeMappings)) {
      const isTemplated = type.endsWith('_S');
      const name = isTemplated ? type.replace(/_S$/, '') : type;
      this.emit(
        `\nexport type ${this.toTypeName(name)}${
          isTemplated ? '<S>' : ''
        } = |` +
          interfaces
            .map((i) => `(${i}${i.endsWith('_S') ? '<S>' : ''})`)
            .join('|') +
          ';',
      );
    }
  }
}
