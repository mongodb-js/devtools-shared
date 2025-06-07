import { SimplifiedSchema } from 'mongodb-schema';
import { types } from 'util';

interface SchemaInfo {
  collectionName: string;
  schema: SimplifiedSchema;
}

const geoPolygonSchema: SchemaInfo = {
  collectionName: 'places',
  schema: {
    loc: {
      types: [
        {
          bsonType: 'Document',
          fields: {
            type: {
              types: [{ bsonType: 'String' }],
            },
            coordinates: {
              types: [
                {
                  bsonType: 'Array',
                  types: [
                    {
                      bsonType: 'Array',
                      types: [
                        {
                          bsonType: 'Array',
                          types: [{ bsonType: 'Double' }],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          },
        },
      ],
    },
  },
};

const geoPointSchema: SchemaInfo = {
  collectionName: 'places',
  schema: {
    location: {
      types: [
        {
          bsonType: 'Document',
          fields: {
            type: {
              types: [{ bsonType: 'String' }],
            },
            coordinates: {
              types: [
                {
                  bsonType: 'Array',
                  types: [
                    {
                      bsonType: 'Double',
                    },
                  ],
                },
              ],
            },
          },
        },
      ],
    },
  },
};

const inventorySchema: SchemaInfo = {
  collectionName: 'inventory',
  schema: {
    price: {
      types: [{ bsonType: 'Double' }],
    },
    qty: {
      types: [{ bsonType: 'Int32' }, { bsonType: 'Undefined' }],
    },
    quantity: {
      types: [{ bsonType: 'Int32' }, { bsonType: 'Undefined' }],
    },
    sale: {
      types: [{ bsonType: 'Boolean' }],
    },
    tags: {
      types: [{ bsonType: 'Array', types: [{ bsonType: 'String' }] }],
    },
  },
};

const mflixMoviesSchema: SchemaInfo = {
  collectionName: 'movies',
  schema: {
    _id: {
      types: [
        {
          bsonType: 'Document',
          fields: { $oid: { types: [{ bsonType: 'String' }] } },
        },
      ],
    },
    title: { types: [{ bsonType: 'String' }] },
    year: {
      types: [
        {
          bsonType: 'Document',
          fields: { $numberInt: { types: [{ bsonType: 'String' }] } },
        },
      ],
    },
    runtime: {
      types: [
        {
          bsonType: 'Document',
          fields: { $numberInt: { types: [{ bsonType: 'String' }] } },
        },
      ],
    },
    released: {
      types: [
        {
          bsonType: 'Document',
          fields: {
            $date: {
              types: [
                {
                  bsonType: 'Document',
                  fields: {
                    $numberLong: { types: [{ bsonType: 'String' }] },
                  },
                },
              ],
            },
          },
        },
      ],
    },
    poster: { types: [{ bsonType: 'String' }] },
    plot: { types: [{ bsonType: 'String' }] },
    fullplot: { types: [{ bsonType: 'String' }] },
    lastupdated: { types: [{ bsonType: 'String' }] },
    type: { types: [{ bsonType: 'String' }] },
    directors: {
      types: [{ bsonType: 'Array', types: [{ bsonType: 'String' }] }],
    },
    imdb: {
      types: [
        {
          bsonType: 'Document',
          fields: {
            rating: {
              types: [
                {
                  bsonType: 'Document',
                  fields: {
                    $numberDouble: { types: [{ bsonType: 'String' }] },
                  },
                },
              ],
            },
            votes: {
              types: [
                {
                  bsonType: 'Document',
                  fields: { $numberInt: { types: [{ bsonType: 'String' }] } },
                },
              ],
            },
            id: {
              types: [
                {
                  bsonType: 'Document',
                  fields: { $numberInt: { types: [{ bsonType: 'String' }] } },
                },
              ],
            },
          },
        },
      ],
    },
    cast: { types: [{ bsonType: 'Array', types: [{ bsonType: 'String' }] }] },
    countries: {
      types: [{ bsonType: 'Array', types: [{ bsonType: 'String' }] }],
    },
    genres: {
      types: [{ bsonType: 'Array', types: [{ bsonType: 'String' }] }],
    },
    tomatoes: {
      types: [
        {
          bsonType: 'Document',
          fields: {
            viewer: {
              types: [
                {
                  bsonType: 'Document',
                  fields: {
                    rating: {
                      types: [
                        {
                          bsonType: 'Document',
                          fields: {
                            $numberDouble: {
                              types: [{ bsonType: 'String' }],
                            },
                          },
                        },
                      ],
                    },
                    numReviews: {
                      types: [
                        {
                          bsonType: 'Document',
                          fields: {
                            $numberInt: { types: [{ bsonType: 'String' }] },
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            },
            lastUpdated: {
              types: [
                {
                  bsonType: 'Document',
                  fields: {
                    $date: {
                      types: [
                        {
                          bsonType: 'Document',
                          fields: {
                            $numberLong: { types: [{ bsonType: 'String' }] },
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            },
          },
        },
      ],
    },
    num_mflix_comments: {
      types: [
        {
          bsonType: 'Document',
          fields: { $numberInt: { types: [{ bsonType: 'String' }] } },
        },
      ],
    },
  },
};

const sampleSuppliesSalesSchema: SchemaInfo = {
  collectionName: 'sales',
  schema: {
    _id: {
      types: [
        {
          bsonType: 'Document',
          fields: { $oid: { types: [{ bsonType: 'String' }] } },
        },
      ],
    },
    saleDate: {
      types: [
        {
          bsonType: 'Document',
          fields: {
            $date: {
              types: [
                {
                  bsonType: 'Document',
                  fields: {
                    $numberLong: { types: [{ bsonType: 'String' }] },
                  },
                },
              ],
            },
          },
        },
      ],
    },
    items: {
      types: [
        {
          bsonType: 'Array',
          types: [
            {
              bsonType: 'Document',
              fields: {
                name: { types: [{ bsonType: 'String' }] },
                tags: {
                  types: [
                    { bsonType: 'Array', types: [{ bsonType: 'String' }] },
                  ],
                },
                price: {
                  types: [
                    {
                      bsonType: 'Document',
                      fields: {
                        $numberDecimal: { types: [{ bsonType: 'String' }] },
                      },
                    },
                  ],
                },
                quantity: {
                  types: [
                    {
                      bsonType: 'Document',
                      fields: {
                        $numberInt: { types: [{ bsonType: 'String' }] },
                      },
                    },
                  ],
                },
              },
            },
          ],
        },
      ],
    },
    storeLocation: { types: [{ bsonType: 'String' }] },
    customer: {
      types: [
        {
          bsonType: 'Document',
          fields: {
            gender: { types: [{ bsonType: 'String' }] },
            age: {
              types: [
                {
                  bsonType: 'Document',
                  fields: { $numberInt: { types: [{ bsonType: 'String' }] } },
                },
              ],
            },
            email: { types: [{ bsonType: 'String' }] },
            satisfaction: {
              types: [
                {
                  bsonType: 'Document',
                  fields: { $numberInt: { types: [{ bsonType: 'String' }] } },
                },
              ],
            },
          },
        },
      ],
    },
    couponUsed: { types: [{ bsonType: 'Boolean' }] },
    purchaseMethod: { types: [{ bsonType: 'String' }] },
  },
};

const listingsAndReviewsSchema: SchemaInfo = {
  collectionName: 'listingsAndReviews',
  schema: {
    _id: {
      types: [
        {
          bsonType: 'String',
        },
      ],
    },
    listing_url: {
      types: [
        {
          bsonType: 'String',
        },
      ],
    },
    name: {
      types: [
        {
          bsonType: 'String',
        },
      ],
    },
    summary: {
      types: [
        {
          bsonType: 'String',
        },
      ],
    },
    interaction: {
      types: [
        {
          bsonType: 'String',
        },
      ],
    },
    house_rules: {
      types: [
        {
          bsonType: 'String',
        },
      ],
    },
    property_type: {
      types: [
        {
          bsonType: 'String',
        },
      ],
    },
    room_type: {
      types: [
        {
          bsonType: 'String',
        },
      ],
    },
    bed_type: {
      types: [
        {
          bsonType: 'String',
        },
      ],
    },
    minimum_nights: {
      types: [
        {
          bsonType: 'String',
        },
      ],
    },
    maximum_nights: {
      types: [
        {
          bsonType: 'String',
        },
      ],
    },
    cancellation_policy: {
      types: [
        {
          bsonType: 'String',
        },
      ],
    },
    last_scraped: {
      types: [
        {
          bsonType: 'Document',
          fields: {
            $date: {
              types: [
                {
                  bsonType: 'Document',
                  fields: {
                    $numberLong: {
                      types: [
                        {
                          bsonType: 'String',
                        },
                      ],
                    },
                  },
                },
              ],
            },
          },
        },
      ],
    },
    calendar_last_scraped: {
      types: [
        {
          bsonType: 'Document',
          fields: {
            $date: {
              types: [
                {
                  bsonType: 'Document',
                  fields: {
                    $numberLong: {
                      types: [
                        {
                          bsonType: 'String',
                        },
                      ],
                    },
                  },
                },
              ],
            },
          },
        },
      ],
    },
    first_review: {
      types: [
        {
          bsonType: 'Document',
          fields: {
            $date: {
              types: [
                {
                  bsonType: 'Document',
                  fields: {
                    $numberLong: {
                      types: [
                        {
                          bsonType: 'String',
                        },
                      ],
                    },
                  },
                },
              ],
            },
          },
        },
      ],
    },
    last_review: {
      types: [
        {
          bsonType: 'Document',
          fields: {
            $date: {
              types: [
                {
                  bsonType: 'Document',
                  fields: {
                    $numberLong: {
                      types: [
                        {
                          bsonType: 'String',
                        },
                      ],
                    },
                  },
                },
              ],
            },
          },
        },
      ],
    },
    accommodates: {
      types: [
        {
          bsonType: 'Document',
          fields: {
            $numberInt: {
              types: [
                {
                  bsonType: 'String',
                },
              ],
            },
          },
        },
      ],
    },
    bedrooms: {
      types: [
        {
          bsonType: 'Document',
          fields: {
            $numberInt: {
              types: [
                {
                  bsonType: 'String',
                },
              ],
            },
          },
        },
      ],
    },
    beds: {
      types: [
        {
          bsonType: 'Document',
          fields: {
            $numberInt: {
              types: [
                {
                  bsonType: 'String',
                },
              ],
            },
          },
        },
      ],
    },
    number_of_reviews: {
      types: [
        {
          bsonType: 'Document',
          fields: {
            $numberInt: {
              types: [
                {
                  bsonType: 'String',
                },
              ],
            },
          },
        },
      ],
    },
    bathrooms: {
      types: [
        {
          bsonType: 'Document',
          fields: {
            $numberDecimal: {
              types: [
                {
                  bsonType: 'String',
                },
              ],
            },
          },
        },
      ],
    },
    amenities: {
      types: [
        {
          bsonType: 'Array',
          types: [
            {
              bsonType: 'String',
            },
          ],
        },
      ],
    },
    price: {
      types: [
        {
          bsonType: 'Document',
          fields: {
            $numberDecimal: {
              types: [
                {
                  bsonType: 'String',
                },
              ],
            },
          },
        },
      ],
    },
    security_deposit: {
      types: [
        {
          bsonType: 'Document',
          fields: {
            $numberDecimal: {
              types: [
                {
                  bsonType: 'String',
                },
              ],
            },
          },
        },
      ],
    },
    cleaning_fee: {
      types: [
        {
          bsonType: 'Document',
          fields: {
            $numberDecimal: {
              types: [
                {
                  bsonType: 'String',
                },
              ],
            },
          },
        },
      ],
    },
    extra_people: {
      types: [
        {
          bsonType: 'Document',
          fields: {
            $numberDecimal: {
              types: [
                {
                  bsonType: 'String',
                },
              ],
            },
          },
        },
      ],
    },
    guests_included: {
      types: [
        {
          bsonType: 'Document',
          fields: {
            $numberDecimal: {
              types: [
                {
                  bsonType: 'String',
                },
              ],
            },
          },
        },
      ],
    },
    images: {
      types: [
        {
          bsonType: 'Document',
          fields: {
            thumbnail_url: {
              types: [
                {
                  bsonType: 'String',
                },
              ],
            },
            medium_url: {
              types: [
                {
                  bsonType: 'String',
                },
              ],
            },
            picture_url: {
              types: [
                {
                  bsonType: 'String',
                },
              ],
            },
            xl_picture_url: {
              types: [
                {
                  bsonType: 'String',
                },
              ],
            },
          },
        },
      ],
    },
    host: {
      types: [
        {
          bsonType: 'Document',
          fields: {
            host_id: {
              types: [
                {
                  bsonType: 'String',
                },
              ],
            },
            host_url: {
              types: [
                {
                  bsonType: 'String',
                },
              ],
            },
            host_name: {
              types: [
                {
                  bsonType: 'String',
                },
              ],
            },
            host_location: {
              types: [
                {
                  bsonType: 'String',
                },
              ],
            },
            host_about: {
              types: [
                {
                  bsonType: 'String',
                },
              ],
            },
            host_response_time: {
              types: [
                {
                  bsonType: 'String',
                },
              ],
            },
            host_thumbnail_url: {
              types: [
                {
                  bsonType: 'String',
                },
              ],
            },
            host_picture_url: {
              types: [
                {
                  bsonType: 'String',
                },
              ],
            },
            host_neighbourhood: {
              types: [
                {
                  bsonType: 'String',
                },
              ],
            },
            host_response_rate: {
              types: [
                {
                  bsonType: 'Document',
                  fields: {
                    $numberInt: {
                      types: [
                        {
                          bsonType: 'String',
                        },
                      ],
                    },
                  },
                },
              ],
            },
            host_is_superhost: {
              types: [
                {
                  bsonType: 'Boolean',
                },
              ],
            },
            host_has_profile_pic: {
              types: [
                {
                  bsonType: 'Boolean',
                },
              ],
            },
            host_identity_verified: {
              types: [
                {
                  bsonType: 'Boolean',
                },
              ],
            },
            host_listings_count: {
              types: [
                {
                  bsonType: 'Document',
                  fields: {
                    $numberInt: {
                      types: [
                        {
                          bsonType: 'String',
                        },
                      ],
                    },
                  },
                },
              ],
            },
            host_total_listings_count: {
              types: [
                {
                  bsonType: 'Document',
                  fields: {
                    $numberInt: {
                      types: [
                        {
                          bsonType: 'String',
                        },
                      ],
                    },
                  },
                },
              ],
            },
            host_verifications: {
              types: [
                {
                  bsonType: 'Array',
                  types: [
                    {
                      bsonType: 'String',
                    },
                  ],
                },
              ],
            },
          },
        },
      ],
    },
    address: {
      types: [
        {
          bsonType: 'Document',
          fields: {
            street: {
              types: [
                {
                  bsonType: 'String',
                },
              ],
            },
            suburb: {
              types: [
                {
                  bsonType: 'String',
                },
              ],
            },
            government_area: {
              types: [
                {
                  bsonType: 'String',
                },
              ],
            },
            market: {
              types: [
                {
                  bsonType: 'String',
                },
              ],
            },
            country: {
              types: [
                {
                  bsonType: 'String',
                },
              ],
            },
            country_code: {
              types: [
                {
                  bsonType: 'String',
                },
              ],
            },
            location: {
              types: [
                {
                  bsonType: 'Document',
                  fields: {
                    type: {
                      types: [
                        {
                          bsonType: 'String',
                        },
                      ],
                    },
                    coordinates: {
                      types: [
                        {
                          bsonType: 'Array',
                          types: [
                            {
                              bsonType: 'Document',
                              fields: {
                                $numberDouble: {
                                  types: [
                                    {
                                      bsonType: 'String',
                                    },
                                  ],
                                },
                              },
                            },
                          ],
                        },
                      ],
                    },
                    is_location_exact: {
                      types: [
                        {
                          bsonType: 'Boolean',
                        },
                      ],
                    },
                  },
                },
              ],
            },
          },
        },
      ],
    },
    availability: {
      types: [
        {
          bsonType: 'Document',
          fields: {
            availability_30: {
              types: [
                {
                  bsonType: 'Document',
                  fields: {
                    $numberInt: {
                      types: [
                        {
                          bsonType: 'String',
                        },
                      ],
                    },
                  },
                },
              ],
            },
            availability_60: {
              types: [
                {
                  bsonType: 'Document',
                  fields: {
                    $numberInt: {
                      types: [
                        {
                          bsonType: 'String',
                        },
                      ],
                    },
                  },
                },
              ],
            },
            availability_90: {
              types: [
                {
                  bsonType: 'Document',
                  fields: {
                    $numberInt: {
                      types: [
                        {
                          bsonType: 'String',
                        },
                      ],
                    },
                  },
                },
              ],
            },
            availability_365: {
              types: [
                {
                  bsonType: 'Document',
                  fields: {
                    $numberInt: {
                      types: [
                        {
                          bsonType: 'String',
                        },
                      ],
                    },
                  },
                },
              ],
            },
          },
        },
      ],
    },
    review_scores: {
      types: [
        {
          bsonType: 'Document',
          fields: {
            review_scores_accuracy: {
              types: [
                {
                  bsonType: 'Document',
                  fields: {
                    $numberInt: {
                      types: [
                        {
                          bsonType: 'String',
                        },
                      ],
                    },
                  },
                },
              ],
            },
            review_scores_cleanliness: {
              types: [
                {
                  bsonType: 'Document',
                  fields: {
                    $numberInt: {
                      types: [
                        {
                          bsonType: 'String',
                        },
                      ],
                    },
                  },
                },
              ],
            },
            review_scores_checkin: {
              types: [
                {
                  bsonType: 'Document',
                  fields: {
                    $numberInt: {
                      types: [
                        {
                          bsonType: 'String',
                        },
                      ],
                    },
                  },
                },
              ],
            },
            review_scores_communication: {
              types: [
                {
                  bsonType: 'Document',
                  fields: {
                    $numberInt: {
                      types: [
                        {
                          bsonType: 'String',
                        },
                      ],
                    },
                  },
                },
              ],
            },
            review_scores_location: {
              types: [
                {
                  bsonType: 'Document',
                  fields: {
                    $numberInt: {
                      types: [
                        {
                          bsonType: 'String',
                        },
                      ],
                    },
                  },
                },
              ],
            },
            review_scores_value: {
              types: [
                {
                  bsonType: 'Document',
                  fields: {
                    $numberInt: {
                      types: [
                        {
                          bsonType: 'String',
                        },
                      ],
                    },
                  },
                },
              ],
            },
            review_scores_rating: {
              types: [
                {
                  bsonType: 'Document',
                  fields: {
                    $numberInt: {
                      types: [
                        {
                          bsonType: 'String',
                        },
                      ],
                    },
                  },
                },
              ],
            },
          },
        },
      ],
    },
    reviews: {
      types: [
        {
          bsonType: 'Array',
          types: [
            {
              bsonType: 'Document',
              fields: {
                _id: {
                  types: [
                    {
                      bsonType: 'String',
                    },
                  ],
                },
                date: {
                  types: [
                    {
                      bsonType: 'Document',
                      fields: {
                        $date: {
                          types: [
                            {
                              bsonType: 'Document',
                              fields: {
                                $numberLong: {
                                  types: [
                                    {
                                      bsonType: 'String',
                                    },
                                  ],
                                },
                              },
                            },
                          ],
                        },
                      },
                    },
                  ],
                },
                listing_id: {
                  types: [
                    {
                      bsonType: 'String',
                    },
                  ],
                },
                reviewer_id: {
                  types: [
                    {
                      bsonType: 'String',
                    },
                  ],
                },
                reviewer_name: {
                  types: [
                    {
                      bsonType: 'String',
                    },
                  ],
                },
                comments: {
                  types: [
                    {
                      bsonType: 'String',
                    },
                  ],
                },
              },
            },
          ],
        },
      ],
    },
  },
};

const analyticsCustomersSchema: SchemaInfo = {
  collectionName: 'customers',
  schema: {
    _id: {
      types: [
        {
          bsonType: 'ObjectId',
        },
      ],
    },
    username: {
      types: [
        {
          bsonType: 'String',
        },
      ],
    },
    name: {
      types: [
        {
          bsonType: 'String',
        },
      ],
    },
    address: {
      types: [
        {
          bsonType: 'String',
        },
      ],
    },
    birthdate: {
      types: [
        {
          bsonType: 'Document',
          fields: {
            $date: {
              types: [
                {
                  bsonType: 'Double',
                },
              ],
            },
          },
        },
      ],
    },
    email: {
      types: [
        {
          bsonType: 'String',
        },
      ],
    },
    accounts: {
      types: [
        {
          bsonType: 'Array',
          types: [
            {
              bsonType: 'Double',
            },
          ],
        },
      ],
    },
    tier_and_details: {
      types: [
        {
          bsonType: 'Document',
          fields: {
            b5f19cb532fa436a9be2cf1d7d1cac8a: {
              types: [
                {
                  bsonType: 'Document',
                  fields: {
                    tier: {
                      types: [
                        {
                          bsonType: 'String',
                        },
                      ],
                    },
                    benefits: {
                      types: [
                        {
                          bsonType: 'Array',
                          types: [
                            {
                              bsonType: 'String',
                            },
                          ],
                        },
                      ],
                    },
                    active: {
                      types: [
                        {
                          bsonType: 'Boolean',
                        },
                      ],
                    },
                    id: {
                      types: [
                        {
                          bsonType: 'String',
                        },
                      ],
                    },
                  },
                },
              ],
            },
          },
        },
      ],
    },
  },
};

const dummySchema: SchemaInfo = {
  collectionName: 'TestCollection',
  schema: {
    _id: {
      types: [
        {
          bsonType: 'ObjectId',
        },
      ],
    },
  },
};

type SchemaMap = {
  [key: string]: SchemaMap | SchemaInfo;
};

const staticSchemas: SchemaMap = {
  expression: {
    dateFromParts: {
      Example: {
        collectionName: 'sales',
        schema: {
          _id: {
            types: [{ bsonType: 'ObjectId' }],
          },
        },
      },
    },
    setIntersection: {
      ['Retrieve Documents for Roles Granted to the Current User']: {
        collectionName: 'budget',
        schema: {
          _id: {
            types: [{ bsonType: 'Int32' }],
          },
          allowedRoles: {
            types: [{ bsonType: 'Array', types: [{ bsonType: 'String' }] }],
          },
          comment: {
            types: [{ bsonType: 'String' }],
          },
          yearlyBudget: {
            types: [{ bsonType: 'Double' }],
          },
          cloudBudget: {
            types: [{ bsonType: 'Double' }, { bsonType: 'Undefined' }],
          },
          salesEventsBudget: {
            types: [{ bsonType: 'Double' }, { bsonType: 'Undefined' }],
          },
        },
      },
    },
    dateAdd: {
      'Filter on a Date Range': {
        collectionName: 'shipping',
        schema: {
          custId: {
            types: [{ bsonType: 'Int32' }],
          },
          purchaseDate: {
            types: [{ bsonType: 'Date' }],
          },
          deliveryDate: {
            types: [{ bsonType: 'Date' }],
          },
        },
      },
    },
    first: {
      collectionName: 'collection',
      schema: {
        items: {
          types: [{ bsonType: 'Array', types: [{ bsonType: 'String' }] }],
        },
      },
    },
    last: {
      collectionName: 'collection',
      schema: {
        items: {
          types: [{ bsonType: 'Array', types: [{ bsonType: 'String' }] }],
        },
      },
    },
  },
  query: {
    and: inventorySchema,
    eq: {
      ['Regex Match Behaviour']: {
        collectionName: 'companies',
        schema: {
          _id: { types: [{ bsonType: 'Int32' }] },
          company: { types: [{ bsonType: 'String' }] },
        },
      },
    },
    exists: inventorySchema,
    geoIntersects: geoPolygonSchema,
    geoWithin: geoPolygonSchema,
    jsonSchema: {
      collectionName: 'TestCollection',
      schema: {
        name: {
          types: [{ bsonType: 'String' }],
        },
        major: {
          types: [{ bsonType: 'String' }],
        },
        gpa: {
          types: [{ bsonType: 'Double' }],
        },
        address: {
          types: [
            {
              bsonType: 'Document',
              fields: {
                street: { types: [{ bsonType: 'String' }] },
                zipcode: { types: [{ bsonType: 'String' }] },
              },
            },
          ],
        },
      },
    },
    near: geoPointSchema,
    nearSphere: geoPointSchema,
    nor: inventorySchema,
    not: inventorySchema,
    or: {
      ['$or Clauses']: inventorySchema,
      ['Error Handling']: {
        collectionName: 'example',
        schema: {
          x: {
            types: [{ bsonType: 'Int32' }],
          },
        },
      },
    },
    sampleRate: dummySchema,
    size: inventorySchema,
  },
  search: {
    autocomplete: mflixMoviesSchema,
    embeddedDocument: sampleSuppliesSalesSchema,
    facet: mflixMoviesSchema,
    geoShape: listingsAndReviewsSchema,
    geoWithin: listingsAndReviewsSchema,
    in: analyticsCustomersSchema,
    moreLikeThis: mflixMoviesSchema,
    near: {
      Number: mflixMoviesSchema,
      Date: mflixMoviesSchema,
      ['GeoJSON Point']: listingsAndReviewsSchema,
      Compound: listingsAndReviewsSchema,
    },
    phrase: mflixMoviesSchema,
    queryString: mflixMoviesSchema,
    range: mflixMoviesSchema,
    regex: mflixMoviesSchema,
    text: mflixMoviesSchema,
    wildcard: mflixMoviesSchema,
  },
  stage: {
    sort: {
      collectionName: 'users',
      schema: {
        age: { types: [{ bsonType: 'Int32' }] },
        posts: { types: [{ bsonType: 'Int32' }] },
        name: { types: [{ bsonType: 'String' }] },
      },
    },
    bucketAuto: {
      collectionName: 'artwork',
      schema: {
        _id: { types: [{ bsonType: 'Int32' }] },
        title: { types: [{ bsonType: 'String' }] },
        artist: { types: [{ bsonType: 'String' }] },
        year: { types: [{ bsonType: 'Int32' }] },
        price: { types: [{ bsonType: 'Decimal128' }] },
        dimensions: {
          types: [
            {
              bsonType: 'Document',
              fields: {
                height: { types: [{ bsonType: 'Int32' }] },
                width: { types: [{ bsonType: 'Int32' }] },
                units: { types: [{ bsonType: 'String' }] },
              },
            },
          ],
        },
      },
    },
    changeStream: {
      collectionName: 'names',
      schema: {
        _id: {
          types: [{ bsonType: 'ObjectId' }],
        },
      },
    },
    changeStreamSplitLargeEvent: {
      collectionName: 'myCollection',
      schema: {
        _id: { types: [{ bsonType: 'Int32' }] },
        largeField: { types: [{ bsonType: 'String' }] },
      },
    },
    collStats: dummySchema,
    currentOp: dummySchema,
    limit: dummySchema,
    listLocalSessions: dummySchema,
    listSampledQueries: dummySchema,
    listSearchIndexes: dummySchema,
    listSessions: dummySchema,
    search: mflixMoviesSchema,
    searchMeta: mflixMoviesSchema,
    shardedDataDistribution: dummySchema,
    skip: dummySchema,
  },
};

export function getStaticSchema({
  category,
  operator,
  test,
}: {
  category: string;
  operator: string;
  test: string;
}):
  | {
      [collectionName: string]: SimplifiedSchema;
    }
  | undefined {
  if (operator.startsWith('$')) {
    operator = operator.slice(1);
  }
  return getStaticSchemaByKeys([category, operator, test], staticSchemas);
}

function getStaticSchemaByKeys(
  keys: string[],
  map: SchemaMap,
): { [collectionName: string]: SimplifiedSchema } | undefined {
  if (keys.length === 0) {
    return undefined;
  }

  const [key, ...rest] = keys;
  const value = map[key];
  if (typeof value === 'object') {
    if ('collectionName' in value && typeof value.collectionName === 'string') {
      return {
        [value.collectionName]: value.schema as SimplifiedSchema,
      };
    }

    return getStaticSchemaByKeys(rest, value as SchemaMap);
  }

  return undefined;
}
