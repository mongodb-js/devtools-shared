/**
 * Transforms MongoDB's $jsonSchema - as set in a collection validator - to the
 * simplified schema.
 *
 * This deliberately does not go via the internal schema: that representation is
 * probabilistic (count, probability, hasDuplicates, sample values) and a
 * validator contains none of those, so populating it would mean inventing
 * statistics. The simplified schema carries types only, which a validator can
 * describe honestly.
 *
 * A validator constrains documents rather than describing them, so the mapping
 * is intentionally lossy: value-level constraints (enum, minimum, pattern, ...)
 * are ignored, as are `patternProperties` and `additionalProperties`. Nothing
 * throws - constructs that carry no type information, and malformed subschemas,
 * simply contribute nothing.
 */
import type {
  SchemaBSONType,
  SimplifiedSchema,
  SimplifiedSchemaArrayType,
  SimplifiedSchemaDocumentType,
  SimplifiedSchemaType,
} from '../schema-analyzer';
import type { JSONSchema, MongoDBJSONSchema } from '../types';

const NUMERIC_TYPES: SchemaBSONType[] = [
  'Int32',
  'Long',
  'Double',
  'Decimal128',
];

/**
 * BSON type aliases accepted by $jsonSchema's `bsonType`, mapped to the type
 * names schema inference produces. Note this is not a straight inversion of
 * `InternalTypeToBsonTypeMap`, which is many-to-one (both `Number` and `Double`
 * map to `double`, both `RegExp` and `BSONRegExp` to `regex`), so where that map
 * collapses two names we pick the BSON-wrapper one a validator would mean.
 */
// The rule's `__proto__: null` fix does not typecheck against `Record<K, V>`.
// Lookups take keys from the validator, so they go through `mapAliases`,
// which only accepts own properties.
// eslint-disable-next-line @mongodb-js/devtools/no-plain-object-records
export const BSONTypeAliasToSimplifiedType: Record<
  string,
  SchemaBSONType | SchemaBSONType[]
> = {
  double: 'Double',
  string: 'String',
  object: 'Document',
  array: 'Array',
  binData: 'Binary',
  undefined: 'Undefined',
  objectId: 'ObjectId',
  bool: 'Boolean',
  date: 'Date',
  null: 'Null',
  regex: 'BSONRegExp',
  javascript: 'Code',
  javascriptWithScope: 'CodeWScope',
  symbol: 'BSONSymbol',
  int: 'Int32',
  timestamp: 'Timestamp',
  long: 'Long',
  decimal: 'Decimal128',
  minKey: 'MinKey',
  maxKey: 'MaxKey',
  // The inverse of `InternalTypeToBsonTypeMap`'s `DBRef: 'dbPointer'`.
  dbPointer: 'DBRef',
  // `number` accepts every BSON numeric type.
  number: NUMERIC_TYPES,
};

/**
 * $jsonSchema also accepts the standard JSON Schema `type` keyword, used as a
 * fallback when `bsonType` is absent.
 */
// The rule's `__proto__: null` fix does not typecheck against `Record<K, V>`.
// Lookups take keys from the validator, so they go through `mapAliases`,
// which only accepts own properties.
// eslint-disable-next-line @mongodb-js/devtools/no-plain-object-records
export const JSONSchemaTypeToSimplifiedType: Record<
  string,
  SchemaBSONType | SchemaBSONType[]
> = {
  object: 'Document',
  array: 'Array',
  string: 'String',
  number: NUMERIC_TYPES,
  boolean: 'Boolean',
  null: 'Null',
  // MongoDB rejects `type: 'integer'` inside $jsonSchema, but accepting it here
  // costs nothing and makes this usable for plain JSON Schema input.
  integer: ['Int32', 'Long'],
};

const UNION_KEYWORDS = ['anyOf', 'oneOf'] as const;

/**
 * The types a subschema permits, or `undefined` when it says nothing about
 * types and so permits any. An empty array means it permits no value at all.
 */
type TypeSet = SimplifiedSchemaType[] | undefined;

function toArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

/**
 * Validators are checked by the server when set, but this is also usable on
 * arbitrary input, so every subschema is checked before it is read.
 */
function isSchema(value: unknown): value is MongoDBJSONSchema {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isDocumentType(
  type: SimplifiedSchemaType,
): type is SimplifiedSchemaDocumentType {
  return type.bsonType === 'Document';
}

function isArrayType(
  type: SimplifiedSchemaType,
): type is SimplifiedSchemaArrayType {
  return type.bsonType === 'Array';
}

/**
 * Adds a type to a union, merging into the existing entry if one already has
 * this bsonType. Inference emits at most one entry per bsonType per field, so
 * collapsing duplicates keeps the output shape identical to inferred schemas -
 * two `object` branches of an anyOf become one Document with merged fields.
 */
function mergeTypeInto(
  types: SimplifiedSchemaType[],
  incoming: SimplifiedSchemaType,
): void {
  const existing = types.find((type) => type.bsonType === incoming.bsonType);
  if (!existing) {
    types.push(incoming);
    return;
  }

  if (isDocumentType(existing) && isDocumentType(incoming)) {
    mergeFieldsInto(existing.fields, incoming.fields);
  } else if (isArrayType(existing) && isArrayType(incoming)) {
    mergeTypesInto(existing.types, incoming.types);
  }
}

function mergeTypesInto(
  types: SimplifiedSchemaType[],
  incoming: SimplifiedSchemaType[],
): void {
  for (const type of incoming) {
    mergeTypeInto(types, type);
  }
}

function mergeFieldsInto(
  fields: SimplifiedSchema,
  incoming: SimplifiedSchema,
): void {
  for (const name of Object.keys(incoming)) {
    const existing = fields[name];
    if (!existing) {
      fields[name] = incoming[name];
      continue;
    }
    mergeTypesInto(existing.types, incoming[name].types);
  }
}

function mapAliases(
  value: unknown,
  map: Record<string, SchemaBSONType | SchemaBSONType[]>,
): SchemaBSONType[] {
  const types: SchemaBSONType[] = [];
  for (const key of toArray(value)) {
    // Own-property check, so that aliases like `constructor` do not resolve to
    // `Object.prototype` members.
    if (
      typeof key === 'string' &&
      Object.prototype.hasOwnProperty.call(map, key)
    ) {
      types.push(...toArray(map[key]));
    }
  }
  return types;
}

/**
 * The types a subschema names outright. Unrecognised aliases contribute
 * nothing, so a `bsonType` made up only of those falls through to `type`.
 */
function explicitTypes(schema: MongoDBJSONSchema): SchemaBSONType[] {
  const bsonTypes = mapAliases(schema.bsonType, BSONTypeAliasToSimplifiedType);
  if (bsonTypes.length > 0) return bsonTypes;

  const jsonTypes = mapAliases(schema.type, JSONSchemaTypeToSimplifiedType);
  if (jsonTypes.length > 0) return jsonTypes;

  // CSFLE fields are declared with `encrypt` in place of `bsonType`. The value
  // is stored as BinData subtype 6, which is what inference would observe.
  if (isSchema(schema.encrypt)) return ['Binary'];

  return [];
}

/**
 * The types an untyped subschema's structural keywords imply. Strictly, JSON
 * Schema applies `properties` only if the value is an object, but a validator
 * author leaving out `bsonType: 'object'` almost always means one.
 */
function impliedTypes(schema: MongoDBJSONSchema): SchemaBSONType[] {
  const types: SchemaBSONType[] = [];
  if (isSchema(schema.properties) || isSchema(schema.patternProperties)) {
    types.push('Document');
  }
  // Not `additionalItems`, which has no effect without a tuple `items`.
  if (schema.items !== undefined) {
    types.push('Array');
  }
  return types;
}

/**
 * Whether two types can describe the same value. A DBRef is a document as far
 * as the validator is concerned, so it intersects with Document.
 */
function intersectKind(
  a: SchemaBSONType,
  b: SchemaBSONType,
): SchemaBSONType | undefined {
  if (a === b) return a;
  if (
    (a === 'DBRef' && b === 'Document') ||
    (a === 'Document' && b === 'DBRef')
  ) {
    return 'DBRef';
  }
  return undefined;
}

/**
 * The values both type sets permit. Matching documents keep the fields of
 * both sides, with the types of a field present in both intersected; a field
 * no value can satisfy is dropped. Matching arrays intersect their members.
 */
function intersectTypes(a: TypeSet, b: TypeSet): TypeSet {
  if (a === undefined) return b;
  if (b === undefined) return a;

  const types: SimplifiedSchemaType[] = [];
  for (const left of a) {
    for (const right of b) {
      const bsonType = intersectKind(left.bsonType, right.bsonType);
      if (bsonType === undefined) continue;

      if (bsonType === 'Document') {
        mergeTypeInto(types, {
          bsonType,
          fields: intersectFields(
            (left as SimplifiedSchemaDocumentType).fields,
            (right as SimplifiedSchemaDocumentType).fields,
          ),
        });
      } else if (bsonType === 'Array') {
        const leftMembers = (left as SimplifiedSchemaArrayType).types;
        const rightMembers = (right as SimplifiedSchemaArrayType).types;
        mergeTypeInto(types, {
          bsonType,
          // An empty member list means the members are unconstrained.
          types:
            leftMembers.length === 0
              ? rightMembers
              : rightMembers.length === 0
                ? leftMembers
                : (intersectTypes(leftMembers, rightMembers) ?? []),
        });
      } else {
        mergeTypeInto(types, { bsonType });
      }
    }
  }
  return types;
}

function intersectFields(
  a: SimplifiedSchema,
  b: SimplifiedSchema,
): SimplifiedSchema {
  const fields: SimplifiedSchema = Object.create(null);
  for (const name of Object.keys(a)) {
    if (!(name in b)) {
      fields[name] = a[name];
      continue;
    }
    const types = intersectTypes(a[name].types, b[name].types);
    if (types && types.length > 0) fields[name] = { types };
  }
  for (const name of Object.keys(b)) {
    if (!(name in a)) fields[name] = b[name];
  }
  return fields;
}

/**
 * The values any of the type sets permit. If one branch is unconstrained, so
 * is the union.
 */
function unionTypes(sets: TypeSet[]): TypeSet {
  const types: SimplifiedSchemaType[] = [];
  for (const set of sets) {
    if (set === undefined) return undefined;
    mergeTypesInto(types, set);
  }
  return types;
}

function isRequired(schema: MongoDBJSONSchema, name: string): boolean {
  return Array.isArray(schema.required) && schema.required.includes(name);
}

function buildTypes(
  bsonType: SchemaBSONType,
  schema: MongoDBJSONSchema,
): SimplifiedSchemaType[] {
  if (bsonType === 'Document') {
    const fields = collectFields(schema.properties);
    if (!('$ref' in fields && '$id' in fields)) {
      return [{ bsonType, fields }];
    }
    // js-bson deserialises any embedded document with `$ref` and `$id` into a
    // DBRef, so that is what inference reports for one. Unless the validator
    // requires both, plain documents without them are permitted too.
    if (isRequired(schema, '$ref') && isRequired(schema, '$id')) {
      return [{ bsonType: 'DBRef' }];
    }
    return [{ bsonType, fields }, { bsonType: 'DBRef' }];
  }

  if (bsonType === 'Array') {
    // `additionalItems` only applies past a tuple `items` form, and only a
    // schema adds member types; `true` or absence leaves them unconstrained,
    // which is ignored here as it would make the tuple form uninformative.
    const memberSchemas = (
      Array.isArray(schema.items)
        ? [...schema.items, schema.additionalItems]
        : [schema.items]
    ).filter(isSchema);
    const members =
      memberSchemas.length > 0
        ? unionTypes(memberSchemas.map((items) => collectTypes(items)))
        : undefined;
    // An empty member list stands for unconstrained members.
    return [{ bsonType, types: members ?? [] }];
  }

  return [{ bsonType }];
}

/**
 * The types a single subschema permits. Keywords at the same level all apply,
 * so `anyOf`/`oneOf` contribute the union of their branches intersected with
 * the schema's own types, and each `allOf` branch is intersected in turn.
 *
 * `scope` is the types of the enclosing schema, when this is one of its
 * branches. An untyped branch constrains those types rather than introducing
 * its own, so `{ bsonType: 'object', oneOf: [{ properties }] }` merges the
 * branch's properties into the parent's Document, and a `properties`-only
 * branch of a `string` does not invent a Document.
 */
function collectTypes(schema: unknown, scope?: SchemaBSONType[]): TypeSet {
  if (!isSchema(schema)) return undefined;

  const explicit = explicitTypes(schema);
  const own = explicit.length > 0 ? explicit : (scope ?? impliedTypes(schema));

  let types: TypeSet;
  if (own.length > 0) {
    types = [];
    for (const bsonType of own) {
      mergeTypesInto(types, buildTypes(bsonType, schema));
    }
  }

  const branchScope = own.length > 0 ? own : undefined;
  for (const keyword of UNION_KEYWORDS) {
    // Malformed branches are skipped rather than read as permitting anything,
    // and an empty branch list (itself invalid) as no constraint.
    const branches: unknown[] = Array.isArray(schema[keyword])
      ? schema[keyword].filter(isSchema)
      : [];
    if (branches.length === 0) continue;
    types = intersectTypes(
      types,
      unionTypes(branches.map((branch) => collectTypes(branch, branchScope))),
    );
  }

  if (Array.isArray(schema.allOf)) {
    for (const branch of schema.allOf) {
      types = intersectTypes(types, collectTypes(branch, branchScope));
    }
  }

  return types;
}

function collectFields(properties: unknown): SimplifiedSchema {
  // Null prototype, matching `simplifiedSchema` in schema-analyzer, so that
  // field names like `__proto__` cannot collide with object internals.
  const fields: SimplifiedSchema = Object.create(null);
  if (!isSchema(properties)) return fields;

  const subschemas = properties as Record<string, unknown>;
  for (const name of Object.keys(subschemas)) {
    const types = collectTypes(subschemas[name]);
    // A field with no type information is omitted rather than emitted with an
    // empty `types` array: inference cannot produce the latter, since a field
    // appears there only because a value was observed for it. A field no value
    // can satisfy is omitted too, since it can only ever be absent.
    if (types && types.length > 0) {
      fields[name] = { types };
    }
  }

  return fields;
}

export function convertMongoDBJSONSchemaToSimplified(
  jsonSchema: JSONSchema,
): SimplifiedSchema {
  // The root always describes a document, so it is read as one even when
  // untyped - including when its shape lives entirely in union branches.
  const root = collectTypes(jsonSchema, ['Document'])?.find(isDocumentType);
  return root?.fields ?? Object.create(null);
}
