'use strict';
const chai = require('chai');
const sinonChaiModule = require('sinon-chai');
const sinonChai = sinonChaiModule.default ?? sinonChaiModule;

chai.use(sinonChai);
