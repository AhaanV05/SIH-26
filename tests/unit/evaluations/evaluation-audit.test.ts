import { describe, expect, it } from "vitest";
import {
  appendAuditEvent,
  verifyAuditChain,
  type AuditEvent,
} from "@/modules/audit/audit-chain";
import {
  buildEvaluationConflictDeclaredAuditEvent,
  buildEvaluationSubmittedAuditEvent,
  buildModerationDecidedAuditEvent,
  declareEvaluationConflict,
  moderateProposal,
  submitIndependentEvaluation,
  type CriterionScoreInput,
  type EvaluationAssignment,
  type FrozenRubric,
} from "@/modules/evaluations";

const HASH = "e".repeat(64);
const rubric: FrozenRubric = {
  versionId: "SPEC-PUNE-V1",
  version: 1,
  contentHash: HASH,
  frozenAt: "2026-08-01T04:30:00.000Z",
  criteria: [
    { id: "R-1", name: "Outcome approach", weight: 50, scoreMin: 0, scoreMax: 10 },
    { id: "R-2", name: "Security & privacy", weight: 30, scoreMin: 0, scoreMax: 10 },
    { id: "R-3", name: "Pilot cost", weight: 20, scoreMin: 0, scoreMax: 10 },
  ],
};

function createAssignment(id = "ASSIGN-1", evaluatorId = "USR-EVAL-1"): EvaluationAssignment {
  return {
    id,
    proposalId: "PROP-ECOSCAN",
    evaluatorId,
    rubricVersionId: rubric.versionId,
    rubricContentHash: rubric.contentHash,
    status: "ASSIGNED",
    conflictDeclaration: null,
  };
}

const sampleScores: CriterionScoreInput[] = [
  { rubricCriterionId: "R-1", value: 9, rationale: "Superior computer vision overflow detection." },
  { rubricCriterionId: "R-2", value: 8, rationale: "Robust hybrid cloud data protection framework." },
  { rubricCriterionId: "R-3", value: 7, rationale: "Within ward municipal budget benchmark." },
];

describe("Evaluation Audit Trail Integration", () => {
  it("generates cryptographic audit chain across full evaluation lifecycle", () => {
    const chain: AuditEvent[] = [];

    // 1. Declare No-Conflict
    const rawAssignment = createAssignment();
    const declaredAssignment = declareEvaluationConflict(
      rawAssignment,
      { id: "USR-EVAL-1", role: "EVALUATOR" },
      { hasConflict: false, declaredAt: "2026-08-05T09:00:00.000Z" },
    );
    const conflictEventInput = buildEvaluationConflictDeclaredAuditEvent(
      declaredAssignment,
      { id: "USR-EVAL-1", role: "EVALUATOR" },
    );
    const conflictEvent = appendAuditEvent(undefined, conflictEventInput);
    chain.push(conflictEvent);

    expect(conflictEvent.action).toBe("EVALUATOR_CLEARED_NO_CONFLICT");
    expect(conflictEvent.sequence).toBe(1);

    // 2. Submit Independent Evaluation
    const evalResult = submitIndependentEvaluation({
      assignment: declaredAssignment,
      actor: { id: "USR-EVAL-1", role: "EVALUATOR" },
      rubric,
      scores: sampleScores,
      submittedAt: "2026-08-05T10:00:00.000Z",
    });
    const submitEventInput = buildEvaluationSubmittedAuditEvent(
      evalResult.submission,
      { id: "USR-EVAL-1", role: "EVALUATOR" },
    );
    const submitEvent = appendAuditEvent(chain[chain.length - 1], submitEventInput);
    chain.push(submitEvent);

    expect(submitEvent.action).toBe("INDEPENDENT_EVALUATION_SUBMITTED");
    expect(submitEvent.sequence).toBe(2);
    expect(submitEvent.previousHash).toBe(conflictEvent.eventHash);

    // 3. Human Moderation Decision
    const moderation = moderateProposal({
      actor: { id: "USR-PROC-1", role: "PROCUREMENT_REVIEWER" },
      proposalId: "PROP-ECOSCAN",
      decision: "SELECTED",
      rationale: "Selected for Ward 12 sandbox pilot because the startup demonstrated validated capability fit and clear measurable milestones.",
      decidedAt: "2026-08-05T12:00:00.000Z",
      rubric,
      eligibleAssignmentIds: ["ASSIGN-1"],
      submissions: [evalResult.submission],
      advisories: [],
      advisoryReviews: [],
    });
    const moderationEventInput = buildModerationDecidedAuditEvent(
      moderation,
      { id: "USR-PROC-1", role: "PROCUREMENT_REVIEWER" },
    );
    const moderationEvent = appendAuditEvent(chain[chain.length - 1], moderationEventInput);
    chain.push(moderationEvent);

    expect(moderationEvent.action).toBe("PROPOSAL_MODERATION_SELECTED");
    expect(moderationEvent.sequence).toBe(3);
    expect(moderationEvent.previousHash).toBe(submitEvent.eventHash);

    // 4. Verify Cryptographic Integrity
    const verification = verifyAuditChain(chain);
    expect(verification.valid).toBe(true);
    if (verification.valid) {
      expect(verification.checkedEvents).toBe(3);
    }
  });

  it("records conflict recusal in audit metadata correctly", () => {
    const rawAssignment = createAssignment("ASSIGN-2", "USR-EVAL-2");
    const recusedAssignment = declareEvaluationConflict(
      rawAssignment,
      { id: "USR-EVAL-2", role: "EVALUATOR" },
      {
        hasConflict: true,
        details: "Founder is a former direct business partner in previous venture.",
        declaredAt: "2026-08-05T09:15:00.000Z",
      },
    );
    const eventInput = buildEvaluationConflictDeclaredAuditEvent(
      recusedAssignment,
      { id: "USR-EVAL-2", role: "EVALUATOR" },
    );
    const event = appendAuditEvent(undefined, eventInput);

    expect(event.action).toBe("EVALUATOR_RECUSED_CONFLICT");
    expect(event.metadata).toMatchObject({
      hasConflict: true,
      status: "RECUSED",
      evaluatorId: "USR-EVAL-2",
    });
  });
});
