/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-explicit-any */

import type * as bson from 'bson';
import type { FilterOperators } from 'mongodb';

type Condition<T> = AlternativeType<T> | FilterOperators<T> | QueryOperator<T>;
type AlternativeType<T> =
  T extends ReadonlyArray<infer U> ? T | RegExpOrString<U> : RegExpOrString<T>;
type RegExpOrString<T> = T extends string ? Regex | T : T;
type KeysOfAType<T, Type> = {
  [k in keyof T]: NonNullable<T[k]> extends Type ? k : never;
}[keyof T];
type RecordWithStaticFields<T extends Record<string, any>, TValue> = T & {
  [key: string]: TValue | T[keyof T];
};

// TBD: Nested fields
type AFieldPath<S, Type> = KeysOfAType<S, Type> & string;
type FieldExpression<T> = { [k: string]: FieldPath<T> };

type MultiAnalyzerSpec<T> = {
  value: KeysOfAType<T, string>;
  multi: string;
};
export namespace Aggregation.Accumulator {
  /**
   * A type describing the `$accumulator` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/accumulator/}
   */
  export interface $accumulator<S> {
    /**
     * Defines a custom accumulator function.
     * New in MongoDB 4.4.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/accumulator/}
     */
    $accumulator: {
      /**
       * Function used to initialize the state. The init function receives its arguments from the initArgs array expression. You can specify the function definition as either BSON type Code or String.
       */
      init: Javascript;

      /**
       * Arguments passed to the init function.
       */
      initArgs?: ResolvesToArray<S>;

      /**
       * Function used to accumulate documents. The accumulate function receives its arguments from the current state and accumulateArgs array expression. The result of the accumulate function becomes the new state. You can specify the function definition as either BSON type Code or String.
       */
      accumulate: Javascript;

      /**
       * Arguments passed to the accumulate function. You can use accumulateArgs to specify what field value(s) to pass to the accumulate function.
       */
      accumulateArgs: ResolvesToArray<S>;

      /**
       * Function used to merge two internal states. merge must be either a String or Code BSON type. merge returns the combined result of the two merged states. For information on when the merge function is called, see Merge Two States with $merge.
       */
      merge: Javascript;

      /**
       * Function used to update the result of the accumulation.
       */
      finalize?: Javascript;

      /**
       * The language used in the $accumulator code.
       */
      lang: string;
    };
  }

  /**
   * A type describing the `$addToSet` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/addToSet/}
   */
  export interface $addToSet<S> {
    /**
     * Returns an array of unique expression values for each group. Order of the array elements is undefined.
     * Changed in MongoDB 5.0: Available in the $setWindowFields stage.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/addToSet/}
     */
    $addToSet: Expression<S>;
  }

  /**
   * A type describing the `$avg` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/avg/}
   */
  export interface $avg<S> {
    /**
     * Returns an average of numerical values. Ignores non-numeric values.
     * Changed in MongoDB 5.0: Available in the $setWindowFields stage.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/avg/}
     */
    $avg: ResolvesToNumber<S>;
  }

  /**
   * A type describing the `$bottom` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/bottom/}
   */
  export interface $bottom<S> {
    /**
     * Returns the bottom element within a group according to the specified sort order.
     * New in MongoDB 5.2: Available in the $group and $setWindowFields stages.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/bottom/}
     */
    $bottom: {
      /**
       * Specifies the order of results, with syntax similar to $sort.
       */
      sortBy: SortBy;

      /**
       * Represents the output for each element in the group and can be any expression.
       */
      output: Expression<S>;
    };
  }

  /**
   * A type describing the `$bottomN` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/bottomN/}
   */
  export interface $bottomN<S> {
    /**
     * Returns an aggregation of the bottom n elements within a group, according to the specified sort order. If the group contains fewer than n elements, $bottomN returns all elements in the group.
     * New in MongoDB 5.2.
     * Available in the $group and $setWindowFields stages.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/bottomN/}
     */
    $bottomN: {
      /**
       * Limits the number of results per group and has to be a positive integral expression that is either a constant or depends on the _id value for $group.
       */
      n: ResolvesToInt<S>;

      /**
       * Specifies the order of results, with syntax similar to $sort.
       */
      sortBy: SortBy;

      /**
       * Represents the output for each element in the group and can be any expression.
       */
      output: Expression<S>;
    };
  }

  /**
   * A type describing the `$count` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/count-accumulator/}
   */
  export interface $count<S> {
    /**
     * Returns the number of documents in the group or window.
     * Distinct from the $count pipeline stage.
     * New in MongoDB 5.0.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/count-accumulator/}
     */
    $count: Record<string, never>;
  }

  /**
   * A type describing the `$covariancePop` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/covariancePop/}
   */
  export interface $covariancePop<S> {
    /**
     * Returns the population covariance of two numeric expressions.
     * New in MongoDB 5.0.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/covariancePop/}
     */
    $covariancePop: [
      expression1: ResolvesToNumber<S>,
      expression2: ResolvesToNumber<S>,
    ];
  }

  /**
   * A type describing the `$covarianceSamp` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/covarianceSamp/}
   */
  export interface $covarianceSamp<S> {
    /**
     * Returns the sample covariance of two numeric expressions.
     * New in MongoDB 5.0.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/covarianceSamp/}
     */
    $covarianceSamp: [
      expression1: ResolvesToNumber<S>,
      expression2: ResolvesToNumber<S>,
    ];
  }

  /**
   * A type describing the `$denseRank` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/denseRank/}
   */
  export interface $denseRank<S> {
    /**
     * Returns the document position (known as the rank) relative to other documents in the $setWindowFields stage partition. There are no gaps in the ranks. Ties receive the same rank.
     * New in MongoDB 5.0.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/denseRank/}
     */
    $denseRank: Record<string, never>;
  }

  /**
   * A type describing the `$derivative` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/derivative/}
   */
  export interface $derivative<S> {
    /**
     * Returns the average rate of change within the specified window.
     * New in MongoDB 5.0.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/derivative/}
     */
    $derivative: {
      input: ResolvesToNumber<S> | ResolvesToDate<S>;

      /**
       * A string that specifies the time unit. Use one of these strings: "week", "day","hour", "minute", "second", "millisecond".
       * If the sortBy field is not a date, you must omit a unit. If you specify a unit, you must specify a date in the sortBy field.
       */
      unit?: TimeUnit;
    };
  }

  /**
   * A type describing the `$documentNumber` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/documentNumber/}
   */
  export interface $documentNumber<S> {
    /**
     * Returns the position of a document (known as the document number) in the $setWindowFields stage partition. Ties result in different adjacent document numbers.
     * New in MongoDB 5.0.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/documentNumber/}
     */
    $documentNumber: Record<string, never>;
  }

  /**
   * A type describing the `$expMovingAvg` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/expMovingAvg/}
   */
  export interface $expMovingAvg<S> {
    /**
     * Returns the exponential moving average for the numeric expression.
     * New in MongoDB 5.0.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/expMovingAvg/}
     */
    $expMovingAvg: {
      input: ResolvesToNumber<S>;

      /**
       * An integer that specifies the number of historical documents that have a significant mathematical weight in the exponential moving average calculation, with the most recent documents contributing the most weight.
       * You must specify either N or alpha. You cannot specify both.
       * The N value is used in this formula to calculate the current result based on the expression value from the current document being read and the previous result of the calculation:
       */
      N?: Int;

      /**
       * A double that specifies the exponential decay value to use in the exponential moving average calculation. A higher alpha value assigns a lower mathematical significance to previous results from the calculation.
       * You must specify either N or alpha. You cannot specify both.
       */
      alpha?: Double;
    };
  }

  /**
   * A type describing the `$first` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/first/}
   */
  export interface $first<S> {
    /**
     * Returns the result of an expression for the first document in a group or window.
     * Changed in MongoDB 5.0: Available in the $setWindowFields stage.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/first/}
     */
    $first: Expression<S>;
  }

  /**
   * A type describing the `$firstN` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/firstN/}
   */
  export interface $firstN<S> {
    /**
     * Returns an aggregation of the first n elements within a group.
     * The elements returned are meaningful only if in a specified sort order.
     * If the group contains fewer than n elements, $firstN returns all elements in the group.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/firstN/}
     */
    $firstN: {
      /**
       * An expression that resolves to the array from which to return n elements.
       */
      input: Expression<S>;

      /**
       * A positive integral expression that is either a constant or depends on the _id value for $group.
       */
      n: ResolvesToInt<S>;
    };
  }

  /**
   * A type describing the `$integral` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/integral/}
   */
  export interface $integral<S> {
    /**
     * Returns the approximation of the area under a curve.
     * New in MongoDB 5.0.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/integral/}
     */
    $integral: {
      input: ResolvesToNumber<S> | ResolvesToDate<S>;

      /**
       * A string that specifies the time unit. Use one of these strings: "week", "day","hour", "minute", "second", "millisecond".
       * If the sortBy field is not a date, you must omit a unit. If you specify a unit, you must specify a date in the sortBy field.
       */
      unit?: TimeUnit;
    };
  }

  /**
   * A type describing the `$last` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/last/}
   */
  export interface $last<S> {
    /**
     * Returns the result of an expression for the last document in a group or window.
     * Changed in MongoDB 5.0: Available in the $setWindowFields stage.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/last/}
     */
    $last: Expression<S>;
  }

  /**
   * A type describing the `$lastN` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/lastN/}
   */
  export interface $lastN<S> {
    /**
     * Returns an aggregation of the last n elements within a group.
     * The elements returned are meaningful only if in a specified sort order.
     * If the group contains fewer than n elements, $lastN returns all elements in the group.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/lastN/}
     */
    $lastN: {
      /**
       * An expression that resolves to the array from which to return n elements.
       */
      input: Expression<S>;

      /**
       * An expression that resolves to a positive integer. The integer specifies the number of array elements that $firstN returns.
       */
      n: ResolvesToInt<S>;
    };
  }

  /**
   * A type describing the `$linearFill` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/linearFill/}
   */
  export interface $linearFill<S> {
    /**
     * Fills null and missing fields in a window using linear interpolation based on surrounding field values.
     * Available in the $setWindowFields stage.
     * New in MongoDB 5.3.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/linearFill/}
     */
    $linearFill: ResolvesToNumber<S>;
  }

  /**
   * A type describing the `$locf` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/locf/}
   */
  export interface $locf<S> {
    /**
     * Last observation carried forward. Sets values for null and missing fields in a window to the last non-null value for the field.
     * Available in the $setWindowFields stage.
     * New in MongoDB 5.2.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/locf/}
     */
    $locf: Expression<S>;
  }

  /**
   * A type describing the `$max` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/max/}
   */
  export interface $max<S> {
    /**
     * Returns the maximum value that results from applying an expression to each document.
     * Changed in MongoDB 5.0: Available in the $setWindowFields stage.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/max/}
     */
    $max: Expression<S>;
  }

  /**
   * A type describing the `$maxN` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/maxN/}
   */
  export interface $maxN<S> {
    /**
     * Returns the n largest values in an array. Distinct from the $maxN accumulator.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/maxN/}
     */
    $maxN: {
      /**
       * An expression that resolves to the array from which to return the maximal n elements.
       */
      input: ResolvesToArray<S>;

      /**
       * An expression that resolves to a positive integer. The integer specifies the number of array elements that $maxN returns.
       */
      n: ResolvesToInt<S>;
    };
  }

  /**
   * A type describing the `$median` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/median/}
   */
  export interface $median<S> {
    /**
     * Returns an approximation of the median, the 50th percentile, as a scalar value.
     * New in MongoDB 7.0.
     * This operator is available as an accumulator in these stages:
     * $group
     * $setWindowFields
     * It is also available as an aggregation expression.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/median/}
     */
    $median: {
      /**
       * $median calculates the 50th percentile value of this data. input must be a field name or an expression that evaluates to a numeric type. If the expression cannot be converted to a numeric type, the $median calculation ignores it.
       */
      input: ResolvesToNumber<S>;

      /**
       * The method that mongod uses to calculate the 50th percentile value. The method must be 'approximate'.
       */
      method: AccumulatorPercentile;
    };
  }

  /**
   * A type describing the `$mergeObjects` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/mergeObjects/}
   */
  export interface $mergeObjects<S> {
    /**
     * Combines multiple documents into a single document.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/mergeObjects/}
     */
    $mergeObjects: ResolvesToObject<S>;
  }

  /**
   * A type describing the `$min` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/min/}
   */
  export interface $min<S> {
    /**
     * Returns the minimum value that results from applying an expression to each document.
     * Changed in MongoDB 5.0: Available in the $setWindowFields stage.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/min/}
     */
    $min: Expression<S>;
  }

  /**
   * A type describing the `$minN` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/minN/}
   */
  export interface $minN<S> {
    /**
     * Returns the n smallest values in an array. Distinct from the $minN accumulator.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/minN/}
     */
    $minN: {
      /**
       * An expression that resolves to the array from which to return the maximal n elements.
       */
      input: ResolvesToArray<S>;

      /**
       * An expression that resolves to a positive integer. The integer specifies the number of array elements that $maxN returns.
       */
      n: ResolvesToInt<S>;
    };
  }

  /**
   * A type describing the `$percentile` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/percentile/}
   */
  export interface $percentile<S> {
    /**
     * Returns an array of scalar values that correspond to specified percentile values.
     * New in MongoDB 7.0.
     * This operator is available as an accumulator in these stages:
     * $group
     * $setWindowFields
     * It is also available as an aggregation expression.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/percentile/}
     */
    $percentile: {
      /**
       * $percentile calculates the percentile values of this data. input must be a field name or an expression that evaluates to a numeric type. If the expression cannot be converted to a numeric type, the $percentile calculation ignores it.
       */
      input: ResolvesToNumber<S>;

      /**
       * $percentile calculates a percentile value for each element in p. The elements represent percentages and must evaluate to numeric values in the range 0.0 to 1.0, inclusive.
       * $percentile returns results in the same order as the elements in p.
       */
      p: ResolvesToArray<S>;

      /**
       * The method that mongod uses to calculate the percentile value. The method must be 'approximate'.
       */
      method: AccumulatorPercentile;
    };
  }

  /**
   * A type describing the `$push` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/push/}
   */
  export interface $push<S> {
    /**
     * Returns an array of values that result from applying an expression to each document.
     * Changed in MongoDB 5.0: Available in the $setWindowFields stage.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/push/}
     */
    $push: Expression<S>;
  }

  /**
   * A type describing the `$rank` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/rank/}
   */
  export interface $rank<S> {
    /**
     * Returns the document position (known as the rank) relative to other documents in the $setWindowFields stage partition.
     * New in MongoDB 5.0.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/rank/}
     */
    $rank: Record<string, never>;
  }

  /**
   * A type describing the `$shift` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/shift/}
   */
  export interface $shift<S> {
    /**
     * Returns the value from an expression applied to a document in a specified position relative to the current document in the $setWindowFields stage partition.
     * New in MongoDB 5.0.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/shift/}
     */
    $shift: {
      /**
       * Specifies an expression to evaluate and return in the output.
       */
      output: Expression<S>;

      /**
       * Specifies an integer with a numeric document position relative to the current document in the output.
       * For example:
       * 1 specifies the document position after the current document.
       * -1 specifies the document position before the current document.
       * -2 specifies the document position that is two positions before the current document.
       */
      by: Int;

      /**
       * Specifies an optional default expression to evaluate if the document position is outside of the implicit $setWindowFields stage window. The implicit window contains all the documents in the partition.
       * The default expression must evaluate to a constant value.
       * If you do not specify a default expression, $shift returns null for documents whose positions are outside of the implicit $setWindowFields stage window.
       */
      default: Expression<S>;
    };
  }

  /**
   * A type describing the `$stdDevPop` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/stdDevPop/}
   */
  export interface $stdDevPop<S> {
    /**
     * Calculates the population standard deviation of the input values. Use if the values encompass the entire population of data you want to represent and do not wish to generalize about a larger population. $stdDevPop ignores non-numeric values.
     * If the values represent only a sample of a population of data from which to generalize about the population, use $stdDevSamp instead.
     * Changed in MongoDB 5.0: Available in the $setWindowFields stage.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/stdDevPop/}
     */
    $stdDevPop: ResolvesToNumber<S>;
  }

  /**
   * A type describing the `$stdDevSamp` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/stdDevSamp/}
   */
  export interface $stdDevSamp<S> {
    /**
     * Calculates the sample standard deviation of the input values. Use if the values encompass a sample of a population of data from which to generalize about the population. $stdDevSamp ignores non-numeric values.
     * If the values represent the entire population of data or you do not wish to generalize about a larger population, use $stdDevPop instead.
     * Changed in MongoDB 5.0: Available in the $setWindowFields stage.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/stdDevSamp/}
     */
    $stdDevSamp: ResolvesToNumber<S>;
  }

  /**
   * A type describing the `$sum` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/sum/}
   */
  export interface $sum<S> {
    /**
     * Returns a sum of numerical values. Ignores non-numeric values.
     * Changed in MongoDB 5.0: Available in the $setWindowFields stage.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/sum/}
     */
    $sum: ResolvesToNumber<S>;
  }

  /**
   * A type describing the `$top` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/top/}
   */
  export interface $top<S> {
    /**
     * Returns the top element within a group according to the specified sort order.
     * New in MongoDB 5.2.
     * Available in the $group and $setWindowFields stages.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/top/}
     */
    $top: {
      /**
       * Specifies the order of results, with syntax similar to $sort.
       */
      sortBy: SortBy;

      /**
       * Represents the output for each element in the group and can be any expression.
       */
      output: Expression<S>;
    };
  }

  /**
   * A type describing the `$topN` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/topN/}
   */
  export interface $topN<S> {
    /**
     * Returns an aggregation of the top n fields within a group, according to the specified sort order.
     * New in MongoDB 5.2.
     * Available in the $group and $setWindowFields stages.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/topN/}
     */
    $topN: {
      /**
       * limits the number of results per group and has to be a positive integral expression that is either a constant or depends on the _id value for $group.
       */
      n: ResolvesToInt<S>;

      /**
       * Specifies the order of results, with syntax similar to $sort.
       */
      sortBy: SortBy;

      /**
       * Represents the output for each element in the group and can be any expression.
       */
      output: Expression<S>;
    };
  }
}
export namespace Aggregation.Expression {
  /**
   * A type describing the `$abs` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/abs/}
   */
  export interface $abs<S> {
    /**
     * Returns the absolute value of a number.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/abs/}
     */
    $abs: ResolvesToNumber<S>;
  }

  /**
   * A type describing the `$acos` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/acos/}
   */
  export interface $acos<S> {
    /**
     * Returns the inverse cosine (arc cosine) of a value in radians.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/acos/}
     */
    $acos: ResolvesToNumber<S>;
  }

  /**
   * A type describing the `$acosh` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/acosh/}
   */
  export interface $acosh<S> {
    /**
     * Returns the inverse hyperbolic cosine (hyperbolic arc cosine) of a value in radians.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/acosh/}
     */
    $acosh: ResolvesToNumber<S>;
  }

  /**
   * A type describing the `$add` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/add/}
   */
  export interface $add<S> {
    /**
     * Adds numbers to return the sum, or adds numbers and a date to return a new date. If adding numbers and a date, treats the numbers as milliseconds. Accepts any number of argument expressions, but at most, one expression can resolve to a date.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/add/}
     */
    $add: [
      /**
       * The arguments can be any valid expression as long as they resolve to either all numbers or to numbers and a date.
       */
      ...(ResolvesToNumber<S> | ResolvesToDate<S>)[],
    ];
  }

  /**
   * A type describing the `$allElementsTrue` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/allElementsTrue/}
   */
  export interface $allElementsTrue<S> {
    /**
     * Returns true if no element of a set evaluates to false, otherwise, returns false. Accepts a single argument expression.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/allElementsTrue/}
     */
    $allElementsTrue: [expression: ResolvesToArray<S>];
  }

  /**
   * A type describing the `$and` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/and/}
   */
  export interface $and<S> {
    /**
     * Returns true only when all its expressions evaluate to true. Accepts any number of argument expressions.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/and/}
     */
    $and: [
      ...(
        | Expression<S>
        | ResolvesToBool<S>
        | ResolvesToNumber<S>
        | ResolvesToString<S>
        | ResolvesToNull<S>
      )[],
    ];
  }

  /**
   * A type describing the `$anyElementTrue` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/anyElementTrue/}
   */
  export interface $anyElementTrue<S> {
    /**
     * Returns true if any elements of a set evaluate to true; otherwise, returns false. Accepts a single argument expression.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/anyElementTrue/}
     */
    $anyElementTrue: [expression: ResolvesToArray<S>];
  }

  /**
   * A type describing the `$arrayElemAt` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/arrayElemAt/}
   */
  export interface $arrayElemAt<S> {
    /**
     * Returns the element at the specified array index.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/arrayElemAt/}
     */
    $arrayElemAt: [array: ResolvesToArray<S>, idx: ResolvesToInt<S>];
  }

  /**
   * A type describing the `$arrayToObject` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/arrayToObject/}
   */
  export interface $arrayToObject<S> {
    /**
     * Converts an array of key value pairs to a document.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/arrayToObject/}
     */
    $arrayToObject: [array: ResolvesToArray<S>];
  }

  /**
   * A type describing the `$asin` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/asin/}
   */
  export interface $asin<S> {
    /**
     * Returns the inverse sin (arc sine) of a value in radians.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/asin/}
     */
    $asin: ResolvesToNumber<S>;
  }

  /**
   * A type describing the `$asinh` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/asinh/}
   */
  export interface $asinh<S> {
    /**
     * Returns the inverse hyperbolic sine (hyperbolic arc sine) of a value in radians.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/asinh/}
     */
    $asinh: ResolvesToNumber<S>;
  }

  /**
   * A type describing the `$atan` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/atan/}
   */
  export interface $atan<S> {
    /**
     * Returns the inverse tangent (arc tangent) of a value in radians.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/atan/}
     */
    $atan: ResolvesToNumber<S>;
  }

  /**
   * A type describing the `$atan2` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/atan2/}
   */
  export interface $atan2<S> {
    /**
     * Returns the inverse tangent (arc tangent) of y / x in radians, where y and x are the first and second values passed to the expression respectively.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/atan2/}
     */
    $atan2: [
      /**
       * $atan2 takes any valid expression that resolves to a number.
       * $atan2 returns values in radians. Use $radiansToDegrees operator to convert the output value from radians to degrees.
       * By default $atan returns values as a double. $atan2 can also return values as a 128-bit decimal as long as the expression resolves to a 128-bit decimal value.
       */
      y: ResolvesToNumber<S>,
      x: ResolvesToNumber<S>,
    ];
  }

  /**
   * A type describing the `$atanh` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/atanh/}
   */
  export interface $atanh<S> {
    /**
     * Returns the inverse hyperbolic tangent (hyperbolic arc tangent) of a value in radians.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/atanh/}
     */
    $atanh: ResolvesToNumber<S>;
  }

  /**
   * A type describing the `$avg` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/avg/}
   */
  export interface $avg<S> {
    /**
     * Returns an average of numerical values. Ignores non-numeric values.
     * Changed in MongoDB 5.0: Available in the $setWindowFields stage.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/avg/}
     */
    $avg: [...ResolvesToNumber<S>[]];
  }

  /**
   * A type describing the `$binarySize` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/binarySize/}
   */
  export interface $binarySize<S> {
    /**
     * Returns the size of a given string or binary data value's content in bytes.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/binarySize/}
     */
    $binarySize: ResolvesToString<S> | ResolvesToBinData<S> | ResolvesToNull<S>;
  }

  /**
   * A type describing the `$bitAnd` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/bitAnd/}
   */
  export interface $bitAnd<S> {
    /**
     * Returns the result of a bitwise and operation on an array of int or long values.
     * New in MongoDB 6.3.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/bitAnd/}
     */
    $bitAnd: [...(ResolvesToInt<S> | ResolvesToLong<S>)[]];
  }

  /**
   * A type describing the `$bitNot` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/bitNot/}
   */
  export interface $bitNot<S> {
    /**
     * Returns the result of a bitwise not operation on a single argument or an array that contains a single int or long value.
     * New in MongoDB 6.3.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/bitNot/}
     */
    $bitNot: ResolvesToInt<S> | ResolvesToLong<S>;
  }

  /**
   * A type describing the `$bitOr` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/bitOr/}
   */
  export interface $bitOr<S> {
    /**
     * Returns the result of a bitwise or operation on an array of int or long values.
     * New in MongoDB 6.3.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/bitOr/}
     */
    $bitOr: [...(ResolvesToInt<S> | ResolvesToLong<S>)[]];
  }

  /**
   * A type describing the `$bitXor` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/bitXor/}
   */
  export interface $bitXor<S> {
    /**
     * Returns the result of a bitwise xor (exclusive or) operation on an array of int and long values.
     * New in MongoDB 6.3.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/bitXor/}
     */
    $bitXor: [...(ResolvesToInt<S> | ResolvesToLong<S>)[]];
  }

  /**
   * A type describing the `$bsonSize` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/bsonSize/}
   */
  export interface $bsonSize<S> {
    /**
     * Returns the size in bytes of a given document (i.e. BSON type Object) when encoded as BSON.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/bsonSize/}
     */
    $bsonSize: ResolvesToObject<S> | ResolvesToNull<S>;
  }

  /**
   * A type describing the `$case` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/switch/}
   */
  export interface $case<S> {
    /**
     * Represents a single case in a $switch expression
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/switch/}
     */
    $case: {
      /**
       * Can be any valid expression that resolves to a boolean. If the result is not a boolean, it is coerced to a boolean value. More information about how MongoDB evaluates expressions as either true or false can be found here.
       */
      case: ResolvesToBool<S>;

      /**
       * Can be any valid expression.
       */
      then: Expression<S>;
    };
  }

  /**
   * A type describing the `$ceil` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/ceil/}
   */
  export interface $ceil<S> {
    /**
     * Returns the smallest integer greater than or equal to the specified number.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/ceil/}
     */
    $ceil: ResolvesToNumber<S>;
  }

  /**
   * A type describing the `$cmp` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/cmp/}
   */
  export interface $cmp<S> {
    /**
     * Returns 0 if the two values are equivalent, 1 if the first value is greater than the second, and -1 if the first value is less than the second.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/cmp/}
     */
    $cmp: [expression1: Expression<S>, expression2: Expression<S>];
  }

  /**
   * A type describing the `$concat` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/concat/}
   */
  export interface $concat<S> {
    /**
     * Concatenates any number of strings.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/concat/}
     */
    $concat: [...ResolvesToString<S>[]];
  }

  /**
   * A type describing the `$concatArrays` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/concatArrays/}
   */
  export interface $concatArrays<S> {
    /**
     * Concatenates arrays to return the concatenated array.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/concatArrays/}
     */
    $concatArrays: [...ResolvesToArray<S>[]];
  }

  /**
   * A type describing the `$cond` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/cond/}
   */
  export interface $cond<S> {
    /**
     * A ternary operator that evaluates one expression, and depending on the result, returns the value of one of the other two expressions. Accepts either three expressions in an ordered list or three named parameters.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/cond/}
     */
    $cond: { if: ResolvesToBool<S>; then: Expression<S>; else: Expression<S> };
  }

  /**
   * A type describing the `$convert` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/convert/}
   */
  export interface $convert<S> {
    /**
     * Converts a value to a specified type.
     * New in MongoDB 4.0.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/convert/}
     */
    $convert: {
      input: Expression<S>;
      to: ResolvesToString<S> | ResolvesToInt<S>;

      /**
       * The value to return on encountering an error during conversion, including unsupported type conversions. The arguments can be any valid expression.
       * If unspecified, the operation throws an error upon encountering an error and stops.
       */
      onError?: Expression<S>;

      /**
       * The value to return if the input is null or missing. The arguments can be any valid expression.
       * If unspecified, $convert returns null if the input is null or missing.
       */
      onNull?: Expression<S>;
    };
  }

  /**
   * A type describing the `$cos` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/cos/}
   */
  export interface $cos<S> {
    /**
     * Returns the cosine of a value that is measured in radians.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/cos/}
     */
    $cos: ResolvesToNumber<S>;
  }

  /**
   * A type describing the `$cosh` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/cosh/}
   */
  export interface $cosh<S> {
    /**
     * Returns the hyperbolic cosine of a value that is measured in radians.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/cosh/}
     */
    $cosh: ResolvesToNumber<S>;
  }

  /**
   * A type describing the `$dateAdd` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/dateAdd/}
   */
  export interface $dateAdd<S> {
    /**
     * Adds a number of time units to a date object.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/dateAdd/}
     */
    $dateAdd: {
      /**
       * The beginning date, in UTC, for the addition operation. The startDate can be any expression that resolves to a Date, a Timestamp, or an ObjectID.
       */
      startDate:
        | ResolvesToDate<S>
        | ResolvesToTimestamp<S>
        | ResolvesToObjectId<S>;

      /**
       * The unit used to measure the amount of time added to the startDate.
       */
      unit: TimeUnit;
      amount: ResolvesToInt<S> | ResolvesToLong<S>;

      /**
       * The timezone to carry out the operation. $timezone must be a valid expression that resolves to a string formatted as either an Olson Timezone Identifier or a UTC Offset. If no timezone is provided, the result is displayed in UTC.
       */
      timezone?: ResolvesToString<S>;
    };
  }

  /**
   * A type describing the `$dateDiff` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/dateDiff/}
   */
  export interface $dateDiff<S> {
    /**
     * Returns the difference between two dates.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/dateDiff/}
     */
    $dateDiff: {
      /**
       * The start of the time period. The startDate can be any expression that resolves to a Date, a Timestamp, or an ObjectID.
       */
      startDate:
        | ResolvesToDate<S>
        | ResolvesToTimestamp<S>
        | ResolvesToObjectId<S>;

      /**
       * The end of the time period. The endDate can be any expression that resolves to a Date, a Timestamp, or an ObjectID.
       */
      endDate:
        | ResolvesToDate<S>
        | ResolvesToTimestamp<S>
        | ResolvesToObjectId<S>;

      /**
       * The time measurement unit between the startDate and endDate
       */
      unit: TimeUnit;

      /**
       * The timezone to carry out the operation. $timezone must be a valid expression that resolves to a string formatted as either an Olson Timezone Identifier or a UTC Offset. If no timezone is provided, the result is displayed in UTC.
       */
      timezone?: ResolvesToString<S>;

      /**
       * Used when the unit is equal to week. Defaults to Sunday. The startOfWeek parameter is an expression that resolves to a case insensitive string
       */
      startOfWeek?: ResolvesToString<S>;
    };
  }

  /**
   * A type describing the `$dateFromParts` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/dateFromParts/}
   */
  export interface $dateFromParts<S> {
    /**
     * Constructs a BSON Date object given the date's constituent parts.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/dateFromParts/}
     */
    $dateFromParts: {
      /**
       * Calendar year. Can be any expression that evaluates to a number.
       */
      year?: ResolvesToNumber<S>;

      /**
       * ISO Week Date Year. Can be any expression that evaluates to a number.
       */
      isoWeekYear?: ResolvesToNumber<S>;

      /**
       * Month. Defaults to 1.
       */
      month?: ResolvesToNumber<S>;

      /**
       * Week of year. Defaults to 1.
       */
      isoWeek?: ResolvesToNumber<S>;

      /**
       * Day of month. Defaults to 1.
       */
      day?: ResolvesToNumber<S>;

      /**
       * Day of week (Monday 1 - Sunday 7). Defaults to 1.
       */
      isoDayOfWeek?: ResolvesToNumber<S>;

      /**
       * Hour. Defaults to 0.
       */
      hour?: ResolvesToNumber<S>;

      /**
       * Minute. Defaults to 0.
       */
      minute?: ResolvesToNumber<S>;

      /**
       * Second. Defaults to 0.
       */
      second?: ResolvesToNumber<S>;

      /**
       * Millisecond. Defaults to 0.
       */
      millisecond?: ResolvesToNumber<S>;

      /**
       * The timezone to carry out the operation. $timezone must be a valid expression that resolves to a string formatted as either an Olson Timezone Identifier or a UTC Offset. If no timezone is provided, the result is displayed in UTC.
       */
      timezone?: ResolvesToString<S>;
    };
  }

  /**
   * A type describing the `$dateFromString` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/dateFromString/}
   */
  export interface $dateFromString<S> {
    /**
     * Converts a date/time string to a date object.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/dateFromString/}
     */
    $dateFromString: {
      /**
       * The date/time string to convert to a date object.
       */
      dateString: ResolvesToString<S>;

      /**
       * The date format specification of the dateString. The format can be any expression that evaluates to a string literal, containing 0 or more format specifiers.
       * If unspecified, $dateFromString uses "%Y-%m-%dT%H:%M:%S.%LZ" as the default format but accepts a variety of formats and attempts to parse the dateString if possible.
       */
      format?: ResolvesToString<S>;

      /**
       * The time zone to use to format the date.
       */
      timezone?: ResolvesToString<S>;

      /**
       * If $dateFromString encounters an error while parsing the given dateString, it outputs the result value of the provided onError expression. This result value can be of any type.
       * If you do not specify onError, $dateFromString throws an error if it cannot parse dateString.
       */
      onError?: Expression<S>;

      /**
       * If the dateString provided to $dateFromString is null or missing, it outputs the result value of the provided onNull expression. This result value can be of any type.
       * If you do not specify onNull and dateString is null or missing, then $dateFromString outputs null.
       */
      onNull?: Expression<S>;
    };
  }

  /**
   * A type describing the `$dateSubtract` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/dateSubtract/}
   */
  export interface $dateSubtract<S> {
    /**
     * Subtracts a number of time units from a date object.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/dateSubtract/}
     */
    $dateSubtract: {
      /**
       * The beginning date, in UTC, for the addition operation. The startDate can be any expression that resolves to a Date, a Timestamp, or an ObjectID.
       */
      startDate:
        | ResolvesToDate<S>
        | ResolvesToTimestamp<S>
        | ResolvesToObjectId<S>;

      /**
       * The unit used to measure the amount of time added to the startDate.
       */
      unit: TimeUnit;
      amount: ResolvesToInt<S> | ResolvesToLong<S>;

      /**
       * The timezone to carry out the operation. $timezone must be a valid expression that resolves to a string formatted as either an Olson Timezone Identifier or a UTC Offset. If no timezone is provided, the result is displayed in UTC.
       */
      timezone?: ResolvesToString<S>;
    };
  }

  /**
   * A type describing the `$dateToParts` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/dateToParts/}
   */
  export interface $dateToParts<S> {
    /**
     * Returns a document containing the constituent parts of a date.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/dateToParts/}
     */
    $dateToParts: {
      /**
       * The input date for which to return parts. date can be any expression that resolves to a Date, a Timestamp, or an ObjectID.
       */
      date: ResolvesToDate<S> | ResolvesToTimestamp<S> | ResolvesToObjectId<S>;

      /**
       * The timezone to carry out the operation. $timezone must be a valid expression that resolves to a string formatted as either an Olson Timezone Identifier or a UTC Offset. If no timezone is provided, the result is displayed in UTC.
       */
      timezone?: ResolvesToString<S>;

      /**
       * If set to true, modifies the output document to use ISO week date fields. Defaults to false.
       */
      iso8601?: boolean;
    };
  }

  /**
   * A type describing the `$dateToString` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/dateToString/}
   */
  export interface $dateToString<S> {
    /**
     * Returns the date as a formatted string.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/dateToString/}
     */
    $dateToString: {
      /**
       * The date to convert to string. Must be a valid expression that resolves to a Date, a Timestamp, or an ObjectID.
       */
      date: ResolvesToDate<S> | ResolvesToTimestamp<S> | ResolvesToObjectId<S>;

      /**
       * The date format specification of the dateString. The format can be any expression that evaluates to a string literal, containing 0 or more format specifiers.
       * If unspecified, $dateFromString uses "%Y-%m-%dT%H:%M:%S.%LZ" as the default format but accepts a variety of formats and attempts to parse the dateString if possible.
       */
      format?: ResolvesToString<S>;

      /**
       * The time zone to use to format the date.
       */
      timezone?: ResolvesToString<S>;

      /**
       * The value to return if the date is null or missing.
       * If unspecified, $dateToString returns null if the date is null or missing.
       */
      onNull?: Expression<S>;
    };
  }

  /**
   * A type describing the `$dateTrunc` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/dateTrunc/}
   */
  export interface $dateTrunc<S> {
    /**
     * Truncates a date.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/dateTrunc/}
     */
    $dateTrunc: {
      /**
       * The date to truncate, specified in UTC. The date can be any expression that resolves to a Date, a Timestamp, or an ObjectID.
       */
      date: ResolvesToDate<S> | ResolvesToTimestamp<S> | ResolvesToObjectId<S>;

      /**
       * The unit of time, specified as an expression that must resolve to one of these strings: year, quarter, week, month, day, hour, minute, second.
       * Together, binSize and unit specify the time period used in the $dateTrunc calculation.
       */
      unit: TimeUnit;

      /**
       * The numeric time value, specified as an expression that must resolve to a positive non-zero number. Defaults to 1.
       * Together, binSize and unit specify the time period used in the $dateTrunc calculation.
       */
      binSize?: ResolvesToNumber<S>;

      /**
       * The timezone to carry out the operation. $timezone must be a valid expression that resolves to a string formatted as either an Olson Timezone Identifier or a UTC Offset. If no timezone is provided, the result is displayed in UTC.
       */
      timezone?: ResolvesToString<S>;

      /**
       * The start of the week. Used when
       * unit is week. Defaults to Sunday.
       */
      startOfWeek?: string;
    };
  }

  /**
   * A type describing the `$dayOfMonth` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/dayOfMonth/}
   */
  export interface $dayOfMonth<S> {
    /**
     * Returns the day of the month for a date as a number between 1 and 31.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/dayOfMonth/}
     */
    $dayOfMonth: {
      /**
       * The date to which the operator is applied. date must be a valid expression that resolves to a Date, a Timestamp, or an ObjectID.
       */
      date: ResolvesToDate<S> | ResolvesToTimestamp<S> | ResolvesToObjectId<S>;

      /**
       * The timezone of the operation result. timezone must be a valid expression that resolves to a string formatted as either an Olson Timezone Identifier or a UTC Offset. If no timezone is provided, the result is displayed in UTC.
       */
      timezone?: ResolvesToString<S>;
    };
  }

  /**
   * A type describing the `$dayOfWeek` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/dayOfWeek/}
   */
  export interface $dayOfWeek<S> {
    /**
     * Returns the day of the week for a date as a number between 1 (Sunday) and 7 (Saturday).
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/dayOfWeek/}
     */
    $dayOfWeek: {
      /**
       * The date to which the operator is applied. date must be a valid expression that resolves to a Date, a Timestamp, or an ObjectID.
       */
      date: ResolvesToDate<S> | ResolvesToTimestamp<S> | ResolvesToObjectId<S>;

      /**
       * The timezone of the operation result. timezone must be a valid expression that resolves to a string formatted as either an Olson Timezone Identifier or a UTC Offset. If no timezone is provided, the result is displayed in UTC.
       */
      timezone?: ResolvesToString<S>;
    };
  }

  /**
   * A type describing the `$dayOfYear` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/dayOfYear/}
   */
  export interface $dayOfYear<S> {
    /**
     * Returns the day of the year for a date as a number between 1 and 366 (leap year).
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/dayOfYear/}
     */
    $dayOfYear: {
      /**
       * The date to which the operator is applied. date must be a valid expression that resolves to a Date, a Timestamp, or an ObjectID.
       */
      date: ResolvesToDate<S> | ResolvesToTimestamp<S> | ResolvesToObjectId<S>;

      /**
       * The timezone of the operation result. timezone must be a valid expression that resolves to a string formatted as either an Olson Timezone Identifier or a UTC Offset. If no timezone is provided, the result is displayed in UTC.
       */
      timezone?: ResolvesToString<S>;
    };
  }

  /**
   * A type describing the `$degreesToRadians` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/degreesToRadians/}
   */
  export interface $degreesToRadians<S> {
    /**
     * Converts a value from degrees to radians.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/degreesToRadians/}
     */
    $degreesToRadians: ResolvesToNumber<S>;
  }

  /**
   * A type describing the `$divide` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/divide/}
   */
  export interface $divide<S> {
    /**
     * Returns the result of dividing the first number by the second. Accepts two argument expressions.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/divide/}
     */
    $divide: [
      /**
       * The first argument is the dividend, and the second argument is the divisor; i.e. the first argument is divided by the second argument.
       */
      dividend: ResolvesToNumber<S>,
      divisor: ResolvesToNumber<S>,
    ];
  }

  /**
   * A type describing the `$eq` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/eq/}
   */
  export interface $eq<S> {
    /**
     * Returns true if the values are equivalent.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/eq/}
     */
    $eq: [expression1: Expression<S>, expression2: Expression<S>];
  }

  /**
   * A type describing the `$exp` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/exp/}
   */
  export interface $exp<S> {
    /**
     * Raises e to the specified exponent.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/exp/}
     */
    $exp: ResolvesToNumber<S>;
  }

  /**
   * A type describing the `$filter` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/filter/}
   */
  export interface $filter<S> {
    /**
     * Selects a subset of the array to return an array with only the elements that match the filter condition.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/filter/}
     */
    $filter: {
      input: ResolvesToArray<S>;

      /**
       * An expression that resolves to a boolean value used to determine if an element should be included in the output array. The expression references each element of the input array individually with the variable name specified in as.
       */
      cond: ResolvesToBool<S>;

      /**
       * A name for the variable that represents each individual element of the input array. If no name is specified, the variable name defaults to this.
       */
      as?: string;

      /**
       * A number expression that restricts the number of matching array elements that $filter returns. You cannot specify a limit less than 1. The matching array elements are returned in the order they appear in the input array.
       * If the specified limit is greater than the number of matching array elements, $filter returns all matching array elements. If the limit is null, $filter returns all matching array elements.
       */
      limit?: ResolvesToInt<S>;
    };
  }

  /**
   * A type describing the `$first` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/first/}
   */
  export interface $first<S> {
    /**
     * Returns the result of an expression for the first document in an array.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/first/}
     */
    $first: ResolvesToArray<S>;
  }

  /**
   * A type describing the `$firstN` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/firstN-array-element/}
   */
  export interface $firstN<S> {
    /**
     * Returns a specified number of elements from the beginning of an array.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/firstN-array-element/}
     */
    $firstN: {
      /**
       * An expression that resolves to a positive integer. The integer specifies the number of array elements that $firstN returns.
       */
      n: ResolvesToInt<S>;

      /**
       * An expression that resolves to the array from which to return n elements.
       */
      input: ResolvesToArray<S>;
    };
  }

  /**
   * A type describing the `$floor` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/floor/}
   */
  export interface $floor<S> {
    /**
     * Returns the largest integer less than or equal to the specified number.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/floor/}
     */
    $floor: ResolvesToNumber<S>;
  }

  /**
   * A type describing the `$function` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/function/}
   */
  export interface $function<S> {
    /**
     * Defines a custom function.
     * New in MongoDB 4.4.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/function/}
     */
    $function: {
      /**
       * The function definition. You can specify the function definition as either BSON\JavaScript or string.
       * function(arg1, arg2, ...) { ... }
       */
      body: Javascript;

      /**
       * Arguments passed to the function body. If the body function does not take an argument, you can specify an empty array [ ].
       */
      args: unknown[];
      lang: string;
    };
  }

  /**
   * A type describing the `$getField` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/getField/}
   */
  export interface $getField<S> {
    /**
     * Returns the value of a specified field from a document. You can use $getField to retrieve the value of fields with names that contain periods (.) or start with dollar signs ($).
     * New in MongoDB 5.0.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/getField/}
     */
    $getField: {
      /**
       * Field in the input object for which you want to return a value. field can be any valid expression that resolves to a string constant.
       * If field begins with a dollar sign ($), place the field name inside of a $literal expression to return its value.
       */
      field: ResolvesToString<S>;

      /**
       * Default: $$CURRENT
       * A valid expression that contains the field for which you want to return a value. input must resolve to an object, missing, null, or undefined. If omitted, defaults to the document currently being processed in the pipeline ($$CURRENT).
       */
      input?: Expression<S>;
    };
  }

  /**
   * A type describing the `$gt` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/gt/}
   */
  export interface $gt<S> {
    /**
     * Returns true if the first value is greater than the second.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/gt/}
     */
    $gt: [expression1: Expression<S>, expression2: Expression<S>];
  }

  /**
   * A type describing the `$gte` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/gte/}
   */
  export interface $gte<S> {
    /**
     * Returns true if the first value is greater than or equal to the second.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/gte/}
     */
    $gte: [expression1: Expression<S>, expression2: Expression<S>];
  }

  /**
   * A type describing the `$hour` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/hour/}
   */
  export interface $hour<S> {
    /**
     * Returns the hour for a date as a number between 0 and 23.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/hour/}
     */
    $hour: {
      /**
       * The date to which the operator is applied. date must be a valid expression that resolves to a Date, a Timestamp, or an ObjectID.
       */
      date: ResolvesToDate<S> | ResolvesToTimestamp<S> | ResolvesToObjectId<S>;

      /**
       * The timezone of the operation result. timezone must be a valid expression that resolves to a string formatted as either an Olson Timezone Identifier or a UTC Offset. If no timezone is provided, the result is displayed in UTC.
       */
      timezone?: ResolvesToString<S>;
    };
  }

  /**
   * A type describing the `$ifNull` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/ifNull/}
   */
  export interface $ifNull<S> {
    /**
     * Returns either the non-null result of the first expression or the result of the second expression if the first expression results in a null result. Null result encompasses instances of undefined values or missing fields. Accepts two expressions as arguments. The result of the second expression can be null.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/ifNull/}
     */
    $ifNull: [...Expression<S>[]];
  }

  /**
   * A type describing the `$in` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/in/}
   */
  export interface $in<S> {
    /**
     * Returns a boolean indicating whether a specified value is in an array.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/in/}
     */
    $in: [
      /**
       * Any valid expression expression.
       */
      expression: Expression<S>,

      /**
       * Any valid expression that resolves to an array.
       */
      array: ResolvesToArray<S>,
    ];
  }

  /**
   * A type describing the `$indexOfArray` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/indexOfArray/}
   */
  export interface $indexOfArray<S> {
    /**
     * Searches an array for an occurrence of a specified value and returns the array index of the first occurrence. Array indexes start at zero.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/indexOfArray/}
     */
    $indexOfArray: [
      /**
       * Can be any valid expression as long as it resolves to an array.
       * If the array expression resolves to a value of null or refers to a field that is missing, $indexOfArray returns null.
       * If the array expression does not resolve to an array or null nor refers to a missing field, $indexOfArray returns an error.
       */
      array: ResolvesToArray<S>,
      search: Expression<S>,

      /**
       * An integer, or a number that can be represented as integers (such as 2.0), that specifies the starting index position for the search. Can be any valid expression that resolves to a non-negative integral number.
       * If unspecified, the starting index position for the search is the beginning of the string.
       */
      start?: ResolvesToInt<S>,

      /**
       * An integer, or a number that can be represented as integers (such as 2.0), that specifies the ending index position for the search. Can be any valid expression that resolves to a non-negative integral number. If you specify a <end> index value, you should also specify a <start> index value; otherwise, $indexOfArray uses the <end> value as the <start> index value instead of the <end> value.
       * If unspecified, the ending index position for the search is the end of the string.
       */
      end?: ResolvesToInt<S>,
    ];
  }

  /**
   * A type describing the `$indexOfBytes` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/indexOfBytes/}
   */
  export interface $indexOfBytes<S> {
    /**
     * Searches a string for an occurrence of a substring and returns the UTF-8 byte index of the first occurrence. If the substring is not found, returns -1.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/indexOfBytes/}
     */
    $indexOfBytes: [
      /**
       * Can be any valid expression as long as it resolves to a string.
       * If the string expression resolves to a value of null or refers to a field that is missing, $indexOfBytes returns null.
       * If the string expression does not resolve to a string or null nor refers to a missing field, $indexOfBytes returns an error.
       */
      string: ResolvesToString<S>,

      /**
       * Can be any valid expression as long as it resolves to a string.
       */
      substring: ResolvesToString<S>,

      /**
       * An integer, or a number that can be represented as integers (such as 2.0), that specifies the starting index position for the search. Can be any valid expression that resolves to a non-negative integral number.
       * If unspecified, the starting index position for the search is the beginning of the string.
       */
      start?: ResolvesToInt<S>,

      /**
       * An integer, or a number that can be represented as integers (such as 2.0), that specifies the ending index position for the search. Can be any valid expression that resolves to a non-negative integral number. If you specify a <end> index value, you should also specify a <start> index value; otherwise, $indexOfArray uses the <end> value as the <start> index value instead of the <end> value.
       * If unspecified, the ending index position for the search is the end of the string.
       */
      end?: ResolvesToInt<S>,
    ];
  }

  /**
   * A type describing the `$indexOfCP` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/indexOfCP/}
   */
  export interface $indexOfCP<S> {
    /**
     * Searches a string for an occurrence of a substring and returns the UTF-8 code point index of the first occurrence. If the substring is not found, returns -1
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/indexOfCP/}
     */
    $indexOfCP: [
      /**
       * Can be any valid expression as long as it resolves to a string.
       * If the string expression resolves to a value of null or refers to a field that is missing, $indexOfCP returns null.
       * If the string expression does not resolve to a string or null nor refers to a missing field, $indexOfCP returns an error.
       */
      string: ResolvesToString<S>,

      /**
       * Can be any valid expression as long as it resolves to a string.
       */
      substring: ResolvesToString<S>,

      /**
       * An integer, or a number that can be represented as integers (such as 2.0), that specifies the starting index position for the search. Can be any valid expression that resolves to a non-negative integral number.
       * If unspecified, the starting index position for the search is the beginning of the string.
       */
      start?: ResolvesToInt<S>,

      /**
       * An integer, or a number that can be represented as integers (such as 2.0), that specifies the ending index position for the search. Can be any valid expression that resolves to a non-negative integral number. If you specify a <end> index value, you should also specify a <start> index value; otherwise, $indexOfArray uses the <end> value as the <start> index value instead of the <end> value.
       * If unspecified, the ending index position for the search is the end of the string.
       */
      end?: ResolvesToInt<S>,
    ];
  }

  /**
   * A type describing the `$isArray` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/isArray/}
   */
  export interface $isArray<S> {
    /**
     * Determines if the operand is an array. Returns a boolean.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/isArray/}
     */
    $isArray: [expression: Expression<S>];
  }

  /**
   * A type describing the `$isNumber` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/isNumber/}
   */
  export interface $isNumber<S> {
    /**
     * Returns boolean true if the specified expression resolves to an integer, decimal, double, or long.
     * Returns boolean false if the expression resolves to any other BSON type, null, or a missing field.
     * New in MongoDB 4.4.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/isNumber/}
     */
    $isNumber: Expression<S>;
  }

  /**
   * A type describing the `$isoDayOfWeek` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/isoDayOfWeek/}
   */
  export interface $isoDayOfWeek<S> {
    /**
     * Returns the weekday number in ISO 8601 format, ranging from 1 (for Monday) to 7 (for Sunday).
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/isoDayOfWeek/}
     */
    $isoDayOfWeek: {
      /**
       * The date to which the operator is applied. date must be a valid expression that resolves to a Date, a Timestamp, or an ObjectID.
       */
      date: ResolvesToDate<S> | ResolvesToTimestamp<S> | ResolvesToObjectId<S>;

      /**
       * The timezone of the operation result. timezone must be a valid expression that resolves to a string formatted as either an Olson Timezone Identifier or a UTC Offset. If no timezone is provided, the result is displayed in UTC.
       */
      timezone?: ResolvesToString<S>;
    };
  }

  /**
   * A type describing the `$isoWeek` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/isoWeek/}
   */
  export interface $isoWeek<S> {
    /**
     * Returns the week number in ISO 8601 format, ranging from 1 to 53. Week numbers start at 1 with the week (Monday through Sunday) that contains the year's first Thursday.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/isoWeek/}
     */
    $isoWeek: {
      /**
       * The date to which the operator is applied. date must be a valid expression that resolves to a Date, a Timestamp, or an ObjectID.
       */
      date: ResolvesToDate<S> | ResolvesToTimestamp<S> | ResolvesToObjectId<S>;

      /**
       * The timezone of the operation result. timezone must be a valid expression that resolves to a string formatted as either an Olson Timezone Identifier or a UTC Offset. If no timezone is provided, the result is displayed in UTC.
       */
      timezone?: ResolvesToString<S>;
    };
  }

  /**
   * A type describing the `$isoWeekYear` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/isoWeekYear/}
   */
  export interface $isoWeekYear<S> {
    /**
     * Returns the year number in ISO 8601 format. The year starts with the Monday of week 1 (ISO 8601) and ends with the Sunday of the last week (ISO 8601).
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/isoWeekYear/}
     */
    $isoWeekYear: {
      /**
       * The date to which the operator is applied. date must be a valid expression that resolves to a Date, a Timestamp, or an ObjectID.
       */
      date: ResolvesToDate<S> | ResolvesToTimestamp<S> | ResolvesToObjectId<S>;

      /**
       * The timezone of the operation result. timezone must be a valid expression that resolves to a string formatted as either an Olson Timezone Identifier or a UTC Offset. If no timezone is provided, the result is displayed in UTC.
       */
      timezone?: ResolvesToString<S>;
    };
  }

  /**
   * A type describing the `$last` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/last/}
   */
  export interface $last<S> {
    /**
     * Returns the result of an expression for the last document in an array.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/last/}
     */
    $last: ResolvesToArray<S>;
  }

  /**
   * A type describing the `$lastN` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/lastN/#array-operator}
   */
  export interface $lastN<S> {
    /**
     * Returns a specified number of elements from the end of an array.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/lastN/#array-operator}
     */
    $lastN: {
      /**
       * An expression that resolves to a positive integer. The integer specifies the number of array elements that $firstN returns.
       */
      n: ResolvesToInt<S>;

      /**
       * An expression that resolves to the array from which to return n elements.
       */
      input: ResolvesToArray<S>;
    };
  }

  /**
   * A type describing the `$let` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/let/}
   */
  export interface $let<S> {
    /**
     * Defines variables for use within the scope of a subexpression and returns the result of the subexpression. Accepts named parameters.
     * Accepts any number of argument expressions.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/let/}
     */
    $let: {
      /**
       * Assignment block for the variables accessible in the in expression. To assign a variable, specify a string for the variable name and assign a valid expression for the value.
       * The variable assignments have no meaning outside the in expression, not even within the vars block itself.
       */
      vars: ExpressionMap<S>;

      /**
       * The expression to evaluate.
       */
      in: Expression<S>;
    };
  }

  /**
   * A type describing the `$literal` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/literal/}
   */
  export interface $literal<S> {
    /**
     * Return a value without parsing. Use for values that the aggregation pipeline may interpret as an expression. For example, use a $literal expression to a string that starts with a dollar sign ($) to avoid parsing as a field path.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/literal/}
     */
    $literal: any;
  }

  /**
   * A type describing the `$ln` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/ln/}
   */
  export interface $ln<S> {
    /**
     * Calculates the natural log of a number.
     * $ln is equivalent to $log: [ <number>, Math.E ] expression, where Math.E is a JavaScript representation for Euler's number e.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/ln/}
     */
    $ln: ResolvesToNumber<S>;
  }

  /**
   * A type describing the `$log` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/log/}
   */
  export interface $log<S> {
    /**
     * Calculates the log of a number in the specified base.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/log/}
     */
    $log: [
      /**
       * Any valid expression as long as it resolves to a non-negative number.
       */
      number: ResolvesToNumber<S>,

      /**
       * Any valid expression as long as it resolves to a positive number greater than 1.
       */
      base: ResolvesToNumber<S>,
    ];
  }

  /**
   * A type describing the `$log10` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/log10/}
   */
  export interface $log10<S> {
    /**
     * Calculates the log base 10 of a number.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/log10/}
     */
    $log10: ResolvesToNumber<S>;
  }

  /**
   * A type describing the `$lt` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/lt/}
   */
  export interface $lt<S> {
    /**
     * Returns true if the first value is less than the second.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/lt/}
     */
    $lt: [expression1: Expression<S>, expression2: Expression<S>];
  }

  /**
   * A type describing the `$lte` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/lte/}
   */
  export interface $lte<S> {
    /**
     * Returns true if the first value is less than or equal to the second.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/lte/}
     */
    $lte: [expression1: Expression<S>, expression2: Expression<S>];
  }

  /**
   * A type describing the `$ltrim` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/ltrim/}
   */
  export interface $ltrim<S> {
    /**
     * Removes whitespace or the specified characters from the beginning of a string.
     * New in MongoDB 4.0.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/ltrim/}
     */
    $ltrim: {
      /**
       * The string to trim. The argument can be any valid expression that resolves to a string.
       */
      input: ResolvesToString<S>;

      /**
       * The character(s) to trim from the beginning of the input.
       * The argument can be any valid expression that resolves to a string. The $ltrim operator breaks down the string into individual UTF code point to trim from input.
       * If unspecified, $ltrim removes whitespace characters, including the null character.
       */
      chars?: ResolvesToString<S>;
    };
  }

  /**
   * A type describing the `$map` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/map/}
   */
  export interface $map<S> {
    /**
     * Applies a subexpression to each element of an array and returns the array of resulting values in order. Accepts named parameters.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/map/}
     */
    $map: {
      /**
       * An expression that resolves to an array.
       */
      input: ResolvesToArray<S>;

      /**
       * A name for the variable that represents each individual element of the input array. If no name is specified, the variable name defaults to this.
       */
      as?: ResolvesToString<S>;

      /**
       * An expression that is applied to each element of the input array. The expression references each element individually with the variable name specified in as.
       */
      in: Expression<S>;
    };
  }

  /**
   * A type describing the `$max` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/max/}
   */
  export interface $max<S> {
    /**
     * Returns the maximum value that results from applying an expression to each document.
     * Changed in MongoDB 5.0: Available in the $setWindowFields stage.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/max/}
     */
    $max: [...Expression<S>[]];
  }

  /**
   * A type describing the `$maxN` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/maxN-array-element/}
   */
  export interface $maxN<S> {
    /**
     * Returns the n largest values in an array. Distinct from the $maxN accumulator.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/maxN-array-element/}
     */
    $maxN: {
      /**
       * An expression that resolves to the array from which to return the maximal n elements.
       */
      input: ResolvesToArray<S>;

      /**
       * An expression that resolves to a positive integer. The integer specifies the number of array elements that $maxN returns.
       */
      n: ResolvesToInt<S>;
    };
  }

  /**
   * A type describing the `$median` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/median/}
   */
  export interface $median<S> {
    /**
     * Returns an approximation of the median, the 50th percentile, as a scalar value.
     * New in MongoDB 7.0.
     * This operator is available as an accumulator in these stages:
     * $group
     * $setWindowFields
     * It is also available as an aggregation expression.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/median/}
     */
    $median: {
      /**
       * $median calculates the 50th percentile value of this data. input must be a field name or an expression that evaluates to a numeric type. If the expression cannot be converted to a numeric type, the $median calculation ignores it.
       */
      input: ResolvesToNumber<S> | ResolvesToNumber<S>[];

      /**
       * The method that mongod uses to calculate the 50th percentile value. The method must be 'approximate'.
       */
      method: AccumulatorPercentile;
    };
  }

  /**
   * A type describing the `$mergeObjects` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/mergeObjects/}
   */
  export interface $mergeObjects<S> {
    /**
     * Combines multiple documents into a single document.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/mergeObjects/}
     */
    $mergeObjects: [
      /**
       * Any valid expression that resolves to a document.
       */
      ...ResolvesToObject<S>[],
    ];
  }

  /**
   * A type describing the `$meta` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/meta/}
   */
  export interface $meta<S> {
    /**
     * Access available per-document metadata related to the aggregation operation.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/meta/}
     */
    $meta: string;
  }

  /**
   * A type describing the `$millisecond` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/millisecond/}
   */
  export interface $millisecond<S> {
    /**
     * Returns the milliseconds of a date as a number between 0 and 999.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/millisecond/}
     */
    $millisecond: {
      /**
       * The date to which the operator is applied. date must be a valid expression that resolves to a Date, a Timestamp, or an ObjectID.
       */
      date: ResolvesToDate<S> | ResolvesToTimestamp<S> | ResolvesToObjectId<S>;

      /**
       * The timezone of the operation result. timezone must be a valid expression that resolves to a string formatted as either an Olson Timezone Identifier or a UTC Offset. If no timezone is provided, the result is displayed in UTC.
       */
      timezone?: ResolvesToString<S>;
    };
  }

  /**
   * A type describing the `$min` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/min/}
   */
  export interface $min<S> {
    /**
     * Returns the minimum value that results from applying an expression to each document.
     * Changed in MongoDB 5.0: Available in the $setWindowFields stage.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/min/}
     */
    $min: [...Expression<S>[]];
  }

  /**
   * A type describing the `$minN` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/minN-array-element/}
   */
  export interface $minN<S> {
    /**
     * Returns the n smallest values in an array. Distinct from the $minN accumulator.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/minN-array-element/}
     */
    $minN: {
      /**
       * An expression that resolves to the array from which to return the maximal n elements.
       */
      input: ResolvesToArray<S>;

      /**
       * An expression that resolves to a positive integer. The integer specifies the number of array elements that $maxN returns.
       */
      n: ResolvesToInt<S>;
    };
  }

  /**
   * A type describing the `$minute` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/minute/}
   */
  export interface $minute<S> {
    /**
     * Returns the minute for a date as a number between 0 and 59.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/minute/}
     */
    $minute: {
      /**
       * The date to which the operator is applied. date must be a valid expression that resolves to a Date, a Timestamp, or an ObjectID.
       */
      date: ResolvesToDate<S> | ResolvesToTimestamp<S> | ResolvesToObjectId<S>;

      /**
       * The timezone of the operation result. timezone must be a valid expression that resolves to a string formatted as either an Olson Timezone Identifier or a UTC Offset. If no timezone is provided, the result is displayed in UTC.
       */
      timezone?: ResolvesToString<S>;
    };
  }

  /**
   * A type describing the `$mod` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/mod/}
   */
  export interface $mod<S> {
    /**
     * Returns the remainder of the first number divided by the second. Accepts two argument expressions.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/mod/}
     */
    $mod: [
      /**
       * The first argument is the dividend, and the second argument is the divisor; i.e. first argument is divided by the second argument.
       */
      dividend: ResolvesToNumber<S>,
      divisor: ResolvesToNumber<S>,
    ];
  }

  /**
   * A type describing the `$month` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/month/}
   */
  export interface $month<S> {
    /**
     * Returns the month for a date as a number between 1 (January) and 12 (December).
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/month/}
     */
    $month: {
      /**
       * The date to which the operator is applied. date must be a valid expression that resolves to a Date, a Timestamp, or an ObjectID.
       */
      date: ResolvesToDate<S> | ResolvesToTimestamp<S> | ResolvesToObjectId<S>;

      /**
       * The timezone of the operation result. timezone must be a valid expression that resolves to a string formatted as either an Olson Timezone Identifier or a UTC Offset. If no timezone is provided, the result is displayed in UTC.
       */
      timezone?: ResolvesToString<S>;
    };
  }

  /**
   * A type describing the `$multiply` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/multiply/}
   */
  export interface $multiply<S> {
    /**
     * Multiplies numbers to return the product. Accepts any number of argument expressions.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/multiply/}
     */
    $multiply: [
      /**
       * The arguments can be any valid expression as long as they resolve to numbers.
       * Starting in MongoDB 6.1 you can optimize the $multiply operation. To improve performance, group references at the end of the argument list.
       */
      ...ResolvesToNumber<S>[],
    ];
  }

  /**
   * A type describing the `$ne` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/ne/}
   */
  export interface $ne<S> {
    /**
     * Returns true if the values are not equivalent.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/ne/}
     */
    $ne: [expression1: Expression<S>, expression2: Expression<S>];
  }

  /**
   * A type describing the `$not` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/not/}
   */
  export interface $not<S> {
    /**
     * Returns the boolean value that is the opposite of its argument expression. Accepts a single argument expression.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/not/}
     */
    $not: [expression: Expression<S> | ResolvesToBool<S>];
  }

  /**
   * A type describing the `$objectToArray` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/objectToArray/}
   */
  export interface $objectToArray<S> {
    /**
     * Converts a document to an array of documents representing key-value pairs.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/objectToArray/}
     */
    $objectToArray: ResolvesToObject<S>;
  }

  /**
   * A type describing the `$or` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/or/}
   */
  export interface $or<S> {
    /**
     * Returns true when any of its expressions evaluates to true. Accepts any number of argument expressions.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/or/}
     */
    $or: [...(Expression<S> | ResolvesToBool<S>)[]];
  }

  /**
   * A type describing the `$percentile` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/percentile/}
   */
  export interface $percentile<S> {
    /**
     * Returns an array of scalar values that correspond to specified percentile values.
     * New in MongoDB 7.0.
     * This operator is available as an accumulator in these stages:
     * $group
     * $setWindowFields
     * It is also available as an aggregation expression.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/percentile/}
     */
    $percentile: {
      /**
       * $percentile calculates the percentile values of this data. input must be a field name or an expression that evaluates to a numeric type. If the expression cannot be converted to a numeric type, the $percentile calculation ignores it.
       */
      input: ResolvesToNumber<S> | ResolvesToNumber<S>[];

      /**
       * $percentile calculates a percentile value for each element in p. The elements represent percentages and must evaluate to numeric values in the range 0.0 to 1.0, inclusive.
       * $percentile returns results in the same order as the elements in p.
       */
      p: ResolvesToArray<S>;

      /**
       * The method that mongod uses to calculate the percentile value. The method must be 'approximate'.
       */
      method: AccumulatorPercentile;
    };
  }

  /**
   * A type describing the `$pow` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/pow/}
   */
  export interface $pow<S> {
    /**
     * Raises a number to the specified exponent.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/pow/}
     */
    $pow: [number: ResolvesToNumber<S>, exponent: ResolvesToNumber<S>];
  }

  /**
   * A type describing the `$radiansToDegrees` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/radiansToDegrees/}
   */
  export interface $radiansToDegrees<S> {
    /**
     * Converts a value from radians to degrees.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/radiansToDegrees/}
     */
    $radiansToDegrees: ResolvesToNumber<S>;
  }

  /**
   * A type describing the `$rand` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/rand/}
   */
  export interface $rand<S> {
    /**
     * Returns a random float between 0 and 1
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/rand/}
     */
    $rand: Record<string, never>;
  }

  /**
   * A type describing the `$range` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/range/}
   */
  export interface $range<S> {
    /**
     * Outputs an array containing a sequence of integers according to user-defined inputs.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/range/}
     */
    $range: [
      /**
       * An integer that specifies the start of the sequence. Can be any valid expression that resolves to an integer.
       */
      start: ResolvesToInt<S>,

      /**
       * An integer that specifies the exclusive upper limit of the sequence. Can be any valid expression that resolves to an integer.
       */
      end: ResolvesToInt<S>,

      /**
       * An integer that specifies the increment value. Can be any valid expression that resolves to a non-zero integer. Defaults to 1.
       */
      step?: ResolvesToInt<S>,
    ];
  }

  /**
   * A type describing the `$reduce` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/reduce/}
   */
  export interface $reduce<S> {
    /**
     * Applies an expression to each element in an array and combines them into a single value.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/reduce/}
     */
    $reduce: {
      /**
       * Can be any valid expression that resolves to an array.
       * If the argument resolves to a value of null or refers to a missing field, $reduce returns null.
       * If the argument does not resolve to an array or null nor refers to a missing field, $reduce returns an error.
       */
      input: ResolvesToArray<S>;

      /**
       * The initial cumulative value set before in is applied to the first element of the input array.
       */
      initialValue: Expression<S>;

      /**
       * A valid expression that $reduce applies to each element in the input array in left-to-right order. Wrap the input value with $reverseArray to yield the equivalent of applying the combining expression from right-to-left.
       * During evaluation of the in expression, two variables will be available:
       * - value is the variable that represents the cumulative value of the expression.
       * - this is the variable that refers to the element being processed.
       */
      in:
        | Expression<
            S & {
              /**
               * The variable that represents the cumulative value of the expression.
               */
              $this: any;

              /**
               * The variable that refers to the element being processed.
               */
              $value: any;
            }
          >
        | ExpressionMap<
            S & {
              /**
               * The variable that represents the cumulative value of the expression.
               */
              $this: any;

              /**
               * The variable that refers to the element being processed.
               */
              $value: any;
            }
          >;
    };
  }

  /**
   * A type describing the `$regexFind` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/regexFind/}
   */
  export interface $regexFind<S> {
    /**
     * Applies a regular expression (regex) to a string and returns information on the first matched substring.
     * New in MongoDB 4.2.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/regexFind/}
     */
    $regexFind: {
      /**
       * The string on which you wish to apply the regex pattern. Can be a string or any valid expression that resolves to a string.
       */
      input: ResolvesToString<S>;

      /**
       * The regex pattern to apply. Can be any valid expression that resolves to either a string or regex pattern /<pattern>/. When using the regex /<pattern>/, you can also specify the regex options i and m (but not the s or x options)
       */
      regex: ResolvesToString<S> | Regex;
      options?: string;
    };
  }

  /**
   * A type describing the `$regexFindAll` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/regexFindAll/}
   */
  export interface $regexFindAll<S> {
    /**
     * Applies a regular expression (regex) to a string and returns information on the all matched substrings.
     * New in MongoDB 4.2.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/regexFindAll/}
     */
    $regexFindAll: {
      /**
       * The string on which you wish to apply the regex pattern. Can be a string or any valid expression that resolves to a string.
       */
      input: ResolvesToString<S>;

      /**
       * The regex pattern to apply. Can be any valid expression that resolves to either a string or regex pattern /<pattern>/. When using the regex /<pattern>/, you can also specify the regex options i and m (but not the s or x options)
       */
      regex: ResolvesToString<S> | Regex;
      options?: string;
    };
  }

  /**
   * A type describing the `$regexMatch` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/regexMatch/}
   */
  export interface $regexMatch<S> {
    /**
     * Applies a regular expression (regex) to a string and returns a boolean that indicates if a match is found or not.
     * New in MongoDB 4.2.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/regexMatch/}
     */
    $regexMatch: {
      /**
       * The string on which you wish to apply the regex pattern. Can be a string or any valid expression that resolves to a string.
       */
      input: ResolvesToString<S>;

      /**
       * The regex pattern to apply. Can be any valid expression that resolves to either a string or regex pattern /<pattern>/. When using the regex /<pattern>/, you can also specify the regex options i and m (but not the s or x options)
       */
      regex: ResolvesToString<S> | Regex;
      options?: string;
    };
  }

  /**
   * A type describing the `$replaceAll` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/replaceAll/}
   */
  export interface $replaceAll<S> {
    /**
     * Replaces all instances of a search string in an input string with a replacement string.
     * $replaceAll is both case-sensitive and diacritic-sensitive, and ignores any collation present on a collection.
     * New in MongoDB 4.4.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/replaceAll/}
     */
    $replaceAll: {
      /**
       * The string on which you wish to apply the find. Can be any valid expression that resolves to a string or a null. If input refers to a field that is missing, $replaceAll returns null.
       */
      input: ResolvesToString<S> | ResolvesToNull<S>;

      /**
       * The string to search for within the given input. Can be any valid expression that resolves to a string or a null. If find refers to a field that is missing, $replaceAll returns null.
       */
      find: ResolvesToString<S> | ResolvesToNull<S>;

      /**
       * The string to use to replace all matched instances of find in input. Can be any valid expression that resolves to a string or a null.
       */
      replacement: ResolvesToString<S> | ResolvesToNull<S>;
    };
  }

  /**
   * A type describing the `$replaceOne` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/replaceOne/}
   */
  export interface $replaceOne<S> {
    /**
     * Replaces the first instance of a matched string in a given input.
     * New in MongoDB 4.4.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/replaceOne/}
     */
    $replaceOne: {
      /**
       * The string on which you wish to apply the find. Can be any valid expression that resolves to a string or a null. If input refers to a field that is missing, $replaceAll returns null.
       */
      input: ResolvesToString<S> | ResolvesToNull<S>;

      /**
       * The string to search for within the given input. Can be any valid expression that resolves to a string or a null. If find refers to a field that is missing, $replaceAll returns null.
       */
      find: ResolvesToString<S> | ResolvesToNull<S>;

      /**
       * The string to use to replace all matched instances of find in input. Can be any valid expression that resolves to a string or a null.
       */
      replacement: ResolvesToString<S> | ResolvesToNull<S>;
    };
  }

  /**
   * A type describing the `$reverseArray` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/reverseArray/}
   */
  export interface $reverseArray<S> {
    /**
     * Returns an array with the elements in reverse order.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/reverseArray/}
     */
    $reverseArray: ResolvesToArray<S>;
  }

  /**
   * A type describing the `$round` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/round/}
   */
  export interface $round<S> {
    /**
     * Rounds a number to a whole integer or to a specified decimal place.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/round/}
     */
    $round: [
      /**
       * Can be any valid expression that resolves to a number. Specifically, the expression must resolve to an integer, double, decimal, or long.
       * $round returns an error if the expression resolves to a non-numeric data type.
       */
      number: ResolvesToNumber<S>,

      /**
       * Can be any valid expression that resolves to an integer between -20 and 100, exclusive.
       */
      place?: ResolvesToInt<S>,
    ];
  }

  /**
   * A type describing the `$rtrim` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/rtrim/}
   */
  export interface $rtrim<S> {
    /**
     * Removes whitespace characters, including null, or the specified characters from the end of a string.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/rtrim/}
     */
    $rtrim: {
      /**
       * The string to trim. The argument can be any valid expression that resolves to a string.
       */
      input: ResolvesToString<S>;

      /**
       * The character(s) to trim from the beginning of the input.
       * The argument can be any valid expression that resolves to a string. The $ltrim operator breaks down the string into individual UTF code point to trim from input.
       * If unspecified, $ltrim removes whitespace characters, including the null character.
       */
      chars?: ResolvesToString<S>;
    };
  }

  /**
   * A type describing the `$second` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/second/}
   */
  export interface $second<S> {
    /**
     * Returns the seconds for a date as a number between 0 and 60 (leap seconds).
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/second/}
     */
    $second: {
      /**
       * The date to which the operator is applied. date must be a valid expression that resolves to a Date, a Timestamp, or an ObjectID.
       */
      date: ResolvesToDate<S> | ResolvesToTimestamp<S> | ResolvesToObjectId<S>;

      /**
       * The timezone of the operation result. timezone must be a valid expression that resolves to a string formatted as either an Olson Timezone Identifier or a UTC Offset. If no timezone is provided, the result is displayed in UTC.
       */
      timezone?: ResolvesToString<S>;
    };
  }

  /**
   * A type describing the `$setDifference` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/setDifference/}
   */
  export interface $setDifference<S> {
    /**
     * Returns a set with elements that appear in the first set but not in the second set; i.e. performs a relative complement of the second set relative to the first. Accepts exactly two argument expressions.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/setDifference/}
     */
    $setDifference: [
      /**
       * The arguments can be any valid expression as long as they each resolve to an array.
       */
      expression1: ResolvesToArray<S>,

      /**
       * The arguments can be any valid expression as long as they each resolve to an array.
       */
      expression2: ResolvesToArray<S>,
    ];
  }

  /**
   * A type describing the `$setEquals` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/setEquals/}
   */
  export interface $setEquals<S> {
    /**
     * Returns true if the input sets have the same distinct elements. Accepts two or more argument expressions.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/setEquals/}
     */
    $setEquals: [...ResolvesToArray<S>[]];
  }

  /**
   * A type describing the `$setField` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/setField/}
   */
  export interface $setField<S> {
    /**
     * Adds, updates, or removes a specified field in a document. You can use $setField to add, update, or remove fields with names that contain periods (.) or start with dollar signs ($).
     * New in MongoDB 5.0.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/setField/}
     */
    $setField: {
      /**
       * Field in the input object that you want to add, update, or remove. field can be any valid expression that resolves to a string constant.
       */
      field: ResolvesToString<S>;

      /**
       * Document that contains the field that you want to add or update. input must resolve to an object, missing, null, or undefined.
       */
      input: ResolvesToObject<S>;

      /**
       * The value that you want to assign to field. value can be any valid expression.
       * Set to $$REMOVE to remove field from the input document.
       */
      value: Expression<S>;
    };
  }

  /**
   * A type describing the `$setIntersection` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/setIntersection/}
   */
  export interface $setIntersection<S> {
    /**
     * Returns a set with elements that appear in all of the input sets. Accepts any number of argument expressions.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/setIntersection/}
     */
    $setIntersection: [...ResolvesToArray<S>[]];
  }

  /**
   * A type describing the `$setIsSubset` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/setIsSubset/}
   */
  export interface $setIsSubset<S> {
    /**
     * Returns true if all elements of the first set appear in the second set, including when the first set equals the second set; i.e. not a strict subset. Accepts exactly two argument expressions.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/setIsSubset/}
     */
    $setIsSubset: [
      expression1: ResolvesToArray<S>,
      expression2: ResolvesToArray<S>,
    ];
  }

  /**
   * A type describing the `$setUnion` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/setUnion/}
   */
  export interface $setUnion<S> {
    /**
     * Returns a set with elements that appear in any of the input sets.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/setUnion/}
     */
    $setUnion: [...ResolvesToArray<S>[]];
  }

  /**
   * A type describing the `$sin` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/sin/}
   */
  export interface $sin<S> {
    /**
     * Returns the sine of a value that is measured in radians.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/sin/}
     */
    $sin: ResolvesToNumber<S>;
  }

  /**
   * A type describing the `$sinh` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/sinh/}
   */
  export interface $sinh<S> {
    /**
     * Returns the hyperbolic sine of a value that is measured in radians.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/sinh/}
     */
    $sinh: ResolvesToNumber<S>;
  }

  /**
   * A type describing the `$size` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/size/}
   */
  export interface $size<S> {
    /**
     * Returns the number of elements in the array. Accepts a single expression as argument.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/size/}
     */
    $size: ResolvesToArray<S>;
  }

  /**
   * A type describing the `$slice` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/slice/}
   */
  export interface $slice<S> {
    /**
     * Returns a subset of an array.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/slice/}
     */
    $slice:
      | [
          /**
           * Any valid expression as long as it resolves to an array.
           */
          expression: ResolvesToArray<S>,

          /**
           * Any valid expression as long as it resolves to an integer. If position is specified, n must resolve to a positive integer.
           * If positive, $slice returns up to the first n elements in the array. If the position is specified, $slice returns the first n elements starting from the position.
           * If negative, $slice returns up to the last n elements in the array. n cannot resolve to a negative number if <position> is specified.
           */
          n: ResolvesToInt<S>,
        ]
      | [
          /**
           * Any valid expression as long as it resolves to an array.
           */
          expression: ResolvesToArray<S>,

          /**
           * Any valid expression as long as it resolves to an integer.
           * If positive, $slice determines the starting position from the start of the array. If position is greater than the number of elements, the $slice returns an empty array.
           * If negative, $slice determines the starting position from the end of the array. If the absolute value of the <position> is greater than the number of elements, the starting position is the start of the array.
           */
          position: ResolvesToInt<S>,

          /**
           * Any valid expression as long as it resolves to an integer. If position is specified, n must resolve to a positive integer.
           * If positive, $slice returns up to the first n elements in the array. If the position is specified, $slice returns the first n elements starting from the position.
           * If negative, $slice returns up to the last n elements in the array. n cannot resolve to a negative number if <position> is specified.
           */
          n: ResolvesToInt<S>,
        ];
  }

  /**
   * A type describing the `$sortArray` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/sortArray/}
   */
  export interface $sortArray<S> {
    /**
     * Sorts the elements of an array.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/sortArray/}
     */
    $sortArray: {
      /**
       * The array to be sorted.
       * The result is null if the expression: is missing, evaluates to null, or evaluates to undefined
       * If the expression evaluates to any other non-array value, the document returns an error.
       */
      input: ResolvesToArray<S>;

      /**
       * The document specifies a sort ordering.
       */
      sortBy: Int | SortSpec | SortBy;
    };
  }

  /**
   * A type describing the `$split` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/split/}
   */
  export interface $split<S> {
    /**
     * Splits a string into substrings based on a delimiter. Returns an array of substrings. If the delimiter is not found within the string, returns an array containing the original string.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/split/}
     */
    $split: [
      /**
       * The string to be split. string expression can be any valid expression as long as it resolves to a string.
       */
      string: ResolvesToString<S>,

      /**
       * The delimiter to use when splitting the string expression. delimiter can be any valid expression as long as it resolves to a string.
       */
      delimiter: ResolvesToString<S>,
    ];
  }

  /**
   * A type describing the `$sqrt` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/sqrt/}
   */
  export interface $sqrt<S> {
    /**
     * Calculates the square root.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/sqrt/}
     */
    $sqrt: ResolvesToNumber<S>;
  }

  /**
   * A type describing the `$stdDevPop` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/stdDevPop/}
   */
  export interface $stdDevPop<S> {
    /**
     * Calculates the population standard deviation of the input values. Use if the values encompass the entire population of data you want to represent and do not wish to generalize about a larger population. $stdDevPop ignores non-numeric values.
     * If the values represent only a sample of a population of data from which to generalize about the population, use $stdDevSamp instead.
     * Changed in MongoDB 5.0: Available in the $setWindowFields stage.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/stdDevPop/}
     */
    $stdDevPop: [...ResolvesToNumber<S>[]];
  }

  /**
   * A type describing the `$stdDevSamp` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/stdDevSamp/}
   */
  export interface $stdDevSamp<S> {
    /**
     * Calculates the sample standard deviation of the input values. Use if the values encompass a sample of a population of data from which to generalize about the population. $stdDevSamp ignores non-numeric values.
     * If the values represent the entire population of data or you do not wish to generalize about a larger population, use $stdDevPop instead.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/stdDevSamp/}
     */
    $stdDevSamp: [...ResolvesToNumber<S>[]];
  }

  /**
   * A type describing the `$strLenBytes` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/strLenBytes/}
   */
  export interface $strLenBytes<S> {
    /**
     * Returns the number of UTF-8 encoded bytes in a string.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/strLenBytes/}
     */
    $strLenBytes: ResolvesToString<S>;
  }

  /**
   * A type describing the `$strLenCP` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/strLenCP/}
   */
  export interface $strLenCP<S> {
    /**
     * Returns the number of UTF-8 code points in a string.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/strLenCP/}
     */
    $strLenCP: ResolvesToString<S>;
  }

  /**
   * A type describing the `$strcasecmp` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/strcasecmp/}
   */
  export interface $strcasecmp<S> {
    /**
     * Performs case-insensitive string comparison and returns: 0 if two strings are equivalent, 1 if the first string is greater than the second, and -1 if the first string is less than the second.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/strcasecmp/}
     */
    $strcasecmp: [
      expression1: ResolvesToString<S>,
      expression2: ResolvesToString<S>,
    ];
  }

  /**
   * A type describing the `$substr` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/substr/}
   */
  export interface $substr<S> {
    /**
     * Deprecated. Use $substrBytes or $substrCP.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/substr/}
     */
    $substr: [
      string: ResolvesToString<S>,

      /**
       * If start is a negative number, $substr returns an empty string "".
       */
      start: ResolvesToInt<S>,

      /**
       * If length is a negative number, $substr returns a substring that starts at the specified index and includes the rest of the string.
       */
      length: ResolvesToInt<S>,
    ];
  }

  /**
   * A type describing the `$substrBytes` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/substrBytes/}
   */
  export interface $substrBytes<S> {
    /**
     * Returns the substring of a string. Starts with the character at the specified UTF-8 byte index (zero-based) in the string and continues for the specified number of bytes.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/substrBytes/}
     */
    $substrBytes: [
      string: ResolvesToString<S>,

      /**
       * If start is a negative number, $substr returns an empty string "".
       */
      start: ResolvesToInt<S>,

      /**
       * If length is a negative number, $substr returns a substring that starts at the specified index and includes the rest of the string.
       */
      length: ResolvesToInt<S>,
    ];
  }

  /**
   * A type describing the `$substrCP` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/substrCP/}
   */
  export interface $substrCP<S> {
    /**
     * Returns the substring of a string. Starts with the character at the specified UTF-8 code point (CP) index (zero-based) in the string and continues for the number of code points specified.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/substrCP/}
     */
    $substrCP: [
      string: ResolvesToString<S>,

      /**
       * If start is a negative number, $substr returns an empty string "".
       */
      start: ResolvesToInt<S>,

      /**
       * If length is a negative number, $substr returns a substring that starts at the specified index and includes the rest of the string.
       */
      length: ResolvesToInt<S>,
    ];
  }

  /**
   * A type describing the `$subtract` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/subtract/}
   */
  export interface $subtract<S> {
    /**
     * Returns the result of subtracting the second value from the first. If the two values are numbers, return the difference. If the two values are dates, return the difference in milliseconds. If the two values are a date and a number in milliseconds, return the resulting date. Accepts two argument expressions. If the two values are a date and a number, specify the date argument first as it is not meaningful to subtract a date from a number.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/subtract/}
     */
    $subtract: [
      expression1: ResolvesToNumber<S> | ResolvesToDate<S>,
      expression2: ResolvesToNumber<S> | ResolvesToDate<S>,
    ];
  }

  /**
   * A type describing the `$sum` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/sum/}
   */
  export interface $sum<S> {
    /**
     * Returns a sum of numerical values. Ignores non-numeric values.
     * Changed in MongoDB 5.0: Available in the $setWindowFields stage.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/sum/}
     */
    $sum: [...(ResolvesToNumber<S> | ResolvesToArray<S>)[]];
  }

  /**
   * A type describing the `$switch` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/switch/}
   */
  export interface $switch<S> {
    /**
     * Evaluates a series of case expressions. When it finds an expression which evaluates to true, $switch executes a specified expression and breaks out of the control flow.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/switch/}
     */
    $switch: {
      /**
       * An array of control branch documents. Each branch is a document with the following fields:
       * - case Can be any valid expression that resolves to a boolean. If the result is not a boolean, it is coerced to a boolean value. More information about how MongoDB evaluates expressions as either true or false can be found here.
       * - then Can be any valid expression.
       * The branches array must contain at least one branch document.
       */
      branches: unknown[];

      /**
       * The path to take if no branch case expression evaluates to true.
       * Although optional, if default is unspecified and no branch case evaluates to true, $switch returns an error.
       */
      default?: Expression<S>;
    };
  }

  /**
   * A type describing the `$tan` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/tan/}
   */
  export interface $tan<S> {
    /**
     * Returns the tangent of a value that is measured in radians.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/tan/}
     */
    $tan: ResolvesToNumber<S>;
  }

  /**
   * A type describing the `$tanh` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/tanh/}
   */
  export interface $tanh<S> {
    /**
     * Returns the hyperbolic tangent of a value that is measured in radians.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/tanh/}
     */
    $tanh: ResolvesToNumber<S>;
  }

  /**
   * A type describing the `$toBool` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/toBool/}
   */
  export interface $toBool<S> {
    /**
     * Converts value to a boolean.
     * New in MongoDB 4.0.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/toBool/}
     */
    $toBool: Expression<S>;
  }

  /**
   * A type describing the `$toDate` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/toDate/}
   */
  export interface $toDate<S> {
    /**
     * Converts value to a Date.
     * New in MongoDB 4.0.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/toDate/}
     */
    $toDate: Expression<S>;
  }

  /**
   * A type describing the `$toDecimal` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/toDecimal/}
   */
  export interface $toDecimal<S> {
    /**
     * Converts value to a Decimal128.
     * New in MongoDB 4.0.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/toDecimal/}
     */
    $toDecimal: Expression<S>;
  }

  /**
   * A type describing the `$toDouble` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/toDouble/}
   */
  export interface $toDouble<S> {
    /**
     * Converts value to a double.
     * New in MongoDB 4.0.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/toDouble/}
     */
    $toDouble: Expression<S>;
  }

  /**
   * A type describing the `$toHashedIndexKey` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/toHashedIndexKey/}
   */
  export interface $toHashedIndexKey<S> {
    /**
     * Computes and returns the hash value of the input expression using the same hash function that MongoDB uses to create a hashed index. A hash function maps a key or string to a fixed-size numeric value.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/toHashedIndexKey/}
     */
    $toHashedIndexKey: Expression<S>;
  }

  /**
   * A type describing the `$toInt` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/toInt/}
   */
  export interface $toInt<S> {
    /**
     * Converts value to an integer.
     * New in MongoDB 4.0.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/toInt/}
     */
    $toInt: Expression<S>;
  }

  /**
   * A type describing the `$toLong` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/toLong/}
   */
  export interface $toLong<S> {
    /**
     * Converts value to a long.
     * New in MongoDB 4.0.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/toLong/}
     */
    $toLong: Expression<S>;
  }

  /**
   * A type describing the `$toLower` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/toLower/}
   */
  export interface $toLower<S> {
    /**
     * Converts a string to lowercase. Accepts a single argument expression.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/toLower/}
     */
    $toLower: ResolvesToString<S>;
  }

  /**
   * A type describing the `$toObjectId` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/toObjectId/}
   */
  export interface $toObjectId<S> {
    /**
     * Converts value to an ObjectId.
     * New in MongoDB 4.0.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/toObjectId/}
     */
    $toObjectId: Expression<S>;
  }

  /**
   * A type describing the `$toString` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/toString/}
   */
  export interface $toString<S> {
    /**
     * Converts value to a string.
     * New in MongoDB 4.0.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/toString/}
     */
    $toString: Expression<S>;
  }

  /**
   * A type describing the `$toUpper` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/toUpper/}
   */
  export interface $toUpper<S> {
    /**
     * Converts a string to uppercase. Accepts a single argument expression.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/toUpper/}
     */
    $toUpper: ResolvesToString<S>;
  }

  /**
   * A type describing the `$trim` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/trim/}
   */
  export interface $trim<S> {
    /**
     * Removes whitespace or the specified characters from the beginning and end of a string.
     * New in MongoDB 4.0.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/trim/}
     */
    $trim: {
      /**
       * The string to trim. The argument can be any valid expression that resolves to a string.
       */
      input: ResolvesToString<S>;

      /**
       * The character(s) to trim from the beginning of the input.
       * The argument can be any valid expression that resolves to a string. The $ltrim operator breaks down the string into individual UTF code point to trim from input.
       * If unspecified, $ltrim removes whitespace characters, including the null character.
       */
      chars?: ResolvesToString<S>;
    };
  }

  /**
   * A type describing the `$trunc` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/trunc/}
   */
  export interface $trunc<S> {
    /**
     * Truncates a number to a whole integer or to a specified decimal place.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/trunc/}
     */
    $trunc: [
      /**
       * Can be any valid expression that resolves to a number. Specifically, the expression must resolve to an integer, double, decimal, or long.
       * $trunc returns an error if the expression resolves to a non-numeric data type.
       */
      number: ResolvesToNumber<S>,

      /**
       * Can be any valid expression that resolves to an integer between -20 and 100, exclusive. e.g. -20 < place < 100. Defaults to 0.
       */
      place?: ResolvesToInt<S>,
    ];
  }

  /**
   * A type describing the `$tsIncrement` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/tsIncrement/}
   */
  export interface $tsIncrement<S> {
    /**
     * Returns the incrementing ordinal from a timestamp as a long.
     * New in MongoDB 5.1.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/tsIncrement/}
     */
    $tsIncrement: ResolvesToTimestamp<S>;
  }

  /**
   * A type describing the `$tsSecond` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/tsSecond/}
   */
  export interface $tsSecond<S> {
    /**
     * Returns the seconds from a timestamp as a long.
     * New in MongoDB 5.1.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/tsSecond/}
     */
    $tsSecond: ResolvesToTimestamp<S>;
  }

  /**
   * A type describing the `$type` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/type/}
   */
  export interface $type<S> {
    /**
     * Return the BSON data type of the field.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/type/}
     */
    $type: Expression<S>;
  }

  /**
   * A type describing the `$unsetField` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/unsetField/}
   */
  export interface $unsetField<S> {
    /**
     * You can use $unsetField to remove fields with names that contain periods (.) or that start with dollar signs ($).
     * $unsetField is an alias for $setField using $$REMOVE to remove fields.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/unsetField/}
     */
    $unsetField: {
      /**
       * Field in the input object that you want to add, update, or remove. field can be any valid expression that resolves to a string constant.
       */
      field: ResolvesToString<S>;

      /**
       * Document that contains the field that you want to add or update. input must resolve to an object, missing, null, or undefined.
       */
      input: ResolvesToObject<S>;
    };
  }

  /**
   * A type describing the `$week` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/week/}
   */
  export interface $week<S> {
    /**
     * Returns the week number for a date as a number between 0 (the partial week that precedes the first Sunday of the year) and 53 (leap year).
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/week/}
     */
    $week: {
      /**
       * The date to which the operator is applied. date must be a valid expression that resolves to a Date, a Timestamp, or an ObjectID.
       */
      date: ResolvesToDate<S> | ResolvesToTimestamp<S> | ResolvesToObjectId<S>;

      /**
       * The timezone of the operation result. timezone must be a valid expression that resolves to a string formatted as either an Olson Timezone Identifier or a UTC Offset. If no timezone is provided, the result is displayed in UTC.
       */
      timezone?: ResolvesToString<S>;
    };
  }

  /**
   * A type describing the `$year` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/year/}
   */
  export interface $year<S> {
    /**
     * Returns the year for a date as a number (e.g. 2014).
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/year/}
     */
    $year: {
      /**
       * The date to which the operator is applied. date must be a valid expression that resolves to a Date, a Timestamp, or an ObjectID.
       */
      date: ResolvesToDate<S> | ResolvesToTimestamp<S> | ResolvesToObjectId<S>;

      /**
       * The timezone of the operation result. timezone must be a valid expression that resolves to a string formatted as either an Olson Timezone Identifier or a UTC Offset. If no timezone is provided, the result is displayed in UTC.
       */
      timezone?: ResolvesToString<S>;
    };
  }

  /**
   * A type describing the `$zip` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/zip/}
   */
  export interface $zip<S> {
    /**
     * Merge two arrays together.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/zip/}
     */
    $zip: {
      /**
       * An array of expressions that resolve to arrays. The elements of these input arrays combine to form the arrays of the output array.
       * If any of the inputs arrays resolves to a value of null or refers to a missing field, $zip returns null.
       * If any of the inputs arrays does not resolve to an array or null nor refers to a missing field, $zip returns an error.
       */
      inputs: ResolvesToArray<S>;

      /**
       * A boolean which specifies whether the length of the longest array determines the number of arrays in the output array.
       * The default value is false: the shortest array length determines the number of arrays in the output array.
       */
      useLongestLength?: boolean;

      /**
       * An array of default element values to use if the input arrays have different lengths. You must specify useLongestLength: true along with this field, or else $zip will return an error.
       * If useLongestLength: true but defaults is empty or not specified, $zip uses null as the default value.
       * If specifying a non-empty defaults, you must specify a default for each input array or else $zip will return an error.
       */
      defaults?: unknown[];
    };
  }
}
export namespace Aggregation.Query {
  /**
   * A type describing the `$all` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/all/}
   */
  export interface $all<S> {
    /**
     * Matches arrays that contain all elements specified in the query.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/all/}
     */
    $all: [...FieldQuery<S>[]];
  }

  /**
   * A type describing the `$and` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/and/}
   */
  export interface $and<S> {
    /**
     * Joins query clauses with a logical AND returns all documents that match the conditions of both clauses.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/and/}
     */
    $and: [Query<S>, ...Query<S>[]];
  }

  /**
   * A type describing the `$bitsAllClear` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/bitsAllClear/}
   */
  export interface $bitsAllClear<S> {
    /**
     * Matches numeric or binary values in which a set of bit positions all have a value of 0.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/bitsAllClear/}
     */
    $bitsAllClear: (Int | bson.Binary) | (Int | bson.Binary)[];
  }

  /**
   * A type describing the `$bitsAllSet` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/bitsAllSet/}
   */
  export interface $bitsAllSet<S> {
    /**
     * Matches numeric or binary values in which a set of bit positions all have a value of 1.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/bitsAllSet/}
     */
    $bitsAllSet: (Int | bson.Binary) | (Int | bson.Binary)[];
  }

  /**
   * A type describing the `$bitsAnyClear` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/bitsAnyClear/}
   */
  export interface $bitsAnyClear<S> {
    /**
     * Matches numeric or binary values in which any bit from a set of bit positions has a value of 0.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/bitsAnyClear/}
     */
    $bitsAnyClear: (Int | bson.Binary) | (Int | bson.Binary)[];
  }

  /**
   * A type describing the `$bitsAnySet` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/bitsAnySet/}
   */
  export interface $bitsAnySet<S> {
    /**
     * Matches numeric or binary values in which any bit from a set of bit positions has a value of 1.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/bitsAnySet/}
     */
    $bitsAnySet: (Int | bson.Binary) | (Int | bson.Binary)[];
  }

  /**
   * A type describing the `$box` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/box/}
   */
  export interface $box<S> {
    /**
     * Specifies a rectangular box using legacy coordinate pairs for $geoWithin queries. The 2d index supports $box.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/box/}
     */
    $box: unknown[];
  }

  /**
   * A type describing the `$center` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/center/}
   */
  export interface $center<S> {
    /**
     * Specifies a circle using legacy coordinate pairs to $geoWithin queries when using planar geometry. The 2d index supports $center.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/center/}
     */
    $center: unknown[];
  }

  /**
   * A type describing the `$centerSphere` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/centerSphere/}
   */
  export interface $centerSphere<S> {
    /**
     * Specifies a circle using either legacy coordinate pairs or GeoJSON format for $geoWithin queries when using spherical geometry. The 2dsphere and 2d indexes support $centerSphere.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/centerSphere/}
     */
    $centerSphere: unknown[];
  }

  /**
   * A type describing the `$elemMatch` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/elemMatch/}
   */
  export interface $elemMatch<S> {
    /**
     * The $elemMatch operator matches documents that contain an array field with at least one element that matches all the specified query criteria.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/elemMatch/}
     */
    $elemMatch: Query<S> | FieldQuery<S>;
  }

  /**
   * A type describing the `$eq` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/eq/}
   */
  export interface $eq<S> {
    /**
     * Matches values that are equal to a specified value.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/eq/}
     */
    $eq: Expression<S>;
  }

  /**
   * A type describing the `$exists` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/exists/}
   */
  export interface $exists<S> {
    /**
     * Matches documents that have the specified field.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/exists/}
     */
    $exists: boolean;
  }

  /**
   * A type describing the `$expr` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/expr/}
   */
  export interface $expr<S> {
    /**
     * Allows use of aggregation expressions within the query language.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/expr/}
     */
    $expr: Expression<S>;
  }

  /**
   * A type describing the `$geoIntersects` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/geoIntersects/}
   */
  export interface $geoIntersects<S> {
    /**
     * Selects geometries that intersect with a GeoJSON geometry. The 2dsphere index supports $geoIntersects.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/geoIntersects/}
     */
    $geoIntersects: Geometry<S> & {};
  }

  /**
   * A type describing the `$geoWithin` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/geoWithin/}
   */
  export interface $geoWithin<S> {
    /**
     * Selects geometries within a bounding GeoJSON geometry. The 2dsphere and 2d indexes support $geoWithin.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/geoWithin/}
     */
    $geoWithin: Geometry<S> & {};
  }

  /**
   * A type describing the `$geometry` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/geometry/}
   */
  export interface $geometry<S> {
    /**
     * Specifies a geometry in GeoJSON format to geospatial query operators.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/geometry/}
     */
    $geometry: {
      type: string;
      coordinates: unknown[];
      crs?: Record<string, unknown>;
    };
  }

  /**
   * A type describing the `$gt` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/gt/}
   */
  export interface $gt<S> {
    /**
     * Matches values that are greater than a specified value.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/gt/}
     */
    $gt: any;
  }

  /**
   * A type describing the `$gte` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/gte/}
   */
  export interface $gte<S> {
    /**
     * Matches values that are greater than or equal to a specified value.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/gte/}
     */
    $gte: any;
  }

  /**
   * A type describing the `$in` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/in/}
   */
  export interface $in<S> {
    /**
     * Matches any of the values specified in an array.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/in/}
     */
    $in: unknown[];
  }

  /**
   * A type describing the `$jsonSchema` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/jsonSchema/}
   */
  export interface $jsonSchema<S> {
    /**
     * Validate documents against the given JSON Schema.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/jsonSchema/}
     */
    $jsonSchema: Record<string, unknown>;
  }

  /**
   * A type describing the `$lt` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/lt/}
   */
  export interface $lt<S> {
    /**
     * Matches values that are less than a specified value.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/lt/}
     */
    $lt: any;
  }

  /**
   * A type describing the `$lte` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/lte/}
   */
  export interface $lte<S> {
    /**
     * Matches values that are less than or equal to a specified value.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/lte/}
     */
    $lte: any;
  }

  /**
   * A type describing the `$maxDistance` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/maxDistance/}
   */
  export interface $maxDistance<S> {
    /**
     * Specifies a maximum distance to limit the results of $near and $nearSphere queries. The 2dsphere and 2d indexes support $maxDistance.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/maxDistance/}
     */
    $maxDistance: Number;
  }

  /**
   * A type describing the `$minDistance` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/minDistance/}
   */
  export interface $minDistance<S> {
    /**
     * Specifies a minimum distance to limit the results of $near and $nearSphere queries. For use with 2dsphere index only.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/minDistance/}
     */
    $minDistance: Int | Double;
  }

  /**
   * A type describing the `$mod` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/mod/}
   */
  export interface $mod<S> {
    /**
     * Performs a modulo operation on the value of a field and selects documents with a specified result.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/mod/}
     */
    $mod: [divisor: Number, remainder: Number];
  }

  /**
   * A type describing the `$ne` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/ne/}
   */
  export interface $ne<S> {
    /**
     * Matches all values that are not equal to a specified value.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/ne/}
     */
    $ne: any;
  }

  /**
   * A type describing the `$near` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/near/}
   */
  export interface $near<S> {
    /**
     * Returns geospatial objects in proximity to a point. Requires a geospatial index. The 2dsphere and 2d indexes support $near.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/near/}
     */
    $near: Geometry<S> & {
      /**
       * Distance in meters. Limits the results to those documents that are at most the specified distance from the center point.
       */
      $maxDistance?: Number;

      /**
       * Distance in meters. Limits the results to those documents that are at least the specified distance from the center point.
       */
      $minDistance?: Number;
    };
  }

  /**
   * A type describing the `$nearSphere` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/nearSphere/}
   */
  export interface $nearSphere<S> {
    /**
     * Returns geospatial objects in proximity to a point on a sphere. Requires a geospatial index. The 2dsphere and 2d indexes support $nearSphere.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/nearSphere/}
     */
    $nearSphere: Geometry<S> & {
      /**
       * Distance in meters.
       */
      $maxDistance?: Number;

      /**
       * Distance in meters. Limits the results to those documents that are at least the specified distance from the center point.
       */
      $minDistance?: Number;
    };
  }

  /**
   * A type describing the `$nin` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/nin/}
   */
  export interface $nin<S> {
    /**
     * Matches none of the values specified in an array.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/nin/}
     */
    $nin: unknown[];
  }

  /**
   * A type describing the `$nor` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/nor/}
   */
  export interface $nor<S> {
    /**
     * Joins query clauses with a logical NOR returns all documents that fail to match both clauses.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/nor/}
     */
    $nor: [Query<S>, ...Query<S>[]];
  }

  /**
   * A type describing the `$not` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/not/}
   */
  export interface $not<S> {
    /**
     * Inverts the effect of a query expression and returns documents that do not match the query expression.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/not/}
     */
    $not: FieldQuery<S>;
  }

  /**
   * A type describing the `$or` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/or/}
   */
  export interface $or<S> {
    /**
     * Joins query clauses with a logical OR returns all documents that match the conditions of either clause.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/or/}
     */
    $or: [Query<S>, ...Query<S>[]];
  }

  /**
   * A type describing the `$polygon` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/polygon/}
   */
  export interface $polygon<S> {
    /**
     * Specifies a polygon to using legacy coordinate pairs for $geoWithin queries. The 2d index supports $center.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/polygon/}
     */
    $polygon: unknown[];
  }

  /**
   * A type describing the `$rand` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/rand/}
   */
  export interface $rand<S> {
    /**
     * Generates a random float between 0 and 1.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/rand/}
     */
    $rand: Record<string, never>;
  }

  /**
   * A type describing the `$regex` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/regex/}
   */
  export interface $regex<S> {
    /**
     * Selects documents where values match a specified regular expression.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/regex/}
     */
    $regex: Regex;
  }

  /**
   * A type describing the `$sampleRate` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/sampleRate/}
   */
  export interface $sampleRate<S> {
    /**
     * Randomly select documents at a given rate. Although the exact number of documents selected varies on each run, the quantity chosen approximates the sample rate expressed as a percentage of the total number of documents.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/sampleRate/}
     */
    $sampleRate: ResolvesToDouble<S>;
  }

  /**
   * A type describing the `$size` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/size/}
   */
  export interface $size<S> {
    /**
     * Selects documents if the array field is a specified size.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/size/}
     */
    $size: Int;
  }

  /**
   * A type describing the `$text` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/text/}
   */
  export interface $text<S> {
    /**
     * Performs text search.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/text/}
     */
    $text: {
      /**
       * A string of terms that MongoDB parses and uses to query the text index. MongoDB performs a logical OR search of the terms unless specified as a phrase.
       */
      $search: string;

      /**
       * The language that determines the list of stop words for the search and the rules for the stemmer and tokenizer. If not specified, the search uses the default language of the index.
       * If you specify a default_language value of none, then the text index parses through each word in the field, including stop words, and ignores suffix stemming.
       */
      $language?: string;

      /**
       * A boolean flag to enable or disable case sensitive search. Defaults to false; i.e. the search defers to the case insensitivity of the text index.
       */
      $caseSensitive?: boolean;

      /**
       * A boolean flag to enable or disable diacritic sensitive search against version 3 text indexes. Defaults to false; i.e. the search defers to the diacritic insensitivity of the text index.
       * Text searches against earlier versions of the text index are inherently diacritic sensitive and cannot be diacritic insensitive. As such, the $diacriticSensitive option has no effect with earlier versions of the text index.
       */
      $diacriticSensitive?: boolean;
    };
  }

  /**
   * A type describing the `$type` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/type/}
   */
  export interface $type<S> {
    /**
     * Selects documents if a field is of the specified type.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/type/}
     */
    $type: [...(Int | string)[]];
  }

  /**
   * A type describing the `$where` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/where/}
   */
  export interface $where<S> {
    /**
     * Matches documents that satisfy a JavaScript expression.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/where/}
     */
    $where: Javascript;
  }
}
export namespace Aggregation.Search {
  /**
   * A type describing the `autocomplete` operator.
   * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/autocomplete/}
   */
  export interface Autocomplete<S> {
    /**
     * The autocomplete operator performs a search for a word or phrase that
     * contains a sequence of characters from an incomplete input string. The
     * fields that you intend to query with the autocomplete operator must be
     * indexed with the autocomplete data type in the collection's index definition.
     * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/autocomplete/}
     */
    autocomplete: {
      path: SearchPath<S>;
      query: string;
      tokenOrder?: string;
      fuzzy?: Record<string, unknown>;
      score?: SearchScore;
    };
  }

  /**
   * A type describing the `compound` operator.
   * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/compound/}
   */
  export interface Compound<S> {
    /**
     * The compound operator combines two or more operators into a single query.
     * Each element of a compound query is called a clause, and each clause
     * consists of one or more sub-queries.
     * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/compound/}
     */
    compound: {
      must?: SearchOperator<S> | SearchOperator<S>[];
      mustNot?: SearchOperator<S> | SearchOperator<S>[];
      should?: SearchOperator<S> | SearchOperator<S>[];
      filter?: SearchOperator<S> | SearchOperator<S>[];
      minimumShouldMatch?: Int;
      score?: SearchScore;
    };
  }

  /**
   * A type describing the `embeddedDocument` operator.
   * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/embedded-document/}
   */
  export interface EmbeddedDocument<S> {
    /**
     * The embeddedDocument operator is similar to $elemMatch operator.
     * It constrains multiple query predicates to be satisfied from a single
     * element of an array of embedded documents. embeddedDocument can be used only
     * for queries over fields of the embeddedDocuments
     * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/embedded-document/}
     */
    embeddedDocument: {
      path: SearchPath<S>;
      operator: SearchOperator<S>;
      score?: SearchScore;
    };
  }

  /**
   * A type describing the `equals` operator.
   * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/equals/}
   */
  export interface Equals<S> {
    /**
     * The equals operator checks whether a field matches a value you specify.
     * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/equals/}
     */
    equals: {
      path: SearchPath<S>;
      value:
        | bson.Binary
        | boolean
        | Date
        | bson.ObjectId
        | null
        | Number
        | string;
      score?: SearchScore;
    };
  }

  /**
   * A type describing the `exists` operator.
   * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/exists/}
   */
  export interface Exists<S> {
    /**
     * The exists operator tests if a path to a specified indexed field name exists in a document.
     * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/exists/}
     */
    exists: { path: SearchPath<S>; score?: SearchScore };
  }

  /**
   * A type describing the `facet` operator.
   * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/facet/}
   */
  export interface Facet<S> {
    /**
     * The facet collector groups results by values or ranges in the specified
     * faceted fields and returns the count for each of those groups.
     * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/facet/}
     */
    facet: { facets: Record<string, unknown>; operator?: SearchOperator<S> };
  }

  /**
   * A type describing the `geoShape` operator.
   * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/geoShape/}
   */
  export interface GeoShape<S> {
    /**
     * The geoShape operator supports querying shapes with a relation to a given
     * geometry if indexShapes is set to true in the index definition.
     * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/geoShape/}
     */
    geoShape: {
      path: SearchPath<S>;
      relation: string;
      geometry: Geometry<S>;
      score?: SearchScore;
    };
  }

  /**
   * A type describing the `geoWithin` operator.
   * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/geoWithin/}
   */
  export interface GeoWithin<S> {
    /**
     * The geoWithin operator supports querying geographic points within a given
     * geometry. Only points are returned, even if indexShapes value is true in
     * the index definition.
     * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/geoWithin/}
     */
    geoWithin: {
      path: SearchPath<S>;
      box?: Record<string, unknown>;
      circle?: Record<string, unknown>;
      geometry?: Geometry<S>;
      score?: SearchScore;
    };
  }

  /**
   * A type describing the `in` operator.
   * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/in/}
   */
  export interface In<S> {
    /**
     * The in operator performs a search for an array of BSON values in a field.
     * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/in/}
     */
    in: { path: SearchPath<S>; value: any | any[]; score?: SearchScore };
  }

  /**
   * A type describing the `moreLikeThis` operator.
   * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/moreLikeThis/}
   */
  export interface MoreLikeThis<S> {
    /**
     * The moreLikeThis operator returns documents similar to input documents.
     * The moreLikeThis operator allows you to build features for your applications
     * that display similar or alternative results based on one or more given documents.
     * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/moreLikeThis/}
     */
    moreLikeThis: {
      like: Record<string, unknown> | Record<string, unknown>[];
      score?: SearchScore;
    };
  }

  /**
   * A type describing the `near` operator.
   * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/near/}
   */
  export interface Near<S> {
    /**
     * The near operator supports querying and scoring numeric, date, and GeoJSON point values.
     * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/near/}
     */
    near: {
      path: SearchPath<S>;
      origin: Date | Number | Geometry<S>;
      pivot: Number;
      score?: SearchScore;
    };
  }

  /**
   * A type describing the `phrase` operator.
   * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/phrase/}
   */
  export interface Phrase<S> {
    /**
     * The phrase operator performs search for documents containing an ordered sequence of terms using the analyzer specified in the index configuration.
     * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/phrase/}
     */
    phrase: {
      path: SearchPath<S>;
      query: string | string[];
      slop?: Int;
      synonyms?: string;
      score?: SearchScore;
    };
  }

  /**
   * A type describing the `queryString` operator.
   * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/queryString/}
   */
  export interface QueryString<S> {
    queryString: { defaultPath: SearchPath<S>; query: string };
  }

  /**
   * A type describing the `range` operator.
   * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/range/}
   */
  export interface Range<S> {
    /**
     * The range operator supports querying and scoring numeric, date, and string values.
     * You can use this operator to find results that are within a given numeric, date, objectId, or letter (from the English alphabet) range.
     * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/range/}
     */
    range: {
      path: SearchPath<S>;
      gt?: Date | Number | string | bson.ObjectId;
      gte?: Date | Number | string | bson.ObjectId;
      lt?: Date | Number | string | bson.ObjectId;
      lte?: Date | Number | string | bson.ObjectId;
      score?: SearchScore;
    };
  }

  /**
   * A type describing the `regex` operator.
   * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/regex/}
   */
  export interface Regex<S> {
    /**
     * regex interprets the query field as a regular expression.
     * regex is a term-level operator, meaning that the query field isn't analyzed.
     * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/regex/}
     */
    regex: {
      path: SearchPath<S>;
      query: string;
      allowAnalyzedField?: boolean;
      score?: SearchScore;
    };
  }

  /**
   * A type describing the `text` operator.
   * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/text/}
   */
  export interface Text<S> {
    /**
     * The text operator performs a full-text search using the analyzer that you specify in the index configuration.
     * If you omit an analyzer, the text operator uses the default standard analyzer.
     * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/text/}
     */
    text: {
      path: SearchPath<S>;
      query: string;
      fuzzy?: Record<string, unknown>;
      matchCriteria?: string;
      synonyms?: string;
      score?: SearchScore;
    };
  }

  /**
   * A type describing the `wildcard` operator.
   * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/wildcard/}
   */
  export interface Wildcard<S> {
    /**
     * The wildcard operator enables queries which use special characters in the search string that can match any character.
     * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/wildcard/}
     */
    wildcard: {
      path: SearchPath<S>;
      query: string;
      allowAnalyzedField?: boolean;
      score?: SearchScore;
    };
  }
}
export namespace Aggregation.Stage {
  /**
   * A type describing the `$addFields` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/addFields/}
   */
  export interface $addFields<S> {
    /**
     * Adds new fields to documents. Outputs documents that contain all existing fields from the input documents and newly added fields.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/addFields/}
     */
    $addFields: {
      /**
       * Specify the name of each field to add and set its value to an aggregation expression or an empty object.
       */
    } & { [expression: string]: Expression<S> };
  }

  /**
   * A type describing the `$bucket` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/bucket/}
   */
  export interface $bucket<S> {
    /**
     * Categorizes incoming documents into groups, called buckets, based on a specified expression and bucket boundaries.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/bucket/}
     */
    $bucket: {
      /**
       * An expression to group documents by. To specify a field path, prefix the field name with a dollar sign $ and enclose it in quotes.
       * Unless $bucket includes a default specification, each input document must resolve the groupBy field path or expression to a value that falls within one of the ranges specified by the boundaries.
       */
      groupBy: Expression<S>;

      /**
       * An array of values based on the groupBy expression that specify the boundaries for each bucket. Each adjacent pair of values acts as the inclusive lower boundary and the exclusive upper boundary for the bucket. You must specify at least two boundaries.
       * The specified values must be in ascending order and all of the same type. The exception is if the values are of mixed numeric types, such as:
       */
      boundaries: unknown[];

      /**
       * A literal that specifies the _id of an additional bucket that contains all documents whose groupBy expression result does not fall into a bucket specified by boundaries.
       * If unspecified, each input document must resolve the groupBy expression to a value within one of the bucket ranges specified by boundaries or the operation throws an error.
       * The default value must be less than the lowest boundaries value, or greater than or equal to the highest boundaries value.
       * The default value can be of a different type than the entries in boundaries.
       */
      default?: Expression<S>;

      /**
       * A document that specifies the fields to include in the output documents in addition to the _id field. To specify the field to include, you must use accumulator expressions.
       * If you do not specify an output document, the operation returns a count field containing the number of documents in each bucket.
       * If you specify an output document, only the fields specified in the document are returned; i.e. the count field is not returned unless it is explicitly included in the output document.
       */
      output?: Record<string, unknown>;
    };
  }

  /**
   * A type describing the `$bucketAuto` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/bucketAuto/}
   */
  export interface $bucketAuto<S> {
    /**
     * Categorizes incoming documents into a specific number of groups, called buckets, based on a specified expression. Bucket boundaries are automatically determined in an attempt to evenly distribute the documents into the specified number of buckets.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/bucketAuto/}
     */
    $bucketAuto: {
      /**
       * An expression to group documents by. To specify a field path, prefix the field name with a dollar sign $ and enclose it in quotes.
       */
      groupBy: Expression<S>;

      /**
       * A positive 32-bit integer that specifies the number of buckets into which input documents are grouped.
       */
      buckets: Int;

      /**
       * A document that specifies the fields to include in the output documents in addition to the _id field. To specify the field to include, you must use accumulator expressions.
       * The default count field is not included in the output document when output is specified. Explicitly specify the count expression as part of the output document to include it.
       */
      output?: Record<string, unknown>;

      /**
       * A string that specifies the preferred number series to use to ensure that the calculated boundary edges end on preferred round numbers or their powers of 10.
       * Available only if the all groupBy values are numeric and none of them are NaN.
       */
      granularity?: Granularity;
    };
  }

  /**
   * A type describing the `$changeStream` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/changeStream/}
   */
  export interface $changeStream<S> {
    /**
     * Returns a Change Stream cursor for the collection or database. This stage can only occur once in an aggregation pipeline and it must occur as the first stage.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/changeStream/}
     */
    $changeStream: {
      /**
       * A flag indicating whether the stream should report all changes that occur on the deployment, aside from those on internal databases or collections.
       */
      allChangesForCluster?: boolean;

      /**
       * Specifies whether change notifications include a copy of the full document when modified by update operations.
       */
      fullDocument?: FullDocument;

      /**
       * Valid values are "off", "whenAvailable", or "required". If set to "off", the "fullDocumentBeforeChange" field of the output document is always omitted. If set to "whenAvailable", the "fullDocumentBeforeChange" field will be populated with the pre-image of the document modified by the current change event if such a pre-image is available, and will be omitted otherwise. If set to "required", then the "fullDocumentBeforeChange" field is always populated and an exception is thrown if the pre-image is not              available.
       */
      fullDocumentBeforeChange?: FullDocumentBeforeChange;

      /**
       * Specifies a resume token as the logical starting point for the change stream. Cannot be used with startAfter or startAtOperationTime fields.
       */
      resumeAfter?: Int;

      /**
       * Specifies whether to include additional change events, such as such as DDL and index operations.
       * New in MongoDB 6.0.
       */
      showExpandedEvents?: boolean;

      /**
       * Specifies a resume token as the logical starting point for the change stream. Cannot be used with resumeAfter or startAtOperationTime fields.
       */
      startAfter?: Record<string, unknown>;

      /**
       * Specifies a time as the logical starting point for the change stream. Cannot be used with resumeAfter or startAfter fields.
       */
      startAtOperationTime?: bson.Timestamp;
    };
  }

  /**
   * A type describing the `$changeStreamSplitLargeEvent` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/changeStreamSplitLargeEvent/}
   */
  export interface $changeStreamSplitLargeEvent<S> {
    /**
     * Splits large change stream events that exceed 16 MB into smaller fragments returned in a change stream cursor.
     * You can only use $changeStreamSplitLargeEvent in a $changeStream pipeline and it must be the final stage in the pipeline.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/changeStreamSplitLargeEvent/}
     */
    $changeStreamSplitLargeEvent: Record<string, never>;
  }

  /**
   * A type describing the `$collStats` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/collStats/}
   */
  export interface $collStats<S> {
    /**
     * Returns statistics regarding a collection or view.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/collStats/}
     */
    $collStats: {
      latencyStats?: Record<string, unknown>;
      storageStats?: Record<string, unknown>;
      count?: Record<string, unknown>;
      queryExecStats?: Record<string, unknown>;
    };
  }

  /**
   * A type describing the `$count` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/count/}
   */
  export interface $count<S> {
    /**
     * Returns a count of the number of documents at this stage of the aggregation pipeline.
     * Distinct from the $count aggregation accumulator.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/count/}
     */
    $count: string;
  }

  /**
   * A type describing the `$currentOp` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/currentOp/}
   */
  export interface $currentOp<S> {
    /**
     * Returns information on active and/or dormant operations for the MongoDB deployment. To run, use the db.aggregate() method.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/currentOp/}
     */
    $currentOp: {
      allUsers?: boolean;
      idleConnections?: boolean;
      idleCursors?: boolean;
      idleSessions?: boolean;
      localOps?: boolean;
    };
  }

  /**
   * A type describing the `$densify` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/densify/}
   */
  export interface $densify<S> {
    /**
     * Creates new documents in a sequence of documents where certain values in a field are missing.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/densify/}
     */
    $densify: {
      /**
       * The field to densify. The values of the specified field must either be all numeric values or all dates.
       * Documents that do not contain the specified field continue through the pipeline unmodified.
       * To specify a <field> in an embedded document or in an array, use dot notation.
       */
      field: string;

      /**
       * The field(s) that will be used as the partition keys.
       */
      partitionByFields?: unknown[];

      /**
       * Specification for range based densification.
       */
      range: Range;
    };
  }

  /**
   * A type describing the `$documents` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/documents/}
   */
  export interface $documents<S> {
    /**
     * Returns literal documents from input values.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/documents/}
     */
    $documents: ResolvesToArray<S>;
  }

  /**
   * A type describing the `$facet` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/facet/}
   */
  export interface $facet<S> {
    /**
     * Processes multiple aggregation pipelines within a single stage on the same set of input documents. Enables the creation of multi-faceted aggregations capable of characterizing data across multiple dimensions, or facets, in a single stage.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/facet/}
     */
    $facet: {} & { [facet: string]: Pipeline<S> };
  }

  /**
   * A type describing the `$fill` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/fill/}
   */
  export interface $fill<S> {
    /**
     * Populates null and missing field values within documents.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/fill/}
     */
    $fill: {
      /**
       * Specifies an expression to group the documents. In the $fill stage, a group of documents is known as a partition.
       * If you omit partitionBy and partitionByFields, $fill uses one partition for the entire collection.
       * partitionBy and partitionByFields are mutually exclusive.
       */
      partitionBy?: Record<string, unknown> | string;

      /**
       * Specifies an array of fields as the compound key to group the documents. In the $fill stage, each group of documents is known as a partition.
       * If you omit partitionBy and partitionByFields, $fill uses one partition for the entire collection.
       * partitionBy and partitionByFields are mutually exclusive.
       */
      partitionByFields?: unknown[];

      /**
       * Specifies the field or fields to sort the documents within each partition. Uses the same syntax as the $sort stage.
       */
      sortBy?: SortBy;

      /**
       * Specifies an object containing each field for which to fill missing values. You can specify multiple fields in the output object.
       * The object name is the name of the field to fill. The object value specifies how the field is filled.
       */
      output: Record<string, unknown>;
    };
  }

  /**
   * A type describing the `$geoNear` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/geoNear/}
   */
  export interface $geoNear<S> {
    /**
     * Returns an ordered stream of documents based on the proximity to a geospatial point. Incorporates the functionality of $match, $sort, and $limit for geospatial data. The output documents include an additional distance field and can include a location identifier field.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/geoNear/}
     */
    $geoNear: {
      /**
       * The output field that contains the calculated distance. To specify a field within an embedded document, use dot notation.
       */
      distanceField?: string;

      /**
       * The factor to multiply all distances returned by the query. For example, use the distanceMultiplier to convert radians, as returned by a spherical query, to kilometers by multiplying by the radius of the Earth.
       */
      distanceMultiplier?: Number;

      /**
       * This specifies the output field that identifies the location used to calculate the distance. This option is useful when a location field contains multiple locations. To specify a field within an embedded document, use dot notation.
       */
      includeLocs?: string;

      /**
       * Specify the geospatial indexed field to use when calculating the distance.
       */
      key?: string;

      /**
       * The maximum distance from the center point that the documents can be. MongoDB limits the results to those documents that fall within the specified distance from the center point.
       * Specify the distance in meters if the specified point is GeoJSON and in radians if the specified point is legacy coordinate pairs.
       */
      maxDistance?: Number;

      /**
       * The minimum distance from the center point that the documents can be. MongoDB limits the results to those documents that fall outside the specified distance from the center point.
       * Specify the distance in meters for GeoJSON data and in radians for legacy coordinate pairs.
       */
      minDistance?: Number;

      /**
       * The point for which to find the closest documents.
       */
      near: GeoPoint | ResolvesToObject<S>;

      /**
       * Limits the results to the documents that match the query. The query syntax is the usual MongoDB read operation query syntax.
       * You cannot specify a $near predicate in the query field of the $geoNear stage.
       */
      query?: Query<S>;

      /**
       * Determines how MongoDB calculates the distance between two points:
       * - When true, MongoDB uses $nearSphere semantics and calculates distances using spherical geometry.
       * - When false, MongoDB uses $near semantics: spherical geometry for 2dsphere indexes and planar geometry for 2d indexes.
       * Default: false.
       */
      spherical?: boolean;
    };
  }

  /**
   * A type describing the `$graphLookup` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/graphLookup/}
   */
  export interface $graphLookup<S> {
    /**
     * Performs a recursive search on a collection. To each output document, adds a new array field that contains the traversal results of the recursive search for that document.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/graphLookup/}
     */
    $graphLookup: {
      /**
       * Target collection for the $graphLookup operation to search, recursively matching the connectFromField to the connectToField. The from collection must be in the same database as any other collections used in the operation.
       * Starting in MongoDB 5.1, the collection specified in the from parameter can be sharded.
       */
      from: string;

      /**
       * Expression that specifies the value of the connectFromField with which to start the recursive search. Optionally, startWith may be array of values, each of which is individually followed through the traversal process.
       */
      startWith: Expression<S> | Expression<S>[];

      /**
       * Field name whose value $graphLookup uses to recursively match against the connectToField of other documents in the collection. If the value is an array, each element is individually followed through the traversal process.
       */
      connectFromField: string;

      /**
       * Field name in other documents against which to match the value of the field specified by the connectFromField parameter.
       */
      connectToField: string;

      /**
       * Name of the array field added to each output document. Contains the documents traversed in the $graphLookup stage to reach the document.
       */
      as: string;

      /**
       * Non-negative integral number specifying the maximum recursion depth.
       */
      maxDepth?: Int;

      /**
       * Name of the field to add to each traversed document in the search path. The value of this field is the recursion depth for the document, represented as a NumberLong. Recursion depth value starts at zero, so the first lookup corresponds to zero depth.
       */
      depthField?: string;

      /**
       * A document specifying additional conditions for the recursive search. The syntax is identical to query filter syntax.
       */
      restrictSearchWithMatch?: Query<S>;
    };
  }

  /**
   * A type describing the `$group` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/group/}
   */
  export interface $group<S> {
    /**
     * Groups input documents by a specified identifier expression and applies the accumulator expression(s), if specified, to each group. Consumes all input documents and outputs one document per each distinct group. The output documents only contain the identifier field and, if specified, accumulated fields.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/group/}
     */
    $group: RecordWithStaticFields<
      {
        /**
         * The _id expression specifies the group key. If you specify an _id value of null, or any other constant value, the $group stage returns a single document that aggregates values across all of the input documents.
         */
        _id: Expression<S> | ExpressionMap<S>;
      },
      /**
       * Computed using the accumulator operators.
       */
      Accumulator<S>
    >;
  }

  /**
   * A type describing the `$indexStats` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/indexStats/}
   */
  export interface $indexStats<S> {
    /**
     * Returns statistics regarding the use of each index for the collection.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/indexStats/}
     */
    $indexStats: Record<string, never>;
  }

  /**
   * A type describing the `$limit` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/limit/}
   */
  export interface $limit<S> {
    /**
     * Passes the first n documents unmodified to the pipeline where n is the specified limit. For each input document, outputs either one document (for the first n documents) or zero documents (after the first n documents).
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/limit/}
     */
    $limit: Int;
  }

  /**
   * A type describing the `$listLocalSessions` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/listLocalSessions/}
   */
  export interface $listLocalSessions<S> {
    /**
     * Lists all active sessions recently in use on the currently connected mongos or mongod instance. These sessions may have not yet propagated to the system.sessions collection.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/listLocalSessions/}
     */
    $listLocalSessions: {
      /**
       * Returns all sessions for the specified users. If running with access control, the authenticated user must have privileges with listSessions action on the cluster to list sessions for other users.
       */
      users?: unknown[];

      /**
       * Returns all sessions for all users. If running with access control, the authenticated user must have privileges with listSessions action on the cluster.
       */
      allUsers?: boolean;
    };
  }

  /**
   * A type describing the `$listSampledQueries` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/listSampledQueries/}
   */
  export interface $listSampledQueries<S> {
    /**
     * Lists sampled queries for all collections or a specific collection.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/listSampledQueries/}
     */
    $listSampledQueries: { namespace?: string };
  }

  /**
   * A type describing the `$listSearchIndexes` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/listSearchIndexes/}
   */
  export interface $listSearchIndexes<S> {
    /**
     * Returns information about existing Atlas Search indexes on a specified collection.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/listSearchIndexes/}
     */
    $listSearchIndexes: {
      /**
       * The id of the index to return information about.
       */
      id?: string;

      /**
       * The name of the index to return information about.
       */
      name?: string;
    };
  }

  /**
   * A type describing the `$listSessions` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/listSessions/}
   */
  export interface $listSessions<S> {
    /**
     * Lists all sessions that have been active long enough to propagate to the system.sessions collection.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/listSessions/}
     */
    $listSessions: {
      /**
       * Returns all sessions for the specified users. If running with access control, the authenticated user must have privileges with listSessions action on the cluster to list sessions for other users.
       */
      users?: unknown[];

      /**
       * Returns all sessions for all users. If running with access control, the authenticated user must have privileges with listSessions action on the cluster.
       */
      allUsers?: boolean;
    };
  }

  /**
   * A type describing the `$lookup` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/lookup/}
   */
  export interface $lookup<S> {
    /**
     * Performs a left outer join to another collection in the same database to filter in documents from the "joined" collection for processing.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/lookup/}
     */
    $lookup: {
      /**
       * Specifies the collection in the same database to perform the join with.
       * from is optional, you can use a $documents stage in a $lookup stage instead. For an example, see Use a $documents Stage in a $lookup Stage.
       * Starting in MongoDB 5.1, the collection specified in the from parameter can be sharded.
       */
      from?: string;

      /**
       * Specifies the field from the documents input to the $lookup stage. $lookup performs an equality match on the localField to the foreignField from the documents of the from collection. If an input document does not contain the localField, the $lookup treats the field as having a value of null for matching purposes.
       */
      localField?: string;

      /**
       * Specifies the field from the documents in the from collection. $lookup performs an equality match on the foreignField to the localField from the input documents. If a document in the from collection does not contain the foreignField, the $lookup treats the value as null for matching purposes.
       */
      foreignField?: string;

      /**
       * Specifies variables to use in the pipeline stages. Use the variable expressions to access the fields from the joined collection's documents that are input to the pipeline.
       */
      let?: Record<string, unknown>;

      /**
       * Specifies the pipeline to run on the joined collection. The pipeline determines the resulting documents from the joined collection. To return all documents, specify an empty pipeline [].
       * The pipeline cannot include the $out stage or the $merge stage. Starting in v6.0, the pipeline can contain the Atlas Search $search stage as the first stage inside the pipeline.
       * The pipeline cannot directly access the joined document fields. Instead, define variables for the joined document fields using the let option and then reference the variables in the pipeline stages.
       */
      pipeline?: Pipeline<S>;

      /**
       * Specifies the name of the new array field to add to the input documents. The new array field contains the matching documents from the from collection. If the specified name already exists in the input document, the existing field is overwritten.
       */
      as: string;
    };
  }

  /**
   * A type describing the `$match` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/match/}
   */
  export interface $match<S> {
    /**
     * Filters the document stream to allow only matching documents to pass unmodified into the next pipeline stage. $match uses standard MongoDB queries. For each input document, outputs either one document (a match) or zero documents (no match).
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/match/}
     */
    $match: Query<S>;
  }

  /**
   * A type describing the `$merge` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/merge/}
   */
  export interface $merge<S> {
    /**
     * Writes the resulting documents of the aggregation pipeline to a collection. The stage can incorporate (insert new documents, merge documents, replace documents, keep existing documents, fail the operation, process documents with a custom update pipeline) the results into an output collection. To use the $merge stage, it must be the last stage in the pipeline.
     * New in MongoDB 4.2.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/merge/}
     */
    $merge: {
      /**
       * The output collection.
       */
      into: string | OutCollection;

      /**
       * Field or fields that act as a unique identifier for a document. The identifier determines if a results document matches an existing document in the output collection.
       */
      on?: string | string[];

      /**
       * Specifies variables for use in the whenMatched pipeline.
       */
      let?: Record<string, unknown>;

      /**
       * The behavior of $merge if a result document and an existing document in the collection have the same value for the specified on field(s).
       */
      whenMatched?: WhenMatched | Pipeline<S>;

      /**
       * The behavior of $merge if a result document does not match an existing document in the out collection.
       */
      whenNotMatched?: WhenNotMatched;
    };
  }

  /**
   * A type describing the `$out` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/out/}
   */
  export interface $out<S> {
    /**
     * Writes the resulting documents of the aggregation pipeline to a collection. To use the $out stage, it must be the last stage in the pipeline.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/out/}
     */
    $out: string | OutCollection;
  }

  /**
   * A type describing the `$planCacheStats` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/planCacheStats/}
   */
  export interface $planCacheStats<S> {
    /**
     * Returns plan cache information for a collection.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/planCacheStats/}
     */
    $planCacheStats: Record<string, never>;
  }

  /**
   * A type describing the `$project` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/project/}
   */
  export interface $project<S> {
    /**
     * Reshapes each document in the stream, such as by adding new fields or removing existing fields. For each input document, outputs one document.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/project/}
     */
    $project: {} & { [specification: string]: Expression<S> };
  }

  /**
   * A type describing the `$redact` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/redact/}
   */
  export interface $redact<S> {
    /**
     * Reshapes each document in the stream by restricting the content for each document based on information stored in the documents themselves. Incorporates the functionality of $project and $match. Can be used to implement field level redaction. For each input document, outputs either one or zero documents.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/redact/}
     */
    $redact: Expression<S>;
  }

  /**
   * A type describing the `$replaceRoot` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/replaceRoot/}
   */
  export interface $replaceRoot<S> {
    /**
     * Replaces a document with the specified embedded document. The operation replaces all existing fields in the input document, including the _id field. Specify a document embedded in the input document to promote the embedded document to the top level.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/replaceRoot/}
     */
    $replaceRoot: { newRoot: ResolvesToObject<S> };
  }

  /**
   * A type describing the `$replaceWith` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/replaceWith/}
   */
  export interface $replaceWith<S> {
    /**
     * Replaces a document with the specified embedded document. The operation replaces all existing fields in the input document, including the _id field. Specify a document embedded in the input document to promote the embedded document to the top level.
     * Alias for $replaceRoot.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/replaceWith/}
     */
    $replaceWith: ResolvesToObject<S>;
  }

  /**
   * A type describing the `$sample` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/sample/}
   */
  export interface $sample<S> {
    /**
     * Randomly selects the specified number of documents from its input.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/sample/}
     */
    $sample: {
      /**
       * The number of documents to randomly select.
       */
      size: Int;
    };
  }

  /**
   * A type describing the `$search` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/search/}
   */
  export interface $search<S> {
    /**
     * Performs a full-text search of the field or fields in an Atlas collection.
     * NOTE: $search is only available for MongoDB Atlas clusters, and is not available for self-managed deployments.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/search/}
     */
    $search: SearchOperator<S> & {
      /**
       * Name of the Atlas Search index to use. If omitted, defaults to "default".
       */
      index?: string;

      /**
       * Specifies the highlighting options for displaying search terms in their original context.
       */
      highlight?: SearchHighlight<S>;

      /**
       * Parallelize search across segments on dedicated search nodes.
       * If you don't have separate search nodes on your cluster,
       * Atlas Search ignores this flag. If omitted, defaults to false.
       */
      concurrent?: boolean;

      /**
       * Document that specifies the count options for retrieving a count of the results.
       */
      count?: Record<string, unknown>;

      /**
       * Reference point for retrieving results. searchAfter returns documents starting immediately following the specified reference point.
       */
      searchAfter?: string;

      /**
       * Reference point for retrieving results. searchBefore returns documents starting immediately before the specified reference point.
       */
      searchBefore?: string;

      /**
       * Flag that specifies whether to retrieve a detailed breakdown of the score for the documents in the results. If omitted, defaults to false.
       */
      scoreDetails?: boolean;

      /**
       * Document that specifies the fields to sort the Atlas Search results by in ascending or descending order.
       */
      sort?: Record<string, unknown>;

      /**
       * Flag that specifies whether to perform a full document lookup on the backend database or return only stored source fields directly from Atlas Search.
       */
      returnStoredSource?: boolean;

      /**
       * Document that specifies the tracking option to retrieve analytics information on the search terms.
       */
      tracking?: Record<string, unknown>;
    };
  }

  /**
   * A type describing the `$searchMeta` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/searchMeta/}
   */
  export interface $searchMeta<S> {
    /**
     * Returns different types of metadata result documents for the Atlas Search query against an Atlas collection.
     * NOTE: $searchMeta is only available for MongoDB Atlas clusters running MongoDB v4.4.9 or higher, and is not available for self-managed deployments.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/searchMeta/}
     */
    $searchMeta: SearchOperator<S> & {
      /**
       * Name of the Atlas Search index to use. If omitted, defaults to default.
       */
      index?: string;

      /**
       * Document that specifies the count options for retrieving a count of the results.
       */
      count?: Record<string, unknown>;
    };
  }

  /**
   * A type describing the `$set` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/set/}
   */
  export interface $set<S> {
    /**
     * Adds new fields to documents. Outputs documents that contain all existing fields from the input documents and newly added fields.
     * Alias for $addFields.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/set/}
     */
    $set: {} & { [field: string]: Expression<S> };
  }

  /**
   * A type describing the `$setWindowFields` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/setWindowFields/}
   */
  export interface $setWindowFields<S> {
    /**
     * Groups documents into windows and applies one or more operators to the documents in each window.
     * New in MongoDB 5.0.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/setWindowFields/}
     */
    $setWindowFields: {
      /**
       * Specifies the field(s) to sort the documents by in the partition. Uses the same syntax as the $sort stage. Default is no sorting.
       */
      sortBy: SortBy;

      /**
       * Specifies the field(s) to append to the documents in the output returned by the $setWindowFields stage. Each field is set to the result returned by the window operator.
       * A field can contain dots to specify embedded document fields and array fields. The semantics for the embedded document dotted notation in the $setWindowFields stage are the same as the $addFields and $set stages.
       */
      output: Record<string, unknown>;

      /**
       * Specifies an expression to group the documents. In the $setWindowFields stage, the group of documents is known as a partition. Default is one partition for the entire collection.
       */
      partitionBy?: Expression<S>;
    };
  }

  /**
   * A type describing the `$shardedDataDistribution` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/shardedDataDistribution/}
   */
  export interface $shardedDataDistribution<S> {
    /**
     * Provides data and size distribution information on sharded collections.
     * New in MongoDB 6.0.3.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/shardedDataDistribution/}
     */
    $shardedDataDistribution: Record<string, never>;
  }

  /**
   * A type describing the `$skip` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/skip/}
   */
  export interface $skip<S> {
    /**
     * Skips the first n documents where n is the specified skip number and passes the remaining documents unmodified to the pipeline. For each input document, outputs either zero documents (for the first n documents) or one document (if after the first n documents).
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/skip/}
     */
    $skip: Int;
  }

  /**
   * A type describing the `$sort` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/sort/}
   */
  export interface $sort<S> {
    /**
     * Reorders the document stream by a specified sort key. Only the order changes; the documents remain unmodified. For each input document, outputs one document.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/sort/}
     */
    $sort: {} & { [sort: string]: Expression<S> | SortSpec };
  }

  /**
   * A type describing the `$sortByCount` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/sortByCount/}
   */
  export interface $sortByCount<S> {
    /**
     * Groups incoming documents based on the value of a specified expression, then computes the count of documents in each distinct group.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/sortByCount/}
     */
    $sortByCount: Expression<S>;
  }

  /**
   * A type describing the `$unionWith` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/unionWith/}
   */
  export interface $unionWith<S> {
    /**
     * Performs a union of two collections; i.e. combines pipeline results from two collections into a single result set.
     * New in MongoDB 4.4.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/unionWith/}
     */
    $unionWith: {
      /**
       * The collection or view whose pipeline results you wish to include in the result set.
       */
      coll: string;

      /**
       * An aggregation pipeline to apply to the specified coll.
       * The pipeline cannot include the $out and $merge stages. Starting in v6.0, the pipeline can contain the Atlas Search $search stage as the first stage inside the pipeline.
       */
      pipeline?: Pipeline<S>;
    };
  }

  /**
   * A type describing the `$unset` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/unset/}
   */
  export interface $unset<S> {
    /**
     * Removes or excludes fields from documents.
     * Alias for $project stage that removes or excludes fields.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/unset/}
     */
    $unset: [...UnprefixedFieldPath<S>[]];
  }

  /**
   * A type describing the `$unwind` operator.
   * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/unwind/}
   */
  export interface $unwind<S> {
    /**
     * Deconstructs an array field from the input documents to output a document for each element. Each output document replaces the array with an element value. For each input document, outputs n documents where n is the number of array elements and can be zero for an empty array.
     * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/unwind/}
     */
    $unwind: {
      /**
       * Field path to an array field.
       */
      path: ArrayFieldPath<S>;

      /**
       * The name of a new field to hold the array index of the element. The name cannot start with a dollar sign $.
       */
      includeArrayIndex?: string;

      /**
       * If true, if the path is null, missing, or an empty array, $unwind outputs the document.
       * If false, if path is null, missing, or an empty array, $unwind does not output a document.
       * The default value is false.
       */
      preserveNullAndEmptyArrays?: boolean;
    };
  }

  /**
   * A type describing the `$vectorSearch` operator.
   * @see {@link https://www.mongodb.com/docs/atlas/atlas-vector-search/vector-search-stage/}
   */
  export interface $vectorSearch<S> {
    /**
     * The $vectorSearch stage performs an ANN or ENN search on a vector in the specified field.
     * @see {@link https://www.mongodb.com/docs/atlas/atlas-vector-search/vector-search-stage/}
     */
    $vectorSearch: {
      /**
       * Name of the Atlas Vector Search index to use.
       */
      index: string;

      /**
       * Number of documents to return in the results. This value can't exceed the value of numCandidates if you specify numCandidates.
       */
      limit: Int;

      /**
       * Indexed vector type field to search.
       */
      path: string;

      /**
       * Array of numbers that represent the query vector. The number type must match the indexed field value type.
       */
      queryVector: unknown[];

      /**
       * This is required if numCandidates is omitted. false to run ANN search. true to run ENN search.
       */
      exact?: boolean;

      /**
       * Any match query that compares an indexed field with a boolean, date, objectId, number (not decimals), string, or UUID to use as a pre-filter.
       */
      filter?: Query<S>;

      /**
       * This field is required if exact is false or omitted.
       * Number of nearest neighbors to use during the search. Value must be less than or equal to (<=) 10000. You can't specify a number less than the number of documents to return (limit).
       */
      numCandidates?: Int;
    };
  }
}

export type Int = number | bson.Int32 | { $numberInt: string };
export type Double = number | bson.Double | { $numberDouble: string };
export type Decimal = bson.Decimal128 | { $numberDecimal: string };
export type Regex =
  | RegExp
  | bson.BSONRegExp
  | { pattern: string; options?: string };
export type Long = bigint | bson.Long | { $numberLong: string };
export type Javascript = bson.Code | Function | string;
export type Geometry<S> =
  | { type: 'Point'; coordinates: number[] }
  | { type: 'MultiPoint'; coordinates: number[][] }
  | { type: 'LineString'; coordinates: number[][] }
  | { type: 'MultiLineString'; coordinates: number[][][] }
  | { type: 'Polygon'; coordinates: number[][][] }
  | { type: 'MultiPolygon'; coordinates: number[][][][] }
  | Aggregation.Query.$box<S>
  | Aggregation.Query.$center<S>
  | Aggregation.Query.$centerSphere<S>
  | Aggregation.Query.$geometry<S>
  | Aggregation.Query.$polygon<S>;
export type Number = Int | Long | Double | Decimal;
export type BsonPrimitive =
  | Number
  | bson.Binary
  | bson.ObjectId
  | string
  | boolean
  | Date
  | null
  | Regex
  | Javascript
  | bson.Timestamp;
export type SearchPath<S> =
  | UnprefixedFieldPath<S>
  | UnprefixedFieldPath<S>[]
  | { wildcard: string };
export type SearchScore = unknown;
export type Granularity = string;
export type FullDocument = string;
export type FullDocumentBeforeChange = string;
export type AccumulatorPercentile = string;
export type Range = unknown;
export type SortBy = unknown;
export type GeoPoint = unknown;
export type SortSpec = -1 | 1;
export type TimeUnit =
  | 'year'
  | 'quarter'
  | 'month'
  | 'week'
  | 'day'
  | 'hour'
  | 'minute'
  | 'second'
  | 'millisecond';
export type OutCollection = unknown;
export type WhenMatched = string;
export type WhenNotMatched = string;
export type Expression<S> =
  | ExpressionOperator<S>
  | FieldPath<S>
  | BsonPrimitive
  | FieldExpression<S>
  | FieldPath<S>[];
export type ExpressionMap<S> = { [k: string]: Expression<S> };
export type Stage<S> =
  | StageOperator<S>
  | Aggregation.Stage.$addFields<S>
  | Aggregation.Stage.$bucket<S>
  | Aggregation.Stage.$bucketAuto<S>
  | Aggregation.Stage.$changeStream<S>
  | Aggregation.Stage.$changeStreamSplitLargeEvent<S>
  | Aggregation.Stage.$collStats<S>
  | Aggregation.Stage.$count<S>
  | Aggregation.Stage.$currentOp<S>
  | Aggregation.Stage.$densify<S>
  | Aggregation.Stage.$documents<S>
  | Aggregation.Stage.$facet<S>
  | Aggregation.Stage.$fill<S>
  | Aggregation.Stage.$geoNear<S>
  | Aggregation.Stage.$graphLookup<S>
  | Aggregation.Stage.$group<S>
  | Aggregation.Stage.$indexStats<S>
  | Aggregation.Stage.$limit<S>
  | Aggregation.Stage.$listLocalSessions<S>
  | Aggregation.Stage.$listSampledQueries<S>
  | Aggregation.Stage.$listSearchIndexes<S>
  | Aggregation.Stage.$listSessions<S>
  | Aggregation.Stage.$lookup<S>
  | Aggregation.Stage.$match<S>
  | Aggregation.Stage.$merge<S>
  | Aggregation.Stage.$out<S>
  | Aggregation.Stage.$planCacheStats<S>
  | Aggregation.Stage.$project<S>
  | Aggregation.Stage.$redact<S>
  | Aggregation.Stage.$replaceRoot<S>
  | Aggregation.Stage.$replaceWith<S>
  | Aggregation.Stage.$sample<S>
  | Aggregation.Stage.$search<S>
  | Aggregation.Stage.$searchMeta<S>
  | Aggregation.Stage.$set<S>
  | Aggregation.Stage.$setWindowFields<S>
  | Aggregation.Stage.$shardedDataDistribution<S>
  | Aggregation.Stage.$skip<S>
  | Aggregation.Stage.$sort<S>
  | Aggregation.Stage.$sortByCount<S>
  | Aggregation.Stage.$unionWith<S>
  | Aggregation.Stage.$unset<S>
  | Aggregation.Stage.$unwind<S>
  | Aggregation.Stage.$vectorSearch<S>;
export type Pipeline<S> = Stage<S>[];
export type Query<S> =
  | QueryOperator<S>
  | Partial<{ [k in keyof S]: Condition<S[k]> }>
  | Aggregation.Query.$and<S>
  | Aggregation.Query.$expr<S>
  | Aggregation.Query.$jsonSchema<S>
  | Aggregation.Query.$nor<S>
  | Aggregation.Query.$or<S>
  | Aggregation.Query.$sampleRate<S>
  | Aggregation.Query.$text<S>
  | Aggregation.Query.$where<S>;
export type Accumulator<S> =
  | Aggregation.Accumulator.$accumulator<S>
  | Aggregation.Accumulator.$addToSet<S>
  | Aggregation.Accumulator.$avg<S>
  | Aggregation.Accumulator.$bottom<S>
  | Aggregation.Accumulator.$bottomN<S>
  | Aggregation.Accumulator.$count<S>
  | Aggregation.Accumulator.$first<S>
  | Aggregation.Accumulator.$firstN<S>
  | Aggregation.Accumulator.$last<S>
  | Aggregation.Accumulator.$lastN<S>
  | Aggregation.Accumulator.$max<S>
  | Aggregation.Accumulator.$maxN<S>
  | Aggregation.Accumulator.$median<S>
  | Aggregation.Accumulator.$mergeObjects<S>
  | Aggregation.Accumulator.$min<S>
  | Aggregation.Accumulator.$minN<S>
  | Aggregation.Accumulator.$percentile<S>
  | Aggregation.Accumulator.$push<S>
  | Aggregation.Accumulator.$stdDevPop<S>
  | Aggregation.Accumulator.$stdDevSamp<S>
  | Aggregation.Accumulator.$sum<S>
  | Aggregation.Accumulator.$top<S>
  | Aggregation.Accumulator.$topN<S>;
export type SearchHighlight<S> = {
  path:
    | UnprefixedFieldPath<S>
    | UnprefixedFieldPath<S>[]
    | { wildcard: string }
    | '*'
    | MultiAnalyzerSpec<S>
    | (UnprefixedFieldPath<S> | MultiAnalyzerSpec<S>)[];

  maxCharsToExamine?: number;
  maxNumPassages?: number;
};
export type FieldPath<S> = `$${AFieldPath<S, any>}`;
export type UnprefixedFieldPath<S> = AFieldPath<S, any>;
export type NumberFieldPath<S> = `$${AFieldPath<S, Number>}`;
export type DoubleFieldPath<S> = `$${AFieldPath<S, Double>}`;
export type StringFieldPath<S> = `$${AFieldPath<S, string>}`;
export type ObjectFieldPath<S> = `$${AFieldPath<S, Record<string, unknown>>}`;
export type ArrayFieldPath<S> = `$${AFieldPath<S, unknown[]>}`;
export type BinDataFieldPath<S> = `$${AFieldPath<S, bson.Binary>}`;
export type ObjectIdFieldPath<S> = `$${AFieldPath<S, bson.ObjectId>}`;
export type BoolFieldPath<S> = `$${AFieldPath<S, boolean>}`;
export type DateFieldPath<S> = `$${AFieldPath<S, Date>}`;
export type NullFieldPath<S> = `$${AFieldPath<S, null>}`;
export type RegexFieldPath<S> = `$${AFieldPath<S, Regex>}`;
export type JavascriptFieldPath<S> = `$${AFieldPath<S, Javascript>}`;
export type IntFieldPath<S> = `$${AFieldPath<S, Int>}`;
export type TimestampFieldPath<S> = `$${AFieldPath<S, bson.Timestamp>}`;
export type LongFieldPath<S> = `$${AFieldPath<S, Long>}`;
export type DecimalFieldPath<S> = `$${AFieldPath<S, Decimal>}`;
export type ResolvesToNumber<S> =
  | ResolvesToAny<S>
  | NumberFieldPath<S>
  | Number
  | ResolvesToInt<S>
  | ResolvesToDouble<S>
  | ResolvesToLong<S>
  | ResolvesToDecimal<S>
  | Aggregation.Expression.$abs<S>
  | Aggregation.Expression.$avg<S>
  | Aggregation.Expression.$pow<S>
  | Aggregation.Expression.$sum<S>;
export type ResolvesToDouble<S> =
  | ResolvesToAny<S>
  | DoubleFieldPath<S>
  | Double
  | Aggregation.Expression.$acos<S>
  | Aggregation.Expression.$acosh<S>
  | Aggregation.Expression.$add<S>
  | Aggregation.Expression.$asin<S>
  | Aggregation.Expression.$asinh<S>
  | Aggregation.Expression.$atan<S>
  | Aggregation.Expression.$atan2<S>
  | Aggregation.Expression.$atanh<S>
  | Aggregation.Expression.$cos<S>
  | Aggregation.Expression.$cosh<S>
  | Aggregation.Expression.$degreesToRadians<S>
  | Aggregation.Expression.$divide<S>
  | Aggregation.Expression.$exp<S>
  | Aggregation.Expression.$ln<S>
  | Aggregation.Expression.$log<S>
  | Aggregation.Expression.$log10<S>
  | Aggregation.Expression.$median<S>
  | Aggregation.Expression.$radiansToDegrees<S>
  | Aggregation.Expression.$rand<S>
  | Aggregation.Expression.$round<S>
  | Aggregation.Expression.$sin<S>
  | Aggregation.Expression.$sinh<S>
  | Aggregation.Expression.$sqrt<S>
  | Aggregation.Expression.$stdDevPop<S>
  | Aggregation.Expression.$stdDevSamp<S>
  | Aggregation.Expression.$subtract<S>
  | Aggregation.Expression.$tan<S>
  | Aggregation.Expression.$tanh<S>
  | Aggregation.Expression.$toDouble<S>
  | Aggregation.Query.$rand<S>;
export type ResolvesToString<S> =
  | ResolvesToAny<S>
  | StringFieldPath<S>
  | string
  | Aggregation.Expression.$concat<S>
  | Aggregation.Expression.$dateToString<S>
  | Aggregation.Expression.$ltrim<S>
  | Aggregation.Expression.$replaceAll<S>
  | Aggregation.Expression.$replaceOne<S>
  | Aggregation.Expression.$rtrim<S>
  | Aggregation.Expression.$substr<S>
  | Aggregation.Expression.$substrBytes<S>
  | Aggregation.Expression.$substrCP<S>
  | Aggregation.Expression.$toLower<S>
  | Aggregation.Expression.$toString<S>
  | Aggregation.Expression.$toUpper<S>
  | Aggregation.Expression.$trim<S>
  | Aggregation.Expression.$trunc<S>
  | Aggregation.Expression.$type<S>;
export type ResolvesToObject<S> =
  | '$$ROOT'
  | ResolvesToAny<S>
  | ObjectFieldPath<S>
  | Record<string, unknown>
  | Aggregation.Expression.$arrayToObject<S>
  | Aggregation.Expression.$dateToParts<S>
  | Aggregation.Expression.$mergeObjects<S>
  | Aggregation.Expression.$regexFind<S>
  | Aggregation.Expression.$setField<S>
  | Aggregation.Expression.$unsetField<S>;
export type ResolvesToArray<S> =
  | ResolvesToAny<S>
  | ArrayFieldPath<S>
  | unknown[]
  | Aggregation.Expression.$concatArrays<S>
  | Aggregation.Expression.$filter<S>
  | Aggregation.Expression.$firstN<S>
  | Aggregation.Expression.$lastN<S>
  | Aggregation.Expression.$map<S>
  | Aggregation.Expression.$maxN<S>
  | Aggregation.Expression.$minN<S>
  | Aggregation.Expression.$objectToArray<S>
  | Aggregation.Expression.$percentile<S>
  | Aggregation.Expression.$range<S>
  | Aggregation.Expression.$regexFindAll<S>
  | Aggregation.Expression.$reverseArray<S>
  | Aggregation.Expression.$setDifference<S>
  | Aggregation.Expression.$setIntersection<S>
  | Aggregation.Expression.$setUnion<S>
  | Aggregation.Expression.$slice<S>
  | Aggregation.Expression.$sortArray<S>
  | Aggregation.Expression.$split<S>
  | Aggregation.Expression.$zip<S>;
export type ResolvesToBinData<S> =
  | ResolvesToAny<S>
  | BinDataFieldPath<S>
  | bson.Binary;
export type ResolvesToObjectId<S> =
  | ResolvesToAny<S>
  | ObjectIdFieldPath<S>
  | bson.ObjectId
  | Aggregation.Expression.$toObjectId<S>;
export type ResolvesToBool<S> =
  | ResolvesToAny<S>
  | BoolFieldPath<S>
  | boolean
  | Aggregation.Expression.$allElementsTrue<S>
  | Aggregation.Expression.$and<S>
  | Aggregation.Expression.$anyElementTrue<S>
  | Aggregation.Expression.$eq<S>
  | Aggregation.Expression.$gt<S>
  | Aggregation.Expression.$gte<S>
  | Aggregation.Expression.$in<S>
  | Aggregation.Expression.$isArray<S>
  | Aggregation.Expression.$isNumber<S>
  | Aggregation.Expression.$lt<S>
  | Aggregation.Expression.$lte<S>
  | Aggregation.Expression.$ne<S>
  | Aggregation.Expression.$not<S>
  | Aggregation.Expression.$or<S>
  | Aggregation.Expression.$regexMatch<S>
  | Aggregation.Expression.$setEquals<S>
  | Aggregation.Expression.$setIsSubset<S>
  | Aggregation.Expression.$toBool<S>;
export type ResolvesToDate<S> =
  | '$$NOW'
  | ResolvesToAny<S>
  | DateFieldPath<S>
  | Date
  | Aggregation.Expression.$add<S>
  | Aggregation.Expression.$dateAdd<S>
  | Aggregation.Expression.$dateFromParts<S>
  | Aggregation.Expression.$dateFromString<S>
  | Aggregation.Expression.$dateSubtract<S>
  | Aggregation.Expression.$dateTrunc<S>
  | Aggregation.Expression.$subtract<S>
  | Aggregation.Expression.$toDate<S>;
export type ResolvesToNull<S> = ResolvesToAny<S> | NullFieldPath<S> | null;
export type ResolvesToRegex<S> = ResolvesToAny<S> | RegexFieldPath<S> | Regex;
export type ResolvesToJavascript<S> =
  | ResolvesToAny<S>
  | JavascriptFieldPath<S>
  | Javascript;
export type ResolvesToInt<S> =
  | ResolvesToAny<S>
  | IntFieldPath<S>
  | Int
  | Aggregation.Expression.$add<S>
  | Aggregation.Expression.$binarySize<S>
  | Aggregation.Expression.$bitAnd<S>
  | Aggregation.Expression.$bitNot<S>
  | Aggregation.Expression.$bitOr<S>
  | Aggregation.Expression.$bitXor<S>
  | Aggregation.Expression.$bsonSize<S>
  | Aggregation.Expression.$ceil<S>
  | Aggregation.Expression.$cmp<S>
  | Aggregation.Expression.$dateDiff<S>
  | Aggregation.Expression.$dayOfMonth<S>
  | Aggregation.Expression.$dayOfWeek<S>
  | Aggregation.Expression.$dayOfYear<S>
  | Aggregation.Expression.$floor<S>
  | Aggregation.Expression.$hour<S>
  | Aggregation.Expression.$indexOfArray<S>
  | Aggregation.Expression.$indexOfBytes<S>
  | Aggregation.Expression.$indexOfCP<S>
  | Aggregation.Expression.$isoDayOfWeek<S>
  | Aggregation.Expression.$isoWeek<S>
  | Aggregation.Expression.$isoWeekYear<S>
  | Aggregation.Expression.$millisecond<S>
  | Aggregation.Expression.$minute<S>
  | Aggregation.Expression.$mod<S>
  | Aggregation.Expression.$month<S>
  | Aggregation.Expression.$round<S>
  | Aggregation.Expression.$second<S>
  | Aggregation.Expression.$size<S>
  | Aggregation.Expression.$strLenBytes<S>
  | Aggregation.Expression.$strLenCP<S>
  | Aggregation.Expression.$strcasecmp<S>
  | Aggregation.Expression.$subtract<S>
  | Aggregation.Expression.$toInt<S>
  | Aggregation.Expression.$week<S>
  | Aggregation.Expression.$year<S>;
export type ResolvesToTimestamp<S> =
  | ResolvesToAny<S>
  | TimestampFieldPath<S>
  | bson.Timestamp
  | '$clusterTime';
export type ResolvesToLong<S> =
  | ResolvesToAny<S>
  | LongFieldPath<S>
  | Long
  | Aggregation.Expression.$add<S>
  | Aggregation.Expression.$bitAnd<S>
  | Aggregation.Expression.$bitNot<S>
  | Aggregation.Expression.$bitOr<S>
  | Aggregation.Expression.$bitXor<S>
  | Aggregation.Expression.$round<S>
  | Aggregation.Expression.$subtract<S>
  | Aggregation.Expression.$toHashedIndexKey<S>
  | Aggregation.Expression.$toLong<S>
  | Aggregation.Expression.$tsIncrement<S>
  | Aggregation.Expression.$tsSecond<S>;
export type ResolvesToDecimal<S> =
  | ResolvesToAny<S>
  | DecimalFieldPath<S>
  | Decimal
  | Aggregation.Expression.$acos<S>
  | Aggregation.Expression.$acosh<S>
  | Aggregation.Expression.$add<S>
  | Aggregation.Expression.$asin<S>
  | Aggregation.Expression.$asinh<S>
  | Aggregation.Expression.$atan<S>
  | Aggregation.Expression.$atan2<S>
  | Aggregation.Expression.$atanh<S>
  | Aggregation.Expression.$cos<S>
  | Aggregation.Expression.$cosh<S>
  | Aggregation.Expression.$degreesToRadians<S>
  | Aggregation.Expression.$multiply<S>
  | Aggregation.Expression.$radiansToDegrees<S>
  | Aggregation.Expression.$round<S>
  | Aggregation.Expression.$sin<S>
  | Aggregation.Expression.$sinh<S>
  | Aggregation.Expression.$subtract<S>
  | Aggregation.Expression.$tan<S>
  | Aggregation.Expression.$tanh<S>
  | Aggregation.Expression.$toDecimal<S>;
export type AccumulatorOperator<S> =
  | Aggregation.Accumulator.$accumulator<S>
  | Aggregation.Accumulator.$addToSet<S>
  | Aggregation.Accumulator.$avg<S>
  | Aggregation.Accumulator.$bottom<S>
  | Aggregation.Accumulator.$bottomN<S>
  | Aggregation.Accumulator.$count<S>
  | Aggregation.Accumulator.$covariancePop<S>
  | Aggregation.Accumulator.$covarianceSamp<S>
  | Aggregation.Accumulator.$denseRank<S>
  | Aggregation.Accumulator.$derivative<S>
  | Aggregation.Accumulator.$documentNumber<S>
  | Aggregation.Accumulator.$expMovingAvg<S>
  | Aggregation.Accumulator.$first<S>
  | Aggregation.Accumulator.$firstN<S>
  | Aggregation.Accumulator.$integral<S>
  | Aggregation.Accumulator.$last<S>
  | Aggregation.Accumulator.$lastN<S>
  | Aggregation.Accumulator.$linearFill<S>
  | Aggregation.Accumulator.$locf<S>
  | Aggregation.Accumulator.$max<S>
  | Aggregation.Accumulator.$maxN<S>
  | Aggregation.Accumulator.$median<S>
  | Aggregation.Accumulator.$mergeObjects<S>
  | Aggregation.Accumulator.$min<S>
  | Aggregation.Accumulator.$minN<S>
  | Aggregation.Accumulator.$percentile<S>
  | Aggregation.Accumulator.$push<S>
  | Aggregation.Accumulator.$rank<S>
  | Aggregation.Accumulator.$shift<S>
  | Aggregation.Accumulator.$stdDevPop<S>
  | Aggregation.Accumulator.$stdDevSamp<S>
  | Aggregation.Accumulator.$sum<S>
  | Aggregation.Accumulator.$top<S>
  | Aggregation.Accumulator.$topN<S>;
export type Window<S> =
  | Aggregation.Accumulator.$addToSet<S>
  | Aggregation.Accumulator.$avg<S>
  | Aggregation.Accumulator.$bottom<S>
  | Aggregation.Accumulator.$bottomN<S>
  | Aggregation.Accumulator.$count<S>
  | Aggregation.Accumulator.$covariancePop<S>
  | Aggregation.Accumulator.$covarianceSamp<S>
  | Aggregation.Accumulator.$denseRank<S>
  | Aggregation.Accumulator.$derivative<S>
  | Aggregation.Accumulator.$documentNumber<S>
  | Aggregation.Accumulator.$expMovingAvg<S>
  | Aggregation.Accumulator.$first<S>
  | Aggregation.Accumulator.$firstN<S>
  | Aggregation.Accumulator.$integral<S>
  | Aggregation.Accumulator.$last<S>
  | Aggregation.Accumulator.$lastN<S>
  | Aggregation.Accumulator.$linearFill<S>
  | Aggregation.Accumulator.$locf<S>
  | Aggregation.Accumulator.$max<S>
  | Aggregation.Accumulator.$maxN<S>
  | Aggregation.Accumulator.$median<S>
  | Aggregation.Accumulator.$min<S>
  | Aggregation.Accumulator.$minN<S>
  | Aggregation.Accumulator.$percentile<S>
  | Aggregation.Accumulator.$push<S>
  | Aggregation.Accumulator.$rank<S>
  | Aggregation.Accumulator.$shift<S>
  | Aggregation.Accumulator.$stdDevPop<S>
  | Aggregation.Accumulator.$stdDevSamp<S>
  | Aggregation.Accumulator.$sum<S>;
export type ExpressionOperator<S> =
  | Aggregation.Expression.$abs<S>
  | Aggregation.Expression.$acos<S>
  | Aggregation.Expression.$acosh<S>
  | Aggregation.Expression.$add<S>
  | Aggregation.Expression.$allElementsTrue<S>
  | Aggregation.Expression.$and<S>
  | Aggregation.Expression.$anyElementTrue<S>
  | Aggregation.Expression.$arrayElemAt<S>
  | Aggregation.Expression.$arrayToObject<S>
  | Aggregation.Expression.$asin<S>
  | Aggregation.Expression.$asinh<S>
  | Aggregation.Expression.$atan<S>
  | Aggregation.Expression.$atan2<S>
  | Aggregation.Expression.$atanh<S>
  | Aggregation.Expression.$avg<S>
  | Aggregation.Expression.$binarySize<S>
  | Aggregation.Expression.$bitAnd<S>
  | Aggregation.Expression.$bitNot<S>
  | Aggregation.Expression.$bitOr<S>
  | Aggregation.Expression.$bitXor<S>
  | Aggregation.Expression.$bsonSize<S>
  | Aggregation.Expression.$case<S>
  | Aggregation.Expression.$ceil<S>
  | Aggregation.Expression.$cmp<S>
  | Aggregation.Expression.$concat<S>
  | Aggregation.Expression.$concatArrays<S>
  | Aggregation.Expression.$cond<S>
  | Aggregation.Expression.$convert<S>
  | Aggregation.Expression.$cos<S>
  | Aggregation.Expression.$cosh<S>
  | Aggregation.Expression.$dateAdd<S>
  | Aggregation.Expression.$dateDiff<S>
  | Aggregation.Expression.$dateFromParts<S>
  | Aggregation.Expression.$dateFromString<S>
  | Aggregation.Expression.$dateSubtract<S>
  | Aggregation.Expression.$dateToParts<S>
  | Aggregation.Expression.$dateToString<S>
  | Aggregation.Expression.$dateTrunc<S>
  | Aggregation.Expression.$dayOfMonth<S>
  | Aggregation.Expression.$dayOfWeek<S>
  | Aggregation.Expression.$dayOfYear<S>
  | Aggregation.Expression.$degreesToRadians<S>
  | Aggregation.Expression.$divide<S>
  | Aggregation.Expression.$eq<S>
  | Aggregation.Expression.$exp<S>
  | Aggregation.Expression.$filter<S>
  | Aggregation.Expression.$first<S>
  | Aggregation.Expression.$firstN<S>
  | Aggregation.Expression.$floor<S>
  | Aggregation.Expression.$function<S>
  | Aggregation.Expression.$getField<S>
  | Aggregation.Expression.$gt<S>
  | Aggregation.Expression.$gte<S>
  | Aggregation.Expression.$hour<S>
  | Aggregation.Expression.$ifNull<S>
  | Aggregation.Expression.$in<S>
  | Aggregation.Expression.$indexOfArray<S>
  | Aggregation.Expression.$indexOfBytes<S>
  | Aggregation.Expression.$indexOfCP<S>
  | Aggregation.Expression.$isArray<S>
  | Aggregation.Expression.$isNumber<S>
  | Aggregation.Expression.$isoDayOfWeek<S>
  | Aggregation.Expression.$isoWeek<S>
  | Aggregation.Expression.$isoWeekYear<S>
  | Aggregation.Expression.$last<S>
  | Aggregation.Expression.$lastN<S>
  | Aggregation.Expression.$let<S>
  | Aggregation.Expression.$literal<S>
  | Aggregation.Expression.$ln<S>
  | Aggregation.Expression.$log<S>
  | Aggregation.Expression.$log10<S>
  | Aggregation.Expression.$lt<S>
  | Aggregation.Expression.$lte<S>
  | Aggregation.Expression.$ltrim<S>
  | Aggregation.Expression.$map<S>
  | Aggregation.Expression.$max<S>
  | Aggregation.Expression.$maxN<S>
  | Aggregation.Expression.$median<S>
  | Aggregation.Expression.$mergeObjects<S>
  | Aggregation.Expression.$meta<S>
  | Aggregation.Expression.$millisecond<S>
  | Aggregation.Expression.$min<S>
  | Aggregation.Expression.$minN<S>
  | Aggregation.Expression.$minute<S>
  | Aggregation.Expression.$mod<S>
  | Aggregation.Expression.$month<S>
  | Aggregation.Expression.$multiply<S>
  | Aggregation.Expression.$ne<S>
  | Aggregation.Expression.$not<S>
  | Aggregation.Expression.$objectToArray<S>
  | Aggregation.Expression.$or<S>
  | Aggregation.Expression.$percentile<S>
  | Aggregation.Expression.$pow<S>
  | Aggregation.Expression.$radiansToDegrees<S>
  | Aggregation.Expression.$rand<S>
  | Aggregation.Expression.$range<S>
  | Aggregation.Expression.$reduce<S>
  | Aggregation.Expression.$regexFind<S>
  | Aggregation.Expression.$regexFindAll<S>
  | Aggregation.Expression.$regexMatch<S>
  | Aggregation.Expression.$replaceAll<S>
  | Aggregation.Expression.$replaceOne<S>
  | Aggregation.Expression.$reverseArray<S>
  | Aggregation.Expression.$round<S>
  | Aggregation.Expression.$rtrim<S>
  | Aggregation.Expression.$second<S>
  | Aggregation.Expression.$setDifference<S>
  | Aggregation.Expression.$setEquals<S>
  | Aggregation.Expression.$setField<S>
  | Aggregation.Expression.$setIntersection<S>
  | Aggregation.Expression.$setIsSubset<S>
  | Aggregation.Expression.$setUnion<S>
  | Aggregation.Expression.$sin<S>
  | Aggregation.Expression.$sinh<S>
  | Aggregation.Expression.$size<S>
  | Aggregation.Expression.$slice<S>
  | Aggregation.Expression.$sortArray<S>
  | Aggregation.Expression.$split<S>
  | Aggregation.Expression.$sqrt<S>
  | Aggregation.Expression.$stdDevPop<S>
  | Aggregation.Expression.$stdDevSamp<S>
  | Aggregation.Expression.$strLenBytes<S>
  | Aggregation.Expression.$strLenCP<S>
  | Aggregation.Expression.$strcasecmp<S>
  | Aggregation.Expression.$substr<S>
  | Aggregation.Expression.$substrBytes<S>
  | Aggregation.Expression.$substrCP<S>
  | Aggregation.Expression.$subtract<S>
  | Aggregation.Expression.$sum<S>
  | Aggregation.Expression.$switch<S>
  | Aggregation.Expression.$tan<S>
  | Aggregation.Expression.$tanh<S>
  | Aggregation.Expression.$toBool<S>
  | Aggregation.Expression.$toDate<S>
  | Aggregation.Expression.$toDecimal<S>
  | Aggregation.Expression.$toDouble<S>
  | Aggregation.Expression.$toHashedIndexKey<S>
  | Aggregation.Expression.$toInt<S>
  | Aggregation.Expression.$toLong<S>
  | Aggregation.Expression.$toLower<S>
  | Aggregation.Expression.$toObjectId<S>
  | Aggregation.Expression.$toString<S>
  | Aggregation.Expression.$toUpper<S>
  | Aggregation.Expression.$trim<S>
  | Aggregation.Expression.$trunc<S>
  | Aggregation.Expression.$tsIncrement<S>
  | Aggregation.Expression.$tsSecond<S>
  | Aggregation.Expression.$type<S>
  | Aggregation.Expression.$unsetField<S>
  | Aggregation.Expression.$week<S>
  | Aggregation.Expression.$year<S>
  | Aggregation.Expression.$zip<S>;
export type ResolvesToAny<S> =
  | Aggregation.Expression.$arrayElemAt<S>
  | Aggregation.Expression.$cond<S>
  | Aggregation.Expression.$convert<S>
  | Aggregation.Expression.$first<S>
  | Aggregation.Expression.$function<S>
  | Aggregation.Expression.$getField<S>
  | Aggregation.Expression.$ifNull<S>
  | Aggregation.Expression.$last<S>
  | Aggregation.Expression.$let<S>
  | Aggregation.Expression.$literal<S>
  | Aggregation.Expression.$max<S>
  | Aggregation.Expression.$meta<S>
  | Aggregation.Expression.$min<S>
  | Aggregation.Expression.$reduce<S>
  | Aggregation.Expression.$switch<S>;
export type SwitchBranch<S> = Aggregation.Expression.$case<S>;
export type FieldQuery<S> =
  | Aggregation.Query.$all<S>
  | Aggregation.Query.$bitsAllClear<S>
  | Aggregation.Query.$bitsAllSet<S>
  | Aggregation.Query.$bitsAnyClear<S>
  | Aggregation.Query.$bitsAnySet<S>
  | Aggregation.Query.$elemMatch<S>
  | Aggregation.Query.$eq<S>
  | Aggregation.Query.$exists<S>
  | Aggregation.Query.$geoIntersects<S>
  | Aggregation.Query.$geoWithin<S>
  | Aggregation.Query.$gt<S>
  | Aggregation.Query.$gte<S>
  | Aggregation.Query.$in<S>
  | Aggregation.Query.$lt<S>
  | Aggregation.Query.$lte<S>
  | Aggregation.Query.$maxDistance<S>
  | Aggregation.Query.$minDistance<S>
  | Aggregation.Query.$mod<S>
  | Aggregation.Query.$ne<S>
  | Aggregation.Query.$near<S>
  | Aggregation.Query.$nearSphere<S>
  | Aggregation.Query.$nin<S>
  | Aggregation.Query.$not<S>
  | Aggregation.Query.$regex<S>
  | Aggregation.Query.$size<S>
  | Aggregation.Query.$type<S>;
export type QueryOperator<S> =
  | Aggregation.Query.$all<S>
  | Aggregation.Query.$and<S>
  | Aggregation.Query.$bitsAllClear<S>
  | Aggregation.Query.$bitsAllSet<S>
  | Aggregation.Query.$bitsAnyClear<S>
  | Aggregation.Query.$bitsAnySet<S>
  | Aggregation.Query.$box<S>
  | Aggregation.Query.$center<S>
  | Aggregation.Query.$centerSphere<S>
  | Aggregation.Query.$elemMatch<S>
  | Aggregation.Query.$eq<S>
  | Aggregation.Query.$exists<S>
  | Aggregation.Query.$expr<S>
  | Aggregation.Query.$geoIntersects<S>
  | Aggregation.Query.$geoWithin<S>
  | Aggregation.Query.$geometry<S>
  | Aggregation.Query.$gt<S>
  | Aggregation.Query.$gte<S>
  | Aggregation.Query.$in<S>
  | Aggregation.Query.$jsonSchema<S>
  | Aggregation.Query.$lt<S>
  | Aggregation.Query.$lte<S>
  | Aggregation.Query.$maxDistance<S>
  | Aggregation.Query.$minDistance<S>
  | Aggregation.Query.$mod<S>
  | Aggregation.Query.$ne<S>
  | Aggregation.Query.$near<S>
  | Aggregation.Query.$nearSphere<S>
  | Aggregation.Query.$nin<S>
  | Aggregation.Query.$nor<S>
  | Aggregation.Query.$not<S>
  | Aggregation.Query.$or<S>
  | Aggregation.Query.$polygon<S>
  | Aggregation.Query.$rand<S>
  | Aggregation.Query.$regex<S>
  | Aggregation.Query.$sampleRate<S>
  | Aggregation.Query.$size<S>
  | Aggregation.Query.$text<S>
  | Aggregation.Query.$type<S>
  | Aggregation.Query.$where<S>;
export type SearchOperator<S> =
  | Aggregation.Search.Autocomplete<S>
  | Aggregation.Search.Compound<S>
  | Aggregation.Search.EmbeddedDocument<S>
  | Aggregation.Search.Equals<S>
  | Aggregation.Search.Exists<S>
  | Aggregation.Search.Facet<S>
  | Aggregation.Search.GeoShape<S>
  | Aggregation.Search.GeoWithin<S>
  | Aggregation.Search.In<S>
  | Aggregation.Search.MoreLikeThis<S>
  | Aggregation.Search.Near<S>
  | Aggregation.Search.Phrase<S>
  | Aggregation.Search.QueryString<S>
  | Aggregation.Search.Range<S>
  | Aggregation.Search.Regex<S>
  | Aggregation.Search.Text<S>
  | Aggregation.Search.Wildcard<S>;
export type StageOperator<S> =
  | Aggregation.Stage.$addFields<S>
  | Aggregation.Stage.$bucket<S>
  | Aggregation.Stage.$bucketAuto<S>
  | Aggregation.Stage.$changeStream<S>
  | Aggregation.Stage.$changeStreamSplitLargeEvent<S>
  | Aggregation.Stage.$collStats<S>
  | Aggregation.Stage.$count<S>
  | Aggregation.Stage.$currentOp<S>
  | Aggregation.Stage.$densify<S>
  | Aggregation.Stage.$documents<S>
  | Aggregation.Stage.$facet<S>
  | Aggregation.Stage.$fill<S>
  | Aggregation.Stage.$geoNear<S>
  | Aggregation.Stage.$graphLookup<S>
  | Aggregation.Stage.$group<S>
  | Aggregation.Stage.$indexStats<S>
  | Aggregation.Stage.$limit<S>
  | Aggregation.Stage.$listLocalSessions<S>
  | Aggregation.Stage.$listSampledQueries<S>
  | Aggregation.Stage.$listSearchIndexes<S>
  | Aggregation.Stage.$listSessions<S>
  | Aggregation.Stage.$lookup<S>
  | Aggregation.Stage.$match<S>
  | Aggregation.Stage.$merge<S>
  | Aggregation.Stage.$out<S>
  | Aggregation.Stage.$planCacheStats<S>
  | Aggregation.Stage.$project<S>
  | Aggregation.Stage.$redact<S>
  | Aggregation.Stage.$replaceRoot<S>
  | Aggregation.Stage.$replaceWith<S>
  | Aggregation.Stage.$sample<S>
  | Aggregation.Stage.$search<S>
  | Aggregation.Stage.$searchMeta<S>
  | Aggregation.Stage.$set<S>
  | Aggregation.Stage.$setWindowFields<S>
  | Aggregation.Stage.$shardedDataDistribution<S>
  | Aggregation.Stage.$skip<S>
  | Aggregation.Stage.$sort<S>
  | Aggregation.Stage.$sortByCount<S>
  | Aggregation.Stage.$unionWith<S>
  | Aggregation.Stage.$unset<S>
  | Aggregation.Stage.$unwind<S>
  | Aggregation.Stage.$vectorSearch<S>;
