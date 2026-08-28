import { expect } from 'chai';
import { parseEcrRegistry } from './ecr';

describe('parseEcrRegistry', function () {
  it('parses the default SLS image repository', function () {
    expect(
      parseEcrRegistry(
        '664315256653.dkr.ecr.us-east-1.amazonaws.com/disagg-storage/',
      ),
      'default SLS repo should be recognized as ECR',
    ).to.deep.equal({
      registry: '664315256653.dkr.ecr.us-east-1.amazonaws.com',
      registryId: '664315256653',
      region: 'us-east-1',
    });
  });

  it('parses a registry host with no repository path', function () {
    expect(
      parseEcrRegistry('123456789012.dkr.ecr.eu-west-2.amazonaws.com'),
      'bare registry host should parse',
    ).to.deep.equal({
      registry: '123456789012.dkr.ecr.eu-west-2.amazonaws.com',
      registryId: '123456789012',
      region: 'eu-west-2',
    });
  });

  it('returns undefined for a non-ECR repository', function () {
    expect(
      parseEcrRegistry('docker.io/library/'),
      'docker.io is not ECR and must not trigger a login',
    ).to.equal(undefined);
  });

  it('returns undefined for a lookalike host', function () {
    expect(
      parseEcrRegistry('evil.amazonaws.com.attacker.test/x/'),
      'host must actually end in .amazonaws.com to count as ECR',
    ).to.equal(undefined);
  });

  it('returns undefined when the account ID is not 12 digits', function () {
    expect(
      parseEcrRegistry('12345.dkr.ecr.us-east-1.amazonaws.com/x/'),
      'AWS account IDs are always 12 digits, so a shorter one is not a registry',
    ).to.equal(undefined);
  });
});
