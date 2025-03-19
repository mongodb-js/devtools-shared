import * as schema from './schema';
import type * as bson from 'bson';

type Doc = {
  _id: bson.ObjectId;
  name: string;
  age: number;
  address: string;
  phone: string;
  email: string;
  hobbies: string[];
  createdAt: Date;
  updatedAt: Date;
};

const pipeline: schema.Pipeline<Doc> = [
  {
    $match: {
      $and: [
        {
          name: 'John',
        },
        {
          $gt: {
            age: 18,
          },
        },
        {
          age: 18,
        },
      ],
    },
  },
  {
    $match: {
      name: 'John',
      age: 18,
    },
  },
];
