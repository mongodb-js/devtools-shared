/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Single Value Field Match
 * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/in/#examples}
 */
function test0() {
  type customers = {
    _id: bson.ObjectId;
    username: string;
    name: string;
    address: string;
    birthdate: {
      $date: bson.Double | number;
    };
    email: string;
    accounts: Array<bson.Double | number>;
    tier_and_details: {
      b5f19cb532fa436a9be2cf1d7d1cac8a: {
        tier: string;
        benefits: Array<string>;
        active: boolean;
        id: string;
      };
    };
  };

  const aggregation: schema.Pipeline<customers> = [
    {
      $search: {
        in: {
          path: 'birthdate',
          value: [
            new Date('1977-03-02T02:20:31.000Z'),
            new Date('1977-03-01T00:00:00.000Z'),
            new Date('1977-05-06T21:57:35.000Z'),
          ],
        },
      },
    },
    { $project: { _id: 0, name: 1, birthdate: 1 } },
  ];
}

/**
 * Array Value Field Match
 * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/in/#examples}
 */
function test1() {
  type customers = {
    _id: bson.ObjectId;
    username: string;
    name: string;
    address: string;
    birthdate: {
      $date: bson.Double | number;
    };
    email: string;
    accounts: Array<bson.Double | number>;
    tier_and_details: {
      b5f19cb532fa436a9be2cf1d7d1cac8a: {
        tier: string;
        benefits: Array<string>;
        active: boolean;
        id: string;
      };
    };
  };

  const aggregation: schema.Pipeline<customers> = [
    { $search: { in: { path: 'accounts', value: [371138, 371139, 371140] } } },
    { $project: { _id: 0, name: 1, accounts: 1 } },
  ];
}

/**
 * Compound Query Match
 * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/in/#examples}
 */
function test2() {
  type customers = {
    _id: bson.ObjectId;
    username: string;
    name: string;
    address: string;
    birthdate: {
      $date: bson.Double | number;
    };
    email: string;
    accounts: Array<bson.Double | number>;
    tier_and_details: {
      b5f19cb532fa436a9be2cf1d7d1cac8a: {
        tier: string;
        benefits: Array<string>;
        active: boolean;
        id: string;
      };
    };
  };

  const aggregation: schema.Pipeline<customers> = [
    {
      $search: {
        compound: {
          must: [
            {
              in: {
                path: 'name',
                value: ['james sanchez', 'jennifer lawrence'],
              },
            },
          ],
          should: [
            {
              in: {
                path: '_id',
                value: [
                  bson.ObjectId.createFromHexString('5ca4bbcea2dd94ee58162a72'),
                  bson.ObjectId.createFromHexString('5ca4bbcea2dd94ee58162a91'),
                ],
              },
            },
          ],
        },
      },
    },
    { $limit: 5 },
    { $project: { _id: 1, name: 1, score: { $meta: 'searchScore' } } },
  ];
}
