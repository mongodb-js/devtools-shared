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
  .option('--dir <path>', 'Directory to scan', '.')
  .option(
    '--bundle-info <paths>',
    'Comma-separated list of bundle info files',
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
      bundleInfoFiles: options.bundleInfo,
      snykReports: options.snykReports,
      failOn: options.failOn,
    });
  });

program
  .command('generate-3rd-party-notices')
  .description('Generate third-party notices')
  .option(
    '--bundle-info <paths>',
    'Comma-separated list of bundle info files',
    commaSeparatedList,
    []
  )
  .action(async (options) => {
    await generate3rdPartyNotices({
      bundleInfoFiles: options.bundleInfo,
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
