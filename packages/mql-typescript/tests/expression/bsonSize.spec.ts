import * as schema from '../../out/schema';

import * as bson from 'bson';

/**
 * Return Sizes of Documents
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/bsonSize/#return-sizes-of-documents}
 */
function test0() {
  type employees = {
    _id: number;
    name: string;
    email: string;
    position: string;
    current_task: {
      project_id: number;
      project_name: string;
      project_duration: number;
      hours: number;
      notes: string;
    } | null;
  };

  const aggregation: schema.Pipeline<employees> = [
    { $project: { name: 1, object_size: { $bsonSize: '$$ROOT' } } },
  ];
}

/**
 * Return Combined Size of All Documents in a Collection
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/bsonSize/#return-combined-size-of-all-documents-in-a-collection}
 */
function test1() {
  type employees = {
    _id: number;
    name: string;
    email: string;
    position: string;
    current_task: {
      project_id: number;
      project_name: string;
      project_duration: number;
      hours: number;
      notes: string;
    } | null;
  };

  const aggregation: schema.Pipeline<employees> = [
    {
      $group: {
        _id: null,
        combined_object_size: { $sum: { $bsonSize: '$$ROOT' } },
      },
    },
  ];
}

/**
 * Return Document with Largest Specified Field
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/bsonSize/#return-document-with-largest-specified-field}
 */
function test2() {
  type employees = {
    _id: number;
    name: string;
    email: string;
    position: string;
    current_task: {
      project_id: number;
      project_name: string;
      project_duration: number;
      hours: number;
      notes: string;
    } | null;
  };

  const aggregation: schema.Pipeline<employees> = [
    {
      $project: {
        name: '$name',
        task_object_size: { $bsonSize: '$current_task' },
      },
    },
    { $sort: { task_object_size: -1 } },
    { $limit: 1 },
  ];
}
