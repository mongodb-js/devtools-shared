<!--
  ^^^^^
  Please fill the title above according to https://www.conventionalcommits.org/en/v1.0.0/.

  type(scope): message <TICKET-NUMBER>

  eg. fix(crud): updates ace editor width in agg pipeline view COMPASS-1111

  Use `feat`, `fix` for user facing changes that should be part of release notes.

  # Semantic Versioning:

  Package versions will be bumped automatically according to the PR title:

  - The words `BREAKING CHANGE` in the title will cause a **major** bump to all the packages changed in the PR. All dependants will also have a major bump (dependencies, optionalDependencies, peerDependencies) or a patch bump (devDependencies).
  - A subject starting with `feat` will cause a **minor** bump to all the packages changed in the PR. All dependants will also have a minor bump (dependencies, optionalDependencies, peerDependencies) or a patch bump (devDependencies).
  - Any other change to any package will cause a `patch` bump to the package and all its dependants.
-->

## Description
<!--- Describe your changes in detail -->
<!--- If applicable, describe (or illustrate) architecture flow -->

## Open Questions
<!--- Any particular areas you'd like reviewers to pay attention to? -->

## Checklist
- [ ] I have signed the Contributor License Agreement (https://www.mongodb.com/legal/contributor-agreement)
- [ ] New tests and/or benchmarks are included
- [ ] Documentation is changed or added
