import _ from 'lodash';
import { regexes } from './regexes';

export function redact<T>(message: T): T {
  if (_.isPlainObject(message)) {
    // recursively walk through all values of an object
    return _.mapValues(message as any, redact);
  }
  if (_.isArray(message)) {
    // walk through array and redact each value
    return _.map(message, redact) as T;
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
