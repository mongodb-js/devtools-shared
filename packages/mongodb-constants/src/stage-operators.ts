import type { ENVS } from './env';
import { ATLAS, ADL, ON_PREM } from './env';

import {
  ANY_NAMESPACE,
  DATABASE,
  ANY_COLLECTION_NAMESPACE,
  COLLECTION,
} from './ns';

type StageOperator = {
  readonly name: string;
  readonly value: string;
  readonly label: string;
  readonly outputStage: boolean;
  readonly fullScan: boolean;
  readonly firstStage: boolean;
  readonly score: number;
  readonly env: readonly (typeof ENVS)[number][];
  readonly meta: 'stage';
  readonly version: string;
  readonly apiVersions: readonly number[];
  readonly namespaces: readonly (typeof ANY_NAMESPACE)[number][];
  readonly description: string;
  readonly comment: string;
  readonly snippet: string;
};

/**
 * The stage operators.
 */
const STAGE_OPERATORS = [
  {
    name: '$addFields',
    value: '$addFields',
    label: '$addFields',
    outputStage: false,
    fullScan: false,
    firstStage: false,
    score: 1,
    env: [ATLAS, ADL, ON_PREM],
    meta: 'stage',
    version: '3.4.0',
    apiVersions: [1],
    namespaces: [...ANY_NAMESPACE],
    description:
      'Adds new field(s) to a document with a computed value, or reassigns an existing field(s) with a computed value.',
    comment: `/**
 * newField: The new field name.
 * expression: The new field expression.
 */
`,
    snippet: `{
  \${1:newField}: \${2:expression}, \${3:...}
}`,
  },
  {
    name: '$bucket',
    value: '$bucket',
    label: '$bucket',
    outputStage: false,
    fullScan: true,
    firstStage: false,
    score: 1,
    env: [ATLAS, ADL, ON_PREM],
    meta: 'stage',
    version: '3.4.0',
    apiVersions: [1],
    namespaces: [...ANY_NAMESPACE],
    description:
      'Categorizes incoming documents into groups, called buckets, based on specified boundaries.',
    comment: `/**
 * groupBy: The expression to group by.
 * boundaries: An array of the lower boundaries for each bucket.
 * default: The bucket name for documents that do not fall within the specified boundaries
 * output: {
 *   outputN: Optional. The output object may contain a single or numerous field names used to accumulate values per bucket.
 * }
 */
`,
    snippet: `{
  groupBy: \${1:expression},
  boundaries: [ \${2:lowerbound}, \${3:...} ],
  default: \${4:literal},
  output: {
    \${5:outputN}: { \${6:accumulator} }, \${7:...}
  }
}`,
  },
  {
    name: '$bucketAuto',
    value: '$bucketAuto',
    label: '$bucketAuto',
    outputStage: false,
    fullScan: true,
    firstStage: false,
    score: 1,
    env: [ATLAS, ADL, ON_PREM],
    meta: 'stage',
    version: '3.4.0',
    apiVersions: [1],
    namespaces: [...ANY_NAMESPACE],
    description:
      'Automatically categorizes documents into a specified number of buckets, attempting even distribution if possible.',
    comment: `/**
 * groupBy: The expression to group by.
 * buckets: The desired number of buckets
 * output: {
 *   outputN: Optional. The output object may contain a single or numerous field names used to accumulate values per bucket.
 * }
 * granularity: Optional number series
 */
`,
    snippet: `{
  groupBy: \${1:expression},
  buckets: \${2:number},
  output: {
    \${3:outputN}: \${4:accumulator}, \${5:...}
  },
  granularity: '\${6:string}'
}`,
  },
  {
    name: '$changeStream',
    value: '$changeStream',
    label: '$changeStream',
    outputStage: false,
    fullScan: false,
    firstStage: true,
    score: 1,
    env: [ATLAS, ON_PREM],
    meta: 'stage',
    version: '4.2.0',
    apiVersions: [1],
    namespaces: [DATABASE],
    description: 'Returns a Change Stream cursor for the collection.',
    comment: `/**
 * allChangesForCluster: Optional boolean to include all changes in the cluster.
 * fullDocument: Optional value to request a copy of full document when modified by update operations (Introduced in 6.0).
 * fullDocumentBeforeChange: Value to configure whether to return a full document before the change or not.
 * resumeAfter: Specifies a resume token as the logical starting point for the change stream. Cannot be used with startAfter or startAtOperationTime fields.
 * showExpandedEvents: Specifies whether to include additional change events, such as such as DDL and index operations (Introduced in 6.0).
 * startAfter: Specifies a resume token as the logical starting point for the change stream. Cannot be used with resumeAfter or startAtOperationTime fields.
 * startAtOperationTime: Specifies a time as the logical starting point for the change stream. Cannot be used with resumeAfter or startAfter fields.
 */
`,
    snippet: `{
  allChangesForCluster: \${1:boolean},
  fullDocument: '\${2:string}',
  fullDocumentBeforeChange: '\${3:string}',
  resumeAfter: \${4:resumeToken},
  showExpandedEvents: \${5:boolean},
  startAfter: \${6:resumeToken},
  startAtOperationTime: \${7:time},
}`,
  },
  {
    name: '$collStats',
    value: '$collStats',
    label: '$collStats',
    outputStage: false,
    fullScan: false,
    firstStage: true,
    score: 1,
    env: [ATLAS, ADL, ON_PREM],
    meta: 'stage',
    version: '3.4.0',
    apiVersions: [],
    namespaces: [...ANY_COLLECTION_NAMESPACE],
    description: 'Returns statistics regarding a collection or view.',
    comment: `/**
 * histograms: Optional latency histograms.
 * storageStats: Optional storage stats.
 */
`,
    snippet: `{
  latencyStats: {
    histograms: \${1:boolean}
  },
  storageStats: {\${2:}},
}`,
  },
  {
    name: '$count',
    value: '$count',
    label: '$count',
    outputStage: false,
    fullScan: false,
    firstStage: false,
    score: 1,
    env: [ATLAS, ADL, ON_PREM],
    meta: 'stage',
    version: '2.2.0',
    apiVersions: [1],
    namespaces: [...ANY_NAMESPACE],
    description:
      'Returns a count of the number of documents at this stage of the aggregation pipeline.',
    comment: `/**
 * Provide the field name for the count.
 */
`,
    // eslint-disable-next-line quotes
    snippet: `'\${1:string}'`,
  },
  {
    name: '$currentOp',
    value: '$currentOp',
    label: '$currentOp',
    outputStage: false,
    fullScan: false,
    firstStage: true,
    score: 1,
    env: [ATLAS, ADL, ON_PREM],
    meta: 'stage',
    version: '3.6.0',
    apiVersions: [1],
    namespaces: [DATABASE],
    description:
      'Returns a cursor over information on active and/or dormant operations for the MongoDB deployment as well as inactive sessions that are holding locks as part of a transaction.',
    comment: `/**
 * allUsers: Optional boolean value to specify whether to return operations for all users or not.
 * idleConnections: Optional boolean value to specify whether to return all operations including idle connections or not.
 * idleCursors: Optional boolean value to specify whether to report on cursors that are idle or not.
 * idleSessions: Optional boolean value to specify whether to report on dormant sessions or not.
 * localOps: Optional boolean value to specify whether to report on operations running locally on targetted mongos or not.
 * backtrace: Optional boolean value to specify whether callstack information is returned as part of the waitingForLatch output field.
 */
`,
    snippet: `{
  allUsers: \${1:false},
  idleConnections: \${2:false},
  idleCursors: \${3:false},
  idleSessions: \${4:true},
  localOps: \${5:false},
  backtrace: \${6:false},
}`,
  },
  {
    name: '$densify',
    value: '$densify',
    label: '$densify',
    outputStage: false,
    fullScan: false,
    firstStage: false,
    score: 1,
    env: [ATLAS, ADL, ON_PREM],
    meta: 'stage',
    version: '5.1.0',
    apiVersions: [1],
    namespaces: [...ANY_NAMESPACE],
    description:
      'Creates new documents to eliminate the gaps in the time or numeric domain at the required granularity level.',
    comment: `/**
 * field: The required field to densify.
 * partitionByFields: The set of fields that acts as a compound key to define each partition.
 * range: {
 *   step: The amount to increment the field value in each document.
 *   unit: If specified field must evaluate to a date for every document in the collection, otherwise must evaluate to a numeric.
 *   bounds: A string or array of numeric/date bounds, corresponding to the type of the field.
 * }
 */
`,
    snippet: `{
  field: \${1:string},
  partitionByFields: [\${2:string}, \${3:string}, ...],
  range: {
    step: \${4:number},
    unit: \${5:string},
    bounds: [\${6:lowerbound}, \${7:upperbound}, ...]
  }
}`,
  },
  {
    name: '$documents',
    value: '$documents',
    label: '$documents',
    outputStage: false,
    fullScan: false,
    firstStage: true,
    score: 1,
    env: [ATLAS, ADL, ON_PREM],
    meta: 'stage',
    version: '4.4.9',
    apiVersions: [1],
    namespaces: [DATABASE],
    description: 'Returns literal documents from input values.',
    comment: `/**
 * expression: Any valid expression.
 */
`,
    snippet: `{
  \${1:expression}
}`,
  },
  {
    name: '$facet',
    value: '$facet',
    label: '$facet',
    outputStage: false,
    fullScan: false,
    firstStage: false,
    score: 1,
    env: [ATLAS, ADL, ON_PREM],
    meta: 'stage',
    version: '3.4.0',
    apiVersions: [1],
    namespaces: [...ANY_NAMESPACE],
    description: 'Allows for multiple parellel aggregations to be specified.',
    comment: `/**
 * outputFieldN: The first output field.
 * stageN: The first aggregation stage.
 */
`,
    snippet: `{
  \${1:outputFieldN}: [ \${2:stageN}, \${3:...} ]
}`,
  },
  {
    name: '$fill',
    value: '$fill',
    label: '$fill',
    outputStage: false,
    fullScan: false,
    firstStage: false,
    score: 1,
    env: [ATLAS, ADL, ON_PREM],
    meta: 'stage',
    version: '5.3.0',
    apiVersions: [1],
    namespaces: [...ANY_NAMESPACE],
    description: 'Populates null and missing field values within documents.',
    comment: `/**
 * sortBy: Syntax is the same as $sort, required if "method" is used in at least one output spec otherwise optional
 * partitionBy: Optional, default is a single partition. Specification is the same as _id in $group (same as partitionBy in window functions).
 * partitionByFields: Optional, set of fields that acts as a compound key to define each partition.
 * output - Required, object for each field to fill in. For a single field, can be a single object.
 * output.<field> - A field to be filled with value, if missing or null in the current document.
 */
`,
    snippet: `{
  sortBy: \${1:sortSpec},
  partitionBy: \${2:expression},
  partitionByFields: [\${3:string}, \${4:string}, ...],
  output: {
    field1: {value: \${5:expression}},
    field2: {method: \${6:string}},
    ...
  }
}`,
  },
  {
    name: '$geoNear',
    value: '$geoNear',
    label: '$geoNear',
    outputStage: false,
    fullScan: false,
    firstStage: false,
    score: 1,
    env: [ATLAS, ADL, ON_PREM],
    meta: 'stage',
    version: '2.4.0',
    apiVersions: [1],
    namespaces: [...ANY_NAMESPACE],
    description: 'Returns documents based on proximity to a geospatial point.',
    comment: `/**
 * near: The point to search near.
 * distanceField: The calculated distance.
 * maxDistance: The maximum distance, in meters, documents can be before being excluded from results.
 * query: Limits results that match the query
 * includeLocs: Optional. Labels and includes the point used to match the document.
 * num: Optional. The maximum number of documents to return.
 * spherical: Defaults to false. Specifies whether to use spherical geometry.
 */
`,
    snippet: `{
  near: { type: 'Point', coordinates: [ \${1:number}, \${2:number} ] },
  distanceField: '\${3:string}',
  maxDistance: \${4:number},
  query: {\${5}},
  includeLocs: '\${6}',
  num: \${7:number},
  spherical: \${8:boolean}
}`,
  },
  {
    name: '$graphLookup',
    value: '$graphLookup',
    label: '$graphLookup',
    outputStage: false,
    fullScan: false,
    firstStage: false,
    score: 1,
    env: [ATLAS, ADL, ON_PREM],
    meta: 'stage',
    version: '3.4.0',
    apiVersions: [1],
    namespaces: [...ANY_NAMESPACE],
    description: 'Performs a recursive search on a collection.',
    comment: `/**
 * from: The target collection.
 * startWith: Expression to start.
 * connectFromField: Field to connect.
 * connectToField: Field to connect to.
 * as: Name of the array field.
 * maxDepth: Optional max recursion depth.
 * depthField: Optional Name of the depth field.
 * restrictSearchWithMatch: Optional query.
 */
`,
    snippet: `{
  from: '\${1:string}',
  startWith: \${2:expression},
  connectFromField: '\${3:string}',
  connectToField: '\${4:string}',
  as: '\${5:string}',
  maxDepth: \${6:number},
  depthField: '\${7:string}',
  restrictSearchWithMatch: {\${8}}
}`,
  },
  {
    name: '$group',
    value: '$group',
    label: '$group',
    outputStage: false,
    fullScan: true,
    firstStage: false,
    score: 1,
    env: [ATLAS, ADL, ON_PREM],
    meta: 'stage',
    version: '2.2.0',
    apiVersions: [1],
    namespaces: [...ANY_NAMESPACE],
    description: 'Groups documents by a specified expression.',
    comment: `/**
 * _id: The id of the group.
 * fieldN: The first field name.
 */
`,
    snippet: `{
  _id: \${1:expression},
  \${2:fieldN}: {
    \${3:accumulatorN}: \${4:expressionN}
  }
}`,
  },
  {
    name: '$indexStats',
    value: '$indexStats',
    label: '$indexStats',
    outputStage: false,
    fullScan: false,
    firstStage: true,
    score: 1,
    env: [ATLAS, ADL, ON_PREM],
    meta: 'stage',
    version: '3.2.0',
    apiVersions: [],
    namespaces: [...ANY_NAMESPACE],
    description:
      'Returns statistics regarding the use of each index for the collection.',
    comment: `/**
 * No parameters.
 */
`,
    snippet: '{}',
  },
  {
    name: '$limit',
    value: '$limit',
    label: '$limit',
    outputStage: false,
    fullScan: false,
    firstStage: false,
    score: 1,
    env: [ATLAS, ADL, ON_PREM],
    meta: 'stage',
    version: '2.2.0',
    apiVersions: [1],
    namespaces: [...ANY_NAMESPACE],
    description:
      'Limits the number of documents that flow into subsequent stages.',
    comment: `/**
 * Provide the number of documents to limit.
 */
`,
    snippet: '${1:number}',
  },
  {
    name: '$listLocalSessions',
    value: '$listLocalSessions',
    label: '$listLocalSessions',
    outputStage: false,
    fullScan: false,
    firstStage: true,
    score: 1,
    env: [ATLAS, ON_PREM],
    meta: 'stage',
    version: '3.6.0',
    apiVersions: [1],
    namespaces: [DATABASE],
    description:
      'Lists the sessions cached in memory by the mongod or mongos instance.',
    comment: `/**
 * users: Optional list of users for which local sessions need to be returned.
 * allUsers: Optional boolean value to specify whether to return local sessions for all users or not.
 */
`,
    snippet: `{
  allUsers: \${1:false},
  users: [
    { user: '\${2:string}', db: '\${3:string}' }
  ]
}`,
  },
  {
    name: '$lookup',
    value: '$lookup',
    label: '$lookup',
    outputStage: false,
    fullScan: false,
    firstStage: false,
    score: 1,
    env: [ATLAS, ADL, ON_PREM],
    meta: 'stage',
    version: '3.2.0',
    apiVersions: [1],
    namespaces: [...ANY_NAMESPACE],
    description: 'Performs a join between two collections.',
    comment: `/**
 * from: The target collection.
 * localField: The local join field.
 * foreignField: The target join field.
 * as: The name for the results.
 * pipeline: Optional pipeline to run on the foreign collection.
 * let: Optional variables to use in the pipeline field stages.
 */
`,
    snippet: `{
  from: \${1:collection},
  localField: \${2:field},
  foreignField: \${3:field},
  as: \${4:result}
}`,
  },
  {
    name: '$match',
    value: '$match',
    label: '$match',
    outputStage: false,
    fullScan: false,
    firstStage: false,
    score: 1,
    env: [ATLAS, ADL, ON_PREM],
    meta: 'stage',
    version: '2.2.0',
    apiVersions: [1],
    namespaces: [...ANY_NAMESPACE],
    description:
      'Filters the document stream to allow only matching documents to pass through to subsequent stages.',
    comment: `/**
 * query: The query in MQL.
 */
`,
    snippet: `{
  \${1:query}
}`,
  },
  {
    name: '$merge',
    value: '$merge',
    label: '$merge',
    outputStage: true,
    fullScan: false,
    firstStage: false,
    score: 1,
    env: [ATLAS, ON_PREM],
    meta: 'stage',
    version: '4.1.11',
    apiVersions: [1],
    namespaces: [...ANY_NAMESPACE],
    description:
      'Merges the resulting documents into a collection, optionally overriding existing documents.',
    comment: `/**
 * into: The target collection.
 * on: Fields to  identify.
 * let: Defined variables.
 * whenMatched: Action for matching docs.
 * whenNotMatched: Action for non-matching docs.
 */
`,
    snippet: `{
  into: '\${1:string}',
  on: '\${2:string}',
  let: '\${3:specification(s)}',
  whenMatched: '\${4:string}',
  whenNotMatched: '\${5:string}'
}`,
  },
  {
    name: '$merge',
    value: '$merge',
    label: '$merge',
    outputStage: true,
    fullScan: false,
    firstStage: false,
    score: 1,
    env: [ADL],
    meta: 'stage',
    version: '4.0.0', // always available in ADL
    apiVersions: [1],
    namespaces: [...ANY_NAMESPACE],
    description:
      'Merges the resulting documents into a collection, optionally overriding existing documents.',
    comment: `/**
 * atlas: Location to write the documents from the aggregation pipeline.
 * on: Fields to identify.
 * let: Defined variables.
 * whenMatched: Action for matching docs.
 * whenNotMatched: Action for non-matching docs.
 */
`,
    snippet: `{
  into: {
    atlas: {
      clusterName: '\${1:atlasClusterName}',
      db: '\${2:database}',
      coll: '\${3:collection}',
      projectId: '\${4:optionalAtlasProjectId}'
    }
  },
  on: '\${5:identifier}',
  let: { \${6:specification(s)} },
  whenMatched: '\${7:string}',
  whenNotMatched: '\${8:string}'
}`,
  },
  {
    name: '$out',
    value: '$out',
    label: '$out',
    outputStage: true,
    fullScan: false,
    firstStage: false,
    score: 1,
    env: [ATLAS, ON_PREM],
    meta: 'stage',
    version: '2.2.0',
    apiVersions: [1],
    namespaces: [...ANY_NAMESPACE],
    description:
      'Writes the result of a pipeline to a new or existing collection.',
    comment: `/**
 * Provide the name of the output database and collection.
 */
`,
    // eslint-disable-next-line quotes
    snippet: `{
  db: '\${1:string}',
  coll: '\${2:string}',
  /*
  timeseries: {
    timeField: '\${3:field}',
    bucketMaxSpanSeconds: '\${4:number}',
    granularity: '\${5:granularity}'
  }
  */
}`,
  },
  {
    name: '$out',
    value: '$out',
    label: '$out',
    outputStage: true,
    fullScan: false,
    firstStage: false,
    score: 1,
    env: [ADL],
    meta: 'stage',
    version: '4.0.0', // always available in ADL
    apiVersions: [1],
    namespaces: [...ANY_NAMESPACE],
    description:
      'Writes the result of a pipeline to an Atlas cluster, S3 bucket, or Azure Blob Storage.',
    comment: `/**
 * Use any one of the following:
 * s3: Parameters to save the data to S3.
 * atlas: Parameters to save the data to Atlas. Example:
 * {
 *   atlas: {
 *     db: 'string',
 *     coll: 'string',
 *     projectId: 'string',
 *     clusterName: 'string'
 *   }
 * },
 * azure: Parameters to save the data to Azure. Example:
 * {
 *   azure: {
 *     serviceURL: 'string',
 *     containerName: 'string',
 *     region: 'string,
 *     filename: 'string',
 *     format: {
 *       name: 'string',
 *       maxFileSize: 'string',
 *       maxRowGroupSize: 'string',
 *       columnCompression: 'string'
 *     },
 *     errorMode: 'string'
 *   }
 * }
 */
`,
    snippet: `{
  s3: {
    bucket: '\${1:string}',
    region: '\${2:string}',
    filename: '\${3:string}',
    format: {
      name: '\${4:string}',
      maxFileSize: '\${5:bytes}',
      maxRowGroupSize: '\${6:string}',
      columnCompression: '\${7:string}'
    },
    errorMode: '\${8:string}'
  }
}`,
  },
  {
    name: '$project',
    value: '$project',
    label: '$project',
    outputStage: false,
    fullScan: false,
    firstStage: false,
    score: 1,
    env: [ATLAS, ADL, ON_PREM],
    meta: 'stage',
    version: '2.2.0',
    apiVersions: [1],
    namespaces: [...ANY_NAMESPACE],
    description:
      'Adds new field(s) to a document with a computed value, or reassigns an existing field(s) with a computed value. Unlike $addFields, $project can also remove fields.',
    comment: `/**
 * specifications: The fields to
 *   include or exclude.
 */
`,
    snippet: `{
  \${1:specification(s)}
}`,
  },
  {
    name: '$rankFusion',
    value: '$rankFusion',
    label: '$rankFusion',
    outputStage: false,
    fullScan: false,
    firstStage: false,
    score: 1,
    env: [ATLAS],
    meta: 'stage',
    version: '8.1.0',
    apiVersions: [],
    namespaces: [COLLECTION],
    description:
      'Combines multiple pipelines using reciprocal rank fusion to create hybrid search results.',
    comment: `/**
 * input.pipelines: Required. Map from name to input pipeline. Each pipeline must be a Ranked Selection Pipeline operating on the same collection. Minimum of one pipeline.
 * combination.weights: Optional. Map from pipeline name to numbers (non-negative). If unspecified, default weight is 1 for each pipeline.
 * scoreDetails: Optional. Default false. Set to true to include detailed scoring information in {$meta: "scoreDetails"} for debugging and tuning.
 */
`,
    snippet: `{
  input: {
    pipelines: {
      \${1:searchPipeline}: [
        {$search: {\${2:searchStage}}},
        {$limit: \${3:limit}}
      ],
      \${4:vectorPipeline}: [
        {$vectorSearch: {\${5:vectorSearchStage}}}
      ]
    }
  },
  combination: {
    weights: {
      \${6:searchPipeline}: \${7:number},
      \${8:vectorPipeline}: \${9:number}
    }
  },
  scoreDetails: \${10:false}
}`,
  },
  {
    name: '$redact',
    value: '$redact',
    label: '$redact',
    outputStage: false,
    fullScan: false,
    firstStage: false,
    score: 1,
    env: [ATLAS, ADL, ON_PREM],
    meta: 'stage',
    version: '2.6.0',
    apiVersions: [1],
    namespaces: [...ANY_NAMESPACE],
    description:
      'Restricts the content for each document based on information stored in the documents themselves',
    comment: `/**
 * expression: Any valid expression that
 * evaluates to $$DESCEND, $$PRUNE, or $$KEEP.
 */
`,
    snippet: `{
  \${1:expression}
}`,
  },
  {
    name: '$replaceRoot',
    value: '$replaceRoot',
    label: '$replaceRoot',
    outputStage: false,
    fullScan: false,
    firstStage: false,
    score: 1,
    env: [ATLAS, ADL, ON_PREM],
    meta: 'stage',
    version: '3.4.0',
    apiVersions: [1],
    namespaces: [...ANY_NAMESPACE],
    description: 'Replaces a document with the specified embedded document.',
    comment: `/**
 * replacementDocument: A document or string.
 */
`,
    snippet: `{
  newRoot: \${1:replacementDocument}
}`,
  },
  {
    name: '$replaceWith',
    value: '$replaceWith',
    label: '$replaceWith',
    outputStage: false,
    fullScan: false,
    firstStage: false,
    score: 1,
    env: [ATLAS, ADL, ON_PREM],
    meta: 'stage',
    version: '4.2.0',
    apiVersions: [1],
    namespaces: [...ANY_NAMESPACE],
    description: 'Replaces a document with the specified embedded document.',
    comment: `/**
 * replacementDocument: A document or string.
 */
`,
    snippet: `{
  newWith: \${1:replacementDocument}
}`,
  },
  {
    name: '$sample',
    value: '$sample',
    label: '$sample',
    outputStage: false,
    fullScan: false,
    firstStage: false,
    score: 1,
    env: [ATLAS, ADL, ON_PREM],
    meta: 'stage',
    version: '3.2.0',
    apiVersions: [1],
    namespaces: [...ANY_COLLECTION_NAMESPACE],
    description:
      'Randomly selects the specified number of documents from its input.',
    comment: `/**
 * size: The number of documents to sample.
 */
`,
    snippet: `{
  size: \${1:number}
}`,
  },
  {
    name: '$search',
    value: '$search',
    label: '$search',
    outputStage: false,
    fullScan: false,
    firstStage: false,
    score: 1,
    env: [ATLAS],
    meta: 'stage',
    version: '4.1.11',
    apiVersions: [],
    namespaces: [COLLECTION],
    description: 'Performs a full-text search on the specified field(s).',
    comment: `/**
 * index: The name of the Search index.
 * text: Analyzed search, with required fields of query and path, the analyzed field(s) to search. Use matchCriteria to match 'any' or 'all' query terms.
 * compound: Combines ops.
 * span: Find in text field regions.
 * exists: Test for presence of a field.
 * near: Find near number or date.
 * range: Find in numeric or date range.
 */
`,
    snippet: `{
  index: '\${1:string}',
  text: {
    query: '\${2:string}',
    path: '\${3:string}',
    matchCriteria: '\${4:any}',
  }
}`,
  },
  {
    name: '$searchMeta',
    value: '$searchMeta',
    label: '$searchMeta',
    outputStage: false,
    fullScan: false,
    firstStage: false,
    score: 1,
    env: [ATLAS],
    meta: 'stage',
    version: '4.4.9',
    apiVersions: [],
    namespaces: [COLLECTION],
    description:
      'Performs a full-text search on the specified field(s) and gets back only the generated search meta data from a query.',
    comment: `/**
 * index: The name of the Search index.
 * count: The count of the results.
 * facet: {
 *   operator: Analyzed search, with required fields of query and path, can either be replaced with the name of a valid operator.
 *   facets: {
 *     stringFacet: Narrows search results based on unique string values, with required fields of type and path.
 *     numberFacet: Narrows search results by breaking them up into separate ranges of numbers, with required fields of type, path, and boundaries.
 *     dateFacet: Narrows search results by breaking them up into separate ranges of dates, with required fields of type, path, and boundaries.
 *   }
 * }
 */
`,
    snippet: `{
  index: \${1:string},
  facet: {
    operator: {
      text: {
        query: \${2:string},
        path: \${3:string}
      }
    },
    facets: {
      \${4:stringFacet}: {
        type: \${5:string},
        path: \${6:string},
        numBuckets: \${7:integer}
      },
      numberFacet: {
        type: 'number',
        path: \${8:string},
        boundaries: [\${9:lowerbound}, \${10:upperbound}, ...],
        default: \${11:string}
      }
    }
  }
}`,
  },
  {
    name: '$set',
    value: '$set',
    label: '$set',
    outputStage: false,
    fullScan: false,
    firstStage: false,
    score: 1,
    env: [ATLAS, ADL, ON_PREM],
    meta: 'stage',
    version: '4.2.0',
    apiVersions: [1],
    namespaces: [...ANY_NAMESPACE],
    description:
      'Adds new fields to documents. $set outputs documents that contain all existing fields from the input documents and newly added fields.',
    comment: `/**
 * field: The field name
 * expression: The expression.
 */
`,
    snippet: `{
  \${1:field}: \${2:expression}
}`,
  },
  {
    name: '$setWindowFields',
    value: '$setWindowFields',
    label: '$setWindowFields',
    outputStage: false,
    fullScan: false,
    firstStage: false,
    score: 1,
    env: [ATLAS, ADL, ON_PREM],
    meta: 'stage',
    version: '5.0.0',
    apiVersions: [1],
    namespaces: [...ANY_NAMESPACE],
    description:
      'Capable of partitioning incoming data, and can apply one or more functions to defined windows within each partition.',
    comment: `/**
 * partitionBy: partitioning of data.
 * sortBy: fields to sort by.
 * output: {
 *   path: {
 *     function: The window function to compute over the given window.
 *     window: {
 *       documents: A number of documents before and after the current document.
 *       range: A range of possible values around the value in the current document's sortBy field.
 *       unit: Specifies the units for the window bounds.
 *     }
 *   }
 * }
 */
`,
    snippet: `{
  partitionBy: \${1:expression},
  sortBy: \${2:sortSpec},
  output: {
    \${3:path}: {
      \${4:function}: \${5:functionArgs},
      window: {
        documents: [\${6:lowerbound}, \${7:upperbound}],
        range: [\${8:lowerbound}, \${9:upperbound}],
        unit: \${10:string}
      }
    },
    \${11:path2}: ...
  }
}`,
  },
  {
    name: '$skip',
    value: '$skip',
    label: '$skip',
    outputStage: false,
    fullScan: false,
    firstStage: false,
    score: 1,
    env: [ATLAS, ADL, ON_PREM],
    meta: 'stage',
    version: '2.2.0',
    apiVersions: [1],
    namespaces: [...ANY_NAMESPACE],
    description:
      'Skips a specified number of documents before advancing to the next stage.',
    comment: `/**
 * Provide the number of documents to skip.
 */
`,
    snippet: '${1:number}',
  },
  {
    name: '$sort',
    value: '$sort',
    label: '$sort',
    outputStage: false,
    fullScan: false,
    firstStage: false,
    score: 1,
    env: [ATLAS, ADL, ON_PREM],
    meta: 'stage',
    version: '2.2.0',
    apiVersions: [1],
    namespaces: [...ANY_NAMESPACE],
    description:
      'Reorders the document stream by a specified sort key and direction.',
    comment: `/**
 * Provide any number of field/order pairs.
 */
`,
    snippet: `{
  \${1:field1}: \${2:sortOrder}
}`,
  },
  {
    name: '$sortByCount',
    value: '$sortByCount',
    label: '$sortByCount',
    outputStage: false,
    fullScan: false,
    firstStage: false,
    score: 1,
    env: [ATLAS, ADL, ON_PREM],
    meta: 'stage',
    version: '3.4.0',
    apiVersions: [1],
    namespaces: [...ANY_NAMESPACE],
    description:
      'Groups incoming documents based on the value of a specified expression, then computes the count of documents in each distinct group.',
    comment: `/**
 * expression: Grouping expression or string.
 */
`,
    snippet: `{
  \${1:expression}
}`,
  },
  {
    name: '$unionWith',
    value: '$unionWith',
    label: '$unionWith',
    outputStage: false,
    fullScan: false,
    firstStage: false,
    score: 1,
    env: [ATLAS, ADL, ON_PREM],
    meta: 'stage',
    version: '4.4.0',
    apiVersions: [1],
    namespaces: [...ANY_NAMESPACE],
    description: 'Perform a union with a pipeline on another collection.',
    comment: `/**
 * coll: The collection name.
 * pipeline: The pipeline on the other collection.
 */
`,
    snippet: `{
  coll: '\${1:coll}',
  pipeline: [\${2:pipeline}]
}`,
  },
  {
    name: '$unset',
    value: '$unset',
    label: '$unset',
    outputStage: false,
    fullScan: false,
    firstStage: false,
    score: 1,
    env: [ATLAS, ADL, ON_PREM],
    meta: 'stage',
    version: '4.2.0',
    apiVersions: [1],
    namespaces: [...ANY_NAMESPACE],
    description: 'Excludes fields from the result document.',
    comment: `/**
 * Provide the field name to exclude.
 * To exclude multiple fields, pass the field names in an array.
 */
`,
    // eslint-disable-next-line quotes
    snippet: `'\${1:string}'`,
  },
  {
    name: '$unwind',
    value: '$unwind',
    label: '$unwind',
    outputStage: false,
    fullScan: false,
    firstStage: false,
    score: 1,
    env: [ATLAS, ADL, ON_PREM],
    meta: 'stage',
    version: '2.2.0',
    apiVersions: [1],
    namespaces: [...ANY_NAMESPACE],
    description:
      'Outputs a new document for each element in a specified array. ',
    comment: `/**
 * path: Path to the array field.
 * includeArrayIndex: Optional name for index.
 * preserveNullAndEmptyArrays: Optional
 *   toggle to unwind null and empty values.
 */
`,
    snippet: `{
  path: \${1:path},
  includeArrayIndex: '\${2:string}',
  preserveNullAndEmptyArrays: \${3:boolean}
}`,
  },
  {
    name: '$vectorSearch',
    value: '$vectorSearch',
    label: '$vectorSearch',
    outputStage: false,
    fullScan: false,
    firstStage: true,
    score: 1,
    env: [ATLAS],
    meta: 'stage',
    version: '>=6.0.10 <7.0.0 || >=7.0.2',
    apiVersions: [],
    namespaces: [COLLECTION],
    description:
      'Performs a kNN search on embeddings in the specified field(s)',
    comment: `/**
 * queryVector: Array of numbers of BSON types \`int\` or \`double\` that represent the query vector. The array size must match the number of vector dimensions specified in the index for the field. (Required)
 * path: The field to search. (Required)
 * numCandidates: Number of nearest neighbors to use during the search. You can specify a number higher than the number of documents to return (\`limit\`) to increase accuracy. (Required)
 * index: Name of the Atlas Search index to use. (Required)
 * limit: Number (of type \`int\` only) of documents to return in the results. (Required)
 * filter: Any MongoDB Query Language (MQL) match expression that compares an indexed field with a boolean, number (not decimals), or string to use as a prefilter. (Optional)
 * exact: Choose between false for ANN (Approximate Nearest Neighbor) and true for ENN (Exact Nearest Neighbor). Defaults to false. (Optional)
 */
`,
    snippet: `{
  queryVector: [\${1:dimension1}, \${2:dimension2}, ...],
  path: \${3:string},
  numCandidates: \${4:numCandidates},
  index: \${5:string},
  limit: \${6:limit},
  filter: {\${7:expression}},
  exact: \${8:boolean}
}`,
  },
] as const;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
(function assertStageOperatorsSceme(_operators: readonly StageOperator[]) {
  // This will fail on compile time if stage operators are not matching the type
  // scheme while allowing us to export their types as const allowing for a
  // stricter type definitions in the user code
})(STAGE_OPERATORS);

/**
 * The list of stage operator names.
 */
const STAGE_OPERATOR_NAMES = STAGE_OPERATORS.map((op) => op.name);

const OUT_STAGES = STAGE_OPERATORS.filter(
  (stage) => stage.outputStage,
) as Extract<(typeof STAGE_OPERATORS)[number], { outputStage: true }>[];

const FULL_SCAN_STAGES = STAGE_OPERATORS.filter(
  (stage) => stage.fullScan,
) as Extract<(typeof STAGE_OPERATORS)[number], { fullScan: true }>[];

const REQUIRED_AS_FIRST_STAGE = STAGE_OPERATORS.filter(
  (stage) => stage.firstStage,
) as Extract<(typeof STAGE_OPERATORS)[number], { firstStage: true }>[];

export {
  STAGE_OPERATORS,
  STAGE_OPERATOR_NAMES,
  OUT_STAGES,
  FULL_SCAN_STAGES,
  REQUIRED_AS_FIRST_STAGE,
};
