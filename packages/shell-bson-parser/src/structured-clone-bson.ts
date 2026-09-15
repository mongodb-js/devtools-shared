import { EJSON } from 'bson';

const BSON_SERIALIZED_TAG = '__bson_serialized__';

type SerializedBson = { [BSON_SERIALIZED_TAG]: true; data: unknown };

function isBsonValue(value: unknown): boolean {
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
    return {
      [BSON_SERIALIZED_TAG]: true,
      data: EJSON.serialize({ v: value }, { relaxed: false }).v,
    } as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map(serializeBsonValues) as unknown as T;
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
    return EJSON.deserialize({ v: value.data }, { relaxed: false }).v as T;
  }
  if (Array.isArray(value)) {
    return value.map(deserializeBsonValues) as unknown as T;
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
