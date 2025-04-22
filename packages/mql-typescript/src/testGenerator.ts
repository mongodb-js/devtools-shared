import path from 'path';
import { GeneratorBase, YamlFiles } from './generator';
import * as fs from 'fs/promises';
import { Operator } from './metaschema';
import { capitalize, removeNewlines } from './utils';
import {
  SimplifiedSchema,
  SimplifiedSchemaType,
  SimplifiedSchemaBaseType,
} from 'mongodb-schema';

import * as bson from 'bson';
type TestType = NonNullable<typeof Operator._output.tests>[number];

export class TestGenerator extends GeneratorBase {
  private schemaBsonTypeToTS(
    type: SimplifiedSchemaBaseType['bsonType'],
  ): string {
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
        return 'bson.Int32';
      case 'Int64':
        return 'bson.Int64';
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
      case 'Number' as any:
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
      result += `${key}: ${this.simplifiedTypesToTS(value.types)};\n`;
    }
    result += '}\n';
    return result;
  }

  private async emitTestBody(category: string, test: TestType): Promise<void> {
    if (!test.link) {
      this.emit(
        `// TODO: No docs reference found for ${category}.${test.name}\n`,
      );
      return;
    }

    if (!test.pipeline) {
      this.emit(`// TODO: No pipeline found for ${category}.${test.name}\n`);
      return;
    }

    if (!test.schema || typeof test.schema === 'string') {
      this.emit(
        `// TODO: no schema found for ${category}.${test.name}${test.schema ? `: ${test.schema}` : ''}\n`,
      );
      return;
    }

    const collectionName = Object.keys(test.schema)[0];
    const schema = test.schema[collectionName] as SimplifiedSchema;

    this.emit(
      `type ${collectionName} = ${this.simplifiedSchemaToTS(schema)}\n`,
    );

    this.emit(`const aggregation: schema.Pipeline<${collectionName}> = [\n`);

    for (const stage of test.pipeline) {
      const json = JSON.stringify(stage, (_, value: any): any => {
        if (
          typeof value === 'object' &&
          '$code' in value &&
          typeof value.$code === 'string'
        ) {
          return removeNewlines(value.$code);
        }

        return value;
      });

      this.emit(
        json.replaceAll(
          /"(?<functionBody>function[^"]*)"/gm,
          '$<functionBody>',
        ),
      );

      this.emit(',\n');
    }

    this.emit('];\n');
  }

  protected override async generateImpl(yamlFiles: YamlFiles): Promise<void> {
    const whitelisted = ['$accumulator', '$addToSet', '$avg', '$bottom']; // TODO: whitelist all

    for await (const file of yamlFiles) {
      const namespace = `${capitalize(file.category)}Operators`;

      const basePath = path.resolve(__dirname, '..', 'tests', file.category);
      fs.mkdir(basePath, { recursive: true });

      for await (const operator of file.operators()) {
        const parsed = Operator.parse(operator.yaml);
        if (whitelisted.indexOf(parsed.name) === -1) {
          // TODO: enable for others
          return;
        }

        const filePath = path.join(basePath, `${parsed.name}.spec.ts`);
        this.emitToFile(filePath);

        this.emit(`import * as schema from '../../out/schema';\n\n`);

        let i = 0;
        for (const test of parsed.tests ?? []) {
          this.emitComment(
            test.name ?? `Test ${namespace}.${parsed.name}`,
            test.link,
          );
          this.emit(`function test${i++}() {\n`);

          await this.emitTestBody(parsed.name, test);

          this.emit('}\n\n');
        }
      }
    }
  }
}
