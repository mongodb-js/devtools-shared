import * as schema from '../../out/schema';

type Books = {
  _id: 8751;
  title: 'The Banquet';
  author: 'Dante';
  copies: 2;
};

const aggregation: schema.Pipeline<Books> = [
  {
    $group: {
      _id: '$author',
      avgCopies: {
        $accumulator: {
          init: function () {
            // Set the initial state
            return { count: 0, sum: 0 };
          },
          accumulate: function (state, numCopies) {
            // Define how to update the state
            return {
              count: state.count + 1,
              sum: state.sum + numCopies,
            };
          },
          accumulateArgs: ['$copies'], // Argument required by the accumulate function
          merge: function (state1, state2) {
            // When the operator performs a merge,
            return {
              // add the fields from the two states
              count: state1.count + state2.count,
              sum: state1.sum + state2.sum,
            };
          },
          finalize: function (state) {
            // After collecting the results from all documents,
            return state.sum / state.count; // calculate the average
          },
          lang: 'js',
        },
      },
    },
  },
];
