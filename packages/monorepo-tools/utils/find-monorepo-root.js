const findUp = require('find-up');
const fs = require('fs');
const path = require('path');

async function findMonorepoRoot() {
  const packagePath = await findUp('package.json');
  const packageJSON = JSON.parse(await fs.promises.readFile(packagePath));
  if (!packageJSON.workspaces) {
    throw new Error(`no workspaces found in ${packagePath}`);
  }
  return path.dirname(packagePath);
}

exports.findMonorepoRoot = findMonorepoRoot;
