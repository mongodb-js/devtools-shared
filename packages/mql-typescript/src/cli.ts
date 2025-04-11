import yargs from 'yargs';
import { SchemaGenerator } from './schemaGenerator';
import { TestGenerator } from './testGenerator';

async function main() {
  const argv = await yargs
    .command('schema', 'Generates schema from the php driver definitions')
    .command(
      'tests',
      'Generates tests from the php driver definitions and the docs examples',
    )
    .demandCommand(1, 'A command must be provided')
    .help().argv;

  const [command, ...args] = argv._.map(String);

  switch (command) {
    case 'schema':
      const schemaGenerator = new SchemaGenerator();
      await schemaGenerator.generate();
      break;
    case 'tests':
      const testGenerator = new TestGenerator();
      await testGenerator.generate();
      break;
    default:
      throw new Error(
        `Unknown command: ${command}. See '${argv.$0} --help' for more information.`,
      );
  }
}

main();
