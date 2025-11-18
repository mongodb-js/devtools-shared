import { regexes } from './regexes';
import { isPlainObject } from './utils';
import { redactSecretsOnString } from './secrets';
import type { Secret } from './secrets';

export function redact<T>(
  message: T,
  secrets: Secret[] | undefined = undefined,
): T {
  if (isPlainObject(message)) {
    // recursively walk through all values of an object
    const newMessage = Object.fromEntries(
      Object.entries(message).map(([key, value]) => [
        key,
        redact(value, secrets),
      ]),
    ) as T;

    // make sure we inherit the prototype so we don't add new behaviour to the object
    // nobody is expecting
    return Object.setPrototypeOf(
      newMessage,
      Object.getPrototypeOf(message) as object | null,
    );
  }

  if (Array.isArray(message)) {
    // walk through array and redact each value
    return message.map((msg) => redact(msg, secrets)) as T;
  }
  if (typeof message !== 'string') {
    // all non-string types can be safely returned
    return message;
  }

  if (secrets) {
    message = redactSecretsOnString(message, secrets);
  }

  // apply all available regexes to the string
  for (const [regex, replacement] of regexes) {
    // The type here isn't completely accurate in case `T` is a specific string template
    // but it's close enough for practical usage
    message = (message as T & string).replace(regex, replacement) as T & string;
  }
  return message;
}

export { redactUriCredentials } from './redact-uri-credentials';

export default redact;
export type { Secret } from './secrets';
