export const MATCHING_METHOD_VERSION = "mahasetu.matching/1.0.0" as const;

export const MATCH_WEIGHTS = {
  capabilityOverlap: 0.4,
  semanticSimilarity: 0.25,
  evidenceStrength: 0.2,
  deliveryFit: 0.15,
} as const;

export type MatchWeightKey = keyof typeof MATCH_WEIGHTS;

export const ASSURANCE_LEVEL_WEIGHTS = {
  AUTHORITY_ASSERTED: 1.0,
  OFFICER_VERIFIED: 0.95,
  SYSTEM_OBSERVED: 0.85,
  THIRD_PARTY_ATTESTED: 0.8,
  SIMULATED_FOR_DEMO: 0.75,
  SELF_DECLARED: 0.4,
} as const;

export type MatchEvidenceAssuranceLevel = keyof typeof ASSURANCE_LEVEL_WEIGHTS;

export interface MatchEligibilityCriterion {
  readonly id: string;
  readonly kind: string;
  readonly mandatory: boolean;
  readonly acceptedEvidence?: readonly string[];
  readonly verificationMethod?: string;
}

export interface StartupCapabilityRecord {
  readonly capabilityCode: string;
  readonly name?: string;
  readonly taxonomyPath?: string;
  readonly proficiency: number; // 1 to 5
  readonly evidenceSummary?: string;
}

export interface StartupEvidenceRecord {
  readonly id: string;
  readonly type: string;
  readonly assuranceLevel: string;
  readonly status: string;
  readonly issuedAt?: string | null;
  readonly expiresAt?: string | null;
  readonly verificationRef?: string | null;
  readonly synthetic?: boolean;
}

export interface StartupProfileMatchInput {
  readonly startupId: string;
  readonly organizationId: string;
  readonly legalName: string;
  readonly displayName: string;
  readonly summary: string;
  readonly capabilityCodes: readonly string[];
  readonly capabilities?: readonly StartupCapabilityRecord[];
  readonly credentialEvidence?: readonly StartupEvidenceRecord[];
  readonly deploymentModels: readonly string[];
  readonly supportedLanguages: readonly string[];
  readonly operatingLocations?: readonly string[];
  readonly website?: string | null;
  readonly stage?: string | null;
}

export interface ChallengeMatchInput {
  readonly challengeId: string;
  readonly departmentId?: string;
  readonly title: string;
  readonly problem: string;
  readonly requiredCapabilityCodes: readonly string[];
  readonly desiredCapabilityCodes?: readonly string[];
  readonly eligibilityCriteria: readonly MatchEligibilityCriterion[];
  readonly preferredDeploymentModels?: readonly string[];
  readonly preferredLanguages?: readonly string[];
  readonly targetLocations?: readonly string[];
  readonly keywords?: readonly string[];
}

export interface CriterionEvaluation {
  readonly criterionId: string;
  readonly kind: string;
  readonly mandatory: boolean;
  readonly passed: boolean;
  readonly matchedEvidenceId?: string;
  readonly matchedAssuranceLevel?: string;
  readonly reason: string;
}

export interface EligibilityEvaluationResult {
  readonly passed: boolean;
  readonly mandatoryCount: number;
  readonly mandatoryPassed: number;
  readonly criteriaEvaluations: readonly CriterionEvaluation[];
  readonly ineligibilityReasons: readonly string[];
}

export interface CapabilityOverlapFactor {
  readonly key: "capabilityOverlap";
  readonly score: number;
  readonly weight: typeof MATCH_WEIGHTS.capabilityOverlap;
  readonly weightedContribution: number;
  readonly matchedRequired: readonly string[];
  readonly missingRequired: readonly string[];
  readonly matchedDesired: readonly string[];
  readonly missingDesired: readonly string[];
  readonly averageProficiency: number;
  readonly rationale: string;
}

export interface SemanticSimilarityFactor {
  readonly key: "semanticSimilarity";
  readonly score: number;
  readonly weight: typeof MATCH_WEIGHTS.semanticSimilarity;
  readonly weightedContribution: number;
  readonly matchedKeywords: readonly string[];
  readonly domainTaxonomyOverlap: readonly string[];
  readonly rationale: string;
}

export interface EvidenceStrengthFactor {
  readonly key: "evidenceStrength";
  readonly score: number;
  readonly weight: typeof MATCH_WEIGHTS.evidenceStrength;
  readonly weightedContribution: number;
  readonly verifiedEvidenceCount: number;
  readonly highAssuranceCount: number;
  readonly evidenceSummaries: readonly string[];
  readonly rationale: string;
}

export interface DeliveryFitFactor {
  readonly key: "deliveryFit";
  readonly score: number;
  readonly weight: typeof MATCH_WEIGHTS.deliveryFit;
  readonly weightedContribution: number;
  readonly matchedDeploymentModels: readonly string[];
  readonly matchedLanguages: readonly string[];
  readonly matchedLocations: readonly string[];
  readonly rationale: string;
}

export interface FactorBreakdown {
  readonly capabilityOverlap: CapabilityOverlapFactor;
  readonly semanticSimilarity: SemanticSimilarityFactor;
  readonly evidenceStrength: EvidenceStrengthFactor;
  readonly deliveryFit: DeliveryFitFactor;
}

export interface MatchExplanation {
  readonly positiveReasons: readonly string[];
  readonly missingCapabilities: readonly string[];
  readonly evidenceSummary: readonly string[];
  readonly gaps: readonly string[];
  readonly feedbackSuggestions: readonly string[];
  readonly sensitiveAttributesUsed: false;
  readonly formula: string;
}

export interface StartupMatchResult {
  readonly id: string;
  readonly challengeId: string;
  readonly startupId: string;
  readonly organizationId: string;
  readonly displayName: string;
  readonly eligibilityPass: boolean;
  readonly eligibility: EligibilityEvaluationResult;
  readonly capabilityScore: number;
  readonly semanticScore: number;
  readonly evidenceScore: number;
  readonly deliveryScore: number;
  readonly overallScore: number;
  readonly confidence: number;
  readonly breakdown: FactorBreakdown;
  readonly explanation: MatchExplanation;
  readonly modelVersion: string;
  readonly generatedAt: string;
  readonly advisoryOnly: true;
  readonly humanAuthorizationRequired: true;
  readonly synthetic: boolean;
  readonly displayLabel?: "Synthetic demonstration data";
}

export interface BatchMatchResult {
  readonly challengeId: string;
  readonly totalEvaluated: number;
  readonly eligibleCount: number;
  readonly ineligibleCount: number;
  readonly rankedMatches: readonly StartupMatchResult[];
  readonly generatedAt: string;
  readonly modelVersion: string;
  readonly advisoryOnly: true;
  readonly humanAuthorizationRequired: true;
  readonly synthetic: boolean;
  readonly displayLabel?: "Synthetic demonstration data";
}

export interface MatchEvaluationOptions {
  readonly generatedAt?: string;
  readonly modelVersion?: string;
  readonly synthetic?: boolean;
  readonly displayLabel?: "Synthetic demonstration data";
}
