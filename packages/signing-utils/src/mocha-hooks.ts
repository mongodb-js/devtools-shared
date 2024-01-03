import * as os from 'os';

export const mochaHooks: { beforeEach: Mocha.HookFunction } = {
  beforeEach() {
    if (os.platform().toLowerCase().includes('win32')) {
      // @ts-expect-error TS does not know mocha will properly set `this` when it invokes beforeEach
      this.skip();
    }
  },
};
