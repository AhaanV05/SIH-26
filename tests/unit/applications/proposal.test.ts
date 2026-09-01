import { describe, expect, it } from "vitest";

import {
  authorizeProposalRead,
  createProposalDraft,
  demoProposals,
  transitionProposal,
} from "@/modules/applications";

const startupActor = { userId: "founder", role: "STARTUP_ADMIN" as const, startupId: "ORG-ECOSCAN" };
const validInput = {
  challengeId: "CHAL-WASTE-PUNE-001",
  startupId: "ORG-ECOSCAN",
  approach: "A sufficiently detailed approach that explains edge inference, encrypted synchronization, open APIs, and an operational fallback.",
  outcomes: "Detect at least ninety percent of overflow events and reduce median dispatch time below twenty minutes.",
  timeline: [{ phase: "Sandbox benchmark", weeks: 2 }],
  pilotCostInPaise: 18_500_000,
  risks: "Camera occlusion is mitigated with confidence thresholds and manual fallback.",
  declarationsAccepted: true,
};

describe("proposal domain", () => {
  it("validates a startup-owned draft and labels the fixture", () => {
    expect(createProposalDraft(validInput, startupActor, "PROP-NEW")).toMatchObject({
      id: "PROP-NEW", status: "DRAFT", displayLabel: "SIMULATED_FOR_DEMO",
    });
    expect(() => createProposalDraft({ ...validInput, startupId: "ORG-BINSENSE" }, startupActor, "PROP-X"))
      .toThrow("FORBIDDEN_PROPOSAL_CREATE");
  });

  it("rejects incomplete, unmeasurable submissions", () => {
    expect(() => createProposalDraft({ ...validInput, approach: "too short", declarationsAccepted: false }, startupActor, "PROP-X"))
      .toThrow();
  });

  it("enforces proposal state, role, ownership, and challenge-open gates", () => {
    const draft = createProposalDraft(validInput, startupActor, "PROP-NEW");
    expect(() => transitionProposal(draft, "SUBMITTED", startupActor, "2026-09-01T10:00:00+05:30", "OTHER"))
      .toThrow("CHALLENGE_NOT_OPEN");
    const submitted = transitionProposal(draft, "SUBMITTED", startupActor, "2026-09-01T10:00:00+05:30", "PUBLISHED");
    expect(submitted.status).toBe("SUBMITTED");
    expect(() => transitionProposal(draft, "SUBMITTED", { ...startupActor, role: "STARTUP_CONTRIBUTOR" }, "2026-09-01T10:00:00+05:30", "PUBLISHED"))
      .toThrow("FORBIDDEN_PROPOSAL_TRANSITION");
    expect(() => transitionProposal(submitted, "ELIGIBILITY_REVIEW", startupActor, "2026-09-01T10:05:00+05:30"))
      .toThrow("FORBIDDEN_PROPOSAL_TRANSITION");
    expect(transitionProposal(submitted, "ELIGIBILITY_REVIEW", { userId: "reviewer", role: "PROCUREMENT_REVIEWER" }, "2026-09-01T10:05:00+05:30").status)
      .toBe("ELIGIBILITY_REVIEW");
    expect(() => transitionProposal(submitted, "SELECTED", { userId: "reviewer", role: "PROCUREMENT_REVIEWER" }, "2026-09-01T10:05:00+05:30"))
      .toThrow("INVALID_PROPOSAL_TRANSITION");
  });

  it("blocks startup IDOR and limits evaluators to assigned proposals", () => {
    expect(() => authorizeProposalRead(startupActor, demoProposals[0]!)).not.toThrow();
    expect(() => authorizeProposalRead(startupActor, demoProposals[1]!)).toThrow("FORBIDDEN_PROPOSAL_READ");
    expect(() => authorizeProposalRead({ userId: "eval", role: "EVALUATOR", assignedProposalIds: [demoProposals[0]!.id] }, demoProposals[1]!))
      .toThrow("FORBIDDEN_PROPOSAL_READ");
    expect(() => authorizeProposalRead({ userId: "finance", role: "FINANCE_OFFICER" }, demoProposals[0]!))
      .toThrow("FORBIDDEN_PROPOSAL_READ");
  });
});
