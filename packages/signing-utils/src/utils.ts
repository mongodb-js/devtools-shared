import { debug as debugFn } from 'debug';

export const debug = debugFn('signing-utils');

export function getEnv() {
  const garasign_username =
    process.env['GARASIGN_USERNAME'] ?? process.env['garasign_username'];
  const garasign_password =
    process.env['GARASIGN_PASSWORD'] ?? process.env['garasign_password'];
  const artifactory_username =
    process.env['ARTIFACTORY_USERNAME'] ?? process.env['artifactory_username'];
  const artifactory_password =
    process.env['ARTIFACTORY_PASSWORD'] ?? process.env['artifactory_password'];

  return {
    garasign_username,
    garasign_password,
    artifactory_username,
    artifactory_password,
  };
}
