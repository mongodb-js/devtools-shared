/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Use $mod to Select Documents
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/mod/#use--mod-to-select-documents}
 */
function test0() {
  type inventory = {
    _id: number;
    item: string;
    qty: number;
  };

  const aggregation: schema.Pipeline<inventory> = [
    { $match: { qty: { $mod: [4, 0] } } },
  ];
}

/**
 * Floating Point Arguments
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/mod/#floating-point-arguments}
 */
function test1() {
  type inventory = {
    _id: number;
    item: string;
    qty: number;
  };

  const aggregation: schema.Pipeline<inventory> = [
    { $match: { qty: { $mod: [4, 0] } } },
    { $match: { qty: { $mod: [4.5, 0] } } },
    { $match: { qty: { $mod: [4.99, 0] } } },
  ];
}
