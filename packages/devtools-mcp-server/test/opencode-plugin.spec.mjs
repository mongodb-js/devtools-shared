import { expect } from 'chai';
import plugin, {
  CHROME_DEVTOOLS_SERVER_PACKAGE,
  loadSkills,
  mcpServerConfig,
  MONGODB_SERVER_PACKAGE,
  remoteServerConfig,
  resolveChromeDevtoolsServerCommand,
  resolveMongodbServerCommand,
  resolveRemoteServer,
  resolveServerCommand,
  SERVER_PACKAGE,
} from '../opencode-plugin.mjs';

function createFakeContext(options = {}, existing = {}) {
  const registered = [];
  const skills = [];
  const context = {
    options,
    mcp: {
      transform: async (callback) => {
        callback({
          get(name) {
            return existing[name];
          },
          set(name, config) {
            registered.push({ name, config });
          },
        });
      },
    },
    skill: {
      transform: async (callback) => {
        callback({
          add(skill) {
            skills.push(skill);
          },
        });
      },
    },
  };

  return { context, registered, skills };
}

describe('opencode plugin', function () {
  const savedEnv = {
    DEVPROD_MCP_URL: process.env.DEVPROD_MCP_URL,
    GLEAN_ENTERPRISE_URL: process.env.GLEAN_ENTERPRISE_URL,
  };

  beforeEach(function () {
    delete process.env.DEVPROD_MCP_URL;
    delete process.env.GLEAN_ENTERPRISE_URL;
  });

  afterEach(function () {
    for (const [name, value] of Object.entries(savedEnv)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  });

  it('has a stable id', function () {
    expect(plugin.id).to.equal('devtools');
  });

  it('registers the devtools, mongodb and chrome-devtools MCP servers', async function () {
    const { context, registered } = createFakeContext();

    await plugin.setup(context);

    expect(registered).to.have.lengthOf(3);
    expect(registered[0]).to.deep.include({ name: 'devtools' });
    expect(registered[1]).to.deep.equal({
      name: 'mongodb',
      config: {
        type: 'local',
        command: ['npx', '-y', `${MONGODB_SERVER_PACKAGE}@3`],
      },
    });
    expect(registered[2]).to.deep.equal({
      name: 'chrome-devtools',
      config: {
        type: 'local',
        command: ['npx', '-y', `${CHROME_DEVTOOLS_SERVER_PACKAGE}@1`],
      },
    });
  });

  it('does not replace servers the user already configured', async function () {
    const existingChrome = {
      type: 'local',
      command: ['chrome-devtools-mcp', '--browserUrl', 'http://127.0.0.1:9222'],
    };
    const { context, registered } = createFakeContext(
      {},
      { 'chrome-devtools': existingChrome },
    );

    await plugin.setup(context);

    expect(registered.map((entry) => entry.name)).to.deep.equal([
      'devtools',
      'mongodb',
    ]);
    expect(registered[1].config.command).to.deep.equal([
      'npx',
      '-y',
      `${MONGODB_SERVER_PACKAGE}@3`,
    ]);
  });

  it('registers the internal servers when their URLs are provided', async function () {
    const { context, registered } = createFakeContext({
      devprodMcpUrl: 'https://devprod.example.com/mcp',
      gleanEnterpriseUrl: 'https://glean.example.com/mcp/endpoint',
    });

    await plugin.setup(context);

    expect(registered.map((entry) => entry.name)).to.deep.equal([
      'devtools',
      'mongodb',
      'chrome-devtools',
      'devprod-mcp',
      'glean-enterprise',
    ]);
    expect(registered[3].config).to.deep.equal({
      type: 'remote',
      url: 'https://devprod.example.com/mcp',
    });
    expect(registered[4].config).to.deep.equal({
      type: 'remote',
      url: 'https://glean.example.com/mcp/endpoint',
    });
  });

  it('reads the internal server URLs from the environment', async function () {
    process.env.DEVPROD_MCP_URL = 'https://devprod.example.com/mcp';
    process.env.GLEAN_ENTERPRISE_URL = 'https://glean.example.com/mcp';

    const { context, registered } = createFakeContext();

    await plugin.setup(context);

    expect(registered.map((entry) => entry.name)).to.deep.equal([
      'devtools',
      'mongodb',
      'chrome-devtools',
      'devprod-mcp',
      'glean-enterprise',
    ]);
    expect(registered[3].config).to.deep.equal({
      type: 'remote',
      url: 'https://devprod.example.com/mcp',
    });
    expect(registered[4].config).to.deep.equal({
      type: 'remote',
      url: 'https://glean.example.com/mcp',
    });
  });

  it('prefers plugin options over the environment', function () {
    expect(
      resolveRemoteServer(
        { devprodMcpUrl: 'https://from-option.example.com/mcp' },
        'devprodMcpUrl',
        'DEVPROD_MCP_URL',
        { DEVPROD_MCP_URL: 'https://from-env.example.com/mcp' },
      ),
    ).to.deep.equal({
      type: 'remote',
      url: 'https://from-option.example.com/mcp',
    });
  });

  it('does not register internal servers without URLs', async function () {
    const { context, registered } = createFakeContext();

    await plugin.setup(context);

    expect(registered.map((entry) => entry.name)).to.not.include.members([
      'devprod-mcp',
      'glean-enterprise',
    ]);
  });

  it('ignores invalid or non-http URLs', function () {
    expect(remoteServerConfig(undefined)).to.be.undefined;
    expect(remoteServerConfig('')).to.be.undefined;
    expect(remoteServerConfig('not a url')).to.be.undefined;
    expect(remoteServerConfig('ftp://example.com/mcp')).to.be.undefined;
    expect(remoteServerConfig('https://example.com/mcp')).to.deep.equal({
      type: 'remote',
      url: 'https://example.com/mcp',
    });
  });

  it('registers the skills shipped with the package', async function () {
    const { context, skills } = createFakeContext();

    await plugin.setup(context);

    expect(skills.map((skill) => skill.id)).to.have.members([
      'start-compass-with-devtools',
      'devtools-mcp-workflows',
    ]);
    const compass = skills.find(
      (skill) => skill.id === 'start-compass-with-devtools',
    );
    expect(compass.name).to.equal('Start Compass with DevTools');
    expect(compass.description).to.match(/Compass/);
    expect(compass.content).to.include('# Start Compass with DevTools');
    expect(compass.content).to.not.include('---');
    expect(compass.path).to.match(
      /skills[/\\]start-compass-with-devtools[/\\]SKILL\.md$/,
    );
  });

  it('can leave the official servers out', async function () {
    const { context, registered, skills } = createFakeContext({
      mongodbServerCommand: false,
      chromeDevtoolsServerCommand: false,
    });

    await plugin.setup(context);

    expect(registered.map((entry) => entry.name)).to.deep.equal(['devtools']);
    expect(skills).to.have.lengthOf(2);
  });

  it('can leave the chrome-devtools server out on its own', async function () {
    const { context, registered } = createFakeContext({
      chromeDevtoolsServerCommand: false,
    });

    await plugin.setup(context);

    expect(registered.map((entry) => entry.name)).to.deep.equal([
      'devtools',
      'mongodb',
    ]);
  });

  it('accepts a chrome-devtools command override for Compass', function () {
    expect(
      resolveChromeDevtoolsServerCommand({
        chromeDevtoolsServerCommand: [
          'npx',
          '-y',
          'chrome-devtools-mcp@1',
          '--browser-url',
          'http://127.0.0.1:9222',
        ],
      }),
    ).to.deep.equal([
      'npx',
      '-y',
      'chrome-devtools-mcp@1',
      '--browser-url',
      'http://127.0.0.1:9222',
    ]);
  });

  it('loads every bundled skill file', function () {
    expect(loadSkills().map((skill) => skill.id)).to.deep.equal([
      'start-compass-with-devtools',
      'devtools-mcp-workflows',
    ]);
  });

  it('accepts an official server command override', function () {
    expect(
      resolveMongodbServerCommand({
        mongodbServerCommand: ['npx', '-y', 'mongodb-mcp-server@3.3.0'],
      }),
    ).to.deep.equal(['npx', '-y', 'mongodb-mcp-server@3.3.0']);
  });

  it('runs the binary shipped with the package when it exists', function () {
    expect(
      resolveServerCommand(
        {},
        { ownBinPath: '/package/dist/bin.js', exists: () => true },
      ),
    ).to.deep.equal(['node', '/package/dist/bin.js']);
  });

  it('falls back to npx when the package is not built', function () {
    expect(
      resolveServerCommand(
        {},
        { ownBinPath: '/package/dist/bin.js', exists: () => false },
      ),
    ).to.deep.equal(['npx', '-y', SERVER_PACKAGE]);
  });

  it('accepts a devtools server command override', async function () {
    const { context, registered } = createFakeContext({
      serverCommand: [
        'node',
        '/checkout/packages/devtools-mcp-server/dist/bin.js',
      ],
    });

    await plugin.setup(context);

    expect(registered[0].config.command).to.deep.equal([
      'node',
      '/checkout/packages/devtools-mcp-server/dist/bin.js',
    ]);
  });

  it('ignores invalid server command overrides', function () {
    expect(
      resolveServerCommand(
        { serverCommand: [] },
        { ownBinPath: '/x', exists: () => false },
      ),
    ).to.deep.equal(['npx', '-y', SERVER_PACKAGE]);
    expect(
      resolveServerCommand(
        { serverCommand: [42] },
        { ownBinPath: '/x', exists: () => false },
      ),
    ).to.deep.equal(['npx', '-y', SERVER_PACKAGE]);
  });

  it('builds typed local server configs', function () {
    expect(
      mcpServerConfig({ serverCommand: ['node', '/x/bin.js'] }),
    ).to.deep.equal({ type: 'local', command: ['node', '/x/bin.js'] });
  });
});
