export type GitCommit = {
  commit: {
    long: string;
    short: string;
  };
  subject: string;
  body: string;
};

/**
 * Calculate the bump for a commit.
 *
 * The bump is determined as follows:
 * if any commit subject or body contains
 *    BREAKING CHANGE or BREAKING CHANGES or
 *    subject has ! after the scope (ie. feat! or feat(..)!:)
 * -> then is a major bump
 * if subject starts with feat
 * -> then is a minor bump
 * everything else is a patch.
 *
 * @param {{subject: string, body: string}} commit - the commit to analyze
 * @return {string} the semver increment determined
 */
export function getConventionalBump(
  commit: Pick<GitCommit, 'subject' | 'body'>
) {
  const { subject, body } = commit;

  if (
    /\bBREAKING CHANGES?\b/.test(subject) ||
    /^[a-z]+(\([A-z0-9_-]+\))?!:/.test(subject) ||
    /\bBREAKING CHANGES?\b/.test(body)
  ) {
    return 'major';
  }

  if (/^(feat)[:(]/.test(subject)) {
    return 'minor';
  }

  return 'patch';
}
