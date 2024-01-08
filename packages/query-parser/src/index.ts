import parseShellStringToEJSON, { ParseMode } from 'ejson-shell-parser';

import _ from 'lodash';
import _debug from 'debug';

import { COLLATION_OPTIONS } from './constants';
import { stringify, toJSString } from './stringify';

const debug = _debug('mongodb-query-parser');

/** @public */
const DEFAULT_FILTER = {};
/** @public */
const DEFAULT_SORT = null;
/** @public */
const DEFAULT_LIMIT = 0;
/** @public */
const DEFAULT_SKIP = 0;
/** @public */
const DEFAULT_PROJECT = null;
/** @public */
const DEFAULT_COLLATION = null;
/** @public */
const DEFAULT_MAX_TIME_MS = 60000; // 1 minute in ms
/** @public */
const QUERY_PROPERTIES = ['filter', 'project', 'sort', 'skip', 'limit'];

function isEmpty(input: string | number | null | undefined): boolean {
  if (input === null || input === undefined) {
    return true;
  }
  const s = _.trim(typeof input === 'number' ? `${input}` : input);

  if (s === '{}') {
    return true;
  }
  return _.isEmpty(s);
}

function isNumberValid(input: string | number) {
  if (isEmpty(input)) {
    return 0;
  }
  return /^\d+$/.test(`${input}`) ? parseInt(`${input}`, 10) : false;
}

function _parseProject(input: string) {
  return parseShellStringToEJSON(input, { mode: ParseMode.Loose });
}

function _parseCollation(input: string) {
  return parseShellStringToEJSON(input, { mode: ParseMode.Loose });
}

/** @public */
export function parseSort(input: string) {
  if (isEmpty(input)) {
    return DEFAULT_SORT;
  }
  return parseShellStringToEJSON(input, { mode: ParseMode.Loose });
}

function _parseFilter(input: string) {
  return parseShellStringToEJSON(input, { mode: ParseMode.Loose });
}

/** @public */
export function parseFilter(input: string) {
  if (isEmpty(input)) {
    return DEFAULT_FILTER;
  }
  return _parseFilter(input);
}

/** @public */
export function parseCollation(input: string) {
  if (isEmpty(input)) {
    return DEFAULT_COLLATION;
  }
  return _parseCollation(input);
}

/**
 * Validation function for a query `filter`. Must be a valid MongoDB query
 * according to the query language.
 * @public
 *
 * @return {Boolean|Object} false if not valid, or the parsed filter.
 */
export function isFilterValid(input: string) {
  if (isEmpty(input)) {
    return DEFAULT_FILTER;
  }
  try {
    return _parseFilter(input);
  } catch (e) {
    debug('Filter "%s" is invalid', input, e);
    return false;
  }
}

/**
 * Validation of collation object keys and values.
 * @public
 *
 * @param {Object} collation
 * @return {Boolean|Object} false if not valid, otherwise the parsed project.
 */
function _isCollationValid(collation: any) {
  for (const [key, value] of Object.entries(collation)) {
    if (!COLLATION_OPTIONS[key]) {
      debug('Collation "%s" is invalid bc of its keys', collation);
      return false;
    }
    if (
      COLLATION_OPTIONS[key as keyof typeof COLLATION_OPTIONS].includes(
        value as string | number | boolean
      ) === false
    ) {
      debug('Collation "%s" is invalid bc of its values', collation);
      return false;
    }
  }
  return collation;
}

/**
 * Validation function for a query `collation`.
 * @public
 *
 * @return {Boolean|Object} false if not valid, or the parsed filter.
 */
export function isCollationValid(input: string) {
  if (isEmpty(input)) {
    return DEFAULT_COLLATION;
  }
  try {
    const parsed = _parseCollation(input);
    return _isCollationValid(parsed);
  } catch (e) {
    debug('Collation "%s" is invalid', input, e);
    return false;
  }
}

function isValueOkForProject() {
  /**
   * Since server 4.4, project in find queries supports everything that
   * aggregations $project supports (which is basically anything at all) so we
   * effectively allow everything as a project value and keep this method for
   * the context
   *
   * @see {@link https://docs.mongodb.com/manual/release-notes/4.4/#projection}
   */
  return true;
}

/** @public */
export function parseProject(input: string) {
  if (isEmpty(input)) {
    return DEFAULT_PROJECT;
  }
  return _parseProject(input);
}

/**
 * Validation function for a query `project`. Must only have 0 or 1 as values.
 * @public
 *
 * @return {Boolean|Object} false if not valid, otherwise the parsed project.
 */
export function isProjectValid(input: string) {
  if (isEmpty(input)) {
    return DEFAULT_PROJECT;
  }

  try {
    const parsed = _parseProject(input);

    if (!_.isObject(parsed)) {
      debug('Project "%s" is invalid. Only documents are allowed', input);
      return false;
    }

    if (!_.every(parsed, isValueOkForProject)) {
      debug('Project "%s" is invalid bc of its values', input);
      return false;
    }

    return parsed;
  } catch (e) {
    debug('Project "%s" is invalid', input, e);
    return false;
  }
}

const ALLOWED_SORT_VALUES = [1, -1, 'asc', 'desc'];

function isValueOkForSortDocument(val: any): boolean {
  return (
    _.includes(ALLOWED_SORT_VALUES, val) ||
    !!(_.isObject(val) && (val as { $meta: string }).$meta)
  );
}

function isValueOkForSortArray(val: any): boolean {
  return (
    _.isArray(val) &&
    val.length === 2 &&
    _.isString(val[0]) &&
    isValueOkForSortDocument(val[1])
  );
}

/**
 * Validation function for a query `sort`. Must only have -1 or 1 as values.
 * @public
 *
 * @return {Boolean|Object} false if not valid, otherwise the cleaned-up sort.
 */
export function isSortValid(input: string) {
  try {
    const parsed = parseSort(input);

    if (isEmpty(parsed)) {
      return DEFAULT_SORT;
    }

    if (_.isArray(parsed) && _.every(parsed, isValueOkForSortArray)) {
      return parsed;
    }

    if (
      _.isObject(parsed) &&
      !_.isArray(parsed) &&
      _.every(parsed, isValueOkForSortDocument)
    ) {
      return parsed;
    }

    debug('Sort "%s" is invalid bc of its values', input);
    return false;
  } catch (e) {
    debug('Sort "%s" is invalid', input, e);
    return false;
  }
}

/**
 * Validation function for a query `maxTimeMS`. Must be digits only.
 * @public
 *
 * Returns false if not valid, otherwise the cleaned-up max time ms.
 */
export function isMaxTimeMSValid(input: string | number): number | false {
  if (isEmpty(input)) {
    return DEFAULT_MAX_TIME_MS;
  }
  return isNumberValid(input);
}

/**
 * Validation function for a query `skip`. Must be digits only.
 * @public
 *
 * Returns false if not valid, otherwise the cleaned-up skip.
 */
export function isSkipValid(input: string | number): number | false {
  if (isEmpty(input)) {
    return DEFAULT_SKIP;
  }
  return isNumberValid(input);
}

/**
 * Validation function for a query `limit`. Must be digits only.
 * @public
 *
 * Returns false if not valid, otherwise the cleaned-up limit.
 */
export function isLimitValid(input: string | number): number | false {
  if (isEmpty(input)) {
    return DEFAULT_LIMIT;
  }
  return isNumberValid(input);
}

const validatorFunctions = {
  isMaxTimeMSValid,
  isFilterValid,
  isProjectValid,
  isSortValid,
  isLimitValid,
  isSkipValid,
  isCollationValid,
  isNumberValid,
};

/** @public */
export function validate(what: string, input: string) {
  const validator =
    validatorFunctions[
      `is${_.upperFirst(what)}Valid` as keyof typeof validatorFunctions
    ];
  if (!validator) {
    debug('Do not know how to validate `%s`. Returning false.', what);
    return false;
  }
  return validator(input);
}

/** @public */
export default function queryParser(
  filter: string,
  project: string | null = DEFAULT_PROJECT
) {
  if (arguments.length === 1) {
    if (_.isString(filter)) {
      return _parseFilter(filter);
    }
  }
  return {
    filter: _parseFilter(filter),
    project: project !== DEFAULT_PROJECT ? _parseProject(project) : project,
  };
}

export {
  stringify,
  toJSString,
  QUERY_PROPERTIES,
  DEFAULT_FILTER,
  DEFAULT_SORT,
  DEFAULT_LIMIT,
  DEFAULT_SKIP,
  DEFAULT_PROJECT,
  DEFAULT_COLLATION,
  DEFAULT_MAX_TIME_MS,
};
