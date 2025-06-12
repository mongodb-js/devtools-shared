import path from 'path';
import type { YamlFiles } from '../generator';
import { GeneratorBase } from '../generator';
import * as fs from 'fs/promises';
import { Operator } from '../metaschema';
import { capitalize, removeNewlines } from '../utils';
import type {
  SimplifiedSchema,
  SimplifiedSchemaType,
  SimplifiedSchemaBaseType,
} from 'mongodb-schema';
import { unsupportedAggregations } from './unsupported-aggregations';
import * as bson from 'bson';

type TestType = NonNullable<typeof Operator._output.tests>[number];

type SchemaBSONType = SimplifiedSchemaBaseType['bsonType'] | 'Long' | 'Number';

export class TestGenerator extends GeneratorBase {
  private schemaBsonTypeToTS(type: SchemaBSONType): string {
    switch (type) {
      case 'Binary':
        return 'bson.Binary';
      case 'Boolean':
        return 'boolean';
      case 'Code':
        return 'bson.Code';
      case 'CodeWScope':
        return 'bson.Code';
      case 'Date':
        return 'Date';
      case 'Decimal128':
        return 'bson.Decimal128';
      case 'Double':
        return 'bson.Double | number';
      case 'Int32':
        return 'bson.Int32 | number';
      case 'Long':
      case 'Int64':
        return 'bson.Long';
      case 'MaxKey':
        return 'bson.MaxKey';
      case 'MinKey':
        return 'bson.MinKey';
      case 'Null':
        return 'null';
      case 'ObjectId':
        return 'bson.ObjectId';
      case 'BSONRegExp':
        return 'bson.BSONRegExp';
      case 'String':
        return 'string';
      case 'BSONSymbol':
        return 'bson.BSONSymbol';
      case 'Timestamp':
        return `bson.Timestamp`;
      case 'Undefined':
        return `undefined`;
      case 'Number':
        return 'number';
      default:
        throw new Error(`Unknown BSON type: ${type}`);
    }
  }

  private simplifiedTypesToTS(types: SimplifiedSchemaType[]): string {
    const mappedTypes = [];
    for (const type of types) {
      if (type.bsonType === 'Document' && 'fields' in type) {
        mappedTypes.push(this.simplifiedSchemaToTS(type.fields));
      } else if (type.bsonType === 'Array' && 'types' in type) {
        mappedTypes.push(`Array<${this.simplifiedTypesToTS(type.types)}>`);
      } else {
        mappedTypes.push(this.schemaBsonTypeToTS(type.bsonType));
      }
    }

    return mappedTypes.join(' | ');
  }

  private simplifiedSchemaToTS(schema: SimplifiedSchema): string {
    let result = '{\n';
    for (const [key, value] of Object.entries(schema)) {
      result += `'${key}': ${this.simplifiedTypesToTS(value.types)};\n`;
    }
    result += '}\n';
    return result;
  }

  private stageToTS(stage: unknown): string {
    switch (typeof stage) {
      case 'object': {
        if (stage === null) {
          return 'null';
        }

        if (Array.isArray(stage)) {
          return `[${stage.map((s) => this.stageToTS(s)).join(', ')}]`;
        }

        if (stage instanceof bson.Binary) {
          return `bson.Binary.createFromBase64('${stage.toString('base64')}', ${stage.sub_type})`;
        }

        if (stage instanceof bson.ObjectId) {
          return `bson.ObjectId.createFromHexString('${stage.toHexString()}')`;
        }

        if (stage instanceof bson.Long) {
          return `new bson.Long('${stage.toString()}')`;
        }

        if (stage instanceof Date) {
          return `new Date('${stage.toISOString()}')`;
        }

        if (stage instanceof bson.BSONRegExp) {
          return `new bson.BSONRegExp('${stage.pattern}', '${stage.options}')`;
        }

        if ('$code' in stage && typeof stage.$code === 'string') {
          return JSON.stringify(removeNewlines(stage.$code));
        }

        let result = '{';
        for (const [key, value] of Object.entries(stage)) {
          result += `${JSON.stringify(key)}: ${this.stageToTS(value)},`;
        }
        result += '}';
        return result;
      }
      case 'undefined':
        return 'undefined';
      default:
        return JSON.stringify(stage);
    }
  }

  private emitTestBody(
    category: string,
    operator: string,
    test: TestType,
  ): void {
    if (!test.pipeline) {
      this.emit(`// TODO: No pipeline found for ${operator}.${test.name}\n`);
      return;
    }

    if (!test.schema || typeof test.schema === 'string') {
      this.emit(
        `// TODO: no schema found for ${operator}.${test.name}${test.schema ? `: ${test.schema}` : ''}\n`,
      );
      return;
    }

    const collectionName = Object.keys(test.schema)[0];
    const schema = test.schema[collectionName] as SimplifiedSchema;

    this.emit(
      `type ${collectionName} = ${this.simplifiedSchemaToTS(schema)}\n`,
    );

    this.emit(`const aggregation: schema.Pipeline<${collectionName}> = [\n`);

    for (let i = 0; i < test.pipeline.length; i++) {
      const stage = test.pipeline[i];

      // Some pipelines project to new types, which is not supported by the static type system.
      // In this case, we typecast to any to suppress the type error.
      const unsupportedStage =
        unsupportedAggregations[category]?.[operator]?.[test.name];
      const isUnsupportedStage =
        unsupportedStage && i >= unsupportedStage.stage;

      if (isUnsupportedStage) {
        this.emitComment(
          `This stage is unsupported by the static type system, so we're casting it to 'any' (${unsupportedStage.comment ?? 'it may involve a projected field'}).`,
        );
      }

      this.emit(this.stageToTS(stage));

      if (isUnsupportedStage) {
        this.emit(' as any');
      }
      this.emit(',\n');
    }

    this.emit('];\n');
  }

  protected override async generateImpl(yamlFiles: YamlFiles): Promise<void> {
    for await (const file of yamlFiles) {
      const namespace = `${capitalize(file.category)}Operators`;

      const basePath = path.resolve(
        __dirname,
        '..',
        '..',
        'tests',
        file.category,
      );
      await fs.mkdir(basePath, { recursive: true });

      for await (const operator of file.operators()) {
        const parsed = Operator.parse(operator.yaml);

        const operatorName = parsed.name.replace(/^\$/, '');

        const filePath = path.join(basePath, `${operatorName}.spec.ts`);
        await this.emitToFile(filePath);

        this.emit('/* eslint-disable @typescript-eslint/no-unused-vars */\n');
        this.emit('/* eslint-disable filename-rules/match */\n');
        this.emit(
          '/* eslint-disable @typescript-eslint/consistent-type-imports */\n',
        );
        this.emit("import type * as schema from '../../out/schema';\n");
        this.emit("import * as bson from 'bson';\n\n");

        let i = 0;
        for (const test of parsed.tests ?? []) {
          this.emitComment(
            test.name ?? `Test ${namespace}.${parsed.name}`,
            test.link,
          );

          this.emit(`function test${i++}() {\n`);

          this.emitTestBody(file.category, operatorName, test);

          this.emit('}\n\n');
        }
      }
    }
  }
}
