import { describe, expect, it } from "vitest";
import {
  appendAuditEvent,
  verifyAuditChain,
  type AuditEvent,
} from "@/modules/audit/audit-chain";
import {
  buildMilestoneTransitionAuditEvent,
  createMilestoneWorkflow,
  transitionMilestoneWorkflow,
} from "@/modules/pilots";

describe("Pilot Milestone Audit Trail Integration", () => {
  it("records tamper-evident audit events for milestone lifecycle transitions", () => {
    const chain: AuditEvent[] = [];

    // 1. Initial Planned Milestone
    let snapshot = createMilestoneWorkflow("MS-PUNE-01");

    // 2. Transition to IN_PROGRESS
    snapshot = transitionMilestoneWorkflow(snapshot, {
      expectedVersion: 0,
      to: "IN_PROGRESS",
      actorRole: "PILOT_REVIEWER",
      reason: "Kickoff meeting held; sandbox environment access granted to startup.",
    });
    const startEvent = appendAuditEvent(
      undefined,
      buildMilestoneTransitionAuditEvent(
        snapshot,
        snapshot.events[snapshot.events.length - 1]!,
        "USR-OFFICER-1",
        "PROBLEM_OWNER",
      ),
    );
    chain.push(startEvent);

    expect(startEvent.action).toBe("MILESTONE_STATE_IN_PROGRESS");
    expect(startEvent.sequence).toBe(1);

    // 3. Transition to EVIDENCE_SUBMITTED
    snapshot = transitionMilestoneWorkflow(snapshot, {
      expectedVersion: 1,
      to: "EVIDENCE_SUBMITTED",
      actorRole: "STARTUP_CONTRIBUTOR",
      reason: "Submitted benchmark report and edge vision device telematics logs.",
      evidenceObjectIds: ["EVID-TELEMETRY-01", "EVID-REPORT-01"],
    });
    const submitEvent = appendAuditEvent(
      chain[chain.length - 1],
      buildMilestoneTransitionAuditEvent(
        snapshot,
        snapshot.events[snapshot.events.length - 1]!,
        "USR-FOUNDER-1",
        "STARTUP_CONTRIBUTOR",
      ),
    );
    chain.push(submitEvent);

    expect(submitEvent.action).toBe("MILESTONE_STATE_EVIDENCE_SUBMITTED");
    expect(submitEvent.sequence).toBe(2);
    expect(submitEvent.previousHash).toBe(startEvent.eventHash);

    // 4. Verify Chain Integrity
    const verification = verifyAuditChain(chain);
    expect(verification.valid).toBe(true);
    if (verification.valid) {
      expect(verification.checkedEvents).toBe(2);
    }
  });
});
