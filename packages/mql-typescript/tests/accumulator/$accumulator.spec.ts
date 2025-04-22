import * as schema from '../../out/schema';

/**
 * Use $accumulator to Implement the $avg Operator
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/accumulator/#use--accumulator-to-implement-the--avg-operator}
 */
function test0() {
  type books = {
    _id: number;
    title: string;
    author: string;
    copies: number;
  };

  const aggregation: schema.Pipeline<books> = [
    {
      $group: {
        _id: '$author',
        avgCopies: {
          $accumulator: {
            init: function () {
              return { count: 0, sum: 0 };
            },
            accumulate: function (state, numCopies) {
              return { count: state.count + 1, sum: state.sum + numCopies };
            },
            accumulateArgs: ['$copies'],
            merge: function (state1, state2) {
              return {
                count: state1.count + state2.count,
                sum: state1.sum + state2.sum,
              };
            },
            finalize: function (state) {
              return state.sum / state.count;
            },
            lang: 'js',
          },
        },
      },
    },
  ];
}

/**
 * Use initArgs to Vary the Initial State by Group
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/accumulator/#use-initargs-to-vary-the-initial-state-by-group}
 */
function test1() {
  type restaurants = {
    _id: number;
    name: string;
    city: string;
    cuisine: string;
  };

  const aggregation: schema.Pipeline<restaurants> = [
    {
      $group: {
        _id: { city: '$city' },
        restaurants: {
          $accumulator: {
            init: function (city, userProfileCity) {
              return { max: city === userProfileCity ? 3 : 1, restaurants: [] };
            },
            initArgs: ['$city', 'Bettles'],
            accumulate: function (state, restaurantName) {
              if (state.restaurants.length < state.max) {
                state.restaurants.push(restaurantName);
              }
              return state;
            },
            accumulateArgs: ['$name'],
            merge: function (state1, state2) {
              return {
                max: state1.max,
                restaurants: state1.restaurants
                  .concat(state2.restaurants)
                  .slice(0, state1.max),
              };
            },
            finalize: function (state) {
              return state.restaurants;
            },
            lang: 'js',
          },
        },
      },
    },
  ];
}
