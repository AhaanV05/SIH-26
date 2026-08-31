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

  it.each([
    ["undefined", { value: undefined }],
    ["non-finite numbers", { value: Number.NaN }],
    ["bigints", { value: BigInt(1) }],
    ["functions", { value: () => "not JSON" }],
    ["non-plain objects", { value: new Date("2026-08-31T10:00:00Z") }],
  ])("rejects %s instead of producing an ambiguous hash", (_label, value) => {
    expect(() => canonicalJson(value)).toThrow(/Canonical JSON|canonical JSON/);
  });

  it("rejects sparse arrays and cyclic objects", () => {
    const sparse = new Array<unknown>(1);
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;

    expect(() => canonicalJson(sparse)).toThrow("dense data arrays");
    expect(() => canonicalJson(cyclic)).toThrow("must not contain cycles");
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

  it.each([
    "2026-08-31T10:00:00",
    "2026-02-30T10:00:00Z",
    "2026-08-31 10:00:00+05:30",
    "2026-08-31T10:00:00+14:01",
    "2026-08-31T10:00:00-00:00",
  ])("rejects a non-strict timestamp: %s", (occurredAt) => {
    expect(() =>
      appendAuditEvent(undefined, {
        id: "audit-invalid-time",
        occurredAt,
        actor: { id: "officer-1", type: "USER" },
        action: "CHALLENGE_CREATED",
        entityType: "Challenge",
        entityId: "challenge-1",
        correlationId: "correlation-1",
      }),
    ).toThrow("valid timezone-aware ISO timestamp");
  });

  it("rejects events that move backward in time", () => {
    const first = firstEvent();

    expect(() =>
      appendAuditEvent(first, {
        id: "audit-002",
        occurredAt: "2026-08-31T09:59:59+05:30",
        actor: { id: "reviewer-1", type: "USER" },
        action: "CHALLENGE_APPROVED",
        entityType: "Challenge",
        entityId: "challenge-1",
        correlationId: "correlation-1",
      }),
    ).toThrow("must not precede the previous audit event");
  });

  it("rejects unsupported metadata before hashing", () => {
    expect(() =>
      appendAuditEvent(undefined, {
        id: "audit-invalid-metadata",
        occurredAt: "2026-08-31T10:00:00Z",
        actor: { id: "officer-1", type: "USER" },
        action: "CHALLENGE_CREATED",
        entityType: "Challenge",
        entityId: "challenge-1",
        correlationId: "correlation-1",
        metadata: { confidence: Number.POSITIVE_INFINITY },
      }),
    ).toThrow("numbers must be finite");
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

  it("detects a timestamp regression during chain verification", () => {
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
    const backdated = {
      ...second,
      occurredAt: "2026-08-31T09:59:59+05:30",
    } as AuditEvent;

    expect(verifyAuditChain([first, backdated])).toMatchObject({
      valid: false,
      checkedEvents: 1,
      failedAtSequence: 2,
      reason: "INVALID_TIMESTAMP",
    });
  });

  it("treats unsupported metadata in a stored event as an invalid hash", () => {
    const event = firstEvent();
    const unsupported = {
      ...event,
      metadata: { confidence: Number.NaN },
    } as AuditEvent;

    expect(verifyAuditChain([unsupported])).toMatchObject({
      valid: false,
      failedAtSequence: 1,
      reason: "INVALID_EVENT_HASH",
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
