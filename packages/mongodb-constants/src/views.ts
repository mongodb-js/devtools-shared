/** utils related to view pipeline **/

import type { Document } from 'mongodb';
import semver from 'semver';

const MIN_VERSION_FOR_VIEW_SEARCH_COMPATIBILITY_DE = '8.0.0';
const MIN_VERSION_FOR_VIEW_SEARCH_COMPATIBILITY_COMPASS = '8.1.0';

/**
 * A view pipeline is searchQueryable (ie: a search index can be created on view) if
 * a pipeline consists of only addFields, set and match with expr stages
 *
 * @param pipeline the view pipeline
 * @returns whether pipeline is search queryable
 */
const isPipelineSearchQueryable = (pipeline: Document[]): boolean => {
  for (const stage of pipeline) {
    const stageKey = Object.keys(stage)[0];

    // Check if the stage is $addFields, $set, or $match
    if (
      !(
        stageKey === '$addFields' ||
        stageKey === '$set' ||
        stageKey === '$match'
      )
    ) {
      return false;
    }

    // If the stage is $match, check if it uses $expr
    if (stageKey === '$match') {
      const matchStage = stage['$match'] as Document;
      const matchKeys = Object.keys(matchStage || {});

      if (matchKeys.length !== 1 || !matchKeys.includes('$expr')) {
        return false;
      }
    }
  }

  return true;
};

/**
 * Views allow search indexes to be made on them in DE for server version 8.1+
 *
 * @param serverVersion the server version
 * @returns whether serverVersion is search compatible for views in DE
 */
const isVersionSearchCompatibleForViewsDataExplorer = (
  serverVersion: string,
): boolean => {
  try {
    return semver.gte(
      serverVersion,
      MIN_VERSION_FOR_VIEW_SEARCH_COMPATIBILITY_DE,
    );
  } catch {
    return false;
  }
};

/**
 * Views allow search indexes to be made on them in compass for mongodb version 8.0+
 *
 * @param serverVersion the view pipeline
 * @returns whether serverVersion is search compatible for views in Compass
 */
const isVersionSearchCompatibleForViewsCompass = (
  serverVersion: string,
): boolean => {
  try {
    return semver.gte(
      serverVersion,
      MIN_VERSION_FOR_VIEW_SEARCH_COMPATIBILITY_COMPASS,
    );
  } catch {
    return false;
  }
};

export const VIEW_PIPELINE_UTILS = {
  MIN_VERSION_FOR_VIEW_SEARCH_COMPATIBILITY_DE,
  MIN_VERSION_FOR_VIEW_SEARCH_COMPATIBILITY_COMPASS,
  isPipelineSearchQueryable,
  isVersionSearchCompatibleForViewsDataExplorer,
  isVersionSearchCompatibleForViewsCompass,
};
