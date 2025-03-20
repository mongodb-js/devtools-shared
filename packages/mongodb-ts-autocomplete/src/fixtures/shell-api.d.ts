// TODO: everything in here is just a very minimal stub until we can generate
// this file from the work in MONGOSH-2031

/* eslint-disable @typescript-eslint/triple-slash-reference */
/// <reference path="mql.d.ts" />

export {}; // turns this into an "external module"

declare global {
  namespace ShellAPI {
    export interface Collection<T> {
      find(query: MQL.Filter<T>): MQL.Cursor<T>;
      findOne(query: MQL.Filter<T>): T;
      aggregate(pipeline: MQL.Pipeline<T>): MQL.Cursor<T>;
      insertOne(value: T): void;
      insertMany(value: MQL.Array<T>): void;
      updateOne(
        query: MQL.Filter<T>,
        modifier: Partial<T> | MQL.Pipeline<T>
      ): void;
      updateMany(
        query: MQL.Filter<T>,
        modifier: Partial<T> | MQL.Pipeline<T>
      ): void;
    }

    export interface Database {
      runCommand(
        cmd: string | MQL.Document,
        options: MQL.Document
      ): MQL.Document;
    }
  }
}
