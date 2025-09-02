const plainObjectTag = Object.prototype.toString.call({});

export function isPlainObject(val: unknown): val is object {
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
