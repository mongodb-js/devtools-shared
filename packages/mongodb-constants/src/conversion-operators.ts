/**
 * The conversion operators.
 */
const CONVERSION_OPERATORS = [
  {
    name: '$convert',
    value: '$convert',
    score: 1,
    meta: 'conv',
    version: '3.7.2',
  },
  {
    name: '$ltrim',
    value: '$ltrim',
    score: 1,
    meta: 'accumulator',
    version: '3.7.2',
  },
  {
    name: '$rtrim',
    value: '$rtrim',
    score: 1,
    meta: 'accumulator',
    version: '3.7.2',
  },
  {
    name: '$toBool',
    value: '$toBool',
    score: 1,
    meta: 'conv',
    version: '3.7.2',
  },
  {
    name: '$toDate',
    value: '$toDate',
    score: 1,
    meta: 'conv',
    version: '3.7.2',
  },
  {
    name: '$toDecimal',
    value: '$toDecimal',
    score: 1,
    meta: 'conv',
    version: '3.7.2',
  },
  {
    name: '$toDouble',
    value: '$toDouble',
    score: 1,
    meta: 'conv',
    version: '3.7.2',
  },
  {
    name: '$toInt',
    value: '$toInt',
    score: 1,
    meta: 'conv',
    version: '3.7.2',
  },
  {
    name: '$toLong',
    value: '$toLong',
    score: 1,
    meta: 'conv',
    version: '3.7.2',
  },
  {
    name: '$toObjectId',
    value: '$toObjectId',
    score: 1,
    meta: 'conv',
    version: '3.7.2',
  },
  {
    name: '$toString',
    value: '$toString',
    score: 1,
    meta: 'conv',
    version: '3.7.2',
  },
  {
    name: '$trim',
    value: '$trim',
    score: 1,
    meta: 'accumulator',
    version: '3.7.2',
  },
] as const;

export { CONVERSION_OPERATORS };
