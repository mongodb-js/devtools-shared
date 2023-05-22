import { program } from 'commander';
import { command as generate3rdPartyNotices } from './commands/generate-third-party-notices';
import { command as generateVulnerabilityReport } from './commands/generate-vulnerability-report';
import { command as scanNodeJs } from './commands/scan-node-js';

export function main(argv: string[]): void {
  program.addCommand(generateVulnerabilityReport);
  program.addCommand(generate3rdPartyNotices);
  program.addCommand(scanNodeJs);
  program.parse(argv);
}
