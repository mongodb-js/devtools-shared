/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Example
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/jsonSchema/#syntax}
 */
function test0() {
  type TestCollection = {
    name: string;
    major: string;
    gpa: bson.Double | number;
    address: {
      street: string;
      zipcode: string;
    };
  };

  const aggregation: schema.Pipeline<TestCollection> = [
    {
      $match: {
        $jsonSchema: {
          required: ['name', 'major', 'gpa', 'address'],
          properties: {
            name: {
              bsonType: 'string',
              description: 'must be a string and is required',
            },
            address: {
              bsonType: 'object',
              required: ['zipcode'],
              properties: {
                street: { bsonType: 'string' },
                zipcode: { bsonType: 'string' },
              },
            },
          },
        },
      },
    },
  ];
}
