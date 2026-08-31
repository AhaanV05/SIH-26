import type { ChallengeSpec } from "../../../src/modules/challenges";

export function createChallengeSpecDraft(): ChallengeSpec {
  return {
    schemaVersion: "mahasetu.challenge/1.0",
    challengeId: "CH-WASTE-001",
    version: 1,
    status: "DRAFT",
    problem: {
      title: "Reduce community-bin overflow events",
      statement:
        "Overflow is detected too late for a safe and efficient collection response.",
      affectedUsers: ["residents", "sanitation workers"],
      geography: ["synthetic-ward-12"],
      baseline: [
        {
          metric: "overflow_events_per_week",
          value: 42,
          unit: "events/week",
          source: "synthetic-baseline-v1",
        },
      ],
      constraints: [],
    },
    outcomes: [
      {
        id: "OUT-1",
        statement: "Detect overflow early enough for an operational collection response.",
        metricIds: ["MET-1"],
      },
    ],
    metrics: [
      {
        id: "MET-1",
        name: "detection_recall",
        direction: "GTE",
        target: 0.9,
        unit: "ratio",
        window: "sandbox-dataset-v1",
        measurementSource: "synthetic-observations-v1",
        calculatorVersion: "waste-metrics/1.0",
        minimumSampleSize: 100,
      },
    ],
    eligibility: [
      {
        id: "EL-1",
        kind: "STARTUP_RECOGNITION",
        mandatory: true,
        acceptedEvidence: [
          "AUTHORITY_ASSERTED",
          "OFFICER_VERIFIED",
          "SIMULATED_FOR_DEMO",
        ],
        verificationMethod: "Verify a current evidence claim and its provenance metadata.",
      },
    ],
    rubric: [
      { id: "R-1", name: "Outcome approach", weight: 30, scoreMin: 0, scoreMax: 10 },
      { id: "R-2", name: "Pilot feasibility", weight: 25, scoreMin: 0, scoreMax: 10 },
      {
        id: "R-3",
        name: "Security and privacy",
        weight: 20,
        scoreMin: 0,
        scoreMax: 10,
      },
      {
        id: "R-4",
        name: "Interoperability and exit",
        weight: 15,
        scoreMin: 0,
        scoreMax: 10,
      },
      { id: "R-5", name: "Pilot cost", weight: 10, scoreMin: 0, scoreMax: 10 },
    ],
    timeline: {
      applicationsOpenAt: "2026-09-01T09:00:00+05:30",
      applicationsCloseAt: "2026-09-05T17:00:00+05:30",
      pilotStartAt: "2026-09-07T09:00:00+05:30",
      pilotEndAt: "2026-09-21T17:00:00+05:30",
      dependencyLeadTimeDays: 5,
    },
    sandbox: {
      datasetVersion: "synthetic-waste-v1",
      apiContractVersion: "waste-events-openapi/1.0",
      egress: "DENY_ALL",
      retentionHours: 24,
      testSuiteVersion: "waste-pilot/1.0",
      usesProductionCitizenData: false,
      dataClassification: "PUBLIC",
    },
    milestones: [
      {
        id: "MS-1",
        name: "Sandbox benchmark",
        paymentPercent: 100,
        requiredMetricIds: ["MET-1"],
        requiredEvidenceTypes: ["TEST_RUN", "LIMITATIONS_NOTE"],
        acceptanceStatement:
          "Accept when the metric target passes and both evidence artifacts are reviewed.",
      },
    ],
    requirements: {
      accessibility: "Meet WCAG 2.2 AA checks for every user-facing pilot workflow.",
      interoperability: "Expose versioned open API contracts and documented export formats.",
      exitAndPortability: "Export government-owned data and provide a documented transition package.",
      securityAndPrivacy: "Use synthetic data and provide access-control and security test evidence.",
      grievanceRoute: "Publish one clarification channel with response windows and review ownership.",
    },
    governance: {
      policyPackVersion: "demo-maharashtra-innovation/0.1",
      requiredApproverRoles: ["PROBLEM_OWNER", "PROCUREMENT_REVIEWER"],
      publicationProfile: "PUBLIC_CHALLENGE_V1",
    },
    integrity: {
      frozenAt: null,
      contentHash: null,
    },
  };
}

export function cloneChallengeSpec(specification: ChallengeSpec): ChallengeSpec {
  return JSON.parse(JSON.stringify(specification)) as ChallengeSpec;
}

