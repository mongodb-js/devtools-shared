// TODO: everything in here is just a very minimal stub until we can generate
// this file from the real bson expression types we'll get in MONGOSH-2032

/* eslint-disable @typescript-eslint/triple-slash-reference */
/// <reference path="bson.d.ts" />

export {}; // turns this into an "external module"

declare global {
  export function ObjectId(id: string): bson.ObjectId;
}
