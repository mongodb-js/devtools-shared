'use strict';
const path = require('path');
const base = require('.');

module.exports = {
  ...base,
  require: [
    ...base.require,
    path.resolve(__dirname, 'register', 'jsdom-global-register.js'),
    path.resolve(__dirname, 'register', 'chai-dom-register.js'),
    path.resolve(__dirname, 'register', 'css-import-register.js'),
  ],
};
