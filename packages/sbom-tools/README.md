# @mongodb-js/sbom-tools

Utilities to generate sbom reports for webpack bundles.

## Reporting of 3rd party vulnerabilities and licenses

This package exports `WebpackDependenciesPlugin`, a shared webpack plugin that reports bundled dependencies and licenses as a json file for each bundle.

And exposes a `mongodb-sbom-tools` binary providing the following commands:

- `generate-vulnerability-report`: Generates a report of vulnerabilities from the output of snyk test and a dependencies json file containing all the dependencies.
- `generate-3rd-party-notices`: Generates a 3rd party notices file based on the licenses information collected by the WebpackDependenciesPlugin. Also validates the licenses.
- `scan-node-js`: A script to produce a list of vulnerabilities affecting a Node.js version in the same format as snyk test (useful as we are redistributing Node.js with mongosh).

### `WebpackDependenciesPlugin`

This plugin taps in the webpack compilation, collects the modules from 3rd party dependencies as they are resolved and writes an output file containing metadata about dependencies and licenses included in the bundle. The plugin ignores dependencies that are removed from the bundle via resolve: `{alias: {<dependency>: false}}`.

Setting `includeExternalProductionDependencies` to true the plugin will also include recursively any production and optional dependencies listed in the `package.json`, regardless of their inclusion in the bundle.

#### Usage

```js
// webpack.config.js

const webpackDependenciesPlugin = new WebpackDependenciesPlugin({
  outputFilename: 'dependencies.json',
  includePackages: ['electron'],
  includeExternalProductionDependencies: true,
 });


module.exports = { ..., plugins: [buildInfoPlugin] }
```

**Example Output**

```json
dependencies.json

[{
  "name": "@aws-sdk/client-cognito-identity",
  "version": "3.267.0",
  "name": "@aws-sdk/client-cognito-identity",
  "version": "3.321.1",
  "license": "Apache-2.0",
  "path": ".../node_modules/@aws-sdk/client-cognito-identity",
  "licenseFiles": [
     {
       "filename": "LICENSE",
       "content": "..."
     }
  ]
}, ...]
```

### `generate-vulnerability-report` command

Outputs a markdown report of vulnerabilities given one or more `dependencies.json` files and the output of one or more multiple `snyk test`.

If `--create-jira-issues` is set then each vulnerability that is not ignored will be also reported as a jira issue.

The jira issue creation must be configured setting the following environment variables:

- `JIRA_BASE_URL` (required): The base url of the jira api (excluded the `/rest/api/...`).
- `JIRA_API_TOKEN` (required): A jira PAT.
- `JIRA_PROJECT` (required): The project used to create the ticket.
- `JIRA_VULNERABILITY_BUILD_INFO`: Additional build info added to the ticket description (for example the commit id).

#### Usage

```
Usage: bin generate-vulnerability-report [options]

Generate vulnerabilities report

Options:
  --dependencies <paths>     Comma-separated list of dependency files (default: [])
  --snyk-reports <paths>     Comma-separated list of snyk
result files (default: [])
  --fail-on [level]          Fail on the specified severity
level
  --create-jira-issues       Create Jira issues for the vulnerabilities found
  -h, --help                 display help for command
```

**Example output:**

```md
| dep@version  | id                    | score        | fixed in | ignored              |
| ------------ | --------------------- | ------------ | -------- | -------------------- |
| jquery@2.2.4 | SNYK-JS-JQUERY-567880 | 6.5 (Medium) | 3.5.0    | -                    |
| got@10.7.0   | SNYK-JS-GOT-2932019   | 5.4 (Medium) | 11.8.5   | Ignored. Reason: ... |
```

#### Ignored vulnerabilities

The `generate-vulnerability-report` command must run from a directory containing a `.snyk` policy file. The Snyk’s policy rules are applied to determine if a vulnerability must be reported as ignored or not.

Ignored vulnerabilities won’t cause the report to fail with an error when `--fail-on` is specified.

#### Fail on

`--fail-on` configures the command to fail with an error if the report contains a vulnerability that:

- Does not have a known severity
- Has a score greater or equal to the specified severity
- Is not ignored
- Has a know remediation path (the “fixed in” column is not empty)

### `generate-3rd-party-notices` command

Takes one or more dependencies.json files and generates a markdown report for 3rd party licenses. Validates that licenses are among the list of allowed licenses.

When the command encounters a package with a license that is not allowed, the generation breaks. False positives can be ignored by excluding or overriding the license for specific packages or organizations.

The following licenses are allowed:

- `MIT`
- `0BSD`
- `BSD-2-Clause`
- `BSD-3-Clause`
- `BSD-4-Clause`
- `Apache-2.0`
- `ISC`
- `CC-BY-4.0`
- `WTFPL`
- `OFL-1.1`
- `Unlicense`

The validation can be tweaked with a configuration file (by default `${cwd}/licenses.json`). The configuration allows ignoring certain orgs and packages, and overriding licenses for specific dependencies.

Overrides and excluded packages are checked for existence inside the `dependencies.json` in order to avoid forgetting exceptions on removed dependencies.

#### Usage

```
Usage: bin generate-3rd-party-notices [options]

Generate third-party notices

Options:
  --product <productName>  Product name
  --config [config]        Path of the configuration file (default:
                           "licenses.json")
  --dependencies <paths>   Comma-separated list of dependency files
                           (default: [])
  -h, --help               display help for command
```

**Example config:**

```json
{
  // remove orgs and packages from the report
  "ignoredOrgs": ["@mongodb-js", "@leafygreen-ui", "@mongosh"],
  "ignoredPackages": ["package1"],
  // include packages in the report, just skip validation
  "doNotValidatePackages": ["package2"],
  "additionalAllowedLicenses": ["PYTHON-2.0"],
  "licenseOverrides": {
    "@segment/loosely-validate-event@2.0.0": "MIT",
    "component-event@0.1.4": "MIT",
    "delegate-events@1.1.1": "MIT",
    "events-mixin@1.3.0": "MIT",
    "sprintf@0.1.3": "BSD-3-Clause"
  }
}
```

**Example output:**

```md
The following third-party software is used by and included in **Mongodb Compass**.
This document was automatically generated on Sun May 14 2023.

## List of dependencies

| Package                                                                                                   | Version | License    |
| --------------------------------------------------------------------------------------------------------- | ------- | ---------- |
| **[@aws-sdk/client-cognito-identity](#5416a8cf83b6af5965b709a5538b4b4590f0a081e36cbd99a1af945d73034f1a)** | 3.321.1 | Apache-2.0 |

...

## Package details

<a id="5416a8cf83b6af5965b709a5538b4b4590f0a081e36cbd99a1af945d73034f1a"></a>

### [@aws-sdk/client-cognito-identity](https://www.npmjs.com/package/@aws-sdk/client-cognito-identity) (version 3.321.1)

License tags: Apache-2.0

License files:

- LICENSE:

                                      Apache License
                                 Version 2.0, January 2004
                              http://www.apache.org/licenses/

         TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION

...
```

### Scan-node-js command

This command scans a Node.js version for known vulnerabilities and produces a report that is conforming to the snyk test output format and can be used with `generate-vulnerability-report`.

`scan-node-js` fails with an error if the Node.js version is not officially supported anymore. Otherwise it builds a list of vulnerability scanning the database published by the Node.js `security-wg` https://raw.githubusercontent.com/nodejs/security-wg/main/vuln/core/index.json, and enriching it with cvss from the nvd.nist.gov database.

The output reports vulnerabilities as they would have been found in a “fake” `.node.js` npm package, with the recommended `NSWG-COR-*`. That is useful in conjunction with `generate-vulnerability-report` as it allows the use of the same policies for ignoring vulnerabilities and includes Node.js in the report as any other package.

#### Usage

```
Usage: bin scan-node-js [options]

Scan node.js version for known vulnerabilities

Options:
  --version <version>  Path to the node.js security-wg core
 database of vulnerabilities
  -h, --help           display help for command
```

Use in conjunction with generate-vulnerability-report:

```sh
echo '[{name: ".node.js", version:"'"$NODE_JS_VERSION"'"}]' > node-js-dep.json
mongodb-sbom-tools scan-node-js --version=$NODE_JS_VERSION > node-js-vuln.json

mongodb-sbom-tools generate-vulnerability-report
--dependencies=node-js-vuln.json --snyk-report=node-js-vuln.json
```
