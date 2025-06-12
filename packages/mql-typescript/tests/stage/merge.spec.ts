/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * On-Demand Materialized View Initial Creation
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/merge/#on-demand-materialized-view--initial-creation}
 */
function test0() {
  type salaries = {
    _id: number;
    employee: string;
    dept: string;
    salary: number;
    fiscal_year: number;
  };

  const aggregation: schema.Pipeline<salaries> = [
    {
      $group: {
        _id: { fiscal_year: '$fiscal_year', dept: '$dept' },
        salaries: { $sum: '$salary' },
      },
    },
    {
      $merge: {
        into: { db: 'reporting', coll: 'budgets' },
        on: '_id',
        whenMatched: 'replace',
        whenNotMatched: 'insert',
      },
    },
  ];
}

/**
 * On-Demand Materialized View Update Replace Data
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/merge/#on-demand-materialized-view--update-replace-data}
 */
function test1() {
  type salaries = {
    _id: number;
    employee: string;
    dept: string;
    salary: number;
    fiscal_year: number;
  };

  const aggregation: schema.Pipeline<salaries> = [
    { $match: { fiscal_year: { $gte: 2019 } } },
    {
      $group: {
        _id: { fiscal_year: '$fiscal_year', dept: '$dept' },
        salaries: { $sum: '$salary' },
      },
    },
    {
      $merge: {
        into: { db: 'reporting', coll: 'budgets' },
        on: '_id',
        whenMatched: 'replace',
        whenNotMatched: 'insert',
      },
    },
  ];
}

/**
 * Only Insert New Data
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/merge/#only-insert-new-data}
 */
function test2() {
  type salaries = {
    _id: number;
    employee: string;
    dept: string;
    salary: number;
    fiscal_year: number;
  };

  const aggregation: schema.Pipeline<salaries> = [
    { $match: { fiscal_year: 2019 } },
    {
      $group: {
        _id: { fiscal_year: '$fiscal_year', dept: '$dept' },
        employees: { $push: '$employee' },
      },
    },
    {
      $project: {
        _id: 0,
        dept: '$_id.dept',
        fiscal_year: '$_id.fiscal_year',
        employees: 1,
      },
    },
    {
      $merge: {
        into: { db: 'reporting', coll: 'orgArchive' },
        on: ['dept', 'fiscal_year'],
        whenMatched: 'fail',
      },
    },
  ];
}

/**
 * Merge Results from Multiple Collections
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/merge/#merge-results-from-multiple-collections}
 */
function test3() {
  type purchaseorders = {
    _id: number;
    quarter: string;
    region: string;
    qty: number;
    reportDate: Date;
  };

  const aggregation: schema.Pipeline<purchaseorders> = [
    { $group: { _id: '$quarter', purchased: { $sum: '$qty' } } },
    {
      $merge: {
        into: 'quarterlyreport',
        on: '_id',
        whenMatched: 'merge',
        whenNotMatched: 'insert',
      },
    },
  ];
}

/**
 * Use the Pipeline to Customize the Merge
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/merge/#use-the-pipeline-to-customize-the-merge}
 */
function test4() {
  type votes = {
    date: Date;
    thumbsup: number;
    thumbsdown: number;
  };

  const aggregation: schema.Pipeline<votes> = [
    {
      $match: {
        date: {
          $gte: new Date('2019-05-07T00:00:00.000Z'),
          $lt: new Date('2019-05-08T00:00:00.000Z'),
        },
      },
    },
    {
      $project: {
        _id: { $dateToString: { format: '%Y-%m', date: '$date' } },
        thumbsup: 1,
        thumbsdown: 1,
      },
    },
    {
      $merge: {
        into: 'monthlytotals',
        on: '_id',
        whenMatched: [
          {
            $addFields: {
              thumbsup: { $add: ['$thumbsup', '$$new.thumbsup'] },
              thumbsdown: { $add: ['$thumbsdown', '$$new.thumbsdown'] },
            },
          },
        ],
        whenNotMatched: 'insert',
      },
    },
  ];
}

/**
 * Use Variables to Customize the Merge
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/merge/#use-variables-to-customize-the-merge}
 */
function test5() {
  type salaries = {
    _id: number;
    employee: string;
    dept: string;
    salary: number;
    fiscal_year: number;
  };

  const aggregation: schema.Pipeline<salaries> = [
    {
      $merge: {
        into: 'cakeSales',
        let: { year: '2020' },
        whenMatched: [{ $addFields: { salesYear: '$$year' } }],
      },
    },
  ];
}
