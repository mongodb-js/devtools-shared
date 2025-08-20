import { expect } from 'chai';
import {
  isPipelineSearchQueryable,
  isVersionSearchCompatibleForViewsCompass,
  isVersionSearchCompatibleForViewsDataExplorer,
} from './views';
import type { Document } from 'mongodb';

describe('views', function () {
  describe('isPipelineSearchQueryable', function () {
    it('should return true for a valid pipeline with $addFields stage', function () {
      const pipeline: Document[] = [{ $addFields: { testField: 'testValue' } }];
      expect(isPipelineSearchQueryable(pipeline)).to.equal(true);
    });

    it('should return true for a valid pipeline with $set stage', function () {
      const pipeline: Document[] = [{ $set: { testField: 'testValue' } }];
      expect(isPipelineSearchQueryable(pipeline)).to.equal(true);
    });

    it('should return true for a valid pipeline with $match stage using $expr', function () {
      const pipeline: Document[] = [
        { $match: { $expr: { $eq: ['$field', 'value'] } } },
      ];
      expect(isPipelineSearchQueryable(pipeline)).to.equal(true);
    });

    it('should return false for a pipeline with an unsupported stage', function () {
      const pipeline: Document[] = [{ $group: { _id: '$field' } }];
      expect(isPipelineSearchQueryable(pipeline)).to.equal(false);
    });

    it('should return false for a $match stage without $expr', function () {
      const pipeline: Document[] = [{ $match: { nonExprKey: 'someValue' } }];
      expect(isPipelineSearchQueryable(pipeline)).to.equal(false);
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
      expect(isPipelineSearchQueryable(pipeline)).to.equal(false);
    });

    it('should return true for an empty pipeline', function () {
      const pipeline: Document[] = [];
      expect(isPipelineSearchQueryable(pipeline)).to.equal(true);
    });

    it('should return false if any stage in the pipeline is invalid', function () {
      const pipeline: Document[] = [
        { $addFields: { testField: 'testValue' } },
        { $match: { $expr: { $eq: ['$field', 'value'] } } },
        { $group: { _id: '$field' } },
      ];
      expect(isPipelineSearchQueryable(pipeline)).to.equal(false);
    });

    it('should handle a pipeline with multiple valid stages', function () {
      const pipeline: Document[] = [
        { $addFields: { field1: 'value1' } },
        { $match: { $expr: { $eq: ['$field', 'value'] } } },
        { $set: { field2: 'value2' } },
      ];
      expect(isPipelineSearchQueryable(pipeline)).to.equal(true);
    });

    it('should return false for a $match stage with no conditions', function () {
      const pipeline: Document[] = [{ $match: {} }];
      expect(isPipelineSearchQueryable(pipeline)).to.equal(false);
    });
  });

  describe('isVersionSearchCompatibleForViewsDataExplorer', function () {
    it('should return true for a version greater than or equal to 8.0.0', function () {
      expect(isVersionSearchCompatibleForViewsDataExplorer('8.0.0')).to.equal(
        true,
      );
      expect(isVersionSearchCompatibleForViewsDataExplorer('8.0.1')).to.equal(
        true,
      );
      expect(isVersionSearchCompatibleForViewsDataExplorer('8.1.0')).to.equal(
        true,
      );
    });

    it('should return false for a version less than 8.0.0', function () {
      expect(isVersionSearchCompatibleForViewsDataExplorer('7.9.9')).to.equal(
        false,
      );
      expect(isVersionSearchCompatibleForViewsDataExplorer('7.0.0')).to.equal(
        false,
      );
    });

    it('should handle invalid version format by returning false', function () {
      expect(
        isVersionSearchCompatibleForViewsDataExplorer('invalid-version'),
      ).to.equal(false);
      expect(isVersionSearchCompatibleForViewsDataExplorer('')).to.equal(false);
    });
  });

  describe('isVersionSearchCompatibleForViewsCompass', function () {
    it('should return true for a version greater than or equal to 8.1.0', function () {
      expect(isVersionSearchCompatibleForViewsCompass('8.1.0')).to.equal(true);
      expect(isVersionSearchCompatibleForViewsCompass('8.1.1')).to.equal(true);
      expect(isVersionSearchCompatibleForViewsCompass('8.2.0')).to.equal(true);
    });

    it('should return false for a version less than 8.1.0', function () {
      expect(isVersionSearchCompatibleForViewsCompass('8.0.9')).to.equal(false);
      expect(isVersionSearchCompatibleForViewsCompass('8.0.0')).to.equal(false);
      expect(isVersionSearchCompatibleForViewsCompass('7.9.9')).to.equal(false);
    });

    it('should handle invalid version format by returning false', function () {
      expect(
        isVersionSearchCompatibleForViewsCompass('invalid-version'),
      ).to.equal(false);
      expect(isVersionSearchCompatibleForViewsCompass('')).to.equal(false);
    });
  });
});
