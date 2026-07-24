// @ts-check
import fs from "node:fs";

// Find every package.json in this repo that is not in node_modules and not in .github
// and run local us-en sort on the dependencies, devDependencies and peerDependencies.
// assert that there's no changes.

const collator = new Intl.Collator("en-US");

/** @param {string[]} keys */
function isSorted(keys) {
  const sorted = keys.toSorted(collator.compare);
  return keys.every((key, index) => key === sorted[index]);
}

/** @type {string[]} */
const packageJsonPaths = [];
for await (const path of fs.promises.glob("**/package.json")) {
  if (!path.includes("node_modules/") && !path.startsWith(".github/")) {
    packageJsonPaths.push(path);
  }
}

const results = await Promise.all(
  packageJsonPaths.map(async (path) => {
    const pkg = JSON.parse(await fs.promises.readFile(path, "utf8"));
    return ["dependencies", "devDependencies", "peerDependencies"]
      .filter((field) => pkg[field] && !isSorted(Object.keys(pkg[field])))
      .map((field) => `${path} (${field})`);
  }),
);

const unsorted = results.flat();

if (unsorted.length > 0) {
  console.error(
    "Error: The following package.json files have unsorted dependencies:\n" +
      unsorted.map((entry) => `  - ${entry}`).join("\n"),
  );
  process.exitCode = 1;
} else {
  console.log(
    `Success: Checked ${packageJsonPaths.length} package.json files, all dependencies are sorted.`,
  );
}
