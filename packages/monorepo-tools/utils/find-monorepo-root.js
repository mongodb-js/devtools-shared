const findUp = require('find-up');
const path = require('path');

async function findMonorepoRoot() {
  const packagePath = await findUp('package-lock.json');
  return path.dirname(packagePath);
}

exports.findMonorepoRoot = findMonorepoRoot;
