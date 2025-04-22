import yargs from 'yargs';
import { SchemaGenerator } from './schemaGenerator';
import { TestGenerator } from './testGenerator';
import { DriverSchemaGenerator } from './driverSchemaGenerator';

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
    )
    .demandCommand(1, 'A command must be provided')
    .help().argv;

  const [command] = argv._.map(String);

  switch (command) {
    case 'schema':
      {
        const schemaGenerator = new SchemaGenerator();
        await schemaGenerator.generate();
      }
      break;
    case 'tests':
      {
        const testGenerator = new TestGenerator();
        await testGenerator.generate();
      }
      break;
    case 'driver-schema':
      {
        const driverSchemaGenerator = new DriverSchemaGenerator();
        await driverSchemaGenerator.generate();
      }
      break;
    default:
      throw new Error(
        `Unknown command: ${command}. See '${argv.$0} --help' for more information.`,
      );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
