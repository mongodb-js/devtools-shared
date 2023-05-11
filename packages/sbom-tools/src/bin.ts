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
    '--dependency-files <paths>',
    'Comma-separated list of dependency files',
    commaSeparatedList,
    []
  )
  .option(
    '--dependencies <dependencies>',
    'Comma-separated list of dependencies. Example electron@18.0.0',
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
      dependencyFiles: options.dependencyFiles,
      dependencies: options.dependencies,
      snykReports: options.snykReports,
      failOn: options.failOn,
    });
  });

program
  .command('generate-3rd-party-notices')
  .description('Generate third-party notices')
  .option(
    '--license-files <paths>',
    'Comma-separated list of license info files',
    commaSeparatedList,
    []
  )
  .action(async (options) => {
    await generate3rdPartyNotices({
      licenseFiles: options.licenseFiles,
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
