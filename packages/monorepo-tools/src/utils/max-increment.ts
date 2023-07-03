import type { ReleaseType } from 'semver';
import semver from 'semver';

export function maxIncrement(
  inc1: ReleaseType | null | undefined,
  inc2: ReleaseType | null | undefined
): ReleaseType | null {
  if (inc1 && inc2) {
    return semver.gt(
      semver.inc('1.0.0', inc1) ?? '',
      semver.inc('1.0.0', inc2) ?? ''
    )
      ? inc1
      : inc2;
  }

  // return the first defined or null in neither are set
  return (inc1 || inc2) ?? null;
}
