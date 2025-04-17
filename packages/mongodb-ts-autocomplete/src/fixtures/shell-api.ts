// TODO: everything in here is just a very minimal stub until we can generate
// this file from the work in MONGOSH-2031

import type * as mql from './mql.ts';

export interface Collection<T> {
  find(query: mql.Filter<T>): mql.Cursor<T>;
  findOne(query: mql.Filter<T>): T;
  aggregate(pipeline: mql.Pipeline<T>): mql.Cursor<T>;
  insertOne(value: T): void;
  insertMany(value: mql.Array<T>): void;
  updateOne(query: mql.Filter<T>, modifier: Partial<T> | mql.Pipeline<T>): void;
  updateMany(
    query: mql.Filter<T>,
    modifier: Partial<T> | mql.Pipeline<T>,
  ): void;
}

export interface Database {
  runCommand(cmd: string | mql.Document, options: mql.Document): mql.Document;
}
