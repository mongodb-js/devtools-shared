/* eslint-disable @typescript-eslint/restrict-template-expressions */
import sinon from 'sinon';
import path from 'path';
import { expect } from 'chai';
import { fetchCodeQLResults } from './fetch-codeql-results';

describe('fetch-codeql-results', function () {
  let octokit: any;

  beforeEach(function () {
    octokit = {
      git: {
        getRef: sinon
          .stub()
          .resolves({ data: { object: { type: 'tag', sha: '1'.repeat(40) } } }),
        getTag: sinon
          .stub()
          .resolves({
            data: { object: { type: 'commit', sha: '2'.repeat(40) } },
          }),
      },
      codeScanning: {
        listRecentAnalyses: sinon
          .stub()
          .callsFake(({ owner, repo, page }: any) => {
            const key = `${owner}/${repo}#${page}`;
            const data = {
              'mongodb-js/mongodb-connection-string-url#0': [
                { commit_sha: '2'.repeat(40), id: 1000 },
              ],
              'mongodb-js/mongodb-connection-string-url#1': [
                { commit_sha: '2'.repeat(40), id: 1001 },
              ],
              'mongodb-js/example-repo#0': [
                { commit_sha: '3'.repeat(40), id: 1002 },
              ],
              'mongodb-js/example-repo#1': [],
            }[key];
            if (!data)
              throw new Error(`No analysis list entry for ${key} prepared`);
            return { data };
          }),
        getAnalysis: sinon
          .stub()
          .callsFake(({ owner, repo, analysis_id }: any) => {
            const key = `${owner}/${repo}#${analysis_id}`;
            const data = {
              'mongodb-js/mongodb-connection-string-url#1000': {
                version: '1',
                runs: [
                  {
                    results: [],
                    tool: {
                      driver: { name: 'toolname', semanticVersion: '1.2.3' },
                    },
                    versionControlProvenance: [{ revisionId: '2'.repeat(40) }],
                  },
                ],
              },
              'mongodb-js/mongodb-connection-string-url#1001': {
                version: '1',
                runs: [
                  {
                    results: [],
                    tool: {
                      driver: { name: 'toolname', semanticVersion: '1.2.3' },
                    },
                    versionControlProvenance: [{ revisionId: '2'.repeat(40) }],
                  },
                ],
              },
              'mongodb-js/example-repo#1002': {
                version: '1',
                runs: [
                  {
                    results: [
                      {
                        properties: {
                          'github/alertUrl': 'https://example.com/alert1',
                        },
                      },
                    ],
                    tool: {
                      driver: { name: 'toolname', semanticVersion: '1.2.3' },
                    },
                    versionControlProvenance: [
                      {
                        revisionId: '3'.repeat(40),
                      },
                    ],
                  },
                ],
              },
            }[key];
            if (!data) throw new Error(`No analysis entry for ${key} prepared`);
            return { data };
          }),
      },
      request: sinon.stub().callsFake(({ url }) => {
        const data = {
          'https://example.com/alert1': {
            state: 'dismissed',
            dismissed_reason: 'false positive',
            dismissed_comment: 'totally fine',
            rule: {
              id: 'rule1234',
              description: 'foobar',
              security_severity_level: 'high',
            },
          },
        }[url];
        if (!data) throw new Error(`No URL response for ${url} prepared`);
        return { data };
      }),
    };
  });

  it('fetches CodeQL results for a repository', async function () {
    const dir = path.resolve(__dirname, '../../test/fixtures/example-repo');
    const result: any = await fetchCodeQLResults(octokit, {
      dependencyFiles: [path.join(dir, 'dependencies.json')],
      excludeRepos: [],
      currentRepo: {
        owner: 'mongodb-js',
        repo: 'example-repo',
        commit: '3'.repeat(40),
      },
    });
    result.properties['mongodb/creationParams'].timestamp =
      '2024-05-23T12:03:47.796Z';
    expect(result).to.deep.equal({
      runs: [
        {
          results: [],
          versionControlProvenance: [
            { revisionId: '2222222222222222222222222222222222222222' },
          ],
        },
        {
          results: [],
          versionControlProvenance: [
            { revisionId: '2222222222222222222222222222222222222222' },
          ],
        },
        {
          results: [
            {
              properties: {
                'github/alertUrl': 'https://example.com/alert1',
                'mongodb/alertState': {
                  state: 'dismissed',
                  dismissed_reason: 'false positive',
                  dismissed_comment: 'totally fine',
                  repos: {
                    revisionId: '3333333333333333333333333333333333333333',
                    repos: [
                      {
                        owner: 'mongodb-js',
                        repo: 'example-repo',
                        commit: '3333333333333333333333333333333333333333',
                      },
                    ],
                  },
                  rule: {
                    id: 'rule1234',
                    description: 'foobar',
                    security_severity_level: 'high',
                  },
                },
              },
            },
          ],
          versionControlProvenance: [
            { revisionId: '3333333333333333333333333333333333333333' },
          ],
        },
      ],
      version: '1',
      properties: {
        'mongodb/creationParams': {
          fromRepo: {
            owner: 'mongodb-js',
            repo: 'example-repo',
            commit: '3333333333333333333333333333333333333333',
          },
          excludeRepos: ['mongodb-js/example-repo'],
          timestamp: '2024-05-23T12:03:47.796Z',
        },
      },
    });
  });
});
