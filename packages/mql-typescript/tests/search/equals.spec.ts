import * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Boolean
 * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/equals/#boolean-examples}
 */
function test0() {
  type users = {
    _id: bson.ObjectId;
    name: string;
    verified_user: boolean;
    account: {
      new_user: boolean;
      active_user: boolean;
    };
    teammates: Array<bson.ObjectId>;
    region: string;
    account_created: Date;
    employee_number: number;
    uuid: bson.Binary;
    job_title: null | string;
  };

  const aggregation: schema.Pipeline<users> = [
    { $search: { equals: { path: 'verified_user', value: true } } },
    { $project: { name: 1, _id: 0, score: { $meta: 'searchScore' } } },
  ];
}

/**
 * ObjectId
 * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/equals/#objectid-example}
 */
function test1() {
  type users = {
    _id: bson.ObjectId;
    name: string;
    verified_user: boolean;
    account: {
      new_user: boolean;
      active_user: boolean;
    };
    teammates: Array<bson.ObjectId>;
    region: string;
    account_created: Date;
    employee_number: number;
    uuid: bson.Binary;
    job_title: null | string;
  };

  const aggregation: schema.Pipeline<users> = [
    {
      $search: {
        equals: {
          path: 'teammates',
          value: bson.ObjectId.createFromHexString('5a9427648b0beebeb69589a1'),
        },
      },
    },
  ];
}

/**
 * Date
 * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/equals/#date-example}
 */
function test2() {
  type users = {
    _id: bson.ObjectId;
    name: string;
    verified_user: boolean;
    account: {
      new_user: boolean;
      active_user: boolean;
    };
    teammates: Array<bson.ObjectId>;
    region: string;
    account_created: Date;
    employee_number: number;
    uuid: bson.Binary;
    job_title: null | string;
  };

  const aggregation: schema.Pipeline<users> = [
    {
      $search: {
        equals: {
          path: 'account_created',
          value: new Date('2022-05-04T05:01:08.000Z'),
        },
      },
    },
  ];
}

/**
 * Number
 * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/equals/#number-example}
 */
function test3() {
  type users = {
    _id: bson.ObjectId;
    name: string;
    verified_user: boolean;
    account: {
      new_user: boolean;
      active_user: boolean;
    };
    teammates: Array<bson.ObjectId>;
    region: string;
    account_created: Date;
    employee_number: number;
    uuid: bson.Binary;
    job_title: null | string;
  };

  const aggregation: schema.Pipeline<users> = [
    { $search: { equals: { path: 'employee_number', value: 259 } } },
  ];
}

/**
 * String
 * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/equals/#string-example}
 */
function test4() {
  type users = {
    _id: bson.ObjectId;
    name: string;
    verified_user: boolean;
    account: {
      new_user: boolean;
      active_user: boolean;
    };
    teammates: Array<bson.ObjectId>;
    region: string;
    account_created: Date;
    employee_number: number;
    uuid: bson.Binary;
    job_title: null | string;
  };

  const aggregation: schema.Pipeline<users> = [
    { $search: { equals: { path: 'name', value: 'jim hall' } } },
  ];
}

/**
 * UUID
 * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/equals/#uuid-example}
 */
function test5() {
  type users = {
    _id: bson.ObjectId;
    name: string;
    verified_user: boolean;
    account: {
      new_user: boolean;
      active_user: boolean;
    };
    teammates: Array<bson.ObjectId>;
    region: string;
    account_created: Date;
    employee_number: number;
    uuid: bson.Binary;
    job_title: null | string;
  };

  const aggregation: schema.Pipeline<users> = [
    {
      $search: {
        equals: {
          path: 'uuid',
          value: bson.Binary.createFromBase64('+sMiYLURTGmEhaK+W33ang==', 4),
        },
      },
    },
  ];
}

/**
 * Null
 * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/equals/#null-example}
 */
function test6() {
  type users = {
    _id: bson.ObjectId;
    name: string;
    verified_user: boolean;
    account: {
      new_user: boolean;
      active_user: boolean;
    };
    teammates: Array<bson.ObjectId>;
    region: string;
    account_created: Date;
    employee_number: number;
    uuid: bson.Binary;
    job_title: null | string;
  };

  const aggregation: schema.Pipeline<users> = [
    { $search: { equals: { path: 'job_title', value: null } } },
  ];
}
