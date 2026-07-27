import { debug as debugFn } from 'debug';

export const debug = debugFn('signing-utils');

export function getEnv() {
  const garasign_username =
    process.env['GARASIGN_USERNAME'] ?? process.env['garasign_username'];
  const garasign_password =
    process.env['GARASIGN_PASSWORD'] ?? process.env['garasign_password'];
  const ecr_login_password =
    process.env['ECR_LOGIN_PASSWORD'] ?? process.env['ecr_login_password'];

  return {
    garasign_username,
    garasign_password,
    ecr_login_password,
  };
}
