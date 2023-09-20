import { expect } from 'chai';
import * as constants from './index';

describe('constants', function () {
  it('should export all constants', function () {
    expect(Object.keys(constants)).to.deep.eq([
      'getFilteredCompletions',
      'wrapField',
      'ACCUMULATORS',
      'BSON_TYPE_ALIASES',
      'BSON_TYPES',
      'CONVERSION_OPERATORS',
      'ATLAS',
      'ADL',
      'ON_PREM',
      'ENVS',
      'EXPRESSION_OPERATORS',
      'JSON_SCHEMA',
      'DATABASE',
      'COLLECTION',
      'VIEW',
      'TIME_SERIES',
      'ANY_COLLECTION_NAMESPACE',
      'ANY_NAMESPACE',
      'QUERY_OPERATORS',
      'STAGE_OPERATORS',
      'STAGE_OPERATOR_NAMES',
      'OUT_STAGES',
      'FULL_SCAN_STAGES',
      'REQUIRED_AS_FIRST_STAGE',
      'SYSTEM_VARIABLES',
      'ATLAS_SEARCH_TEMPLATES',
    ]);
  });
});
