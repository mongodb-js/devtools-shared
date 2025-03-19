import type { JSONSchema4 } from 'json-schema';
import type { MongoDBJSONSchema } from 'mongodb-schema';

export type JSONSchema = Partial<JSONSchema4> & MongoDBJSONSchema;

function getBSONType(property: JSONSchema): string | string[] | undefined {
  return property.bsonType || property.type;
}

function isBSONObjectProperty(property: JSONSchema): boolean {
  return getBSONType(property) === 'object';
}

function isBSONArrayProperty(property: JSONSchema): boolean {
  return getBSONType(property) === 'array';
}

function isBSONPrimitive(property: JSONSchema): boolean {
  return !(isBSONArrayProperty(property) || isBSONObjectProperty(property));
}

function assertIsDefined<T>(
  value: T,
  message: string
): asserts value is NonNullable<T> {
  if (value === undefined || value === null) {
    throw new Error(message);
  }
}

function toTypeName(type: string): string | string[] {
  // JSON Schema types
  if (type === 'string') {
    return 'string';
  }
  if (type === 'number' || type === 'integer') {
    return 'number';
  }
  if (type === 'boolean') {
    return 'boolean';
  }
  if (type === 'null') {
    return 'null';
  }

  // BSON types
  // see InternalTypeToBsonTypeMap
  // TODO: implement once we have the BSON types loaded in, then use whatever
  // namespace they are under.
  /*
  if (type === 'double') {
    return ['bson.Double', 'number'];
  }
  if (type === 'binData') {
    return 'bson.Binary';
  }
  if (type === 'objectId') {
    return 'bson.ObjectId';
  }
  if (type === 'bool') {
    return 'boolean';
  }
  if (type === 'date') {
    return 'bson.Date';
  }
  if (type === 'regex') {
    return 'bson.BSONRegExp';
  }
  if (type === 'symbol') {
    return 'bson.BSONSymbol';
  }
  if (type === 'javascript' || type === 'javascriptWithScope') {
    return 'bson.Code';
  }
  if (type === 'int') {
    return ['bson.Int32', 'number'];
  }
  if (type === 'timestamp') {
    return 'bson.Timestamp';
  }
  if (type === 'long') {
    return ['bson.Long', 'number'];
  }
  if (type === 'decimal') {
    return 'bson.Decimal128';
  }
  if (type === 'minKey') {
    return 'bson.MinKey';
  }
  if (type === 'maxKey') {
    return 'bson.MaxKey';
  }
  if (type === 'dbPointer') {
    return 'bson.DBPointer';
  }
  */

  if (type === 'bool') {
    return 'boolean';
  }
  if (type === 'double' || type === 'int' || type === 'long') {
    return 'number';
  }
  if (type === 'undefined') {
    return 'undefined';
  }

  return 'any';
}

function uniqueTypes(property: JSONSchema): Set<string> {
  const type = getBSONType(property);
  const types = Array.isArray(type)
    ? type.map((t) => toTypeName(t))
    : [toTypeName(type ?? 'any')];
  return new Set(types.flat());
}

function indentSpaces(indent: number) {
  const spaces = [];
  for (let i = 0; i < indent; i++) {
    spaces.push('  ');
  }
  return spaces.join('');
}

function arrayType(types: string[]) {
  if (types.length === 1) {
    return `${types[0]}[]`;
  }
  return `${types.join(' | ')})[]`;
}

function toTypescriptType(
  properties: Record<string, JSONSchema>,
  indent: number
): string {
  const eachFieldDefinition = Object.entries(properties).map(
    ([propertyName, schema]) => {
      if (isBSONPrimitive(schema)) {
        return `${indentSpaces(indent)}${propertyName}?: ${[
          ...uniqueTypes(schema),
        ].join(' | ')}`;
      }

      if (isBSONArrayProperty(schema)) {
        assertIsDefined(schema.items, 'schema.items must be defined');
        return `${indentSpaces(indent)}${propertyName}?: ${arrayType([
          ...uniqueTypes(schema.items),
        ])}`;
      }

      if (isBSONObjectProperty(schema)) {
        assertIsDefined(schema.properties, 'schema.properties must be defined');
        return `${indentSpaces(indent)}${propertyName}?: ${toTypescriptType(
          schema.properties as Record<string, JSONSchema>,
          indent + 1
        )}`;
      }

      throw new Error('We should never get here');
    }
  );

  return `{\n${eachFieldDefinition.join(';\n')};\n${indentSpaces(indent - 1)}}`;
}

export function toTypescriptTypeDefinition(schema: JSONSchema): string {
  assertIsDefined(schema.properties, 'schema.properties must be defined');

  return toTypescriptType(schema.properties as Record<string, JSONSchema>, 1);
}
