// RegExp.escape is not widely available yet, so we are going to use regexp.escape
// as it's extremely simple and at some point we can get rid of it easily.
import escape from 'regexp.escape';

export const SECRET_KIND = [
  'base64',
  'private key',
  'user',
  'password',
  'email',
  'ip',
  'url',
  'mongodb uri',
] as const;

export type SecretKind = (typeof SECRET_KIND)[number];

export type Secret = {
  readonly value: string;
  readonly kind: SecretKind;
};

export function redactSecretsOnString<T extends string>(
  content: T,
  secrets: Secret[],
): T {
  let result = content;
  for (const { value, kind } of secrets) {
    if (!SECRET_KIND.includes(kind)) {
      throw new Error(
        `Unknown secret kind ${kind}. Valid types: ${SECRET_KIND.join(', ')}`,
      );
    }

    const regex = new RegExp(`\\b${escape(value)}\\b`, 'g');
    result = result.replace(regex, `<${kind}>`) as T;
  }

  return result;
}
