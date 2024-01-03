import type { ClientOptions } from './signing-clients';

import { getSigningClient } from './signing-clients';
import { debug } from './utils';

/**
 * Signs a file using Garasign.
 *
 * @param file the name of the file to sign
 * @param options options to sign with - see the docs for `SigningOptions`
 */
export async function sign(
  file: string,
  options: ClientOptions
): Promise<void> {
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
