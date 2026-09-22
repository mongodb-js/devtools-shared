import * as bson from 'bson';

export type MarkedPayload<T> = {
  data: T;
  bsonTypes: Map<object, string>;
};

const BSON_PROTOTYPES: Record<string, object> = Object.create({
  BSONRegExp: bson.BSONRegExp.prototype,
  BSONSymbol: bson.BSONSymbol.prototype,
  Binary: bson.Binary.prototype,
  Code: bson.Code.prototype,
  DBRef: bson.DBRef.prototype,
  Decimal128: bson.Decimal128.prototype,
  Double: bson.Double.prototype,
  Int32: bson.Int32.prototype,
  Long: bson.Long.prototype,
  MaxKey: bson.MaxKey.prototype,
  MinKey: bson.MinKey.prototype,
  ObjectId: bson.ObjectId.prototype,
  Timestamp: bson.Timestamp.prototype,
  UUID: bson.UUID.prototype,
});

function isBsonValue(value: object): value is { _bsontype: string } {
  return typeof (value as { _bsontype?: unknown })._bsontype === 'string';
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
    stack.push(Reflect.get(item, 'scope'));
  } else if (tag === 'DBRef') {
    stack.push(Reflect.get(item, 'oid'), Reflect.get(item, 'fields'));
  }
}

export function markBSON<T>(data: T): MarkedPayload<T> {
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

    const proto = Reflect.getPrototypeOf(item);
    if (proto === Object.prototype || proto === null) {
      for (const value of Object.values(item)) stack.push(value);
    }
  }

  return { data, bsonTypes };
}

export function unmarkBSON<T>(payload: MarkedPayload<T>): T {
  const { data, bsonTypes } = payload;

  for (const [item, tag] of bsonTypes) {
    const prototype = BSON_PROTOTYPES[tag];
    if (!prototype) {
      throw new Error(
        `Cannot unmark unknown BSON type crossing the worker boundary: ${tag}`,
      );
    }
    Reflect.setPrototypeOf(item, prototype);
  }

  return data;
}
