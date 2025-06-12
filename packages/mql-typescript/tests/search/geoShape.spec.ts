/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Disjoint
 * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/geoShape/#disjoint-example}
 */
function test0() {
  type listingsAndReviews = {
    _id: string;
    listing_url: string;
    name: string;
    summary: string;
    interaction: string;
    house_rules: string;
    property_type: string;
    room_type: string;
    bed_type: string;
    minimum_nights: string;
    maximum_nights: string;
    cancellation_policy: string;
    last_scraped: {
      $date: {
        $numberLong: string;
      };
    };
    calendar_last_scraped: {
      $date: {
        $numberLong: string;
      };
    };
    first_review: {
      $date: {
        $numberLong: string;
      };
    };
    last_review: {
      $date: {
        $numberLong: string;
      };
    };
    accommodates: {
      $numberInt: string;
    };
    bedrooms: {
      $numberInt: string;
    };
    beds: {
      $numberInt: string;
    };
    number_of_reviews: {
      $numberInt: string;
    };
    bathrooms: {
      $numberDecimal: string;
    };
    amenities: Array<string>;
    price: {
      $numberDecimal: string;
    };
    security_deposit: {
      $numberDecimal: string;
    };
    cleaning_fee: {
      $numberDecimal: string;
    };
    extra_people: {
      $numberDecimal: string;
    };
    guests_included: {
      $numberDecimal: string;
    };
    images: {
      thumbnail_url: string;
      medium_url: string;
      picture_url: string;
      xl_picture_url: string;
    };
    host: {
      host_id: string;
      host_url: string;
      host_name: string;
      host_location: string;
      host_about: string;
      host_response_time: string;
      host_thumbnail_url: string;
      host_picture_url: string;
      host_neighbourhood: string;
      host_response_rate: {
        $numberInt: string;
      };
      host_is_superhost: boolean;
      host_has_profile_pic: boolean;
      host_identity_verified: boolean;
      host_listings_count: {
        $numberInt: string;
      };
      host_total_listings_count: {
        $numberInt: string;
      };
      host_verifications: Array<string>;
    };
    address: {
      street: string;
      suburb: string;
      government_area: string;
      market: string;
      country: string;
      country_code: string;
      location: {
        type: string;
        coordinates: Array<{
          $numberDouble: string;
        }>;
        is_location_exact: boolean;
      };
    };
    availability: {
      availability_30: {
        $numberInt: string;
      };
      availability_60: {
        $numberInt: string;
      };
      availability_90: {
        $numberInt: string;
      };
      availability_365: {
        $numberInt: string;
      };
    };
    review_scores: {
      review_scores_accuracy: {
        $numberInt: string;
      };
      review_scores_cleanliness: {
        $numberInt: string;
      };
      review_scores_checkin: {
        $numberInt: string;
      };
      review_scores_communication: {
        $numberInt: string;
      };
      review_scores_location: {
        $numberInt: string;
      };
      review_scores_value: {
        $numberInt: string;
      };
      review_scores_rating: {
        $numberInt: string;
      };
    };
    reviews: Array<{
      _id: string;
      date: {
        $date: {
          $numberLong: string;
        };
      };
      listing_id: string;
      reviewer_id: string;
      reviewer_name: string;
      comments: string;
    }>;
  };

  const aggregation: schema.Pipeline<listingsAndReviews> = [
    /**
     * This stage is unsupported by the static type system, so we're casting it to 'any' (this test accesses nested fields, which is not currently supported).
     */
    {
      $search: {
        geoShape: {
          relation: 'disjoint',
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [-161.323242, 22.512557],
                [-152.446289, 22.065278],
                [-156.09375, 17.811456],
                [-161.323242, 22.512557],
              ],
            ],
          },
          path: 'address.location',
        },
      },
    } as any,

    /**
     * This stage is unsupported by the static type system, so we're casting it to 'any' (this test accesses nested fields, which is not currently supported).
     */
    { $limit: 3 } as any,

    /**
     * This stage is unsupported by the static type system, so we're casting it to 'any' (this test accesses nested fields, which is not currently supported).
     */
    {
      $project: {
        _id: 0,
        name: 1,
        address: 1,
        score: { $meta: 'searchScore' },
      },
    } as any,
  ];
}

/**
 * Intersect
 * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/geoShape/#intersects-example}
 */
function test1() {
  type listingsAndReviews = {
    _id: string;
    listing_url: string;
    name: string;
    summary: string;
    interaction: string;
    house_rules: string;
    property_type: string;
    room_type: string;
    bed_type: string;
    minimum_nights: string;
    maximum_nights: string;
    cancellation_policy: string;
    last_scraped: {
      $date: {
        $numberLong: string;
      };
    };
    calendar_last_scraped: {
      $date: {
        $numberLong: string;
      };
    };
    first_review: {
      $date: {
        $numberLong: string;
      };
    };
    last_review: {
      $date: {
        $numberLong: string;
      };
    };
    accommodates: {
      $numberInt: string;
    };
    bedrooms: {
      $numberInt: string;
    };
    beds: {
      $numberInt: string;
    };
    number_of_reviews: {
      $numberInt: string;
    };
    bathrooms: {
      $numberDecimal: string;
    };
    amenities: Array<string>;
    price: {
      $numberDecimal: string;
    };
    security_deposit: {
      $numberDecimal: string;
    };
    cleaning_fee: {
      $numberDecimal: string;
    };
    extra_people: {
      $numberDecimal: string;
    };
    guests_included: {
      $numberDecimal: string;
    };
    images: {
      thumbnail_url: string;
      medium_url: string;
      picture_url: string;
      xl_picture_url: string;
    };
    host: {
      host_id: string;
      host_url: string;
      host_name: string;
      host_location: string;
      host_about: string;
      host_response_time: string;
      host_thumbnail_url: string;
      host_picture_url: string;
      host_neighbourhood: string;
      host_response_rate: {
        $numberInt: string;
      };
      host_is_superhost: boolean;
      host_has_profile_pic: boolean;
      host_identity_verified: boolean;
      host_listings_count: {
        $numberInt: string;
      };
      host_total_listings_count: {
        $numberInt: string;
      };
      host_verifications: Array<string>;
    };
    address: {
      street: string;
      suburb: string;
      government_area: string;
      market: string;
      country: string;
      country_code: string;
      location: {
        type: string;
        coordinates: Array<{
          $numberDouble: string;
        }>;
        is_location_exact: boolean;
      };
    };
    availability: {
      availability_30: {
        $numberInt: string;
      };
      availability_60: {
        $numberInt: string;
      };
      availability_90: {
        $numberInt: string;
      };
      availability_365: {
        $numberInt: string;
      };
    };
    review_scores: {
      review_scores_accuracy: {
        $numberInt: string;
      };
      review_scores_cleanliness: {
        $numberInt: string;
      };
      review_scores_checkin: {
        $numberInt: string;
      };
      review_scores_communication: {
        $numberInt: string;
      };
      review_scores_location: {
        $numberInt: string;
      };
      review_scores_value: {
        $numberInt: string;
      };
      review_scores_rating: {
        $numberInt: string;
      };
    };
    reviews: Array<{
      _id: string;
      date: {
        $date: {
          $numberLong: string;
        };
      };
      listing_id: string;
      reviewer_id: string;
      reviewer_name: string;
      comments: string;
    }>;
  };

  const aggregation: schema.Pipeline<listingsAndReviews> = [
    /**
     * This stage is unsupported by the static type system, so we're casting it to 'any' (this test accesses nested fields, which is not currently supported).
     */
    {
      $search: {
        geoShape: {
          relation: 'intersects',
          geometry: {
            type: 'MultiPolygon',
            coordinates: [
              [
                [
                  [2.16942, 41.40082],
                  [2.17963, 41.40087],
                  [2.18146, 41.39716],
                  [2.15533, 41.40686],
                  [2.14596, 41.38475],
                  [2.17519, 41.41035],
                  [2.16942, 41.40082],
                ],
              ],
              [
                [
                  [2.16365, 41.39416],
                  [2.16963, 41.39726],
                  [2.15395, 41.38005],
                  [2.17935, 41.43038],
                  [2.16365, 41.39416],
                ],
              ],
            ],
          },
          path: 'address.location',
        },
      },
    } as any,

    /**
     * This stage is unsupported by the static type system, so we're casting it to 'any' (this test accesses nested fields, which is not currently supported).
     */
    { $limit: 3 } as any,

    /**
     * This stage is unsupported by the static type system, so we're casting it to 'any' (this test accesses nested fields, which is not currently supported).
     */
    {
      $project: {
        _id: 0,
        name: 1,
        address: 1,
        score: { $meta: 'searchScore' },
      },
    } as any,
  ];
}

/**
 * Within
 * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/geoShape/#within-example}
 */
function test2() {
  type listingsAndReviews = {
    _id: string;
    listing_url: string;
    name: string;
    summary: string;
    interaction: string;
    house_rules: string;
    property_type: string;
    room_type: string;
    bed_type: string;
    minimum_nights: string;
    maximum_nights: string;
    cancellation_policy: string;
    last_scraped: {
      $date: {
        $numberLong: string;
      };
    };
    calendar_last_scraped: {
      $date: {
        $numberLong: string;
      };
    };
    first_review: {
      $date: {
        $numberLong: string;
      };
    };
    last_review: {
      $date: {
        $numberLong: string;
      };
    };
    accommodates: {
      $numberInt: string;
    };
    bedrooms: {
      $numberInt: string;
    };
    beds: {
      $numberInt: string;
    };
    number_of_reviews: {
      $numberInt: string;
    };
    bathrooms: {
      $numberDecimal: string;
    };
    amenities: Array<string>;
    price: {
      $numberDecimal: string;
    };
    security_deposit: {
      $numberDecimal: string;
    };
    cleaning_fee: {
      $numberDecimal: string;
    };
    extra_people: {
      $numberDecimal: string;
    };
    guests_included: {
      $numberDecimal: string;
    };
    images: {
      thumbnail_url: string;
      medium_url: string;
      picture_url: string;
      xl_picture_url: string;
    };
    host: {
      host_id: string;
      host_url: string;
      host_name: string;
      host_location: string;
      host_about: string;
      host_response_time: string;
      host_thumbnail_url: string;
      host_picture_url: string;
      host_neighbourhood: string;
      host_response_rate: {
        $numberInt: string;
      };
      host_is_superhost: boolean;
      host_has_profile_pic: boolean;
      host_identity_verified: boolean;
      host_listings_count: {
        $numberInt: string;
      };
      host_total_listings_count: {
        $numberInt: string;
      };
      host_verifications: Array<string>;
    };
    address: {
      street: string;
      suburb: string;
      government_area: string;
      market: string;
      country: string;
      country_code: string;
      location: {
        type: string;
        coordinates: Array<{
          $numberDouble: string;
        }>;
        is_location_exact: boolean;
      };
    };
    availability: {
      availability_30: {
        $numberInt: string;
      };
      availability_60: {
        $numberInt: string;
      };
      availability_90: {
        $numberInt: string;
      };
      availability_365: {
        $numberInt: string;
      };
    };
    review_scores: {
      review_scores_accuracy: {
        $numberInt: string;
      };
      review_scores_cleanliness: {
        $numberInt: string;
      };
      review_scores_checkin: {
        $numberInt: string;
      };
      review_scores_communication: {
        $numberInt: string;
      };
      review_scores_location: {
        $numberInt: string;
      };
      review_scores_value: {
        $numberInt: string;
      };
      review_scores_rating: {
        $numberInt: string;
      };
    };
    reviews: Array<{
      _id: string;
      date: {
        $date: {
          $numberLong: string;
        };
      };
      listing_id: string;
      reviewer_id: string;
      reviewer_name: string;
      comments: string;
    }>;
  };

  const aggregation: schema.Pipeline<listingsAndReviews> = [
    /**
     * This stage is unsupported by the static type system, so we're casting it to 'any' (this test accesses nested fields, which is not currently supported).
     */
    {
      $search: {
        geoShape: {
          relation: 'within',
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [-74.3994140625, 40.5305017757],
                [-74.7290039063, 40.5805846641],
                [-74.7729492188, 40.9467136651],
                [-74.0698242188, 41.1290213475],
                [-73.65234375, 40.9964840144],
                [-72.6416015625, 40.9467136651],
                [-72.3559570313, 40.7971774152],
                [-74.3994140625, 40.5305017757],
              ],
            ],
          },
          path: 'address.location',
        },
      },
    } as any,

    /**
     * This stage is unsupported by the static type system, so we're casting it to 'any' (this test accesses nested fields, which is not currently supported).
     */
    { $limit: 3 } as any,

    /**
     * This stage is unsupported by the static type system, so we're casting it to 'any' (this test accesses nested fields, which is not currently supported).
     */
    {
      $project: {
        _id: 0,
        name: 1,
        address: 1,
        score: { $meta: 'searchScore' },
      },
    } as any,
  ];
}
