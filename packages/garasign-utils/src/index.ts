import type { ClientOptions } from './signing-clients';

import { getSigningClient } from './signing-clients';
import { assertRequiredVars, debug } from './utils';

export async function sign(
  file: string,
  options: ClientOptions
): Promise<void> {
  assertRequiredVars();
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
