import { program } from 'commander';
import { command as generate3rdPartyNotices } from './commands/generate-third-party-notices';
import { command as generateVulnerabilityReport } from './commands/generate-vulnerability-report';
import { command as scanNodeJs } from './commands/scan-node-js';
import { command as fetchCodeQLResults } from './commands/fetch-codeql-results';
import { command as sarifToMarkdown } from './commands/sarif-to-markdown';

export function main(argv: string[]): void {
  program.addCommand(generateVulnerabilityReport);
  program.addCommand(generate3rdPartyNotices);
  program.addCommand(scanNodeJs);
  program.addCommand(fetchCodeQLResults);
  program.addCommand(sarifToMarkdown);
  program.parse(argv);
}
