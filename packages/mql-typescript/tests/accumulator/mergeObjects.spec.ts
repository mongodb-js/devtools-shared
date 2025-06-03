import * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * $mergeObjects as an Accumulator
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/mergeObjects/#-mergeobjects-as-an-accumulator}
 */
function test0() {
  type sales = {
    _id: number;
    year: number;
    item: string;
    quantity: {
      '2017Q1': number;
      '2017Q2': number;
      '2016Q1': number;
      '2016Q2': number;
      '2016Q3': number;
      '2016Q4': number;
    };
  };

  const aggregation: schema.Pipeline<sales> = [
    { $group: { _id: '$item', mergedSales: { $mergeObjects: '$quantity' } } },
  ];
}
