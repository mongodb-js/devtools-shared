/**
 * This script collects all package names from specified repositories using Lerna.
 * This is useful for generating a list of all packages we own when asking for NPM token updates.
 */
import * as fs from 'fs';
import * as path from 'path';
import { exec as execCallback } from 'child_process';
import { promisify } from 'util';

const exec = promisify(execCallback);

// Repositories to check
const repositories = [
  {
    name: 'devtools-shared',
    isLocal: true,
    path: path.resolve('.'),
  },
  {
    name: 'mongosh',
    url: 'git@github.com:mongodb-js/mongosh.git',
    branch: 'main',
  },
  {
    name: 'compass',
    url: 'git@github.com:mongodb-js/compass.git',
    branch: 'main',
  },
];

// Packages which exist as single repos and are not managed by Lerna
const manualPackages = ['glibc-version', 'mongodb-mcp-server'];

// Set working directory for cloning repos
const workDir = path.resolve('/tmp/repo-package-check');
const outputFile = path.resolve('./tmp/all-packages.txt');

async function main() {
  try {
    // Create working directory if it doesn't exist
    if (!fs.existsSync(workDir)) {
      fs.mkdirSync(workDir, { recursive: true });
    }

    console.log(`Working directory: ${workDir}`);
    console.log('Starting package collection...');

    let allPackages: string[] = [];
    let allScopes: string[] = [];

    // Process each repository
    for (const repo of repositories) {
      console.log(`\nProcessing ${repo.name}...`);

      const repoPath = repo.isLocal ? repo.path : path.join(workDir, repo.name);

      // Clone or pull the repository
      if (!repo.isLocal) {
        if (fs.existsSync(repoPath)) {
          console.log(`Repository exists, pulling latest changes...`);
          await exec(
            `cd ${repoPath} && git fetch && git checkout ${repo.branch} && git pull`,
          );
        } else {
          console.log(`Cloning repository...`);
          await exec(
            `git clone ${repo.url} ${repoPath} --branch ${repo.branch}`,
          );
        }
      }

      // Check if the repository uses Lerna
      if (fs.existsSync(path.join(repoPath, 'lerna.json'))) {
        console.log(`Running npx lerna list in ${repo.name}...`);
        try {
          const { stdout } = await exec(`cd ${repoPath} && npx lerna list`);

          // Parse package names from lerna output
          const packages = stdout
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line.length > 0);

          console.log(`Found ${packages.length} packages in ${repo.name}`);
          allPackages = [...allPackages, ...packages];
        } catch (error) {
          console.error(
            `Error running lerna list in ${repo.name}: ${error as string}`,
          );
        }
      } else {
        console.log(`${repo.name} does not appear to use Lerna. Skipping.`);
      }
    }

    // Sort packages alphabetically and remove duplicates
    const sortedPackages = [...new Set(allPackages), ...manualPackages].sort();

    // Write to output file
    fs.writeFileSync(outputFile, sortedPackages.join('\n') + '\n');

    console.log(`\nComplete! Found ${sortedPackages.length} unique packages.`);
    console.log(`Results saved to: ${outputFile}`);
  } catch (error) {
    console.error(`Error: ${error as string}`);
    process.exit(1);
  }
}

main();
