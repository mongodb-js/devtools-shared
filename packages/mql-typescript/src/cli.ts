import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { SchemaGenerator } from './schema-generator';
import { TestGenerator } from './testGenerator/test-generator';
import { DriverSchemaGenerator } from './driverSchema/driver-schema-generator';
import type { GeneratorBase } from './generator';

async function main() {
  const filterOptions = {
    category: {
      type: 'string',
      choices: ['accumulator', 'expression', 'query', 'search', 'stage'],
      description:
        'The category of the operator to generate. If not provided, all categories will be used.',
    },
    operator: {
      type: 'string',
      description:
        'The operator to generate. If not provided, all operators will be used.',
    },
  } as const;

  const argv = await yargs(hideBin(process.argv))
    .command('schema', 'Generates schema from the php driver definitions')
    .command(
      'tests',
      'Generates tests from the php driver definitions and the docs examples',
      filterOptions,
    )
    .command(
      'driver-schema',
      'Updates the php driver definitions with the schema for the tests',
      filterOptions,
    )
    .demandCommand(1, 'A command must be provided')
    .help().argv;

  const [command] = argv._.map(String);

  const categoryFilter = argv.category as string | undefined;
  const operatorFilter = argv.operator as string | undefined;

  let generator: GeneratorBase;
  switch (command) {
    case 'schema':
      generator = new SchemaGenerator();
      break;
    case 'tests':
      generator = new TestGenerator();
      break;
    case 'driver-schema':
      generator = new DriverSchemaGenerator();
      break;
    default:
      throw new Error(
        `Unknown command: ${command}. See '${argv.$0} --help' for more information.`,
      );
  }

  await generator.generate(categoryFilter, operatorFilter);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
