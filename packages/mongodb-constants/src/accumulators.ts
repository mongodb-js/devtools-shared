/**
 * The accumulators.
 */
const ACCUMULATORS = [
  {
    name: '$accumulator',
    value: '$accumulator',
    score: 1,
    meta: 'accumulator',
    version: '4.4.0',
  },
  {
    name: '$addToSet',
    value: '$addToSet',
    score: 1,
    meta: 'accumulator',
    version: '2.2.0',
  },
  {
    name: '$avg',
    value: '$avg',
    score: 1,
    meta: 'accumulator',
    version: '2.2.0',
    projectVersion: '3.2.0',
  },
  {
    name: '$bottom',
    value: '$bottom',
    score: 1,
    meta: 'accumulator:bottom-n',
    version: '5.2.0',
  },
  {
    name: '$bottomN',
    value: '$bottomN',
    score: 1,
    meta: 'accumulator:bottom-n',
    version: '5.2.0',
  },
  {
    name: '$covariancePop',
    value: '$covariancePop',
    score: 1,
    meta: 'accumulator:window',
    version: '5.0.0',
  },
  {
    name: '$covarianceSamp',
    value: '$covarianceSamp',
    score: 1,
    meta: 'accumulator:window',
    version: '5.0.0',
  },
  {
    name: '$count',
    value: '$count',
    score: 1,
    meta: 'accumulator',
    version: '5.0.0',
  },
  {
    name: '$derivative',
    value: '$derivative',
    score: 1,
    meta: 'accumulator:window',
    version: '5.0.0',
  },
  {
    name: '$denseRank',
    value: '$denseRank',
    score: 1,
    meta: 'accumulator:window',
    version: '5.0.0',
  },
  {
    name: '$documentNumber',
    value: '$documentNumber',
    score: 1,
    meta: 'accumulator:window',
    version: '5.0.0',
  },
  {
    name: '$expMovingAvg',
    value: '$expMovingAvg',
    score: 1,
    meta: 'accumulator:window',
    version: '5.0.0',
  },
  {
    name: '$first',
    value: '$first',
    score: 1,
    meta: 'accumulator',
    version: '2.2.0',
  },
  {
    name: '$firstN',
    value: '$firstN',
    score: 1,
    meta: 'accumulator',
    version: '5.1.0',
  },
  {
    name: '$integral',
    value: '$integral',
    score: 1,
    meta: 'accumulator:window',
    version: '5.0.0',
  },
  {
    name: '$last',
    value: '$last',
    score: 1,
    meta: 'accumulator',
    version: '2.2.0',
  },
  {
    name: '$lastN',
    value: '$lastN',
    score: 1,
    meta: 'accumulator',
    version: '5.2.0',
  },
  {
    name: '$max',
    value: '$max',
    score: 1,
    meta: 'accumulator',
    version: '2.2.0',
    projectVersion: '3.2.0',
  },
  {
    name: '$maxN',
    value: '$maxN',
    score: 1,
    meta: 'accumulator',
    version: '5.2.0',
  },
  {
    name: '$median',
    value: '$median',
    score: 1,
    meta: 'accumulator',
    version: '7.0.0',
  },
  {
    name: '$min',
    value: '$min',
    score: 1,
    meta: 'accumulator',
    version: '2.2.0',
    projectVersion: '3.2.0',
  },
  {
    name: '$minN',
    value: '$minN',
    score: 1,
    meta: 'accumulator',
    version: '5.2.0',
  },
  {
    name: '$percentile',
    value: '$percentile',
    score: 1,
    meta: 'accumulator',
    version: '7.0.0',
  },
  {
    name: '$push',
    value: '$push',
    score: 1,
    meta: 'accumulator',
    version: '2.2.0',
  },
  {
    name: '$rank',
    value: '$rank',
    score: 1,
    meta: 'accumulator:window',
    version: '5.0.0',
  },
  {
    name: '$stdDevPop',
    value: '$stdDevPop',
    score: 1,
    meta: 'accumulator',
    version: '3.2.0',
    projectVersion: '3.2.0',
  },
  {
    name: '$stdDevSamp',
    value: '$stdDevSamp',
    score: 1,
    meta: 'accumulator',
    version: '3.2.0',
    projectVersion: '3.2.0',
  },
  {
    name: '$shift',
    value: '$shift',
    score: 1,
    meta: 'accumulator:window',
    version: '5.0.0',
  },
  {
    name: '$sum',
    value: '$sum',
    score: 1,
    meta: 'accumulator',
    version: '2.2.0',
    projectVersion: '3.2.0',
  },
  {
    name: '$top',
    value: '$top',
    score: 1,
    meta: 'accumulator:top-n',
    version: '5.2.0',
  },
  {
    name: '$topN',
    value: '$topN',
    score: 1,
    meta: 'accumulator:top-n',
    version: '5.2.0',
  },
  {
    name: '$locf',
    value: '$locf',
    score: 1,
    meta: 'accumulator:window',
    version: '5.3.0',
  },
  {
    name: '$linearFill',
    value: '$linearFill',
    score: 1,
    meta: 'accumulator:window',
    version: '5.3.0',
  },
] as const;

export { ACCUMULATORS };
