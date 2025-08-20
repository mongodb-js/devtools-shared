/** utils related to view pipeline **/

import type { Document } from 'mongodb';

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
