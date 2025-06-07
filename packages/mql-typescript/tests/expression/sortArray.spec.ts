import * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Sort on a Field
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/sortArray/#sort-on-a-field}
 */
function test0() {
  type engineers = {
    team: Array<{
      name: string;
      age: number;
      address: {
        street: string;
        city: string;
      };
    }>;
  };

  const aggregation: schema.Pipeline<engineers> = [
    {
      $project: {
        _id: 0,
        result: { $sortArray: { input: '$team', sortBy: { name: 1 } } },
      },
    },
  ];
}

/**
 * Sort on a Subfield
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/sortArray/#sort-on-a-subfield}
 */
function test1() {
  type engineers = {
    team: Array<{
      name: string;
      age: number;
      address: {
        street: string;
        city: string;
      };
    }>;
  };

  const aggregation: schema.Pipeline<engineers> = [
    {
      $project: {
        _id: 0,
        result: {
          $sortArray: { input: '$team', sortBy: { 'address.city': -1 } },
        },
      },
    },
  ];
}

/**
 * Sort on Multiple Fields
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/sortArray/#sort-on-multiple-fields}
 */
function test2() {
  type engineers = {
    team: Array<{
      name: string;
      age: number;
      address: {
        street: string;
        city: string;
      };
    }>;
  };

  const aggregation: schema.Pipeline<engineers> = [
    {
      $project: {
        _id: 0,
        result: {
          $sortArray: { input: '$team', sortBy: { age: -1, name: 1 } },
        },
      },
    },
  ];
}

/**
 * Sort an Array of Integers
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/sortArray/#sort-an-array-of-integers}
 */
function test3() {
  type engineers = {
    team: Array<{
      name: string;
      age: number;
      address: {
        street: string;
        city: string;
      };
    }>;
  };

  const aggregation: schema.Pipeline<engineers> = [
    {
      $project: {
        _id: 0,
        result: { $sortArray: { input: [1, 4, 1, 6, 12, 5], sortBy: 1 } },
      },
    },
  ];
}

/**
 * Sort on Mixed Type Fields
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/sortArray/#sort-on-mixed-type-fields}
 */
function test4() {
  type engineers = {
    team: Array<{
      name: string;
      age: number;
      address: {
        street: string;
        city: string;
      };
    }>;
  };

  const aggregation: schema.Pipeline<engineers> = [
    {
      $project: {
        _id: 0,
        result: {
          $sortArray: {
            input: [
              20,
              4,
              { a: 'Free' },
              6,
              21,
              5,
              'Gratis',
              { a: null },
              { a: { sale: true, price: 19 } },
              {
                bytes: {
                  '0': 255,
                  '1': 3,
                  '2': 0,
                  '3': 0,
                  '4': 0,
                  '5': 0,
                  '6': 0,
                  '7': 0,
                  '8': 0,
                  '9': 0,
                  '10': 0,
                  '11': 0,
                  '12': 0,
                  '13': 0,
                  '14': 60,
                  '15': 48,
                },
              },
              { a: 'On sale' },
            ],
            sortBy: 1,
          },
        },
      },
    },
  ];
}
