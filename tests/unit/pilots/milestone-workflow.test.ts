import { describe, expect, it } from "vitest";
import type { MilestoneAcceptanceEvaluation } from "@/modules/evidence";
import {
  createMilestoneWorkflow,
  transitionMilestoneWorkflow,
} from "@/modules/pilots";

const readyEvaluation: MilestoneAcceptanceEvaluation = {
  id: "EVAL-MS-1",
  milestoneId: "MS-1",
  status: "READY_FOR_HUMAN_ACCEPTANCE",
  rulesSatisfied: true,
  humanAuthorizationRequired: true,
  automaticAcceptancePerformed: false,
  metricEvaluations: [],
  evidenceEvaluations: [],
  blockerCodes: [],
  summary: "All deterministic checks passed; human review is required.",
};

function reachEvidenceSubmitted() {
  const planned = createMilestoneWorkflow("MS-1");
  const active = transitionMilestoneWorkflow(planned, {
    expectedVersion: 0,
    to: "IN_PROGRESS",
    actorRole: "PILOT_REVIEWER",
    reason: "Pilot charter approved",
  });
  return transitionMilestoneWorkflow(active, {
    expectedVersion: 1,
    to: "EVIDENCE_SUBMITTED",
    actorRole: "STARTUP_CONTRIBUTOR",
    reason: "Sandbox benchmark evidence submitted",
    evidenceObjectIds: ["EVIDENCE-TEST", "EVIDENCE-LIMITATIONS"],
  });
}

describe("milestone workflow", () => {
  it("requires deterministic readiness followed by an authorized human decision", () => {
    const submitted = reachEvidenceSubmitted();
    const ready = transitionMilestoneWorkflow(submitted, {
      expectedVersion: 2,
      to: "READY_FOR_HUMAN_ACCEPTANCE",
      actorRole: "EVIDENCE_RULE_ENGINE",
      reason: "Versioned metric and evidence rules passed",
      acceptanceEvaluation: readyEvaluation,
    });
    const accepted = transitionMilestoneWorkflow(ready, {
      expectedVersion: 3,
      to: "ACCEPTED",
      actorRole: "PILOT_REVIEWER",
      reason: "Reviewer confirmed the evidence and limitations",
    });

    expect(accepted.state).toBe("ACCEPTED");
    expect(accepted.version).toBe(4);
    expect(accepted.acceptanceEvaluationId).toBe("EVAL-MS-1");
    expect(accepted.humanAuthorizationRequired).toBe(true);
    expect(accepted.events.map((event) => event.to)).toEqual([
      "IN_PROGRESS",
      "EVIDENCE_SUBMITTED",
      "READY_FOR_HUMAN_ACCEPTANCE",
      "ACCEPTED",
    ]);
  });

  it("blocks automatic or cross-milestone acceptance", () => {
    const submitted = reachEvidenceSubmitted();

    expect(() =>
      transitionMilestoneWorkflow(submitted, {
        expectedVersion: 2,
        to: "READY_FOR_HUMAN_ACCEPTANCE",
        actorRole: "EVIDENCE_RULE_ENGINE",
        reason: "Attempted cross-milestone evaluation",
        acceptanceEvaluation: { ...readyEvaluation, milestoneId: "MS-OTHER" },
      }),
    ).toThrow("different milestone");

    expect(() =>
      transitionMilestoneWorkflow(submitted, {
        expectedVersion: 2,
        to: "READY_FOR_HUMAN_ACCEPTANCE",
        actorRole: "EVIDENCE_RULE_ENGINE",
        reason: "Attempted automatic acceptance",
        acceptanceEvaluation: {
          ...readyEvaluation,
          automaticAcceptancePerformed: true,
        } as unknown as MilestoneAcceptanceEvaluation,
      }),
    ).toThrow("unresolved deterministic blockers");
  });

  it("enforces roles, optimistic versioning, evidence, and reasons", () => {
    const planned = createMilestoneWorkflow("MS-1");

    expect(() =>
      transitionMilestoneWorkflow(planned, {
        expectedVersion: 1,
        to: "IN_PROGRESS",
        actorRole: "PILOT_REVIEWER",
        reason: "Start",
      }),
    ).toThrow("expected 1");

    expect(() =>
      transitionMilestoneWorkflow(planned, {
        expectedVersion: 0,
        to: "IN_PROGRESS",
        actorRole: "STARTUP_CONTRIBUTOR",
        reason: "Unauthorized start",
      }),
    ).toThrow("cannot move");

    const active = transitionMilestoneWorkflow(planned, {
      expectedVersion: 0,
      to: "IN_PROGRESS",
      actorRole: "PILOT_REVIEWER",
      reason: "Start",
    });
    expect(() =>
      transitionMilestoneWorkflow(active, {
        expectedVersion: 1,
        to: "EVIDENCE_SUBMITTED",
        actorRole: "STARTUP_CONTRIBUTOR",
        reason: "Submit",
        evidenceObjectIds: [],
      }),
    ).toThrow("at least one");
  });

  it("supports a returned evidence packet and clean resubmission", () => {
    const submitted = reachEvidenceSubmitted();
    const returned = transitionMilestoneWorkflow(submitted, {
      expectedVersion: 2,
      to: "RETURNED",
      actorRole: "PILOT_REVIEWER",
      reason: "Limitations note needs connectivity caveats",
    });
    const resubmitted = transitionMilestoneWorkflow(returned, {
      expectedVersion: 3,
      to: "EVIDENCE_SUBMITTED",
      actorRole: "STARTUP_CONTRIBUTOR",
      reason: "Added intermittent-connectivity limitations",
      evidenceObjectIds: [
        "EVIDENCE-TEST",
        "EVIDENCE-LIMITATIONS-V2",
      ],
    });

    expect(resubmitted.state).toBe("EVIDENCE_SUBMITTED");
    expect(resubmitted.acceptanceEvaluationId).toBeNull();
    expect(resubmitted.evidenceObjectIds).toContain("EVIDENCE-LIMITATIONS-V2");
  });
});
