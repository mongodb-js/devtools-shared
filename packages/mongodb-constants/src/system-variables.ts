/**
 * System Variables.
 * https://www.mongodb.com/docs/manual/reference/aggregation-variables/#variables-in-aggregation-expressions
 */
const SYSTEM_VARIABLES = [
  {
    name: '$$NOW',
    value: '$$NOW',
    score: 1,
    meta: 'variable:system',
    version: '4.2.0',
    description:
      'A variable that returns the current datetime value. NOW returns the same value for all members of the deployment and remains the same throughout all stages of the aggregation pipeline.',
  },
  {
    name: '$$CLUSTER_TIME',
    value: '$$CLUSTER_TIME',
    score: 1,
    meta: 'variable:system',
    version: '4.2.0',
    description:
      'A variable that returns the current timestamp value. CLUSTER_TIME is only available on replica sets and sharded clusters. CLUSTER_TIME returns the same value for all members of the deployment and remains the same throughout all stages of the pipeline.',
  },
  {
    name: '$$ROOT',
    value: '$$ROOT',
    score: 1,
    meta: 'variable:system',
    version: '2.4.0',
    description:
      'References the root document, i.e. the top-level document, currently being processed in the aggregation pipeline stage.',
  },
  {
    name: '$$CURRENT',
    value: '$$CURRENT',
    score: 1,
    meta: 'variable:system',
    version: '2.4.0',
    description:
      'References the start of the field path being processed in the aggregation pipeline stage. Unless documented otherwise, all stages start with CURRENT the same as ROOT. CURRENT is modifiable. However, since `$<field>` is equivalent to `$$CURRENT.<field>`, rebinding CURRENT changes the meaning of `$` accesses.',
  },
  {
    name: '$$REMOVE',
    value: '$$REMOVE',
    score: 1,
    meta: 'variable:system',
    version: '3.6.0',
    description:
      'A variable which evaluates to the missing value. Allows for the conditional exclusion of fields. In a `$project`, a field set to the variable REMOVE is excluded from the output.',
  },
  {
    name: '$$DESCEND',
    value: '$$DESCEND',
    score: 1,
    meta: 'variable:system',
    version: '3.0.0',
    description: 'One of the allowed results of a `$redact` expression.',
  },
  {
    name: '$$PRUNE',
    value: '$$PRUNE',
    score: 1,
    meta: 'variable:system',
    version: '3.0.0',
    description: 'One of the allowed results of a `$redact` expression.',
  },
  {
    name: '$$KEEP',
    value: '$$KEEP',
    score: 1,
    meta: 'variable:system',
    version: '3.0.0',
    description: 'One of the allowed results of a `$redact` expression.',
  },
  {
    name: '$$SEARCH_META',
    value: '$$SEARCH_META',
    score: 1,
    meta: 'variable:system',
    version: '5.0.0',
    description:
      'A variable that stores the metadata results of an Atlas Search query. In all supported aggregation pipeline stages, a field set to the variable SEARCH_META returns the metadata results for the query. For an example of its usage, see Atlas Search facet and count.',
  },
  {
    name: '$$USER_ROLES',
    value: '$$USER_ROLES',
    score: 1,
    meta: 'variable:system',
    version: '7.0.0',
    description:
      'A variable that stores the role names of the authenticated user running the command.',
  },
];

export { SYSTEM_VARIABLES };
