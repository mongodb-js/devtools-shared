/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Example
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/sortByCount/#examples}
 */
function test0() {
  type exhibits = {
    _id: number;
    title: string;
    artist: string;
    year: number;
    tags: Array<string>;
  };

  const aggregation: schema.Pipeline<exhibits> = [
    { $unwind: { path: '$tags' } },
    { $sortByCount: '$tags' },
  ];
}
