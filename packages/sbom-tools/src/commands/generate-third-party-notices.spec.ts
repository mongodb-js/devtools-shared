import path from 'path';
import type { SinonFakeTimers } from 'sinon';
import { useFakeTimers } from 'sinon';
import { generate3rdPartyNotices } from './generate-third-party-notices';
import { withTempDir } from '../../test/helpers';
import { expect } from 'chai';

async function runGenerateNotices(structure: Record<string, string>) {
  return withTempDir(structure, async (tempDir) => {
    let output = '';

    const error = await generate3rdPartyNotices({
      productName: 'My Product',
      dependencyFiles: [path.resolve(tempDir, 'dependencies.json')],
      configPath: path.resolve(tempDir, 'licenses.json'),
      printResult: (result) => {
        output = result;
      },
    }).catch((err) => Promise.resolve(err));
    return { error, output };
  });
}

describe('generate-third-party-notices', function () {
  let clock: SinonFakeTimers;
  before(function () {
    clock = useFakeTimers(new Date('2023-01-01T12:00:00.468Z'));
  });

  after(function () {
    clock.restore();
  });

  it('reports licenses', async function () {
    const { error, output } = await runGenerateNotices({
      'dependencies.json': JSON.stringify([
        {
          licenseFiles: [
            {
              content: 'my-copyright',
              filename: 'COPYRIGHT',
            },
            {
              content: 'my-license',
              filename: 'LICENSE',
            },
          ],
          name: 'pkg1',
          version: '1.0.0',
          license: 'MIT',
        },
      ]),
      'licenses.json': JSON.stringify({}),
    });

    expect(error).to.be.undefined;
    expect(output).to
      .equal(`The following third-party software is used by and included in **My Product**.
This document was automatically generated on Sun Jan 01 2023.

## List of dependencies

Package|Version|License
-------|-------|-------
**[pkg1](#df57c18c6799d8842573f7535251d2d3084301b8fb74d1f0acbd7edca068c755)**|1.0.0|MIT

## Package details

<a id="df57c18c6799d8842573f7535251d2d3084301b8fb74d1f0acbd7edca068c755"></a>
### [pkg1](https://www.npmjs.com/package/pkg1) (version 1.0.0)
License tags: MIT

License files:
* COPYRIGHT:

      my-copyright

* LICENSE:

      my-license

`);
  });

  it('fails with invalid licenses', async function () {
    const { error, output } = await runGenerateNotices({
      'dependencies.json': JSON.stringify([
        {
          licenseFiles: [],
          name: 'pkg1',
          version: '1.0.0',
          license: 'SOMETHING',
        },
      ]),
      'licenses.json': JSON.stringify({}),
    });

    expect(error?.message).to
      .equal(`Generation failed, found 1 invalid packages:
- pkg1@1.0.0: SOMETHING`);

    expect(output).to.be.empty;
  });

  it('allows to ignore orgs', async function () {
    const { error, output } = await runGenerateNotices({
      'dependencies.json': JSON.stringify([
        {
          licenseFiles: [],
          name: '@ignored-org/pkg1',
          version: '1.0.0',
          license: 'SOMETHING',
        },
      ]),
      'licenses.json': JSON.stringify({
        ignoredOrgs: ['@ignored-org'],
      }),
    });

    expect(error).to.be.undefined;
    expect(output).to
      .equal(`The following third-party software is used by and included in **My Product**.
This document was automatically generated on Sun Jan 01 2023.

## List of dependencies

Package|Version|License
-------|-------|-------


## Package details
`);
  });

  it('allows to ignore packages', async function () {
    const { error, output } = await runGenerateNotices({
      'dependencies.json': JSON.stringify([
        {
          licenseFiles: [],
          name: '@ignored-org/pkg1',
          version: '1.0.0',
          license: 'SOMETHING',
        },
      ]),
      'licenses.json': JSON.stringify({
        ignoredPackages: ['@ignored-org/pkg1@1.0.0'],
      }),
    });

    expect(error).to.be.undefined;
    expect(output).to
      .equal(`The following third-party software is used by and included in **My Product**.
This document was automatically generated on Sun Jan 01 2023.

## List of dependencies

Package|Version|License
-------|-------|-------


## Package details
`);
  });

  it('allows to override licenses', async function () {
    const { error, output } = await runGenerateNotices({
      'dependencies.json': JSON.stringify([
        {
          licenseFiles: [],
          name: '@ignored-org/pkg1',
          version: '1.0.0',
          license: 'SOMETHING',
        },
      ]),
      'licenses.json': JSON.stringify({
        licenseOverrides: { '@ignored-org/pkg1@1.0.0': 'MIT' },
      }),
    });

    expect(error).to.be.undefined;
    expect(output).to
      .equal(`The following third-party software is used by and included in **My Product**.
This document was automatically generated on Sun Jan 01 2023.

## List of dependencies

Package|Version|License
-------|-------|-------
**[@ignored-org/pkg1](#d6aad5d594b2ded84f38bedacf1c895062f4e4161bd755bcedcf1f6db5d5058e)**|1.0.0|MIT

## Package details

<a id="d6aad5d594b2ded84f38bedacf1c895062f4e4161bd755bcedcf1f6db5d5058e"></a>
### [@ignored-org/pkg1](https://www.npmjs.com/package/@ignored-org/pkg1) (version 1.0.0)
License tags: MIT

`);
  });

  it('allows to skip validation for packages', async function () {
    const { error, output } = await runGenerateNotices({
      'dependencies.json': JSON.stringify([
        {
          licenseFiles: [],
          name: 'invalid-package',
          version: '1.0.0',
          license: 'INVALID',
        },
      ]),
      'licenses.json': JSON.stringify({
        doNotValidatePackages: ['invalid-package@1.0.0'],
      }),
    });

    expect(error).to.be.undefined;
    expect(output).to
      .equal(`The following third-party software is used by and included in **My Product**.
This document was automatically generated on Sun Jan 01 2023.

## List of dependencies

Package|Version|License
-------|-------|-------
**[invalid-package](#934251c47b0ded46bf0150a82447d2fe02fddda4c32b2c97cf5b9c3f5f67611f)**|1.0.0|INVALID

## Package details

<a id="934251c47b0ded46bf0150a82447d2fe02fddda4c32b2c97cf5b9c3f5f67611f"></a>
### [invalid-package](https://www.npmjs.com/package/invalid-package) (version 1.0.0)
License tags: INVALID

`);
  });

  it('allows to specify additional licenses', async function () {
    const { error, output } = await runGenerateNotices({
      'dependencies.json': JSON.stringify([
        {
          licenseFiles: [],
          name: 'invalid-package',
          version: '1.0.0',
          license: 'INVALID',
        },
      ]),
      'licenses.json': JSON.stringify({
        additionalAllowedLicenses: ['INVALID'],
      }),
    });

    expect(error).to.be.undefined;
    expect(output).to
      .equal(`The following third-party software is used by and included in **My Product**.
This document was automatically generated on Sun Jan 01 2023.

## List of dependencies

Package|Version|License
-------|-------|-------
**[invalid-package](#934251c47b0ded46bf0150a82447d2fe02fddda4c32b2c97cf5b9c3f5f67611f)**|1.0.0|INVALID

## Package details

<a id="934251c47b0ded46bf0150a82447d2fe02fddda4c32b2c97cf5b9c3f5f67611f"></a>
### [invalid-package](https://www.npmjs.com/package/invalid-package) (version 1.0.0)
License tags: INVALID

`);
  });

  it('fails if overrides are outdated', async function () {
    const { error } = await runGenerateNotices({
      'dependencies.json': JSON.stringify([
        {
          licenseFiles: [],
          name: '@ignored-org/pkg1',
          version: '2.0.0',
          license: 'Apache-2.0',
        },
      ]),
      'licenses.json': JSON.stringify({
        licenseOverrides: { '@ignored-org/pkg1@1.0.0': 'MIT' },
      }),
    });

    expect(error?.message).to.equal(
      'The package "@ignored-org/pkg1@1.0.0" is not appearing in the dependencies, please remove it from the configured ignoredPackages or licenseOverrides.'
    );
  });

  it('fails if ignored packages are outdated', async function () {
    const { error } = await runGenerateNotices({
      'dependencies.json': JSON.stringify([
        {
          licenseFiles: [],
          name: '@ignored-org/pkg1',
          version: '2.0.0',
          license: 'Apache-2.0',
        },
      ]),
      'licenses.json': JSON.stringify({
        ignoredPackages: ['@ignored-org/pkg1@1.0.0'],
      }),
    });

    expect(error?.message).to.equal(
      'The package "@ignored-org/pkg1@1.0.0" is not appearing in the dependencies, please remove it from the configured ignoredPackages or licenseOverrides.'
    );
  });

  it('fails if do not validate packages are outdated', async function () {
    const { error } = await runGenerateNotices({
      'dependencies.json': JSON.stringify([
        {
          licenseFiles: [],
          name: '@ignored-org/pkg1',
          version: '2.0.0',
          license: 'Apache-2.0',
        },
      ]),
      'licenses.json': JSON.stringify({
        doNotValidatePackages: ['@ignored-org/pkg1@1.0.0'],
      }),
    });

    expect(error?.message).to.equal(
      'The package "@ignored-org/pkg1@1.0.0" is not appearing in the dependencies, please remove it from the configured ignoredPackages or licenseOverrides.'
    );
  });
});
