import * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Example
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/ln/#example}
 */
function test0() {
  type sales = {
    _id: number;
    year: string;
    sales: number;
  };

  const aggregation: schema.Pipeline<sales> = [
    { $project: { x: '$year', y: { $ln: '$sales' } } },
  ];
}
