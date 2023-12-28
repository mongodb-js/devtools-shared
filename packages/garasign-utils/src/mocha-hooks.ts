import * as os from 'os';

export const mochaHooks = {
  beforeEach() {
    // @ts-expect-error Stupid mocha binding properties to `this`
    const test = this.currentTest ?? this.test;
    if (os.platform().toLowerCase().includes('win32')) {
      test.skip();
    }
  },
};
