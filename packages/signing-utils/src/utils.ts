import { debug as debugFn } from 'debug';

export const debug = debugFn('signing-utils');

export function assertRequiredVars() {
  [
    'GARASIGN_USERNAME',
    'GARASIGN_PASSWORD',
    'ARTIFACTORY_USERNAME',
    'ARTIFACTORY_PASSWORD',
  ].forEach((envVar) => {
    if (!process.env[envVar]) {
      throw new Error(`${envVar} is required`);
    }
  });
}
