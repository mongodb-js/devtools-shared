import { expect } from 'chai';
import { VIEW_PIPELINE_UTILS } from './views';
import type { Document } from 'mongodb';

describe('views', function () {
  describe('isPipelineSearchQueryable', function () {
    it('should return true for a valid pipeline with $addFields stage', function () {
      const pipeline: Document[] = [{ $addFields: { testField: 'testValue' } }];
      expect(VIEW_PIPELINE_UTILS.isPipelineSearchQueryable(pipeline)).to.equal(
        true,
      );
    });

    it('should return true for a valid pipeline with $set stage', function () {
      const pipeline: Document[] = [{ $set: { testField: 'testValue' } }];
      expect(VIEW_PIPELINE_UTILS.isPipelineSearchQueryable(pipeline)).to.equal(
        true,
      );
    });

    it('should return true for a valid pipeline with $match stage using $expr', function () {
      const pipeline: Document[] = [
        { $match: { $expr: { $eq: ['$field', 'value'] } } },
      ];
      expect(VIEW_PIPELINE_UTILS.isPipelineSearchQueryable(pipeline)).to.equal(
        true,
      );
    });

    it('should return false for a pipeline with an unsupported stage', function () {
      const pipeline: Document[] = [{ $group: { _id: '$field' } }];
      expect(VIEW_PIPELINE_UTILS.isPipelineSearchQueryable(pipeline)).to.equal(
        false,
      );
    });

    it('should return false for a $match stage without $expr', function () {
      const pipeline: Document[] = [{ $match: { nonExprKey: 'someValue' } }];
      expect(VIEW_PIPELINE_UTILS.isPipelineSearchQueryable(pipeline)).to.equal(
        false,
      );
    });

    it('should return false for a $match stage with $expr and additional fields', function () {
      const pipeline: Document[] = [
        {
          $match: {
            $expr: { $eq: ['$field', 'value'] },
            anotherField: 'value',
          },
        },
      ];
      expect(VIEW_PIPELINE_UTILS.isPipelineSearchQueryable(pipeline)).to.equal(
        false,
      );
    });

    it('should return true for an empty pipeline', function () {
      const pipeline: Document[] = [];
      expect(VIEW_PIPELINE_UTILS.isPipelineSearchQueryable(pipeline)).to.equal(
        true,
      );
    });

    it('should return false if any stage in the pipeline is invalid', function () {
      const pipeline: Document[] = [
        { $addFields: { testField: 'testValue' } },
        { $match: { $expr: { $eq: ['$field', 'value'] } } },
        { $group: { _id: '$field' } },
      ];
      expect(VIEW_PIPELINE_UTILS.isPipelineSearchQueryable(pipeline)).to.equal(
        false,
      );
    });

    it('should handle a pipeline with multiple valid stages', function () {
      const pipeline: Document[] = [
        { $addFields: { field1: 'value1' } },
        { $match: { $expr: { $eq: ['$field', 'value'] } } },
        { $set: { field2: 'value2' } },
      ];
      expect(VIEW_PIPELINE_UTILS.isPipelineSearchQueryable(pipeline)).to.equal(
        true,
      );
    });

    it('should return false for a $match stage with no conditions', function () {
      const pipeline: Document[] = [{ $match: {} }];
      expect(VIEW_PIPELINE_UTILS.isPipelineSearchQueryable(pipeline)).to.equal(
        false,
      );
    });
  });

  describe('isVersionSearchCompatibleForViewsDataExplorer', function () {
    it('should return true for a version greater than or equal to 8.0.0', function () {
      expect(
        VIEW_PIPELINE_UTILS.isVersionSearchCompatibleForViewsDataExplorer(
          '8.0.0',
        ),
      ).to.equal(true);
      expect(
        VIEW_PIPELINE_UTILS.isVersionSearchCompatibleForViewsDataExplorer(
          '8.0.1',
        ),
      ).to.equal(true);
      expect(
        VIEW_PIPELINE_UTILS.isVersionSearchCompatibleForViewsDataExplorer(
          '8.1.0',
        ),
      ).to.equal(true);
    });

    it('should return false for a version less than 8.0.0', function () {
      expect(
        VIEW_PIPELINE_UTILS.isVersionSearchCompatibleForViewsDataExplorer(
          '7.9.9',
        ),
      ).to.equal(false);
      expect(
        VIEW_PIPELINE_UTILS.isVersionSearchCompatibleForViewsDataExplorer(
          '7.0.0',
        ),
      ).to.equal(false);
    });

    it('should handle invalid version format by returning false', function () {
      expect(
        VIEW_PIPELINE_UTILS.isVersionSearchCompatibleForViewsDataExplorer(
          'invalid-version',
        ),
      ).to.equal(false);
      expect(
        VIEW_PIPELINE_UTILS.isVersionSearchCompatibleForViewsDataExplorer(''),
      ).to.equal(false);
    });
  });

  describe('isVersionSearchCompatibleForViewsCompass', function () {
    it('should return true for a version greater than or equal to 8.1.0', function () {
      expect(
        VIEW_PIPELINE_UTILS.isVersionSearchCompatibleForViewsCompass('8.1.0'),
      ).to.equal(true);
      expect(
        VIEW_PIPELINE_UTILS.isVersionSearchCompatibleForViewsCompass('8.1.1'),
      ).to.equal(true);
      expect(
        VIEW_PIPELINE_UTILS.isVersionSearchCompatibleForViewsCompass('8.2.0'),
      ).to.equal(true);
    });

    it('should return false for a version less than 8.1.0', function () {
      expect(
        VIEW_PIPELINE_UTILS.isVersionSearchCompatibleForViewsCompass('8.0.9'),
      ).to.equal(false);
      expect(
        VIEW_PIPELINE_UTILS.isVersionSearchCompatibleForViewsCompass('8.0.0'),
      ).to.equal(false);
      expect(
        VIEW_PIPELINE_UTILS.isVersionSearchCompatibleForViewsCompass('7.9.9'),
      ).to.equal(false);
    });

    it('should handle invalid version format by returning false', function () {
      expect(
        VIEW_PIPELINE_UTILS.isVersionSearchCompatibleForViewsCompass(
          'invalid-version',
        ),
      ).to.equal(false);
      expect(
        VIEW_PIPELINE_UTILS.isVersionSearchCompatibleForViewsCompass(''),
      ).to.equal(false);
    });
  });
});
