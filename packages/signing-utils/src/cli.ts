import { InvalidArgumentError, program } from 'commander';
import { sign } from '.';

function parseEnumValue(name: string, values: string[]) {
  return (value: unknown) => {
    if (typeof value !== 'string' || !values.includes(value)) {
      throw new InvalidArgumentError(
        `${name} must be one of ${values.join('|')}`
      );
    }
  };
}

program
  .arguments('file')
  .requiredOption(
    '-c, --client <value>',
    'The client to sign with.  Can be `local` or `remote`.',
    parseEnumValue('client', ['local', 'remote'])
  )
  .requiredOption(
    '--signing-method <value>',
    'The signing method to use.  Can be `gpg` or `jsign`.',
    parseEnumValue('signing method', ['gpg', 'jsign'])
  )
  .option(
    '-h, --host <value>',
    'The SSH host to use when signing with remote client.'
  )
  .option('-u, --username <value>', 'The SSH host username.')
  .option('-p, --port <value>', 'The SSH host port.')
  .option(
    '-k, --private-key <value>',
    'The SSH private key to use when signing with remote client.'
  )
  .parse(process.argv);

const file = program.args[0];

sign(file, program.opts()).then(
  () => {
    // do nothing
  },
  (error) => {
    // eslint-disable-next-line no-console
    console.error({ error });
  }
);
