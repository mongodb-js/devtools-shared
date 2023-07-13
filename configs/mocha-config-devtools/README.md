# @mongodb-js/mocha-config-devtools

> Shared [mocha][mocha] configuration for Devtools packages.

## Usage

For general-purpose packages install as dependency and add the following configuration file

```js
// file:<package>/.mocharc.js
module.exports = require('@mongodb-js/mocha-config-devtools');
```

This configuration activates the colors and sets default timeout to 15 seconds (helpful for CI runs). It also registers `ts-node` so that you can run tests written in typescript without compiling them first

For packages that are intended for the browser use the following configuration file

```js
// file:<package>/.mocharc.js
module.exports = require('@mongodb-js/mocha-config-devtools/react');
```

This configuration extends on the general-purpose one, but also adds `jsdom` to the environment and registers `chai-dom` helpers (if you don't have chai-dom types installed already you should add them with `npm i -D @types/chai-dom`)

[mocha]: https://mochajs.org/#configuring-mocha-nodejs
