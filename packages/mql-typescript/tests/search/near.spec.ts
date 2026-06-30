/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Number
 * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/near/#number-example}
 */
function test0() {
  type movies = {
    _id: {
      $oid: string;
    };
    title: string;
    year: {
      $numberInt: string;
    };
    runtime: {
      $numberInt: string;
    };
    released: {
      $date: {
        $numberLong: string;
      };
    };
    poster: string;
    plot: string;
    fullplot: string;
    lastupdated: string;
    type: string;
    directors: Array<string>;
    imdb: {
      rating: {
        $numberDouble: string;
      };
      votes: {
        $numberInt: string;
      };
      id: {
        $numberInt: string;
      };
    };
    cast: Array<string>;
    countries: Array<string>;
    genres: Array<string>;
    tomatoes: {
      viewer: {
        rating: {
          $numberDouble: string;
        };
        numReviews: {
          $numberInt: string;
        };
      };
      lastUpdated: {
        $date: {
          $numberLong: string;
        };
      };
    };
    num_mflix_comments: {
      $numberInt: string;
    };
  };

  const aggregation: schema.Pipeline<movies> = [
    {
      $search: {
        index: 'runtimes',
        near: { path: 'runtime', origin: 279, pivot: 2 },
      },
    },
    { $limit: 7 },
    {
      $project: {
        _id: 0,
        title: 1,
        runtime: 1,
        score: { $meta: 'searchScore' },
      },
    },
  ];
}

/**
 * Date
 * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/near/#date-example}
 */
function test1() {
  type movies = {
    _id: {
      $oid: string;
    };
    title: string;
    year: {
      $numberInt: string;
    };
    runtime: {
      $numberInt: string;
    };
    released: {
      $date: {
        $numberLong: string;
      };
    };
    poster: string;
    plot: string;
    fullplot: string;
    lastupdated: string;
    type: string;
    directors: Array<string>;
    imdb: {
      rating: {
        $numberDouble: string;
      };
      votes: {
        $numberInt: string;
      };
      id: {
        $numberInt: string;
      };
    };
    cast: Array<string>;
    countries: Array<string>;
    genres: Array<string>;
    tomatoes: {
      viewer: {
        rating: {
          $numberDouble: string;
        };
        numReviews: {
          $numberInt: string;
        };
      };
      lastUpdated: {
        $date: {
          $numberLong: string;
        };
      };
    };
    num_mflix_comments: {
      $numberInt: string;
    };
  };

  const aggregation: schema.Pipeline<movies> = [
    {
      $search: {
        index: 'releaseddate',
        near: {
          path: 'released',
          origin: new Date('1915-09-13T00:00:00.000Z'),
          pivot: 7776000000,
        },
      },
    },
    { $limit: 3 },
    {
      $project: {
        _id: 0,
        title: 1,
        released: 1,
        score: { $meta: 'searchScore' },
      },
    },
  ];
}

/**
 * GeoJSON Point
 * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/near/#geojson-point-examples}
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
        near: {
          origin: { type: 'Point', coordinates: [-8.61308, 41.1413] },
          pivot: 1000,
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
 * Compound
 * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/near/#compound-example}
 */
function test3() {
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
        compound: {
          must: { text: { query: 'Apartment', path: 'property_type' } },
          should: {
            near: {
              origin: { type: 'Point', coordinates: [114.15027, 22.28158] },
              pivot: 1000,
              path: 'address.location',
            },
          },
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
        property_type: 1,
        address: 1,
        score: { $meta: 'searchScore' },
      },
    } as any,
  ];
}
