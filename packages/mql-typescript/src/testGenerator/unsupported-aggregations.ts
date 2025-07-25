const nestedFieldsExplanation =
  'this test accesses nested fields, which is not currently supported';

export const unsupportedAggregations: {
  [category: string]: {
    [operator: string]: {
      [test: string]: { stage: number; comment?: string };
    };
  };
} = {
  accumulator: {
    derivative: {
      Example: { stage: 1 },
    },
  },
  expression: {
    arrayToObject: {
      ['$objectToArray and $arrayToObject Example']: { stage: 1 },
    },
    convert: {
      Example: { stage: 1 },
    },
    dateDiff: {
      'Elapsed Time': { stage: 1 },
    },
    dateSubtract: {
      'Filter by Relative Dates': { stage: 1 },
    },
    let: {
      Example: {
        stage: 0,
        comment:
          '$multiply references a variable that is not available statically',
      },
    },
    map: {
      'Add to Each Element of an Array': {
        stage: 0,
        comment:
          '$map references the variable names defined in the `as` field, which is not available statically',
      },
      'Truncate Each Array Element': {
        stage: 0,
        comment:
          '$map references the variable names defined in the `as` field, which is not available statically',
      },
      'Convert Celsius Temperatures to Fahrenheit': {
        stage: 0,
        comment:
          '$map references the variable names defined in the `as` field, which is not available statically',
      },
    },
    objectToArray: {
      '$objectToArray to Sum Nested Fields': { stage: 1 },
    },
    pow: {
      Example: {
        stage: 0,
        comment: nestedFieldsExplanation,
      },
    },
    reduce: {
      Multiplication: { stage: 1 },
      'Computing a Multiple Reductions': {
        stage: 0,
        comment: nestedFieldsExplanation,
      },
    },
    regexFindAll: {
      'Use Captured Groupings to Parse User Name': { stage: 1 },
    },
    setIntersection: {
      'Retrieve Documents for Roles Granted to the Current User': {
        stage: 0,
        comment: nestedFieldsExplanation,
      },
    },
    split: {
      Example: { stage: 1 },
    },
    sqrt: {
      Example: { stage: 0, comment: nestedFieldsExplanation },
    },
    stdDevPop: {
      'Use in $project Stage': { stage: 0, comment: nestedFieldsExplanation },
    },
    toBool: {
      Example: { stage: 1 },
    },
    zip: {
      'Filtering and Preserving Indexes': {
        stage: 0,
        comment: nestedFieldsExplanation,
      },
    },
  },
  query: {
    eq: {
      'Field in Embedded Document Equals a Value': {
        stage: 0,
        comment: nestedFieldsExplanation,
      },
    },
    type: {
      'Querying by MinKey and MaxKey': {
        stage: 0,
        comment: nestedFieldsExplanation,
      },
    },
  },
  search: {
    embeddedDocument: {
      'Query for Matching Embedded Documents Only': {
        stage: 2,
        comment: nestedFieldsExplanation,
      },
      Basic: {
        stage: 0,
        comment: nestedFieldsExplanation,
      },
      Facet: {
        stage: 0,
        comment: nestedFieldsExplanation,
      },
      ['Query and Sort']: {
        stage: 0,
        comment: nestedFieldsExplanation,
      },
    },
    facet: {
      Facet: {
        stage: 2,
        comment:
          'this uses $$SEARCH_META, which is a synthetic field not available statically',
      },
    },
    geoShape: {
      Disjoint: {
        stage: 0,
        comment: nestedFieldsExplanation,
      },
      Intersect: {
        stage: 0,
        comment: nestedFieldsExplanation,
      },
      Within: {
        stage: 0,
        comment: nestedFieldsExplanation,
      },
    },
    exists: {
      Embedded: {
        stage: 0,
        comment: nestedFieldsExplanation,
      },
    },
    geoWithin: {
      box: {
        stage: 0,
        comment: nestedFieldsExplanation,
      },
      circle: {
        stage: 0,
        comment: nestedFieldsExplanation,
      },
      geometry: {
        stage: 0,
        comment: nestedFieldsExplanation,
      },
    },
    near: {
      ['GeoJSON Point']: {
        stage: 0,
        comment: nestedFieldsExplanation,
      },
      Compound: {
        stage: 0,
        comment: nestedFieldsExplanation,
      },
    },
  },
  stage: {
    addFields: {
      'Using Two $addFields Stages': {
        stage: 1,
      },
    },
    bucket: {
      'Bucket by Year and Filter by Bucket Results': {
        stage: 1,
        comment:
          'the output field of the $bucket stage generates new fields that are not available statically',
      },
    },
    currentOp: {
      'Inactive Sessions': {
        stage: 1,
        comment:
          '$currentOp emits new fields that are not available statically',
      },
      'Sampled Queries': {
        stage: 1,
        comment:
          '$currentOp emits new fields that are not available statically',
      },
    },
    group: {
      'Group by Item Having': {
        stage: 1,
      },
      'Group Documents by author': {
        stage: 1,
      },
    },
    planCacheStats: {
      'Find Cache Entry Details for a Query Hash': {
        stage: 1,
        comment:
          '$planCacheStats emits new fields that are not available statically',
      },
    },
    replaceRoot: {
      'with a Document Nested in an Array': {
        stage: 1,
        comment: nestedFieldsExplanation,
      },
    },
    replaceWith: {
      'a Document Nested in an Array': {
        stage: 1,
        comment: nestedFieldsExplanation,
      },
    },
    search: {
      Example: {
        stage: 3,
        comment:
          '$search emits new fields that are not available statically, such as $$SEARCH_META',
      },
      'Number Search and Sort': {
        stage: 0,
        comment: nestedFieldsExplanation,
      },
      'Return Stored Source Fields': {
        stage: 1,
        comment: nestedFieldsExplanation,
      },
    },
    set: {
      'Using Two $set Stages': {
        stage: 1,
        comment: 'second $set stage references fields created in the first',
      },
    },
    unset: {
      'Remove Embedded Fields': {
        stage: 0,
        comment: nestedFieldsExplanation,
      },
    },
    unwind: {
      'Unwind Embedded Arrays': {
        stage: 1,
        comment: nestedFieldsExplanation,
      },
    },
  },
};
