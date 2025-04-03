import { regexes } from './regexes';

const plainObjectTag = Object.prototype.toString.call({});
function isPlainObject(val: unknown): val is object {
  if (
    typeof val !== 'object' ||
    !val ||
    Object.prototype.toString.call(val) !== plainObjectTag
  ) {
    return false;
  }
  const proto = Object.getPrototypeOf(val);
  if (proto === null) return true;
  if (!Object.prototype.hasOwnProperty.call(proto, 'constructor')) return false;
  const ctor = proto.constructor;
  if (typeof ctor !== 'function') return ctor;
  // `ctor === Object` but this works across contexts
  // (Object is special because Object.__proto__.__proto__ === Object.prototype),
  const ctorPrototype = Object.getPrototypeOf(ctor);
  return Object.getPrototypeOf(ctorPrototype) === ctor.prototype;
}

export function redact<T>(message: T): T {
  if (isPlainObject(message)) {
    // recursively walk through all values of an object
    return Object.fromEntries(
      Object.entries(message).map(([key, value]) => [key, redact(value)]),
    ) as T;
  }
  if (Array.isArray(message)) {
    // walk through array and redact each value
    return message.map(redact) as T;
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
