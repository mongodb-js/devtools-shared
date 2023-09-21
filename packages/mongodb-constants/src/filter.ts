import { satisfies } from 'semver';
import { ACCUMULATORS } from './accumulators';
import { BSON_TYPE_ALIASES } from './bson-type-aliases';
import { BSON_TYPES } from './bson-types';
import { CONVERSION_OPERATORS } from './conversion-operators';
import { EXPRESSION_OPERATORS } from './expression-operators';
import { JSON_SCHEMA } from './json-schema';
import { QUERY_OPERATORS } from './query-operators';
import { STAGE_OPERATORS } from './stage-operators';
import { SYSTEM_VARIABLES } from './system-variables';

export const ALL_CONSTANTS = [
  ...ACCUMULATORS,
  ...BSON_TYPES,
  ...BSON_TYPE_ALIASES,
  ...CONVERSION_OPERATORS,
  ...EXPRESSION_OPERATORS,
  ...JSON_SCHEMA,
  ...QUERY_OPERATORS,
  ...STAGE_OPERATORS,
  ...SYSTEM_VARIABLES,
];

const DEFAULT_SERVER_VERSION = '999.999.999';

export type Meta =
  | typeof ALL_CONSTANTS[number]['meta']
  | 'field:identifier'
  | 'field:reference';

/**
 * Our completions are a mix of ace autocompleter types and some custom values
 * added on top, this interface provides a type definition for all required
 * properties that completer is using
 */
export type Completion = {
  value: string;
  version: string;
  meta: Meta;
  description?: string;
  comment?: string;
  snippet?: string;
  score?: number;
  env?: string[];
  namespaces?: string[];
  apiVersions?: number[];
  outputStage?: boolean;
  fullScan?: boolean;
  firstStage?: boolean;
  geospatial?: boolean;
};

export type StageFilterOptions = {
  env?: string | string[];
  namespace?: string | string[];
  apiVersion?: number | number[];
};

export type FilterOptions = {
  /**
   * Current server version (default is 999.999.999)
   */
  serverVersion?: string;
  /**
   * Additional fields that are part of the document schema to add to
   * autocomplete as identifiers and identifier references
   */
  fields?: (string | { name: string; description?: string })[];
  /**
   * Filter completions by completion category
   */
  meta?: (Meta | 'field:*' | 'accumulator:*' | 'expr:*' | 'variable:*')[];
  /**
   * Stage-only filters
   */
  stage?: StageFilterOptions;
};

function matchesMeta(filter: string[], meta: string) {
  const metaParts = meta.split(':');
  return filter.some((metaFilter) => {
    const filterParts = metaFilter.split(':');
    return (
      filterParts.length === metaParts.length &&
      filterParts.every((part, index) => {
        return part === '*' || part === metaParts[index];
      })
    );
  });
}

function isIn<T extends string | number>(
  val: T | T[] | undefined,
  set: T[] | undefined
): boolean {
  // Do not filter when either value or match set is not provided
  if (typeof val === 'undefined' || typeof set === 'undefined') {
    return true;
  }
  // Otherwise check that value intersects with the match set
  val = Array.isArray(val) ? val : [val];
  return val.some((v) => set.includes(v));
}

/**
 * Helper method that performs a semver check. When comparing current server
 * version against just a version number (for example "1.2.3"), a "greater than
 * or equals" check will be performed, otherwise a range check will be used
 *
 * @param v1 Current server version
 * @param v2 Either a single version number or a range to match against
 */
function satisfiesVersion(v1: string, v2: string): boolean {
  const isGTECheck = /^\d+\.\d+\.\d+$/.test(v2);
  return satisfies(v1, isGTECheck ? `>=${v2}` : v2);
}

export function createConstantFilter({
  meta: filterMeta,
  serverVersion = DEFAULT_SERVER_VERSION,
  stage: filterStage = {},
}: Pick<FilterOptions, 'meta' | 'serverVersion' | 'stage'> = {}): (
  completion: Completion
) => boolean {
  const currentServerVersion =
    /^(?<version>\d+\.\d+\.\d+)/.exec(serverVersion)?.groups?.version ??
    // Fallback to default server version if provided version doesn't match
    // regex so that semver doesn't throw when checking
    DEFAULT_SERVER_VERSION;
  return ({
    version: minServerVersion,
    meta,
    env,
    namespaces,
    apiVersions,
  }) => {
    return (
      satisfiesVersion(currentServerVersion, minServerVersion) &&
      isIn(filterStage.env, env) &&
      isIn(filterStage.namespace, namespaces) &&
      isIn(filterStage.apiVersion, apiVersions) &&
      (!filterMeta || matchesMeta(filterMeta, meta))
    );
  };
}

function isValidIdentifier(identifier: string) {
  // Quick check for common case first
  if (/[.\s"'()[\];={}:]/.test(identifier)) {
    return false;
  }
  try {
    // Everything else we check using eval as regex methods of checking are quite
    // hard to do (see https://mathiasbynens.be/notes/javascript-identifiers-es6)
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    new Function(`"use strict";let _ = { ${identifier}: 0 };`);
    return true;
  } catch {
    return false;
  }
}

/**
 * Helper method to conditionally wrap value if it's not a valid identifier
 */
export function wrapField(field: string, force = false): string {
  return force || !isValidIdentifier(field)
    ? `"${field.replace(/["\\]/g, '\\$&')}"`
    : field;
}

function normalizeField(
  field: string | { name: string; description?: string }
) {
  return typeof field === 'string'
    ? { value: field }
    : {
        value: field.name,
        description: field.description,
      };
}

/**
 * Convenience method to filter list of mongodb constants based on constants
 * values
 *
 * @param options filter options
 * @param constants list of constants to filter, for testing purposes only
 * @returns filtered constants
 */
export function getFilteredCompletions(
  options: FilterOptions = {},
  constants: Completion[] = ALL_CONSTANTS as Completion[]
): Completion[] {
  const {
    serverVersion = DEFAULT_SERVER_VERSION,
    fields = [],
    meta,
    stage,
  } = options;
  const completionsFilter = createConstantFilter({
    serverVersion,
    meta,
    stage,
  });
  const completionsWithFields = constants.concat(
    fields.flatMap((field) => {
      const { value, description } = normalizeField(field);
      return [
        {
          value: value,
          meta: 'field:identifier',
          version: '0.0.0',
          description,
        },
        {
          value: `$${value}`,
          meta: 'field:reference',
          version: '0.0.0',
          description,
        },
      ];
    })
  );

  return completionsWithFields.filter((completion) => {
    return completionsFilter(completion);
  });
}
