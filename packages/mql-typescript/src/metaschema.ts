import { z } from 'zod';

export const Operator = z
  .object({
    name: z.string().regex(new RegExp('^\\$?[a-z][a-zA-Z0-9]*$')),
    link: z.string().url().regex(new RegExp('^https://')),
    type: z.array(
      z.enum([
        'accumulator',
        'stage',
        'query',
        'fieldQuery',
        'filter',
        'window',
        'geometry',
        'switchBranch',
        'resolvesToAny',
        'resolvesToNumber',
        'resolvesToDouble',
        'resolvesToString',
        'resolvesToObject',
        'resolvesToArray',
        'resolvesToBinData',
        'resolvesToObjectId',
        'resolvesToBool',
        'resolvesToDate',
        'resolvesToNull',
        'resolvesToRegex',
        'resolvesToJavascript',
        'resolvesToInt',
        'resolvesToTimestamp',
        'resolvesToLong',
        'resolvesToDecimal',
        'searchOperator',
      ]),
    ),
    encode: z.enum(['array', 'object', 'single']),
    description: z.string(),
    wrapObject: z.boolean().default(true),
    arguments: z
      .array(
        z
          .object({
            name: z.string().regex(new RegExp('^([_$]?[a-z][a-zA-Z0-9]*|N)$')),
            type: z.array(
              z.enum([
                'accumulator',
                'query',
                'fieldQuery',
                'pipeline',
                'window',
                'expression',
                'expressionMap',
                'geometry',
                'fieldPath',
                'unprefixedFieldPath',
                'timeUnit',
                'sortSpec',
                'any',
                'granularity',
                'fullDocument',
                'fullDocumentBeforeChange',
                'accumulatorPercentile',
                'whenMatched',
                'whenNotMatched',
                'outCollection',
                'range',
                'sortBy',
                'geoPoint',
                'resolvesToNumber',
                'numberFieldPath',
                'number',
                'resolvesToDouble',
                'doubleFieldPath',
                'double',
                'resolvesToString',
                'stringFieldPath',
                'string',
                'resolvesToObject',
                'objectFieldPath',
                'object',
                'resolvesToArray',
                'arrayFieldPath',
                'array',
                'resolvesToBinData',
                'binDataFieldPath',
                'binData',
                'resolvesToObjectId',
                'objectIdFieldPath',
                'objectId',
                'resolvesToBool',
                'boolFieldPath',
                'bool',
                'resolvesToDate',
                'dateFieldPath',
                'date',
                'resolvesToNull',
                'nullFieldPath',
                'null',
                'resolvesToRegex',
                'regexFieldPath',
                'regex',
                'resolvesToJavascript',
                'javascriptFieldPath',
                'javascript',
                'resolvesToInt',
                'intFieldPath',
                'int',
                'resolvesToTimestamp',
                'timestampFieldPath',
                'timestamp',
                'resolvesToLong',
                'longFieldPath',
                'long',
                'resolvesToDecimal',
                'decimalFieldPath',
                'decimal',
                'searchPath',
                'searchScore',
                'searchOperator',
              ]),
            ),
            description: z.string().optional(),
            optional: z.boolean().optional(),
            valueMin: z.number().optional(),
            valueMax: z.number().optional(),
            variadic: z.enum(['array', 'object']).optional(),
            variadicMin: z.number().int().gte(0).optional(),
            default: z
              .union([z.array(z.any()), z.boolean(), z.number(), z.string()])
              .optional(),
            mergeObject: z.boolean().default(false),
            syntheticVariables: z
              .array(
                z.object({
                  name: z.string().regex(new RegExp('^[$]?[a-zA-Z0-9]*$')),
                  description: z.string().optional(),
                }),
              )
              .optional(),
          })
          .strict(),
      )
      .optional(),
    tests: z
      .array(
        z
          .object({
            name: z.string().optional(),
            link: z.string().url().regex(new RegExp('^https://')).optional(),
            pipeline: z.array(z.record(z.any())).optional(),
            schema: z
              .union([
                z.string(),
                z.record(
                  z.record(
                    z
                      .object({
                        types: z.array(
                          z.union([
                            z
                              .object({
                                bsonType: z.enum([
                                  'Array',
                                  'Binary',
                                  'Boolean',
                                  'Code',
                                  'CodeWScope',
                                  'Date',
                                  'Decimal128',
                                  'Double',
                                  'Int32',
                                  'Int64',
                                  'Long',
                                  'MaxKey',
                                  'MinKey',
                                  'Null',
                                  'ObjectId',
                                  'BSONRegExp',
                                  'String',
                                  'BSONSymbol',
                                  'Timestamp',
                                  'Undefined',
                                  'Document',
                                  'Number',
                                ]),
                              })
                              .strict(),
                            z
                              .object({
                                bsonType: z.literal('Array'),
                                types: z.array(z.record(z.any())),
                              })
                              .strict(),
                            z
                              .object({
                                bsonType: z.literal('Document'),
                                fields: z.record(z.record(z.any())),
                              })
                              .strict(),
                          ]),
                        ),
                      })
                      .strict(),
                  ),
                ),
              ])
              .optional(),
          })
          .strict(),
      )
      .optional(),
  })
  .strict();
