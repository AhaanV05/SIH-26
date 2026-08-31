import type {
  EvidenceObject,
  EvidenceRequirementEvaluation,
  MetricAcceptanceCriterion,
  MetricObservation,
  MetricRequirementEvaluation,
  MilestoneAcceptanceEvaluation,
  MilestoneDefinition,
} from "./types";

function compareMetric(
  value: number,
  direction: MetricAcceptanceCriterion["direction"],
  target: number,
): boolean {
  if (direction === "GTE") return value >= target;
  if (direction === "LTE") return value <= target;
  return value === target;
}

function evaluateMetric(
  criterion: MetricAcceptanceCriterion,
  observations: readonly MetricObservation[],
): MetricRequirementEvaluation {
  const candidates = observations.filter(
    (observation) => observation.metricDefinitionId === criterion.metricDefinitionId,
  );
  const observation = candidates.find(
    (candidate) =>
      candidate.metricDefinitionVersion === criterion.metricDefinitionVersion,
  );

  const base = {
    metricDefinitionId: criterion.metricDefinitionId,
    target: criterion.target,
    direction: criterion.direction,
  } as const;

  if (!observation) {
    const versionMismatch = candidates.length > 0;
    return {
      ...base,
      passed: false,
      code: versionMismatch
        ? "METRIC_DEFINITION_VERSION_MISMATCH"
        : "METRIC_OBSERVATION_MISSING",
      explanation: versionMismatch
        ? `Metric ${criterion.metricDefinitionId} exists, but not at required definition version ${criterion.metricDefinitionVersion}.`
        : `Required metric ${criterion.metricDefinitionId} has no observation.`,
    };
  }

  const observed = {
    ...base,
    observationId: observation.id,
    actualValue: observation.value,
  } as const;

  if (
    criterion.requiredDatasetVersion &&
    observation.datasetVersion !== criterion.requiredDatasetVersion
  ) {
    return {
      ...observed,
      passed: false,
      code: "DATASET_VERSION_MISMATCH",
      explanation: `Expected dataset ${criterion.requiredDatasetVersion}; received ${observation.datasetVersion}.`,
    };
  }
  if (
    criterion.requiredCalculatorVersion &&
    observation.calculatorVersion !== criterion.requiredCalculatorVersion
  ) {
    return {
      ...observed,
      passed: false,
      code: "CALCULATOR_VERSION_MISMATCH",
      explanation: `Expected calculator ${criterion.requiredCalculatorVersion}; received ${observation.calculatorVersion}.`,
    };
  }
  if (observation.sampleSize < criterion.minimumSampleSize) {
    return {
      ...observed,
      passed: false,
      code: "SAMPLE_SIZE_TOO_SMALL",
      explanation: `Sample size ${observation.sampleSize} is below required minimum ${criterion.minimumSampleSize}.`,
    };
  }
  if (observation.quality.status !== "PASS") {
    return {
      ...observed,
      passed: false,
      code: "QUALITY_CHECK_FAILED",
      explanation: `Metric quality failed: ${observation.quality.issues.join("; ") || "unspecified issue"}.`,
    };
  }

  const passed = compareMetric(observation.value, criterion.direction, criterion.target);
  return {
    ...observed,
    passed,
    code: passed ? "TARGET_MET" : "TARGET_MISSED",
    explanation: passed
      ? `Observed ${observation.value} ${criterion.direction} target ${criterion.target}.`
      : `Observed ${observation.value} does not satisfy ${criterion.direction} target ${criterion.target}.`,
  };
}

function evaluateEvidence(
  requiredKind: MilestoneDefinition["requiredEvidenceKinds"][number],
  evidenceObjects: readonly EvidenceObject[],
): EvidenceRequirementEvaluation {
  const matchingEvidenceObjectIds = evidenceObjects
    .filter((evidence) => evidence.kind === requiredKind)
    .map((evidence) => evidence.id)
    .sort();
  const passed = matchingEvidenceObjectIds.length > 0;
  return {
    kind: requiredKind,
    passed,
    matchingEvidenceObjectIds,
    explanation: passed
      ? `${matchingEvidenceObjectIds.length} ${requiredKind} evidence object(s) supplied.`
      : `Required evidence kind ${requiredKind} is missing.`,
  };
}

export interface EvaluateMilestoneAcceptanceInput {
  readonly evaluationId: string;
  readonly milestone: MilestoneDefinition;
  readonly metricObservations: readonly MetricObservation[];
  readonly evidenceObjects: readonly EvidenceObject[];
}

/**
 * Evaluates deterministic readiness rules only. It deliberately cannot perform
 * the consequential government action of accepting a milestone.
 */
export function evaluateMilestoneAcceptance(
  input: EvaluateMilestoneAcceptanceInput,
): MilestoneAcceptanceEvaluation {
  if (!input.evaluationId) throw new Error("evaluationId is required.");
  if (!input.milestone.id) throw new Error("milestone.id is required.");

  const metricEvaluations = input.milestone.requiredMetrics.map((criterion) =>
    evaluateMetric(criterion, input.metricObservations),
  );
  const evidenceEvaluations = input.milestone.requiredEvidenceKinds.map((kind) =>
    evaluateEvidence(kind, input.evidenceObjects),
  );
  const blockerCodes = [
    ...metricEvaluations
      .filter((evaluation) => !evaluation.passed)
      .map((evaluation) => `${evaluation.metricDefinitionId}:${evaluation.code}`),
    ...evidenceEvaluations
      .filter((evaluation) => !evaluation.passed)
      .map((evaluation) => `EVIDENCE:${evaluation.kind}:MISSING`),
  ];
  const rulesSatisfied = blockerCodes.length === 0;

  return {
    id: input.evaluationId,
    milestoneId: input.milestone.id,
    status: rulesSatisfied ? "READY_FOR_HUMAN_ACCEPTANCE" : "NOT_READY",
    rulesSatisfied,
    humanAuthorizationRequired: true,
    automaticAcceptancePerformed: false,
    metricEvaluations,
    evidenceEvaluations,
    blockerCodes,
    summary: rulesSatisfied
      ? "All deterministic rules are satisfied. An authorized reviewer must still accept the milestone."
      : `${blockerCodes.length} deterministic blocker(s) must be resolved before human acceptance.`,
  };
}
