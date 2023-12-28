const config = require('@mongodb-js/mocha-config-devtools');

config.require.push(`./src/mocha-hooks.ts`);

module.exports = config;
