import yargs from 'yargs';
import { SchemaGenerator } from './schemaGenerator';
import { TestGenerator } from './testGenerator/testGenerator';
import { DriverSchemaGenerator } from './driverSchema/driverSchemaGenerator';
import { GeneratorBase } from './generator';

async function main() {
  const argv = await yargs
    .command('schema', 'Generates schema from the php driver definitions')
    .command(
      'tests',
      'Generates tests from the php driver definitions and the docs examples',
    )
    .command(
      'driver-schema',
      'Updates the php driver definitions with the schema for the tests',
      {
        category: {
          type: 'string',
          choices: ['accumulator', 'expression', 'query', 'search', 'stage'],
          description:
            'The category of the operator to update. If not provided, all categories will be updated.',
        },
        operator: {
          type: 'string',
          description:
            'The operator to update the schema for. If not provided, all operators will be updated.',
        },
      },
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
