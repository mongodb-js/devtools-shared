import * as fs from 'fs';
import * as path from 'path';
import { jsonSchemaToZod } from 'json-schema-to-zod';

/**
 * Generates `src/metaschema.ts` (the zod schema used to parse the operator
 * definitions) directly from the JSON metaschema shipped in the
 * `mql-specifications` submodule, so the zod definitions don't have to be
 * maintained by hand.
 *
 * `json-schema-to-zod` expects a fully dereferenced schema and emits `z.any()`
 * for any `$ref` it doesn't understand, while `json-refs` cannot inline the
 * recursive `Argument.arguments` reference. We therefore dereference the
 * `#/definitions/*` references ourselves, breaking reference cycles by
 * replacing the recursive reference with an empty schema (which becomes
 * `z.any()`).
 */

type JsonSchema = Record<string, unknown>;

const schemaFile = path.resolve(
  __dirname,
  '..',
  'mql-specifications',
  'schemas',
  'operator.json',
);
const outputFile = path.resolve(__dirname, 'metaschema.ts');

const root = JSON.parse(fs.readFileSync(schemaFile, 'utf8')) as {
  definitions: Record<string, JsonSchema>;
};
const definitions = root.definitions;

function dereference(node: unknown, stack: readonly string[]): unknown {
  if (Array.isArray(node)) {
    return node.map((item) => dereference(item, stack));
  }

  if (node && typeof node === 'object') {
    const ref = (node as JsonSchema).$ref;
    if (typeof ref === 'string') {
      const match = /^#\/definitions\/(.+)$/.exec(ref);
      if (!match) {
        throw new Error(`Unsupported $ref: ${ref}`);
      }
      const name = match[1];
      if (stack.includes(name)) {
        // Break the reference cycle. An empty schema is converted to
        // `z.any()`, which accepts the recursive structure at runtime.
        return {};
      }
      if (!definitions[name]) {
        throw new Error(`Unknown definition: ${name}`);
      }
      return dereference(definitions[name], [...stack, name]);
    }

    return Object.fromEntries(
      Object.entries(node).map(([key, value]) => [
        key,
        dereference(value, stack),
      ]),
    );
  }

  return node;
}

const operatorSchema = dereference(definitions.Operator, ['Operator']);

const code = jsonSchemaToZod(operatorSchema as JsonSchema, {
  name: 'Operator',
  module: 'esm',
});

fs.writeFileSync(outputFile, code, 'utf8');
