import { describe, expect, it } from "vitest";

import wasteFixture from "../../../data/fixtures/synthetic-waste-events.v1.json";
import {
  SYNTHETIC_DEMO_LABEL,
  buildMilestoneEvidenceLineage,
  calculateWasteMetrics,
  createWasteMetricObservations,
  evaluateMilestoneAcceptance,
  hasEvidenceLineagePath,
  parseSyntheticWasteEventDataset,
  type EvidenceClaim,
  type EvidenceObject,
  type MilestoneDefinition,
  type SandboxRunRecord,
} from "../../../src/modules/evidence";

const dataset = parseSyntheticWasteEventDataset(wasteFixture);
const report = calculateWasteMetrics(dataset, 20);
const metricObservations = createWasteMetricObservations(
  report,
  "SYN-RUN-WASTE-001",
  ["SYN-EVIDENCE-DATASET-001"],
);

const evidenceObjects: EvidenceObject[] = [
  {
    id: "SYN-EVIDENCE-DATASET-001",
    kind: "DATASET",
    displayName: "Synthetic waste events v1",
    mediaType: "application/json",
    sizeBytes: 1,
    sha256: "a".repeat(64),
    classification: "INTERNAL",
    assuranceLevel: "SIMULATED_FOR_DEMO",
    sourceType: "SYSTEM_EXPORT",
    sourceReference: "data/fixtures/synthetic-waste-events.v1.json",
    synthetic: true,
    displayLabel: SYNTHETIC_DEMO_LABEL,
  },
  {
    id: "SYN-EVIDENCE-TEST-RUN-001",
    kind: "TEST_RUN",
    displayName: "Waste benchmark test run",
    mediaType: "application/json",
    sizeBytes: 1,
    sha256: "b".repeat(64),
    classification: "INTERNAL",
    assuranceLevel: "SYSTEM_OBSERVED",
    sourceType: "CONTROLLED_RUN",
    sourceReference: "SYN-RUN-WASTE-001",
    synthetic: true,
    displayLabel: SYNTHETIC_DEMO_LABEL,
  },
  {
    id: "SYN-EVIDENCE-LIMITATIONS-001",
    kind: "LIMITATIONS_NOTE",
    displayName: "Synthetic benchmark limitations",
    mediaType: "text/markdown",
    sizeBytes: 1,
    sha256: "c".repeat(64),
    classification: "INTERNAL",
    assuranceLevel: "SIMULATED_FOR_DEMO",
    sourceType: "HUMAN_UPLOAD",
    sourceReference: "SYN-LIMITATIONS-NOTE-001",
    synthetic: true,
    displayLabel: SYNTHETIC_DEMO_LABEL,
  },
];

const milestone: MilestoneDefinition = {
  id: "MS-1",
  name: "Sandbox benchmark",
  requiredMetrics: [
    {
      metricDefinitionId: "MET-1",
      metricDefinitionVersion: "1.0.0",
      direction: "GTE",
      target: 0.9,
      minimumSampleSize: 100,
      requiredDatasetVersion: "synthetic-waste-v1",
      requiredCalculatorVersion: "1.0.0",
    },
    {
      metricDefinitionId: "MET-2",
      metricDefinitionVersion: "1.0.0",
      direction: "LTE",
      target: 20,
      minimumSampleSize: 50,
      requiredDatasetVersion: "synthetic-waste-v1",
      requiredCalculatorVersion: "1.0.0",
    },
  ],
  requiredEvidenceKinds: ["TEST_RUN", "LIMITATIONS_NOTE"],
};

describe("versioned waste metric calculation", () => {
  it("derives confusion-matrix, precision, recall, and latency from 120 fixture rows", () => {
    expect(dataset.metadata.displayLabel).toBe("Synthetic demonstration data");
    expect(dataset.observations).toHaveLength(120);
    expect(report.calculatorVersion).toBe("1.0.0");
    expect(report.classification.matrix).toEqual({
      truePositive: 92,
      falsePositive: 4,
      trueNegative: 16,
      falseNegative: 8,
    });
    expect(report.classification.precision).toBe(0.958333);
    expect(report.classification.recall).toBe(0.92);
    expect(report.classification.accuracy).toBe(0.9);
    expect(report.assignmentLatency).toMatchObject({
      eligibleAlerts: 96,
      assignedAlerts: 96,
      unassignedAlerts: 0,
      medianMinutes: 15,
      p95Minutes: 30,
      handledWithinTargetCount: 88,
      handledWithinTargetRate: 0.916667,
    });
  });

  it("rejects a fixture that is not explicitly marked synthetic", () => {
    const unlabeled = {
      ...wasteFixture,
      metadata: { ...wasteFixture.metadata, isSynthetic: false },
    };
    expect(() => parseSyntheticWasteEventDataset(unlabeled)).toThrow(
      /explicitly labeled as synthetic demonstration data/,
    );
  });
});

describe("milestone evidence readiness and lineage", () => {
  it("marks rules ready while preserving mandatory human authorization", () => {
    const evaluation = evaluateMilestoneAcceptance({
      evaluationId: "SYN-EVALUATION-MS-1-V1",
      milestone,
      metricObservations,
      evidenceObjects,
    });

    expect(evaluation).toMatchObject({
      status: "READY_FOR_HUMAN_ACCEPTANCE",
      rulesSatisfied: true,
      humanAuthorizationRequired: true,
      automaticAcceptancePerformed: false,
      blockerCodes: [],
    });
    expect(evaluation.metricEvaluations.every((item) => item.passed)).toBe(true);
  });

  it("explains a missed target and missing limitations evidence", () => {
    const failingMetrics = metricObservations.map((observation) =>
      observation.metricDefinitionId === "MET-1"
        ? { ...observation, value: 0.89 }
        : observation,
    );
    const evaluation = evaluateMilestoneAcceptance({
      evaluationId: "SYN-EVALUATION-MS-1-FAIL",
      milestone,
      metricObservations: failingMetrics,
      evidenceObjects: evidenceObjects.filter(
        (evidence) => evidence.kind !== "LIMITATIONS_NOTE",
      ),
    });

    expect(evaluation.status).toBe("NOT_READY");
    expect(evaluation.blockerCodes).toContain("MET-1:TARGET_MISSED");
    expect(evaluation.blockerCodes).toContain(
      "EVIDENCE:LIMITATIONS_NOTE:MISSING",
    );
  });

  it("traces the synthetic dataset through run, metric, claim, and milestone evaluation", () => {
    const evaluation = evaluateMilestoneAcceptance({
      evaluationId: "SYN-EVALUATION-MS-1-LINEAGE",
      milestone,
      metricObservations,
      evidenceObjects,
    });
    const run: SandboxRunRecord = {
      id: "SYN-RUN-WASTE-001",
      manifestVersion: "waste-sandbox/1.0.0",
      datasetVersion: "synthetic-waste-v1",
      calculatorVersion: "1.0.0",
      status: "COMPLETED",
      sourceEvidenceObjectIds: ["SYN-EVIDENCE-DATASET-001"],
      synthetic: true,
      displayLabel: SYNTHETIC_DEMO_LABEL,
    };
    const claim: EvidenceClaim = {
      id: "SYN-CLAIM-MS-1-RECALL",
      subject: { type: "MILESTONE", id: "MS-1" },
      predicate: "detection_recall_gte_0_90",
      value: true,
      assuranceLevel: "SYSTEM_OBSERVED",
      verificationMethod: "HYBRID",
      supportingEvidenceObjectIds: ["SYN-EVIDENCE-TEST-RUN-001"],
      supportingMetricObservationIds: ["SYN-RUN-WASTE-001:MET-1"],
      contradictingEvidenceObjectIds: [],
      issuerId: "SYN-MAHASETU-SANDBOX",
      synthetic: true,
      displayLabel: SYNTHETIC_DEMO_LABEL,
    };
    const graph = buildMilestoneEvidenceLineage({
      evidenceObjects,
      sandboxRuns: [run],
      metricObservations,
      claims: [claim],
      milestoneEvaluation: evaluation,
    });

    expect(
      hasEvidenceLineagePath(
        graph,
        "evidence-object:SYN-EVIDENCE-DATASET-001",
        "milestone-evaluation:SYN-EVALUATION-MS-1-LINEAGE",
      ),
    ).toBe(true);
    expect(
      hasEvidenceLineagePath(
        graph,
        "evidence-claim:SYN-CLAIM-MS-1-RECALL",
        "milestone-evaluation:SYN-EVALUATION-MS-1-LINEAGE",
      ),
    ).toBe(true);
  });
});
