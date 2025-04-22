// TODO: everything in here is just a very minimal stub until we can generate
// this file from the work in MONGOSH-2031

import type * as mql from './mql.ts';

export interface Collection<T extends { schema: mql.Document }> {
  find(query: mql.Filter<T['schema']>): mql.Cursor<T['schema']>;
  findOne(query: mql.Filter<T['schema']>): T['schema'];
  aggregate(pipeline: mql.Pipeline<T['schema']>): mql.Cursor<T['schema']>;
  insertOne(value: T['schema']): void;
  insertMany(value: mql.Array<T['schema']>): void;
  updateOne(
    query: mql.Filter<T['schema']>,
    modifier: Partial<T> | mql.Pipeline<T['schema']>,
  ): void;
  updateMany(
    query: mql.Filter<T['schema']>,
    modifier: Partial<T['schema']> | mql.Pipeline<T['schema']>,
  ): void;
}

export interface Database {
  runCommand(cmd: string | mql.Document, options: mql.Document): mql.Document;
}
