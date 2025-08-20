/** utils related to view pipeline **/

import type { Document } from 'mongodb';
import semver from 'semver';

/**
 * Constants for view compatibility;
 */
export const MIN_VERSION_FOR_VIEW_SEARCH_COMPATIBILITY_DE = '8.0.0';
export const MIN_VERSION_FOR_VIEW_SEARCH_COMPATIBILITY_COMPASS = '8.1.0';

/** A view pipeline is searchQueryable (ie: a search index can be created on view) if
 * a pipeline consists of only addFields, set and match with expr stages*
 *
 * @param pipeline the view pipeline
 * @returns whether pipeline is search queryable
 * */
export const isPipelineSearchQueryable = (pipeline: Document[]): boolean => {
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

/** Views allow search indexes to be made on them in DE for server version 8.1+
 *
 * @param serverVersion the server version
 * @returns whether serverVersion is search compatible for views in DE
 * */
export const isVersionSearchCompatibleForViewsDataExplorer = (
  serverVersion: string,
) => {
  try {
    return semver.gte(
      serverVersion,
      MIN_VERSION_FOR_VIEW_SEARCH_COMPATIBILITY_DE,
    );
  } catch {
    return false;
  }
};

/** Views allow search indexes to be made on them in compass for mongodb version 8.0+
 *
 * @param serverVersion the view pipeline
 * @returns whether serverVersion is search compatible for views in DE
 * */
export const isVersionSearchCompatibleForViewsCompass = (
  serverVersion: string,
) => {
  try {
    return semver.gte(
      serverVersion,
      MIN_VERSION_FOR_VIEW_SEARCH_COMPATIBILITY_COMPASS,
    );
  } catch {
    return false;
  }
};
