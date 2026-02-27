import { z } from 'zod';

export const Operator = z
  .object({
    name: z.string().regex(new RegExp('^\\$?[a-z][a-zA-Z0-9]*$')),
    minVersion: z
      .string()
      .regex(new RegExp('^[0-9]+\\.[0-9]+(\\.[1-9][0-9]*)?$')),
    link: z.string().url().regex(new RegExp('^https://')),
    generic: z.array(z.string()).optional(),
    type: z.array(
      z.union([
        z.enum([
          'pipeline',
          'accumulator',
          'stage',
          'updateStage',
          'query',
          'update',
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
        z.object({
          name: z.enum([
            'pipeline',
            'accumulator',
            'stage',
            'updateStage',
            'query',
            'update',
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
          generic: z.string().optional(),
        }),
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
            minVersion: z
              .string()
              .regex(new RegExp('^[0-9]+\\.[0-9]+(\\.[1-9][0-9]*)?$'))
              .optional(),
            type: z.array(
              z.union([
                z.enum([
                  'stage',
                  'updateStage',
                  'accumulator',
                  'query',
                  'fieldQuery',
                  'pipeline',
                  'updatePipeline',
                  'window',
                  'expression',
                  'geometry',
                  'unprefixedFieldPath',
                  'timeUnit',
                  'sortSpec',
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
                  'resolvesToAny',
                  'fieldPath',
                  'any',
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
                  'bitwiseOperation',
                  'searchOperator',
                ]),
                z.object({
                  name: z.enum([
                    'stage',
                    'updateStage',
                    'accumulator',
                    'query',
                    'fieldQuery',
                    'pipeline',
                    'updatePipeline',
                    'window',
                    'expression',
                    'geometry',
                    'unprefixedFieldPath',
                    'timeUnit',
                    'sortSpec',
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
                    'resolvesToAny',
                    'fieldPath',
                    'any',
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
                    'bitwiseOperation',
                    'searchOperator',
                  ]),
                  generic: z.string().optional(),
                }),
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
                  name: z.string().regex(new RegExp('^[$]?[a-zA-Z0-9]+$')),
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
        z.union([
          z
            .object({
              name: z.string(),
              link: z.string().url().regex(new RegExp('^https://')).optional(),
              pipeline: z.array(z.record(z.any())),
              schema: z
                .union([
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
                  z.string(),
                ])
                .optional(),
            })
            .strict(),
          z
            .object({
              name: z.string(),
              link: z.string().url().regex(new RegExp('^https://')).optional(),
              filter: z.record(z.any()),
              update: z.record(z.any()),
              schema: z
                .union([
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
                  z.string(),
                ])
                .optional(),
            })
            .strict(),
        ]),
      )
      .optional(),
  })
  .strict();
