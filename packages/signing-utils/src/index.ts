import type { ClientOptions as SigningOptions } from './signing-clients';

import { getSigningClient } from './signing-clients';
import { getEnv, debug } from './utils';

export async function sign(
  file: string,
  options: SigningOptions
): Promise<void> {
  getEnv();
  debug(
    `Signing file: ${file} with client ${options.client} and options:`,
    options
  );
  try {
    const signingClient = await getSigningClient(options);
    await signingClient.sign(file);
  } catch (err) {
    debug(`Error signing file: ${file}`, err);
    throw err;
  }
}
