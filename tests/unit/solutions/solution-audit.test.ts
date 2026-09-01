import { describe, expect, it } from "vitest";
import {
  appendAuditEvent,
  verifyAuditChain,
  type AuditEvent,
} from "@/modules/audit/audit-chain";
import {
  assessTransferability,
  buildAdoptionTransitionAuditEvent,
  buildTransferabilityEvaluatedAuditEvent,
  createAdoptionRequest,
  transitionAdoptionRequest,
  type TransferabilityFactorInput,
} from "@/modules/solutions";

const sampleFactors: TransferabilityFactorInput[] = [
  {
    key: "problemSimilarity",
    score: 0.9,
    rationale: "Matching urban solid waste overflow problem statement.",
    evidenceIds: ["EVID-1"],
    gaps: [],
    constraint: "NONE",
  },
  {
    key: "operatingContextFit",
    score: 0.7,
    rationale: "Similar ward tier and geography.",
    evidenceIds: ["EVID-2"],
    gaps: [],
    constraint: "NONE",
  },
  {
    key: "dataFit",
    score: 0.85,
    rationale: "Compatible GIS schema.",
    evidenceIds: ["EVID-3"],
    gaps: [],
    constraint: "NONE",
  },
  {
    key: "integrationFit",
    score: 0.8,
    rationale: "REST API endpoints compatible.",
    evidenceIds: ["EVID-4"],
    gaps: [],
    constraint: "NONE",
  },
  {
    key: "scaleFit",
    score: 0.75,
    rationale: "Volume fits within tested capacity.",
    evidenceIds: ["EVID-5"],
    gaps: [],
    constraint: "NONE",
  },
  {
    key: "evidenceStrength",
    score: 0.9,
    rationale: "Verified telemetry and pilot logs.",
    evidenceIds: ["EVID-6"],
    gaps: [],
    constraint: "NONE",
  },
  {
    key: "evidenceFreshness",
    score: 0.95,
    rationale: "Under 30 days old.",
    evidenceIds: ["EVID-7"],
    gaps: [],
    constraint: "NONE",
  },
  {
    key: "localizationCostFit",
    score: 0.8,
    rationale: "Minor config adjustments only.",
    evidenceIds: ["EVID-8"],
    gaps: [],
    constraint: "NONE",
  },
];

describe("Scale & Transferability Audit Trail Integration", () => {
  it("records tamper-evident audit events for transferability evaluation and adoption flow", () => {
    const chain: AuditEvent[] = [];

    // 1. Transferability Evaluation Event
    const assessment = assessTransferability({
      assessmentId: "ASSESS-TEST-001",
      solutionCardId: "SOLUTION-001",
      sourceContextId: "PUNE-SWM",
      targetContextId: "SATARA-SWM",
      synthetic: true,
      displayLabel: "Synthetic demonstration data",
      factors: sampleFactors,
    });

    const assessEvent = appendAuditEvent(
      undefined,
      buildTransferabilityEvaluatedAuditEvent(assessment, "USR-ANALYST-1"),
    );
    chain.push(assessEvent);

    expect(assessEvent.action).toBe("TRANSFERABILITY_ASSESSMENT_EVALUATED");
    expect(assessEvent.sequence).toBe(1);

    // 2. Adoption Request Lifecycle
    let snapshot = createAdoptionRequest({
      requestId: "ADOPT-TEST-001",
      solutionCardId: "SOLUTION-001",
      targetDepartmentId: "SATARA-SWM",
    });

    snapshot = transitionAdoptionRequest(snapshot, {
      expectedVersion: 0,
      to: "ASSESSMENT_READY",
      actorRole: "TRANSFERABILITY_RULE_ENGINE",
      reason: "8 context factors evaluated and verified.",
      assessment,
    });

    const adoptEvent = appendAuditEvent(
      chain[chain.length - 1],
      buildAdoptionTransitionAuditEvent(
        snapshot,
        snapshot.history[snapshot.history.length - 1]!,
        "USR-ENGINE-1",
      ),
    );
    chain.push(adoptEvent);

    expect(adoptEvent.action).toBe("ADOPTION_STATE_ASSESSMENT_READY");
    expect(adoptEvent.sequence).toBe(2);
    expect(adoptEvent.previousHash).toBe(assessEvent.eventHash);

    // 3. Verify Chain Integrity
    const verification = verifyAuditChain(chain);
    expect(verification.valid).toBe(true);
    if (verification.valid) {
      expect(verification.checkedEvents).toBe(2);
    }
  });
});
