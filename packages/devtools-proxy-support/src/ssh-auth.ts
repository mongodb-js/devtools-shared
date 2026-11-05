import type { AuthenticationType } from 'ssh2';

interface SshAuthMethodSelectorOptions {
  hasPassword: boolean;
  hasPrivateKey: boolean;
}

export type SshAuthMethodSelector = (
  methodsLeft: AuthenticationType[] | null,
  partialSuccess: boolean | null,
) => AuthenticationType | false;

/**
 * Creates the authentication policy for one SSH connection.
 *
 * The method order intentionally matches the subset of ssh2's default policy
 * supported by SSHAgent. `methodsLeft` is accepted as part of ssh2's handler
 * contract but does not influence selection yet; server-guided selection needs
 * a separate compatibility strategy before it can safely replace this order.
 */
export function createSshAuthMethodSelector({
  hasPassword,
  hasPrivateKey,
}: SshAuthMethodSelectorOptions): SshAuthMethodSelector {
  const methods: AuthenticationType[] = ['none'];
  if (hasPassword) {
    methods.push('password');
  }
  if (hasPrivateKey) {
    methods.push('publickey');
  }
  if (hasPassword) {
    methods.push('keyboard-interactive');
  }

  let nextMethodIndex = 0;
  let hasObservedPartialSuccess = false;

  return (_methodsLeft, partialSuccess) => {
    if (partialSuccess === true) {
      hasObservedPartialSuccess = true;
    }

    while (nextMethodIndex < methods.length) {
      const method = methods[nextMethodIndex++];
      if (method === 'keyboard-interactive' && hasObservedPartialSuccess) {
        continue;
      }
      return method;
    }

    return false;
  };
}
