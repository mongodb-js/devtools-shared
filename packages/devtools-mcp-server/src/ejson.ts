import { BSON, type Document } from 'mongodb';

/**
 * Converts JSON tool input into BSON values. Strict (non-relaxed) mode keeps
 * `$numberLong`/`$numberInt`/`$numberDouble` intact instead of collapsing them
 * to JavaScript numbers, while relaxed values such as `{"$date": "..."}` and
 * plain numbers are still accepted.
 */
export function fromEjson(value: unknown): Document {
  return BSON.EJSON.parse(JSON.stringify(value), {
    relaxed: false,
  }) as Document;
}

/**
 * Converts BSON values into canonical Extended JSON, keeping ObjectId, Date,
 * Long, Decimal128 and friends intact on their way back to the agent.
 */
export function toEjson(value: unknown): unknown {
  return BSON.EJSON.serialize(value, { relaxed: false });
}
