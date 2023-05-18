export type KnownSeverity = 'low' | 'medium' | 'high' | 'critical';
export type Severity = KnownSeverity | 'unknown';

type Score = number | undefined;

const SEVERITY_TO_SCORE: Record<Severity, Score> = {
  low: 0,
  medium: 4,
  high: 7,
  critical: 9,
  unknown: undefined,
};

export function severityToScore(severity: Severity): Score {
  return SEVERITY_TO_SCORE[severity];
}

export function scoreToSeverity(score: number | undefined): Severity {
  if (score === undefined) {
    return 'unknown';
  }

  if (score >= 9) {
    return 'critical';
  }
  if (score >= 7) {
    return 'high';
  }
  if (score >= 4) {
    return 'medium';
  }
  return 'low';
}
