import { AuditScoreMatrix, DeterministicResult, SemanticResult } from '../types/brandDna';

/**
 * Computes the unified mathematical scoring matrix per Section 8
 */
export function computeAuditScoreMatrix(
  deterministic: DeterministicResult,
  semantic: SemanticResult
): AuditScoreMatrix {
  const sDet = Math.max(0, Math.min(100, Math.round(deterministic.score * 10) / 10));
  const sSem = Math.max(0, Math.min(100, Math.round(semantic.score * 10) / 10));

  // Overall Brand Alignment Score: S_overall = (S_det * 0.4) + (S_sem * 0.6)
  const sOverall = Math.max(0, Math.min(100, Math.round(((sDet * 0.4) + (sSem * 0.6)) * 10) / 10));

  // Confidence Index: Average of deterministic (1.0) and semantic confidence
  const confidenceIndex = Math.max(0, Math.min(1.0, Math.round(((deterministic.confidence + semantic.confidence) / 2) * 100) / 100));

  let overallRatingLabel: 'EXEMPLARY' | 'ALIGNED' | 'NEEDS_REVIEW' | 'CRITICAL_MISALIGNMENT' = 'ALIGNED';
  if (sOverall >= 90) {
    overallRatingLabel = 'EXEMPLARY';
  } else if (sOverall >= 75) {
    overallRatingLabel = 'ALIGNED';
  } else if (sOverall >= 60) {
    overallRatingLabel = 'NEEDS_REVIEW';
  } else {
    overallRatingLabel = 'CRITICAL_MISALIGNMENT';
  }

  return {
    sDet,
    sSem,
    sOverall,
    confidenceIndex,
    overallRatingLabel
  };
}

/**
 * Returns color category based on score thresholds:
 * > 85%: emerald (#10B981)
 * 60% - 84%: amber (#F59E0B)
 * < 60%: rose/red (#EF4444)
 */
export function getScoreColor(score: number): {
  hex: string;
  textClass: string;
  borderClass: string;
  bgClass: string;
  badgeClass: string;
} {
  if (score >= 85) {
    return {
      hex: '#10B981',
      textClass: 'text-emerald-400',
      borderClass: 'border-emerald-500/40',
      bgClass: 'bg-emerald-500/10',
      badgeClass: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
    };
  }
  if (score >= 60) {
    return {
      hex: '#2DD4BF',
      textClass: 'text-teal-300',
      borderClass: 'border-teal-500/40',
      bgClass: 'bg-teal-500/10',
      badgeClass: 'bg-teal-950/60 text-white border-teal-500/40'
    };
  }
  return {
    hex: '#EF4444',
    textClass: 'text-rose-400',
    borderClass: 'border-rose-500/40',
    bgClass: 'bg-rose-500/10',
    badgeClass: 'bg-rose-950/60 text-rose-300 border-rose-800/60'
  };
}

/**
 * Diagnostic framing language for audit results
 */
export function getDiagnosticSummaryText(matrix: AuditScoreMatrix): {
  headline: string;
  subtext: string;
} {
  if (matrix.sOverall >= 90) {
    return {
      headline: 'High Brand Alignment Detected',
      subtext: 'Content demonstrates strong consistency with voice, formality, and vocabulary benchmarks.'
    };
  }
  if (matrix.sOverall >= 75) {
    return {
      headline: 'Moderate Alignment with Minor Variances',
      subtext: 'Draft largely conforms to brand guidelines, with targeted opportunities for tone or term precision.'
    };
  }
  if (matrix.sOverall >= 60) {
    return {
      headline: 'Potential Misalignment Identified',
      subtext: 'Detected issues in phrasing or stylistic tone. Review suggested alignment improvements below.'
    };
  }
  return {
    headline: 'Critical Brand Misalignment Observed',
    subtext: 'Multiple forbidden terms or significant voice tone deviations detected. Remediation recommended.'
  };
}
