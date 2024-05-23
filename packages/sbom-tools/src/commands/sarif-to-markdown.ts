/* eslint-disable @typescript-eslint/restrict-template-expressions */

import { Command } from 'commander';
import fs from 'fs/promises';

export function sarifToMarkdown({ sarif }: { sarif: any }): string {
  const creationParams = sarif.properties['mongodb/creationParams'];
  let markdown = `
  Static analysis results for ${creationParams.fromRepo.owner}/${creationParams.fromRepo.repo} at \`${creationParams.fromRepo.commit}\`
  created at ${creationParams.timestamp}:

| Tool | Repository | Finding | Description | State | Category |
| --- | --- | --- | --- | --- | --- |
`;

  for (const {
    results,
    versionControlProvenance: [versionControlProvenance],
    tool: { driver },
  } of sarif.runs) {
    const repository = `${versionControlProvenance.repositoryUri} at \`${versionControlProvenance.revisionId}\``;
    const tool = `${driver.name} ${driver.semanticVersion || ''}`;
    for (const { properties } of results) {
      const alertState = properties['mongodb/alertState'];
      markdown +=
        `| ${tool} | ${repository} | #${properties['github/alertNumber']} | ${
          alertState.rule.description
        } | ${alertState.state}: ${alertState.dismissed_reason}\n${
          alertState.dismissed_comment || ''
        } | ${alertState.rule.security_severity_level} |`.replace(
          /\n/g,
          '<br/>'
        ) + '\n';
    }
  }

  markdown += `

`;
  return markdown;
}

export const command = new Command('sarif-to-markdown')
  .description('Convert SARIF CodeQL results to markdown')
  .option('--sarif <file>', 'JSON SARIF file input')
  .option('--md <file>', 'Markdown file output')
  .action(async (options) => {
    const markdown = sarifToMarkdown({
      sarif: JSON.parse(await fs.readFile(options.sarif, 'utf8')),
    });
    await fs.writeFile(options.md, markdown);
  });
