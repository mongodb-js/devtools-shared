import { program } from 'commander';
import { generate3rdPartyNotices } from './commands/generate-third-party-notices';
import { generateVulnerabilityReport } from './commands/generate-vulnerability-report';
import { scanNodeJs } from './commands/scan-node-js';

function commaSeparatedList(value: string) {
  return value.split(',');
}

program
  .command('generate-vulnerability-report')
  .description('Generate vulnerabilities report')
  .option(
    '--dependencies <paths>',
    'Comma-separated list of dependency files',
    commaSeparatedList,
    []
  )
  .option(
    '--snyk-reports <paths>',
    'Comma-separated list of snyk result files',
    commaSeparatedList,
    []
  )
  .option('--fail-on [level]', 'Fail on the specified severity level')
  .action(async (options) => {
    await generateVulnerabilityReport({
      dependencyFiles: options.dependencies,
      snykReports: options.snykReports,
      failOn: options.failOn,
    });
  });

program
  .command('generate-3rd-party-notices')
  .description('Generate third-party notices')
  .option('--product <productName>', 'Product name')
  .option(
    '--config [config]',
    'Path of the configuration file',
    'licenses.json'
  )
  .option(
    '--dependencies <paths>',
    'Comma-separated list of dependency files',
    commaSeparatedList,
    []
  )
  .action(async (options) => {
    await generate3rdPartyNotices({
      productName: options.product,
      dependencyFiles: options.dependencies,
      configPath: options.config,
    });
  });

program
  .command('scan-node-js')
  .description('Scan node.js version for known vulnerabilities')
  .option(
    '--version <version>',
    'Path to the node.js security-wg core database of vulnerabilities'
  )
  .action(async (options) => {
    await scanNodeJs({
      version: options.version,
    });
  });

program.parse(process.argv);
