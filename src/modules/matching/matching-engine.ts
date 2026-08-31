import {
  ASSURANCE_LEVEL_WEIGHTS,
  MATCH_WEIGHTS,
  MATCHING_METHOD_VERSION,
  type BatchMatchResult,
  type CapabilityOverlapFactor,
  type ChallengeMatchInput,
  type CriterionEvaluation,
  type DeliveryFitFactor,
  type EligibilityEvaluationResult,
  type EvidenceStrengthFactor,
  type FactorBreakdown,
  type MatchEvaluationOptions,
  type MatchEvidenceAssuranceLevel,
  type MatchExplanation,
  type SemanticSimilarityFactor,
  type StartupProfileMatchInput,
  type StartupMatchResult,
} from "./types";

const round = (value: number, places = 4): number => {
  const factor = 10 ** places;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

const clamp = (value: number, min = 0, max = 1): number => {
  return Math.max(min, Math.min(max, value));
};

function normalizeString(text: string): string {
  return text.toLowerCase().trim();
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-_]/g, " ")
    .split(/[\s-_]+/)
    .filter((token) => token.length > 2);
}

function matchesEvidenceKind(criterionKind: string, evidenceType: string): boolean {
  const normCriterion = normalizeString(criterionKind).replace(/[^a-z0-9]/g, "");
  const normEvidence = normalizeString(evidenceType).replace(/[^a-z0-9]/g, "");

  if (normCriterion.includes(normEvidence) || normEvidence.includes(normCriterion)) {
    return true;
  }

  // Common synonym mappings for Indian procurement & startup ecosystem
  const synonyms: Record<string, string[]> = {
    startuprecognition: ["dpiitrecognition", "startupindia", "udyam", "msme"],
    securityreadiness: ["securitytestreport", "soc2", "iso27001", "certin", "securityaudit", "privacyassessment"],
    msmestatus: ["udyam", "msmeregistration", "dpiitrecognition"],
    incorporation: ["mca", "certificateofincorporation", "cin", "pan"],
    taxcompliance: ["gstn", "gstcompliance", "taxclearance"],
  };

  const matchedSynonyms = synonyms[normCriterion] ?? [];
  return matchedSynonyms.some((syn) => normEvidence.includes(syn) || syn.includes(normEvidence));
}

export function evaluateEligibility(
  challenge: ChallengeMatchInput,
  startup: StartupProfileMatchInput,
): EligibilityEvaluationResult {
  const criteria = challenge.eligibilityCriteria ?? [];
  const evidenceList = startup.credentialEvidence ?? [];
  const criteriaEvaluations: CriterionEvaluation[] = [];
  const ineligibilityReasons: string[] = [];

  let mandatoryCount = 0;
  let mandatoryPassed = 0;

  for (const criterion of criteria) {
    if (criterion.mandatory) {
      mandatoryCount++;
    }

    // Look for matching evidence
    const matchingEvidence = evidenceList.filter((ev) =>
      matchesEvidenceKind(criterion.kind, ev.type),
    );

    const validEvidence = matchingEvidence.find((ev) => {
      const isStatusValid =
        ev.status === "VERIFIED" || ev.status === "ACTIVE" || ev.status === "VALID";
      const isNotExpired =
        !ev.expiresAt || new Date(ev.expiresAt).getTime() > Date.now();

      if (!isStatusValid || !isNotExpired) {
        return false;
      }

      if (
        criterion.acceptedEvidence &&
        criterion.acceptedEvidence.length > 0 &&
        !criterion.acceptedEvidence.includes(ev.assuranceLevel)
      ) {
        return false;
      }

      return true;
    });

    if (validEvidence) {
      if (criterion.mandatory) {
        mandatoryPassed++;
      }
      criteriaEvaluations.push({
        criterionId: criterion.id,
        kind: criterion.kind,
        mandatory: criterion.mandatory,
        passed: true,
        matchedEvidenceId: validEvidence.id,
        matchedAssuranceLevel: validEvidence.assuranceLevel,
        reason: `Satisfied with ${validEvidence.type} (${validEvidence.assuranceLevel}).`,
      });
    } else {
      const reason = `No valid or accepted evidence found for criterion ${criterion.kind}${
        criterion.mandatory ? " (Mandatory)" : ""
      }.`;

      if (criterion.mandatory) {
        ineligibilityReasons.push(reason);
      }

      criteriaEvaluations.push({
        criterionId: criterion.id,
        kind: criterion.kind,
        mandatory: criterion.mandatory,
        passed: false,
        reason,
      });
    }
  }

  const passed = mandatoryCount === mandatoryPassed;

  return {
    passed,
    mandatoryCount,
    mandatoryPassed,
    criteriaEvaluations,
    ineligibilityReasons,
  };
}

export function calculateCapabilityOverlap(
  challenge: ChallengeMatchInput,
  startup: StartupProfileMatchInput,
): CapabilityOverlapFactor {
  const startupCapabilityCodes = new Set<string>([
    ...(startup.capabilityCodes ?? []),
    ...(startup.capabilities?.map((c) => c.capabilityCode) ?? []),
  ]);

  const proficiencyMap = new Map<string, number>();
  if (startup.capabilities) {
    for (const cap of startup.capabilities) {
      proficiencyMap.set(cap.capabilityCode, cap.proficiency);
    }
  }

  const requiredCodes = challenge.requiredCapabilityCodes ?? [];
  const desiredCodes = challenge.desiredCapabilityCodes ?? [];

  const matchedRequired: string[] = [];
  const missingRequired: string[] = [];
  const matchedDesired: string[] = [];
  const missingDesired: string[] = [];

  let totalProficiency = 0;
  let proficiencyCount = 0;

  for (const code of requiredCodes) {
    if (startupCapabilityCodes.has(code)) {
      matchedRequired.push(code);
      const prof = proficiencyMap.get(code) ?? 3;
      totalProficiency += prof;
      proficiencyCount++;
    } else {
      missingRequired.push(code);
    }
  }

  for (const code of desiredCodes) {
    if (startupCapabilityCodes.has(code)) {
      matchedDesired.push(code);
      const prof = proficiencyMap.get(code) ?? 3;
      totalProficiency += prof;
      proficiencyCount++;
    } else {
      missingDesired.push(code);
    }
  }

  const avgProficiency = proficiencyCount > 0 ? totalProficiency / proficiencyCount : 3;

  // Base score calculation
  const requiredRatio = requiredCodes.length > 0 ? matchedRequired.length / requiredCodes.length : 1;
  const desiredRatio = desiredCodes.length > 0 ? matchedDesired.length / desiredCodes.length : 1;

  let rawScore: number;
  if (requiredCodes.length > 0 && desiredCodes.length > 0) {
    rawScore = requiredRatio * 0.8 + desiredRatio * 0.2;
  } else if (requiredCodes.length > 0) {
    rawScore = requiredRatio;
  } else if (desiredCodes.length > 0) {
    rawScore = desiredRatio;
  } else {
    rawScore = startupCapabilityCodes.size > 0 ? 0.85 : 0.2;
  }

  // Proficiency scaling bonus/penalty (+-0.1 based on proficiency above/below baseline 3)
  const proficiencyAdjustment = ((avgProficiency - 3) / 2) * 0.1;
  const score = round(clamp(rawScore + proficiencyAdjustment, 0, 1));
  const weight = MATCH_WEIGHTS.capabilityOverlap;
  const weightedContribution = round(score * weight);

  let rationale: string;
  if (matchedRequired.length === requiredCodes.length && requiredCodes.length > 0) {
    rationale = `All ${requiredCodes.length} required capabilities matched with average proficiency ${avgProficiency.toFixed(1)}/5.`;
  } else if (matchedRequired.length > 0) {
    rationale = `Matched ${matchedRequired.length}/${requiredCodes.length} required capabilities. Missing: ${missingRequired.join(", ")}.`;
  } else if (requiredCodes.length === 0 && matchedDesired.length > 0) {
    rationale = `Matched ${matchedDesired.length}/${desiredCodes.length} desired capabilities.`;
  } else {
    rationale = `No required capabilities matched. Missing: ${missingRequired.join(", ")}.`;
  }

  return {
    key: "capabilityOverlap",
    score,
    weight,
    weightedContribution,
    matchedRequired,
    missingRequired,
    matchedDesired,
    missingDesired,
    averageProficiency: round(avgProficiency, 2),
    rationale,
  };
}

export function calculateSemanticSimilarity(
  challenge: ChallengeMatchInput,
  startup: StartupProfileMatchInput,
): SemanticSimilarityFactor {
  const primaryChallengeTokens = new Set<string>([
    ...tokenize(challenge.title),
    ...(challenge.keywords?.map(normalizeString) ?? []),
  ]);

  const bodyChallengeTokens = new Set<string>([
    ...tokenize(challenge.problem),
  ]);

  const startupTaxonomyTokens =
    startup.capabilities?.flatMap((c) =>
      c.taxonomyPath ? tokenize(c.taxonomyPath) : [],
    ) ?? [];

  const startupTokens = new Set<string>([
    ...tokenize(startup.summary ?? ""),
    ...tokenize(startup.displayName ?? ""),
    ...tokenize(startup.legalName ?? ""),
    ...startupTaxonomyTokens,
  ]);

  const matchedKeywords: string[] = [];
  let primaryMatches = 0;
  for (const token of primaryChallengeTokens) {
    if (startupTokens.has(token)) {
      matchedKeywords.push(token);
      primaryMatches++;
    }
  }

  let bodyMatches = 0;
  for (const token of bodyChallengeTokens) {
    if (startupTokens.has(token) && !primaryChallengeTokens.has(token)) {
      matchedKeywords.push(token);
      bodyMatches++;
    }
  }

  const domainTaxonomyOverlap = Array.from(
    new Set(startupTaxonomyTokens.filter((token) => primaryChallengeTokens.has(token) || bodyChallengeTokens.has(token))),
  );

  // Compute weighted keyword and taxonomy overlap
  let rawScore = 0;
  if (primaryChallengeTokens.size > 0 || bodyChallengeTokens.size > 0) {
    const primaryRatio = primaryChallengeTokens.size > 0 ? primaryMatches / primaryChallengeTokens.size : 0;
    const bodyRatio = bodyChallengeTokens.size > 0 ? bodyMatches / Math.min(bodyChallengeTokens.size, 10) : 0;
    const taxonomyBonus = domainTaxonomyOverlap.length > 0 ? 0.15 : 0;
    rawScore = clamp(primaryRatio * 0.6 + bodyRatio * 0.25 + taxonomyBonus, 0, 1);
  } else {
    rawScore = 0.5;
  }

  const score = round(rawScore);
  const weight = MATCH_WEIGHTS.semanticSimilarity;
  const weightedContribution = round(score * weight);

  const rationale =
    matchedKeywords.length > 0
      ? `Semantic overlap found across keywords: ${matchedKeywords.slice(0, 5).join(", ")}${
          matchedKeywords.length > 5 ? ` (+${matchedKeywords.length - 5} more)` : ""
        }.`
      : "Limited semantic keyword overlap with challenge problem statement.";

  return {
    key: "semanticSimilarity",
    score,
    weight,
    weightedContribution,
    matchedKeywords,
    domainTaxonomyOverlap,
    rationale,
  };
}

export function calculateEvidenceStrength(
  challenge: ChallengeMatchInput,
  startup: StartupProfileMatchInput,
): EvidenceStrengthFactor {
  const evidenceList = startup.credentialEvidence ?? [];
  let totalScore = 0;
  let verifiedCount = 0;
  let highAssuranceCount = 0;
  const evidenceSummaries: string[] = [];

  for (const ev of evidenceList) {
    const isValid = ev.status === "VERIFIED" || ev.status === "ACTIVE" || ev.status === "VALID";
    if (!isValid) continue;

    verifiedCount++;
    const assurance = (ev.assuranceLevel as MatchEvidenceAssuranceLevel) || "SELF_DECLARED";
    const weight = ASSURANCE_LEVEL_WEIGHTS[assurance] ?? 0.5;

    if (
      assurance === "AUTHORITY_ASSERTED" ||
      assurance === "OFFICER_VERIFIED" ||
      assurance === "SYSTEM_OBSERVED" ||
      assurance === "THIRD_PARTY_ATTESTED"
    ) {
      highAssuranceCount++;
    }

    totalScore += weight;
    evidenceSummaries.push(`${ev.type} (${assurance})`);
  }

  let rawScore: number;
  if (evidenceList.length === 0) {
    rawScore = 0.1; // Baseline for no evidence
  } else {
    // Score based on verified items and assurance quality
    const coverageScore = Math.min(verifiedCount / 2, 1.0) * 0.5;
    const qualityScore = verifiedCount > 0 ? (totalScore / verifiedCount) * 0.5 : 0;
    rawScore = clamp(coverageScore + qualityScore, 0, 1);
  }

  const score = round(rawScore);
  const weight = MATCH_WEIGHTS.evidenceStrength;
  const weightedContribution = round(score * weight);

  const rationale =
    verifiedCount > 0
      ? `${verifiedCount} verified evidence items provided (${highAssuranceCount} high assurance level).`
      : "No verified credential evidence records on file.";

  return {
    key: "evidenceStrength",
    score,
    weight,
    weightedContribution,
    verifiedEvidenceCount: verifiedCount,
    highAssuranceCount,
    evidenceSummaries,
    rationale,
  };
}

export function calculateDeliveryFit(
  challenge: ChallengeMatchInput,
  startup: StartupProfileMatchInput,
): DeliveryFitFactor {
  const startupDeployments = new Set((startup.deploymentModels ?? []).map(normalizeString));
  const startupLanguages = new Set((startup.supportedLanguages ?? []).map(normalizeString));
  const startupLocations = new Set((startup.operatingLocations ?? []).map(normalizeString));

  const preferredDeployments = (challenge.preferredDeploymentModels ?? []).map(normalizeString);
  const preferredLanguages = (challenge.preferredLanguages ?? []).map(normalizeString);
  const targetLocations = (challenge.targetLocations ?? []).map(normalizeString);

  const matchedDeploymentModels: string[] = [];
  const matchedLanguages: string[] = [];
  const matchedLocations: string[] = [];

  let deploymentScore = 1.0;
  if (preferredDeployments.length > 0) {
    for (const dep of preferredDeployments) {
      if (startupDeployments.has(dep)) {
        matchedDeploymentModels.push(dep);
      }
    }
    deploymentScore = matchedDeploymentModels.length / preferredDeployments.length;
  } else if (startupDeployments.size > 0) {
    matchedDeploymentModels.push(...Array.from(startupDeployments));
    deploymentScore = 1.0;
  }

  let languageScore = 1.0;
  if (preferredLanguages.length > 0) {
    for (const lang of preferredLanguages) {
      if (startupLanguages.has(lang)) {
        matchedLanguages.push(lang);
      }
    }
    languageScore = matchedLanguages.length / preferredLanguages.length;
  } else if (startupLanguages.size > 0) {
    matchedLanguages.push(...Array.from(startupLanguages));
    languageScore = 1.0;
  }

  let locationScore = 1.0;
  if (targetLocations.length > 0) {
    for (const loc of targetLocations) {
      if (startupLocations.has(loc)) {
        matchedLocations.push(loc);
      }
    }
    locationScore =
      matchedLocations.length > 0 ? matchedLocations.length / targetLocations.length : 0.5;
  }

  const rawScore = deploymentScore * 0.45 + languageScore * 0.4 + locationScore * 0.15;
  const score = round(clamp(rawScore, 0, 1));
  const weight = MATCH_WEIGHTS.deliveryFit;
  const weightedContribution = round(score * weight);

  const rationale = `Deployment fit (${(deploymentScore * 100).toFixed(0)}%), language coverage (${(
    languageScore * 100
  ).toFixed(0)}%), location compatibility (${(locationScore * 100).toFixed(0)}%).`;

  return {
    key: "deliveryFit",
    score,
    weight,
    weightedContribution,
    matchedDeploymentModels,
    matchedLanguages,
    matchedLocations,
    rationale,
  };
}

export function computeStartupMatch(
  challenge: ChallengeMatchInput,
  startup: StartupProfileMatchInput,
  options: MatchEvaluationOptions = {},
): StartupMatchResult {
  if (!challenge.challengeId || !startup.startupId) {
    throw new Error("challengeId and startupId are required for match computation.");
  }

  const eligibility = evaluateEligibility(challenge, startup);
  const capabilityOverlap = calculateCapabilityOverlap(challenge, startup);
  const semanticSimilarity = calculateSemanticSimilarity(challenge, startup);
  const evidenceStrength = calculateEvidenceStrength(challenge, startup);
  const deliveryFit = calculateDeliveryFit(challenge, startup);

  const breakdown: FactorBreakdown = {
    capabilityOverlap,
    semanticSimilarity,
    evidenceStrength,
    deliveryFit,
  };

  const weightedSum =
    capabilityOverlap.weightedContribution +
    semanticSimilarity.weightedContribution +
    evidenceStrength.weightedContribution +
    deliveryFit.weightedContribution;

  // If eligibility failed, overall score is 0.0 per Truth.md section 7.8
  const overallScore = eligibility.passed ? round(clamp(weightedSum, 0, 1)) : 0;

  // Confidence metric based on evidence strength & capability overlap
  const confidence = round(
    clamp(0.55 * evidenceStrength.score + 0.45 * capabilityOverlap.score, 0.1, 0.99),
    2,
  );

  // Compile explainable reasons and feedback
  const positiveReasons: string[] = [];
  if (capabilityOverlap.matchedRequired.length > 0) {
    positiveReasons.push(
      `Covers required capabilities: ${capabilityOverlap.matchedRequired.join(", ")}.`,
    );
  }
  if (capabilityOverlap.matchedDesired.length > 0) {
    positiveReasons.push(
      `Provides desired capabilities: ${capabilityOverlap.matchedDesired.join(", ")}.`,
    );
  }
  if (evidenceStrength.verifiedEvidenceCount > 0) {
    positiveReasons.push(
      `Verified credentials on record (${evidenceStrength.evidenceSummaries.slice(0, 2).join(", ")}).`,
    );
  }
  if (deliveryFit.matchedLanguages.length > 0) {
    positiveReasons.push(`Supports required languages: ${deliveryFit.matchedLanguages.join(", ")}.`);
  }

  const missingCapabilities = [
    ...capabilityOverlap.missingRequired,
    ...capabilityOverlap.missingDesired,
  ];

  const evidenceSummary = evidenceStrength.evidenceSummaries;

  const gaps: string[] = [
    ...eligibility.ineligibilityReasons,
    ...capabilityOverlap.missingRequired.map((c) => `Missing required capability: ${c}`),
  ];

  const feedbackSuggestions: string[] = [];
  if (!eligibility.passed) {
    feedbackSuggestions.push(
      "Upload verified credential evidence for missing mandatory criteria to unlock eligibility.",
    );
  }
  if (capabilityOverlap.missingRequired.length > 0) {
    feedbackSuggestions.push(
      `Add evidenced capabilities in ${capabilityOverlap.missingRequired.join(", ")} to improve capability match.`,
    );
  }
  if (evidenceStrength.verifiedEvidenceCount < 2) {
    feedbackSuggestions.push(
      "Add high-assurance credentials (e.g. security audits, DPIIT recognition) to boost evidence score.",
    );
  }

  const formula =
    "0.40*capability_overlap + 0.25*semantic_similarity + 0.20*evidence_strength + 0.15*delivery_fit";

  const explanation: MatchExplanation = {
    positiveReasons,
    missingCapabilities,
    evidenceSummary,
    gaps,
    feedbackSuggestions,
    sensitiveAttributesUsed: false,
    formula,
  };

  const id = `MATCH-${challenge.challengeId}-${startup.startupId}`;
  const modelVersion = options.modelVersion ?? MATCHING_METHOD_VERSION;
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const synthetic = options.synthetic ?? true;
  const displayLabel = options.displayLabel ?? (synthetic ? "Synthetic demonstration data" : undefined);

  return {
    id,
    challengeId: challenge.challengeId,
    startupId: startup.startupId,
    organizationId: startup.organizationId,
    displayName: startup.displayName,
    eligibilityPass: eligibility.passed,
    eligibility,
    capabilityScore: capabilityOverlap.score,
    semanticScore: semanticSimilarity.score,
    evidenceScore: evidenceStrength.score,
    deliveryScore: deliveryFit.score,
    overallScore,
    confidence,
    breakdown,
    explanation,
    modelVersion,
    generatedAt,
    advisoryOnly: true,
    humanAuthorizationRequired: true,
    synthetic,
    displayLabel,
  };
}

export function rankStartupMatches(
  challenge: ChallengeMatchInput,
  startups: readonly StartupProfileMatchInput[],
  options: MatchEvaluationOptions = {},
): BatchMatchResult {
  const matches = startups.map((startup) => computeStartupMatch(challenge, startup, options));

  // Partition into eligible and ineligible
  const eligibleMatches = matches.filter((m) => m.eligibilityPass);
  const ineligibleMatches = matches.filter((m) => !m.eligibilityPass);

  // Sort eligible by overall score descending, tie-breaking by capabilityScore then evidenceScore
  eligibleMatches.sort((a, b) => {
    if (b.overallScore !== a.overallScore) {
      return b.overallScore - a.overallScore;
    }
    if (b.capabilityScore !== a.capabilityScore) {
      return b.capabilityScore - a.capabilityScore;
    }
    return b.evidenceScore - a.evidenceScore;
  });

  // Sort ineligible by proportion of mandatory criteria passed, then capability score
  ineligibleMatches.sort((a, b) => {
    const aMandatoryRatio =
      a.eligibility.mandatoryCount > 0
        ? a.eligibility.mandatoryPassed / a.eligibility.mandatoryCount
        : 0;
    const bMandatoryRatio =
      b.eligibility.mandatoryCount > 0
        ? b.eligibility.mandatoryPassed / b.eligibility.mandatoryCount
        : 0;

    if (bMandatoryRatio !== aMandatoryRatio) {
      return bMandatoryRatio - aMandatoryRatio;
    }
    return b.capabilityScore - a.capabilityScore;
  });

  const rankedMatches = [...eligibleMatches, ...ineligibleMatches];
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const modelVersion = options.modelVersion ?? MATCHING_METHOD_VERSION;
  const synthetic = options.synthetic ?? true;
  const displayLabel = options.displayLabel ?? (synthetic ? "Synthetic demonstration data" : undefined);

  return {
    challengeId: challenge.challengeId,
    totalEvaluated: startups.length,
    eligibleCount: eligibleMatches.length,
    ineligibleCount: ineligibleMatches.length,
    rankedMatches,
    generatedAt,
    modelVersion,
    advisoryOnly: true,
    humanAuthorizationRequired: true,
    synthetic,
    displayLabel,
  };
}
