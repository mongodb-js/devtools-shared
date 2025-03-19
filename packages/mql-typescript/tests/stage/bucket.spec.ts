import * as schema from '../../out/schema';

type Artists = {
  _id: number;
  last_name: string;
  first_name: string;
  year_born: number;
  year_died: number;
  nationality: string;
};

const stage1: schema.StageOperators.$bucket<Artists> = {
  $bucket: {
    groupBy: '$year_born', // Field to group by
    boundaries: [1840, 1850, 1860, 1870, 1880], // Boundaries for the buckets
    default: 'Other', // Bucket ID for documents which do not fall into a bucket
    output: {
      // Output for each bucket
      count: { $sum: 1 },
      artists: {
        $push: {
          name: { $concat: ['$first_name', ' ', '$last_name'] },
          year_born: '$year_born',
        },
      },
    },
  },
};

const stage2: schema.StageOperators.$match<Artists & { count: number }> = {
  $match: { count: { $gt: 3 } },
};

const aggregation: schema.Pipeline<any> = [stage1, stage2];
