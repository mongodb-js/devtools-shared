import * as bson from 'bson';

const BSON_SERIALIZED_TAG = '__bson_serialized__';

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

type SerializedBson = {
  [BSON_SERIALIZED_TAG]: true;
  type: string;
  props: Record<string, unknown>;
};

function isBsonValue(value: unknown): value is { _bsontype: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { _bsontype?: unknown })._bsontype === 'string'
  );
}

function isSerializedBson(value: unknown): value is SerializedBson {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as Record<string, unknown>)[BSON_SERIALIZED_TAG] === true
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

export function serializeBsonValues<T>(value: T): T {
  if (isBsonValue(value)) {
    const props: Record<string, unknown> = Object.create(null);
    for (const [key, entryValue] of Object.entries(value)) {
      props[key] = serializeBsonValues(entryValue);
    }
    return {
      [BSON_SERIALIZED_TAG]: true,
      // UUID reports `_bsontype` 'Binary'; keep its own prototype.
      type: value instanceof bson.UUID ? 'UUID' : value._bsontype,
      props,
    } as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map(serializeBsonValues) as unknown as T;
  }
  if (value instanceof Map) {
    return new Map(
      [...value].map(([k, v]) => [
        serializeBsonValues(k),
        serializeBsonValues(v),
      ]),
    ) as unknown as T;
  }
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entryValue]) => [
        key,
        serializeBsonValues(entryValue),
      ]),
    ) as T;
  }
  return value;
}

export function deserializeBsonValues<T>(value: T): T {
  if (isSerializedBson(value)) {
    const prototype = BSON_PROTOTYPES[value.type];
    if (!prototype) {
      throw new Error(
        `Cannot deserialize unknown BSON type crossing the worker boundary: ${value.type}`,
      );
    }
    const props: Record<string, unknown> = Object.create(null);
    for (const [key, entryValue] of Object.entries(value.props)) {
      props[key] = deserializeBsonValues(entryValue);
    }
    return Object.assign(Object.create(prototype), props) as T;
  }
  // Buffers cross `postMessage` as plain Uint8Array's
  if (value instanceof Uint8Array && !Buffer.isBuffer(value)) {
    return Buffer.from(value) as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map(deserializeBsonValues) as unknown as T;
  }
  if (value instanceof Map) {
    return new Map(
      [...value].map(([k, v]) => [
        deserializeBsonValues(k),
        deserializeBsonValues(v),
      ]),
    ) as unknown as T;
  }
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entryValue]) => [
        key,
        deserializeBsonValues(entryValue),
      ]),
    ) as T;
  }
  return value;
}
