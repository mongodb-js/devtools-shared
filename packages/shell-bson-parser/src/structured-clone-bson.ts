import { BSON } from 'bson';

export type TrackedPayload<T> = {
  data: T;
  bsonTypes: Map<object, string>;
};

const BSON_PROTOTYPE_BY_TAG = new Map<string, object>([
  ['BSONRegExp', BSON.BSONRegExp.prototype],
  ['BSONSymbol', BSON.BSONSymbol.prototype],
  ['Binary', BSON.Binary.prototype],
  ['Code', BSON.Code.prototype],
  ['DBRef', BSON.DBRef.prototype],
  ['Decimal128', BSON.Decimal128.prototype],
  ['Double', BSON.Double.prototype],
  ['Int32', BSON.Int32.prototype],
  ['Long', BSON.Long.prototype],
  ['MaxKey', BSON.MaxKey.prototype],
  ['MinKey', BSON.MinKey.prototype],
  ['ObjectId', BSON.ObjectId.prototype],
  ['Timestamp', BSON.Timestamp.prototype],
  ['UUID', BSON.UUID.prototype],
]);

const KNOWN_BSON_PROTOTYPES = new Set(BSON_PROTOTYPE_BY_TAG.values());

function isBsonValue(value: object): value is { _bsontype: string } {
  if (typeof (value as { _bsontype?: unknown })._bsontype !== 'string') {
    return false;
  }
  return KNOWN_BSON_PROTOTYPES.has(Object.getPrototypeOf(value));
}

function isMap(m: unknown): m is Map<unknown, unknown> {
  return (
    !!m &&
    typeof m === 'object' &&
    Symbol.toStringTag in m &&
    (m as { [Symbol.toStringTag]: unknown })[Symbol.toStringTag] === 'Map'
  );
}

function isSet(s: unknown): s is Set<unknown> {
  return (
    !!s &&
    typeof s === 'object' &&
    Symbol.toStringTag in s &&
    (s as { [Symbol.toStringTag]: unknown })[Symbol.toStringTag] === 'Set'
  );
}

/**
 * `Code.scope` and `DBRef.oid`/`fields` are themselves ordinary values that
 * might contain further BSON (e.g. an `ObjectId` inside a `DBRef`'s `oid` or
 * a `Code`'s `scope`). The outer `Code`/`DBRef` is otherwise treated as an
 * opaque leaf by the walk, so without this they'd never get visited.
 *
 * Pushes onto `stack` in place.
 */
function pushNestedBsonDocuments(
  tag: string,
  item: object,
  stack: unknown[],
): void {
  if (tag === 'Code') {
    stack.push((item as BSON.Code).scope);
  } else if (tag === 'DBRef') {
    stack.push((item as BSON.DBRef).oid, (item as BSON.DBRef).fields);
  }
}

export function trackBSON<T>(data: T): TrackedPayload<T> {
  const bsonTypes = new Map<object, string>();
  const stack: unknown[] = [data];
  const visited = new Set<object>();

  while (stack.length > 0) {
    const item = stack.pop();

    if (item === null || typeof item !== 'object') {
      continue;
    }
    if (visited.has(item)) {
      continue;
    }
    visited.add(item);

    if (isBsonValue(item)) {
      // A UUID is a Binary with sub_type 4 - that's BSON's own definition,
      // regardless of whether it was actually constructed via `new UUID()`
      // or is a plain `Binary` someone tagged sub_type 4 by hand. Check the
      // sub_type, not `instanceof bson.UUID`, so both come back as UUID.
      const tag =
        item._bsontype === 'Binary' &&
        (item as { sub_type?: unknown }).sub_type === 4
          ? 'UUID'
          : item._bsontype;
      bsonTypes.set(item, tag);
      pushNestedBsonDocuments(tag, item, stack);
      continue;
    }

    if (Array.isArray(item)) {
      for (const value of item) stack.push(value);
      continue;
    }

    if (isMap(item)) {
      for (const [key, value] of item) stack.push(key, value);
      continue;
    }

    if (isSet(item)) {
      for (const value of item) stack.push(value);
      continue;
    }

    const proto = Object.getPrototypeOf(item);
    if (proto === Object.prototype || proto === null) {
      for (const value of Object.values(item)) stack.push(value);
    }
  }

  return { data, bsonTypes };
}

export function untrackBSON<T>(payload: TrackedPayload<T>): T {
  const { data, bsonTypes } = payload;

  for (const [item, tag] of bsonTypes) {
    const prototype = BSON_PROTOTYPE_BY_TAG.get(tag);
    if (!prototype) {
      throw new Error(
        `Cannot unmark unknown BSON type crossing the worker boundary: ${tag}`,
      );
    }
    Object.setPrototypeOf(item, prototype);
  }

  return data;
}
