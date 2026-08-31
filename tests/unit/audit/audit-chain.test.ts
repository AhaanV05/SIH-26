import { describe, expect, it } from "vitest";

import {
  appendAuditEvent,
  AUDIT_GENESIS_HASH,
  canonicalJson,
  verifyAuditChain,
  type AuditEvent,
} from "../../../src/modules/audit/audit-chain";

function firstEvent(): AuditEvent {
  return appendAuditEvent(undefined, {
    id: "audit-001",
    occurredAt: "2026-08-31T10:00:00+05:30",
    actor: { id: "officer-1", type: "USER", role: "PROBLEM_OWNER" },
    action: "CHALLENGE_CREATED",
    entityType: "Challenge",
    entityId: "challenge-1",
    correlationId: "correlation-1",
    metadata: { title: "Synthetic waste challenge", version: 1 },
  });
}

describe("canonicalJson", () => {
  it("produces the same value regardless of object key insertion order", () => {
    expect(canonicalJson({ z: 1, a: { y: 2, b: 3 } })).toBe(
      canonicalJson({ a: { b: 3, y: 2 }, z: 1 }),
    );
  });

  it("preserves array order", () => {
    expect(canonicalJson({ values: [1, 2] })).not.toBe(
      canonicalJson({ values: [2, 1] }),
    );
  });
});

describe("audit hash chain", () => {
  it("creates a deterministic genesis event", () => {
    const event = firstEvent();

    expect(event.sequence).toBe(1);
    expect(event.previousHash).toBe(AUDIT_GENESIS_HASH);
    expect(event.eventHash).toMatch(/^[a-f0-9]{64}$/);
    expect(firstEvent().eventHash).toBe(event.eventHash);
  });

  it("links and verifies multiple events", () => {
    const first = firstEvent();
    const second = appendAuditEvent(first, {
      id: "audit-002",
      occurredAt: "2026-08-31T10:01:00+05:30",
      actor: { id: "reviewer-1", type: "USER", role: "PROCUREMENT_REVIEWER" },
      action: "CHALLENGE_APPROVED",
      entityType: "Challenge",
      entityId: "challenge-1",
      correlationId: "correlation-1",
      reason: "Required fields and lint findings resolved",
    });

    expect(second.previousHash).toBe(first.eventHash);
    expect(verifyAuditChain([first, second])).toEqual({
      valid: true,
      checkedEvents: 2,
    });
  });

  it("detects payload tampering", () => {
    const original = firstEvent();
    const tampered = {
      ...original,
      action: "CHALLENGE_PUBLISHED",
    } as AuditEvent;

    expect(verifyAuditChain([tampered])).toMatchObject({
      valid: false,
      failedAtSequence: 1,
      reason: "INVALID_EVENT_HASH",
    });
  });

  it("detects a broken link", () => {
    const first = firstEvent();
    const second = appendAuditEvent(first, {
      id: "audit-002",
      occurredAt: "2026-08-31T10:01:00+05:30",
      actor: { id: "reviewer-1", type: "USER" },
      action: "CHALLENGE_APPROVED",
      entityType: "Challenge",
      entityId: "challenge-1",
      correlationId: "correlation-1",
    });
    const broken = { ...second, previousHash: AUDIT_GENESIS_HASH } as AuditEvent;

    expect(verifyAuditChain([first, broken])).toMatchObject({
      valid: false,
      failedAtSequence: 2,
      reason: "INVALID_PREVIOUS_HASH",
    });
  });

  it("rejects incomplete input before hashing", () => {
    expect(() =>
      appendAuditEvent(undefined, {
        id: "",
        occurredAt: "not-a-date",
        actor: { id: "", type: "USER" },
        action: "",
        entityType: "Challenge",
        entityId: "challenge-1",
        correlationId: "correlation-1",
      }),
    ).toThrow("id must not be empty");
  });
});
