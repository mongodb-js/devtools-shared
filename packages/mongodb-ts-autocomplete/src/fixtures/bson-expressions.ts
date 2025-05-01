// TODO: everything in here is just a very minimal stub until we can generate
// this file from the real bson expression types we'll get in MONGOSH-2032

import type * as bson from 'bson';

declare global {
  export function ObjectId(id: string): bson.ObjectId;
}
