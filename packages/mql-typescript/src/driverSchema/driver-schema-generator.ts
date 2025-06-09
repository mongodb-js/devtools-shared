import type { YamlFiles } from '../generator';
import { GeneratorBase } from '../generator';
import { Operator } from '../metaschema';
import * as yaml from 'js-yaml';
import * as fs from 'fs/promises';
import { DocsCrawler } from './docs-crawler';
import { getStaticSchema } from './static-schemas';

type TestType = NonNullable<typeof Operator._output.tests>[number];

export class DriverSchemaGenerator extends GeneratorBase {
  private async getSchemaFromDocs(test: TestType): Promise<object | string> {
    if (!test.link) {
      console.error(`No docs reference found for ${test.name}`);
      return '// TODO: No docs reference found';
    }
    if (!test.pipeline) {
      console.error(`No pipeline found for ${test.name} at ${test.link}`);
      return '// TODO: No pipeline found';
    }

    const docsCrawler = new DocsCrawler(test.link);
    const schema = await docsCrawler.getSchema();

    if (!schema) {
      console.error(
        `Could not extract schema for ${test.name} at ${test.link}`,
      );
      return '// TODO: No schema found in docs';
    }

    return {
      [schema.collectionName]: schema.schema,
    };
  }

  private async updateTestSchema({
    category,
    operator,
    test,
    rawYaml,
  }: {
    category: string;
    operator: string;
    test: TestType;
    rawYaml: { tests: { name: string; schema: object | string }[] };
  }): Promise<void> {
    const yamlTest = rawYaml.tests.find(
      (t: { name: string }) => t.name === test.name,
    );

    if (!yamlTest) {
      console.error(
        `Test ${test.name} not found in operator ${operator} in category ${category}`,
      );
      return;
    }

    yamlTest.schema =
      getStaticSchema({ category, operator, test: test.name }) ??
      (await this.getSchemaFromDocs(test));
  }

  override async generateImpl(yamlFiles: YamlFiles): Promise<void> {
    for await (const file of yamlFiles) {
      for await (const operator of file.operators()) {
        const parsed = Operator.parse(operator.yaml);

        const operatorYaml = operator.yaml as {
          name: string;
          tests: { name: string; schema: object | string }[];
        };

        for (const test of parsed.tests ?? []) {
          await this.updateTestSchema({
            category: file.category,
            operator: operatorYaml.name,
            test,
            rawYaml: operatorYaml,
          });
        }

        let updatedYaml = yaml.dump(operatorYaml, {
          schema: GeneratorBase.loadOptions.schema,
          indent: 4,
          lineWidth: -1,
        });

        updatedYaml = `# $schema: ../schema.json\n${updatedYaml}`;

        await fs.writeFile(operator.path, updatedYaml, 'utf8');
      }
    }
  }
}
