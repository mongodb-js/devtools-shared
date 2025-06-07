import * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Basic
 * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/embedded-document/#index-definition}
 */
function test0() {
  type sales = {
    _id: {
      $oid: string;
    };
    saleDate: {
      $date: {
        $numberLong: string;
      };
    };
    items: Array<{
      name: string;
      tags: Array<string>;
      price: {
        $numberDecimal: string;
      };
      quantity: {
        $numberInt: string;
      };
    }>;
    storeLocation: string;
    customer: {
      gender: string;
      age: {
        $numberInt: string;
      };
      email: string;
      satisfaction: {
        $numberInt: string;
      };
    };
    couponUsed: boolean;
    purchaseMethod: string;
  };

  const aggregation: schema.Pipeline<sales> = [
    /**
     * This stage is unsupported by the static type system, so we're casting it to 'any' (this test accesses nested fields, which is not currently supported).
     */
    {
      $search: {
        embeddedDocument: {
          path: 'items',
          operator: {
            compound: {
              must: [{ text: { path: 'items.tags', query: 'school' } }],
              should: [{ text: { path: 'items.name', query: 'backpack' } }],
            },
          },
          score: { embedded: { aggregate: 'mean' } },
        },
      },
    } as any,

    /**
     * This stage is unsupported by the static type system, so we're casting it to 'any' (this test accesses nested fields, which is not currently supported).
     */
    { $limit: 5 } as any,

    /**
     * This stage is unsupported by the static type system, so we're casting it to 'any' (this test accesses nested fields, which is not currently supported).
     */
    {
      $project: {
        _id: 0,
        'items.name': 1,
        'items.tags': 1,
        score: { $meta: 'searchScore' },
      },
    } as any,
  ];
}

/**
 * Facet
 * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/embedded-document/#facet-query}
 */
function test1() {
  type sales = {
    _id: {
      $oid: string;
    };
    saleDate: {
      $date: {
        $numberLong: string;
      };
    };
    items: Array<{
      name: string;
      tags: Array<string>;
      price: {
        $numberDecimal: string;
      };
      quantity: {
        $numberInt: string;
      };
    }>;
    storeLocation: string;
    customer: {
      gender: string;
      age: {
        $numberInt: string;
      };
      email: string;
      satisfaction: {
        $numberInt: string;
      };
    };
    couponUsed: boolean;
    purchaseMethod: string;
  };

  const aggregation: schema.Pipeline<sales> = [
    /**
     * This stage is unsupported by the static type system, so we're casting it to 'any' (this test accesses nested fields, which is not currently supported).
     */
    {
      $searchMeta: {
        facet: {
          operator: {
            embeddedDocument: {
              path: 'items',
              operator: {
                compound: {
                  must: [{ text: { path: 'items.tags', query: 'school' } }],
                  should: [{ text: { path: 'items.name', query: 'backpack' } }],
                },
              },
            },
          },
          facets: {
            purchaseMethodFacet: { type: 'string', path: 'purchaseMethod' },
          },
        },
      },
    } as any,
  ];
}

/**
 * Query and Sort
 * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/embedded-document/#query-and-sort}
 */
function test2() {
  type sales = {
    _id: {
      $oid: string;
    };
    saleDate: {
      $date: {
        $numberLong: string;
      };
    };
    items: Array<{
      name: string;
      tags: Array<string>;
      price: {
        $numberDecimal: string;
      };
      quantity: {
        $numberInt: string;
      };
    }>;
    storeLocation: string;
    customer: {
      gender: string;
      age: {
        $numberInt: string;
      };
      email: string;
      satisfaction: {
        $numberInt: string;
      };
    };
    couponUsed: boolean;
    purchaseMethod: string;
  };

  const aggregation: schema.Pipeline<sales> = [
    /**
     * This stage is unsupported by the static type system, so we're casting it to 'any' (this test accesses nested fields, which is not currently supported).
     */
    {
      $search: {
        embeddedDocument: {
          path: 'items',
          operator: { text: { path: 'items.name', query: 'laptop' } },
        },
        sort: { 'items.tags': 1 },
      },
    } as any,

    /**
     * This stage is unsupported by the static type system, so we're casting it to 'any' (this test accesses nested fields, which is not currently supported).
     */
    { $limit: 5 } as any,

    /**
     * This stage is unsupported by the static type system, so we're casting it to 'any' (this test accesses nested fields, which is not currently supported).
     */
    {
      $project: {
        _id: 0,
        'items.name': 1,
        'items.tags': 1,
        score: { $meta: 'searchScore' },
      },
    } as any,
  ];
}

/**
 * Query for Matching Embedded Documents Only
 * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/embedded-document/#query-for-matching-embedded-documents-only}
 */
function test3() {
  type sales = {
    _id: {
      $oid: string;
    };
    saleDate: {
      $date: {
        $numberLong: string;
      };
    };
    items: Array<{
      name: string;
      tags: Array<string>;
      price: {
        $numberDecimal: string;
      };
      quantity: {
        $numberInt: string;
      };
    }>;
    storeLocation: string;
    customer: {
      gender: string;
      age: {
        $numberInt: string;
      };
      email: string;
      satisfaction: {
        $numberInt: string;
      };
    };
    couponUsed: boolean;
    purchaseMethod: string;
  };

  const aggregation: schema.Pipeline<sales> = [
    {
      $search: {
        embeddedDocument: {
          path: 'items',
          operator: {
            compound: {
              must: [
                { range: { path: 'items.quantity', gt: 2 } },
                { exists: { path: 'items.price' } },
                { text: { path: 'items.tags', query: 'school' } },
              ],
            },
          },
        },
      },
    },
    { $limit: 2 },

    /**
     * This stage is unsupported by the static type system, so we're casting it to 'any' (this test accesses nested fields, which is not currently supported).
     */
    {
      $project: {
        _id: 0,
        storeLocation: 1,
        items: {
          $filter: {
            input: '$items',
            cond: {
              $and: [
                { $ifNull: ['$$this.price', 'false'] },
                { $gt: ['$$this.quantity', 2] },
                { $in: ['office', '$$this.tags'] },
              ],
            },
          },
        },
      },
    } as any,
  ];
}
