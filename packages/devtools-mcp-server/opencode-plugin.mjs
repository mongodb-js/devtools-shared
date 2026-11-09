import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** npm package that provides the DevTools MCP server (this package). */
export const SERVER_PACKAGE = '@mongodb-js/devtools-mcp-server';

/** npm package of the official MongoDB MCP server. */
export const MONGODB_SERVER_PACKAGE = 'mongodb-mcp-server';

/** npm package of the official Chrome DevTools MCP server. */
export const CHROME_DEVTOOLS_SERVER_PACKAGE = 'chrome-devtools-mcp';

/** Environment variables used when the URL options are not set. */
export const DEVPROD_MCP_URL_ENV = 'DEVPROD_MCP_URL';
export const GLEAN_ENTERPRISE_URL_ENV = 'GLEAN_ENTERPRISE_URL';

/** Skills shipped with the package, relative to the package root. */
export const SKILL_FILES = [
  {
    id: 'start-compass-with-devtools',
    file: 'start-compass-with-devtools/SKILL.md',
  },
  { id: 'devtools-mcp-workflows', file: 'devtools-mcp-workflows/SKILL.md' },
];

/**
 * The server binary built into the package (`dist/bin.js`). npm installs from
 * the registry include the build; a checkout installed from git does not, and
 * the plugin falls back to `npx`.
 */
const OWN_BIN_PATH = fileURLToPath(new URL('dist/bin.js', import.meta.url));

function isStringArray(value) {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((entry) => typeof entry === 'string')
  );
}

export function resolveServerCommand(
  options = {},
  { ownBinPath = OWN_BIN_PATH, exists = existsSync } = {},
) {
  const command = options.serverCommand;
  if (isStringArray(command)) {
    return command;
  }
  return exists(ownBinPath)
    ? ['node', ownBinPath]
    : ['npx', '-y', SERVER_PACKAGE];
}

export function resolveMongodbServerCommand(options = {}) {
  const command = options.mongodbServerCommand;
  if (command === false) {
    return undefined;
  }
  return isStringArray(command)
    ? command
    : ['npx', '-y', `${MONGODB_SERVER_PACKAGE}@3`];
}

export function resolveChromeDevtoolsServerCommand(options = {}) {
  const command = options.chromeDevtoolsServerCommand;
  if (command === false) {
    return undefined;
  }
  return isStringArray(command)
    ? command
    : ['npx', '-y', `${CHROME_DEVTOOLS_SERVER_PACKAGE}@1`];
}

/**
 * Remote servers are only registered when their URL is provided: the endpoints
 * are internal, so the package cannot ship defaults for them.
 */
export function remoteServerConfig(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    return undefined;
  }
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return undefined;
    }
    return { type: 'remote', url: url.toString() };
  } catch {
    return undefined;
  }
}

/**
 * Resolves a remote server from the plugin option first and the environment
 * variable second, so the URL can be supplied without editing the config.
 */
export function resolveRemoteServer(
  options,
  optionName,
  envName,
  env = process.env,
) {
  return (
    remoteServerConfig(options[optionName]) ?? remoteServerConfig(env[envName])
  );
}

export function mcpServerConfig(options = {}) {
  return { type: 'local', command: resolveServerCommand(options) };
}

export function mongodbMcpServerConfig(options = {}) {
  const command = resolveMongodbServerCommand(options);
  return command ? { type: 'local', command } : undefined;
}

export function chromeDevtoolsMcpServerConfig(options = {}) {
  const command = resolveChromeDevtoolsServerCommand(options);
  return command ? { type: 'local', command } : undefined;
}

function parseSkillFile(content) {
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(content);
  if (!frontmatter) {
    return undefined;
  }

  const fields = {};
  for (const line of frontmatter[1].split(/\r?\n/)) {
    const field = /^([\w-]+):\s*(.*)$/.exec(line);
    if (field && field[2]) {
      fields[field[1]] = field[2].trim();
    }
  }
  if (!fields.name) {
    return undefined;
  }

  return {
    name: fields.name,
    ...(fields.description ? { description: fields.description } : {}),
    body: content.slice(frontmatter[0].length).trim(),
  };
}

/**
 * Reads the skills bundled with the package. Failures are ignored so a partial
 * install still registers the MCP servers.
 */
export function loadSkills() {
  const skills = [];

  for (const { id, file } of SKILL_FILES) {
    try {
      const path = fileURLToPath(new URL(`./skills/${file}`, import.meta.url));
      const parsed = parseSkillFile(readFileSync(path, 'utf8'));
      if (!parsed) {
        continue;
      }
      skills.push({
        id,
        name: parsed.name,
        ...(parsed.description ? { description: parsed.description } : {}),
        path,
        content: parsed.body,
      });
    } catch {
      // Optional: the MCP servers are still useful without the skills.
    }
  }

  return skills;
}

/**
 * Registers with OpenCode:
 *
 * - the `devtools` MCP server (cluster lifecycle, fixtures, fail points);
 * - the official `mongodb` MCP server (database tools);
 * - the official `chrome-devtools` MCP server (browser/Compass debugging);
 * - the internal `devprod-mcp` and `glean-enterprise` servers, only when
 *   their URLs are provided as plugin options or environment variables;
 * - the skills shipped in this package.
 *
 * All registrations are transforms rather than config writes, so removing or
 * disabling the plugin removes them again.
 */
const plugin = {
  id: 'devtools',
  async setup(ctx) {
    const options = ctx.options ?? {};
    const mongodb = mongodbMcpServerConfig(options);
    const chromeDevtools = chromeDevtoolsMcpServerConfig(options);
    const devprod = resolveRemoteServer(
      options,
      'devprodMcpUrl',
      DEVPROD_MCP_URL_ENV,
    );
    const glean = resolveRemoteServer(
      options,
      'gleanEnterpriseUrl',
      GLEAN_ENTERPRISE_URL_ENV,
    );
    const skills = loadSkills();
    const servers = [
      ['devtools', mcpServerConfig(options)],
      ['mongodb', mongodb],
      ['chrome-devtools', chromeDevtools],
      ['devprod-mcp', devprod],
      ['glean-enterprise', glean],
    ];

    await ctx.mcp.transform((editor) => {
      for (const [name, config] of servers) {
        // Never replace a server the user already configured by hand.
        if (config && !editor.get(name)) {
          editor.set(name, config);
        }
      }
    });

    if (skills.length > 0) {
      await ctx.skill.transform((editor) => {
        for (const skill of skills) {
          editor.add(skill);
        }
      });
    }
  },
};

export default plugin;
