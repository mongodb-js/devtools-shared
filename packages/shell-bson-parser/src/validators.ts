import _ from 'lodash';
import _debug from 'debug';

import { parse, ParseMode } from './parse';
import { COLLATION_OPTIONS } from './constants';

const debug = _debug('shell-bson-parser:validators');

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
const DEFAULT_HINT = null;

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
  return parse(input, { mode: ParseMode.Loose });
}

function _parseCollation(input: string) {
  return parse(input, { mode: ParseMode.Loose });
}

function parseSort(input: string) {
  if (isEmpty(input)) {
    return DEFAULT_SORT;
  }
  return parse(input, { mode: ParseMode.Loose });
}

function isValueOkForHint() {
  /**
   * Prior to MongoDB 7.0, hint would accept invalid values, like NaN.
   * So we're on the looser side of validation here.
   */
  return true;
}

function _parseHint(input: string) {
  return parse(input, { mode: ParseMode.Loose });
}

function _parseFilter(input: string) {
  return parse(input, {
    mode: ParseMode.Loose,
    allowMethods: true,
  });
}

function isFilterValid(input: string) {
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

function _isCollationValid(collation: any) {
  for (const [key, value] of Object.entries(collation)) {
    if (!COLLATION_OPTIONS[key]) {
      debug('Collation "%s" is invalid bc of its keys', collation);
      return false;
    }
    if (
      COLLATION_OPTIONS[key as keyof typeof COLLATION_OPTIONS].includes(
        value as string | number | boolean,
      ) === false
    ) {
      debug('Collation "%s" is invalid bc of its values', collation);
      return false;
    }
  }
  return collation;
}

function isCollationValid(input: string) {
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

function isProjectValid(input: string) {
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

function isSortValid(input: string) {
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

function isHintValid(input: string) {
  if (isEmpty(input)) {
    return DEFAULT_HINT;
  }

  try {
    const parsed = _parseHint(input);

    if (_.isString(parsed)) {
      return parsed;
    }

    if (_.isArray(parsed) || !_.isObject(parsed)) {
      debug(
        'Hint "%s" is invalid. Only strings or documents are allowed',
        input,
      );
      return false;
    }

    if (!_.every(parsed, isValueOkForHint)) {
      debug('Hint "%s" is invalid bc of its values', input);
      return false;
    }

    return parsed;
  } catch (e) {
    debug('Hint "%s" is invalid', input, e);
    return false;
  }
}

function isMaxTimeMSValid(input: string | number): number | false {
  if (isEmpty(input)) {
    return DEFAULT_MAX_TIME_MS;
  }
  return isNumberValid(input);
}

function isSkipValid(input: string | number): number | false {
  if (isEmpty(input)) {
    return DEFAULT_SKIP;
  }
  return isNumberValid(input);
}

function isLimitValid(input: string | number): number | false {
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
  isHintValid,
};

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

export {
  DEFAULT_FILTER,
  DEFAULT_SORT,
  DEFAULT_LIMIT,
  DEFAULT_SKIP,
  DEFAULT_PROJECT,
  DEFAULT_COLLATION,
  DEFAULT_MAX_TIME_MS,
  DEFAULT_HINT,
};
