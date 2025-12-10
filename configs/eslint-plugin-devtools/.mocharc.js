'use strict';
module.exports = {
  ...require('@mongodb-js/mocha-config-devtools'),
  spec: ['rules/**/*.test.js'],
  watchFiles: ['rules/**/*.js'],
};
