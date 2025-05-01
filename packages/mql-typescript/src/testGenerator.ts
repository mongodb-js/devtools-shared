import path from 'path';
import { GeneratorBase, YamlFiles } from './generator';
import * as fs from 'fs/promises';
import { Operator } from './metaschema';
import { capitalize, removeNewlines } from './utils';
import { parseSchema, Schema } from 'mongodb-schema';
import { JSDOM } from 'jsdom';
import JSON5 from 'json5';

type TestType = NonNullable<typeof Operator._output.tests>[number];

class DocsCrawler {
  constructor(private readonly url: string) {}

  private getInsertionCode(
    element: Element | null | undefined,
  ): { collectionName: string; documents: unknown[] } | undefined {
    const codeSnippet = element?.querySelector('script')?.innerHTML;

    if (codeSnippet !== undefined) {
      const insertionCode =
        /db\.(?<collectionName>[^\.]*)\.insertMany\((?<documents>\[.*])\)/gm.exec(
          removeNewlines(JSON.parse(codeSnippet).text as string),
        );

      if (insertionCode && insertionCode.groups) {
        return {
          collectionName: insertionCode.groups.collectionName,

          // The docs use quoted/unquoted shell syntax inconsistently, so use JSON5 instead of regular JSON
          // to parse the documents.
          documents: JSON5.parse(insertionCode.groups.documents.trim()),
        };
      }
    }

    // Sometimes insertion code for the collection will be in the parent examples section. We fallback to it if we can't find it in the current section.
    while (element) {
      element = element?.parentElement?.closest('section');
      const examples = element?.querySelector("a[href='#examples']");
      if (examples) {
        return this.getInsertionCode(element);
      }
    }

    return undefined;
  }

  public async getSchema(): Promise<
    { schema: Schema; collectionName: string } | undefined
  > {
    const fragment = new URL(this.url).hash;
    if (!fragment) {
      return;
    }

    const dom = await JSDOM.fromURL(this.url);
    const exampleSection = dom.window.document
      .querySelector(`a[href='${fragment}']`)
      ?.closest('section');

    const insertionCode = this.getInsertionCode(exampleSection);

    if (!insertionCode) {
      return;
    }

    return {
      schema: await parseSchema(insertionCode.documents),
      collectionName: insertionCode.collectionName,
    };
  }
}

export class TestGenerator extends GeneratorBase {
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

    const schema = await new DocsCrawler(test.link).getSchema();
    if (!schema) {
      this.emit(
        `// TODO: no schema found for ${category}.${test.name} at ${test.link}\n`,
      );
      return;
    }

    this.emit(`type ${schema.collectionName} = {};\n`); // TODO
    this.emit(
      `const aggregation: schema.Pipeline<${schema.collectionName}> = [\n`,
    );

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
