/**
 * Constants for various types of namespaces for stage operators.
 */
const DATABASE = 'db';
const COLLECTION = 'coll';
const VIEW = 'view';
const TIME_SERIES = 'timeseries';

const ANY_COLLECTION_NAMESPACE = [COLLECTION, VIEW, TIME_SERIES] as const;

const ANY_NAMESPACE = [DATABASE, ...ANY_COLLECTION_NAMESPACE] as const;

export {
  DATABASE,
  COLLECTION,
  VIEW,
  TIME_SERIES,
  ANY_COLLECTION_NAMESPACE,
  ANY_NAMESPACE,
};
