export const TRANSFERABILITY_METHOD_VERSION =
  "mahasetu.transferability/1.0.0" as const;

export const TRANSFERABILITY_WEIGHTS = {
  problemSimilarity: 0.2,
  operatingContextFit: 0.15,
  dataFit: 0.15,
  integrationFit: 0.1,
  scaleFit: 0.1,
  evidenceStrength: 0.15,
  evidenceFreshness: 0.1,
  localizationCostFit: 0.05,
} as const;

export type TransferabilityFactorKey = keyof typeof TRANSFERABILITY_WEIGHTS;

export type TransferabilityConstraint =
  | "NONE"
  | "LOCALIZED_MICRO_PILOT_REQUIRED"
  | "FRESH_COMPETITIVE_DISCOVERY_REQUIRED"
  | "NOT_CURRENTLY_TRANSFERABLE";

export type TransferabilityRecommendation =
  | "REUSE_EVIDENCE_AND_ROUTE_TO_AUTHORIZED_PROCUREMENT"
  | "RUN_LOCALIZED_MICRO_PILOT"
  | "REQUIRE_FRESH_COMPETITIVE_DISCOVERY"
  | "NOT_CURRENTLY_TRANSFERABLE";

export interface TransferabilityFactorInput {
  readonly key: TransferabilityFactorKey;
  readonly score: number;
  readonly rationale: string;
  readonly evidenceIds: readonly string[];
  readonly gaps: readonly string[];
  readonly constraint: TransferabilityConstraint;
}

export interface TransferabilityAssessmentInput {
  readonly assessmentId: string;
  readonly solutionCardId: string;
  readonly sourceContextId: string;
  readonly targetContextId: string;
  readonly factors: readonly TransferabilityFactorInput[];
  readonly synthetic: boolean;
  readonly displayLabel?: "Synthetic demonstration data";
}

export interface TransferabilityFactorResult extends TransferabilityFactorInput {
  readonly weight: number;
  readonly weightedContribution: number;
}

export interface TransferabilityAssessment {
  readonly id: string;
  readonly methodVersion: typeof TRANSFERABILITY_METHOD_VERSION;
  readonly solutionCardId: string;
  readonly sourceContextId: string;
  readonly targetContextId: string;
  readonly score: number;
  readonly scoreBandRecommendation: TransferabilityRecommendation;
  readonly recommendation: TransferabilityRecommendation;
  readonly factors: readonly TransferabilityFactorResult[];
  readonly bindingConstraints: readonly TransferabilityConstraint[];
  readonly reasons: readonly string[];
  readonly gaps: readonly string[];
  readonly advisoryOnly: true;
  readonly humanAuthorizationRequired: true;
  readonly synthetic: boolean;
  readonly displayLabel?: "Synthetic demonstration data";
}

const RECOMMENDATION_CAUTION: Record<TransferabilityRecommendation, number> = {
  REUSE_EVIDENCE_AND_ROUTE_TO_AUTHORIZED_PROCUREMENT: 0,
  RUN_LOCALIZED_MICRO_PILOT: 1,
  REQUIRE_FRESH_COMPETITIVE_DISCOVERY: 2,
  NOT_CURRENTLY_TRANSFERABLE: 3,
};

const CONSTRAINT_RECOMMENDATION: Record<
  TransferabilityConstraint,
  TransferabilityRecommendation
> = {
  NONE: "REUSE_EVIDENCE_AND_ROUTE_TO_AUTHORIZED_PROCUREMENT",
  LOCALIZED_MICRO_PILOT_REQUIRED: "RUN_LOCALIZED_MICRO_PILOT",
  FRESH_COMPETITIVE_DISCOVERY_REQUIRED: "REQUIRE_FRESH_COMPETITIVE_DISCOVERY",
  NOT_CURRENTLY_TRANSFERABLE: "NOT_CURRENTLY_TRANSFERABLE",
};

const round = (value: number, places = 4): number => {
  const factor = 10 ** places;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

const scoreRecommendation = (score: number): TransferabilityRecommendation => {
  if (score >= 0.8) return "REUSE_EVIDENCE_AND_ROUTE_TO_AUTHORIZED_PROCUREMENT";
  if (score >= 0.6) return "RUN_LOCALIZED_MICRO_PILOT";
  if (score >= 0.4) return "REQUIRE_FRESH_COMPETITIVE_DISCOVERY";
  return "NOT_CURRENTLY_TRANSFERABLE";
};

const moreCautiousRecommendation = (
  left: TransferabilityRecommendation,
  right: TransferabilityRecommendation,
): TransferabilityRecommendation =>
  RECOMMENDATION_CAUTION[left] >= RECOMMENDATION_CAUTION[right] ? left : right;

export function assessTransferability(
  input: TransferabilityAssessmentInput,
): TransferabilityAssessment {
  if (!input.assessmentId || !input.solutionCardId) {
    throw new Error("assessmentId and solutionCardId are required.");
  }
  if (input.synthetic && input.displayLabel !== "Synthetic demonstration data") {
    throw new Error("Synthetic transferability inputs must carry the demo label.");
  }

  const expectedKeys = Object.keys(TRANSFERABILITY_WEIGHTS) as TransferabilityFactorKey[];
  const keys = input.factors.map((factor) => factor.key);
  const duplicateKeys = keys.filter((key, index) => keys.indexOf(key) !== index);
  const missingKeys = expectedKeys.filter((key) => !keys.includes(key));
  const unknownKeys = keys.filter((key) => !expectedKeys.includes(key));
  if (duplicateKeys.length || missingKeys.length || unknownKeys.length) {
    throw new Error(
      `Transferability requires each factor exactly once. Missing: ${missingKeys.join(", ") || "none"}; duplicates: ${duplicateKeys.join(", ") || "none"}; unknown: ${unknownKeys.join(", ") || "none"}.`,
    );
  }

  const factorMap = new Map(input.factors.map((factor) => [factor.key, factor]));
  const factors = expectedKeys.map((key): TransferabilityFactorResult => {
    const factor = factorMap.get(key)!;
    if (!Number.isFinite(factor.score) || factor.score < 0 || factor.score > 1) {
      throw new Error(`Transferability factor ${key} score must be between 0 and 1.`);
    }
    if (!factor.rationale.trim()) {
      throw new Error(`Transferability factor ${key} requires a rationale.`);
    }
    const weight = TRANSFERABILITY_WEIGHTS[key];
    return {
      ...factor,
      weight,
      weightedContribution: round(factor.score * weight),
    };
  });
  const score = round(
    factors.reduce((total, factor) => total + factor.weightedContribution, 0),
  );
  const scoreBandRecommendation = scoreRecommendation(score);
  const bindingConstraints = Array.from(
    new Set(
      factors
        .map((factor) => factor.constraint)
        .filter((constraint) => constraint !== "NONE"),
    ),
  );
  const recommendation = bindingConstraints.reduce(
    (current, constraint) =>
      moreCautiousRecommendation(
        current,
        CONSTRAINT_RECOMMENDATION[constraint],
      ),
    scoreBandRecommendation,
  );
  const gaps = factors.flatMap((factor) =>
    factor.gaps.map((gap) => `${factor.key}: ${gap}`),
  );
  const reasons = factors.map(
    (factor) =>
      `${factor.key}: ${factor.score.toFixed(2)} × ${factor.weight.toFixed(2)} = ${factor.weightedContribution.toFixed(4)} — ${factor.rationale}`,
  );

  return {
    id: input.assessmentId,
    methodVersion: TRANSFERABILITY_METHOD_VERSION,
    solutionCardId: input.solutionCardId,
    sourceContextId: input.sourceContextId,
    targetContextId: input.targetContextId,
    score,
    scoreBandRecommendation,
    recommendation,
    factors,
    bindingConstraints,
    reasons,
    gaps,
    advisoryOnly: true,
    humanAuthorizationRequired: true,
    synthetic: input.synthetic,
    displayLabel: input.displayLabel,
  };
}
