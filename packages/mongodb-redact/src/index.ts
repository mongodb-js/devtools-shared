import { regexes } from './regexes';
import { isPlainObject } from './utils';
import { redactSecrets } from './secrets';
import type { Secret } from './secrets';

export function redact<T>(
  message: T,
  secrets: Secret[] | undefined = undefined,
): T {
  if (secrets) {
    message = redactSecrets(message, secrets);
  }

  if (isPlainObject(message)) {
    // recursively walk through all values of an object
    return Object.fromEntries(
      Object.entries(message).map(([key, value]) => [key, redact(value)]),
    ) as T;
  }
  if (Array.isArray(message)) {
    // walk through array and redact each value
    return message.map((msg) => redact(msg)) as T;
  }
  if (typeof message !== 'string') {
    // all non-string types can be safely returned
    return message;
  }
  // apply all available regexes to the string
  for (const [regex, replacement] of regexes) {
    // The type here isn't completely accurate in case `T` is a specific string template
    // but it's close enough for practical usage
    message = (message as T & string).replace(regex, replacement) as T & string;
  }
  return message;
}

export default redact;
