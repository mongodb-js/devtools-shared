import * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * box
 * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/geoWithin/#box-example}
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
        geoWithin: {
          path: 'address.location',
          box: {
            bottomLeft: { type: 'Point', coordinates: [112.467, -55.05] },
            topRight: { type: 'Point', coordinates: [168, -9.133] },
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
    { $project: { _id: 0, name: 1, address: 1 } } as any,
  ];
}

/**
 * circle
 * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/geoWithin/#circle-example}
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
        geoWithin: {
          circle: {
            center: { type: 'Point', coordinates: [-73.54, 45.54] },
            radius: 1600,
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
    { $project: { _id: 0, name: 1, address: 1 } } as any,
  ];
}

/**
 * geometry
 * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/geoWithin/#geometry-examples}
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
        geoWithin: {
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
    { $project: { _id: 0, name: 1, address: 1 } } as any,
  ];
}
