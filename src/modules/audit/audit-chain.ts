import { createHash } from "node:crypto";

export const AUDIT_EVENT_SCHEMA_VERSION = 1 as const;
export const AUDIT_GENESIS_HASH = "0".repeat(64);

export type AuditActor = Readonly<{
  id: string;
  type: "USER" | "SERVICE" | "SYSTEM";
  role?: string;
}>;

export type AuditEventInput = Readonly<{
  id: string;
  occurredAt: string;
  actor: AuditActor;
  action: string;
  entityType: string;
  entityId: string;
  correlationId: string;
  reason?: string;
  metadata?: Readonly<Record<string, unknown>>;
}>;

export type AuditEvent = AuditEventInput &
  Readonly<{
    sequence: number;
    schemaVersion: typeof AUDIT_EVENT_SCHEMA_VERSION;
    previousHash: string;
    eventHash: string;
  }>;

export type AuditChainVerification = Readonly<
  | { valid: true; checkedEvents: number }
  | {
      valid: false;
      checkedEvents: number;
      failedAtSequence: number;
      reason:
        | "INVALID_SEQUENCE"
        | "INVALID_PREVIOUS_HASH"
        | "INVALID_EVENT_HASH"
        | "INVALID_TIMESTAMP";
    }
>;

function assertNonEmpty(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${field} must not be empty`);
  }
}

function assertTimestamp(value: string): void {
  if (Number.isNaN(Date.parse(value))) {
    throw new Error("occurredAt must be an ISO-compatible timestamp");
  }
}

/**
 * Produces deterministic JSON for hashing. Object keys are sorted recursively;
 * array order is preserved because it is semantically meaningful.
 */
export function canonicalJson(value: unknown): string {
  if (value === undefined) {
    return "null";
  }

  if (value === null || typeof value !== "object") {
    const serialized = JSON.stringify(value);
    if (serialized === undefined) {
      throw new Error("Unsupported value in canonical JSON");
    }
    return serialized;
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }

  const record = value as Record<string, unknown>;
  const entries = Object.keys(record)
    .sort()
    .filter((key) => record[key] !== undefined)
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`);

  return `{${entries.join(",")}}`;
}

function hashEventPayload(event: Omit<AuditEvent, "eventHash">): string {
  return createHash("sha256").update(canonicalJson(event), "utf8").digest("hex");
}

export function appendAuditEvent(
  previousEvent: AuditEvent | undefined,
  input: AuditEventInput,
): AuditEvent {
  assertNonEmpty(input.id, "id");
  assertNonEmpty(input.action, "action");
  assertNonEmpty(input.entityType, "entityType");
  assertNonEmpty(input.entityId, "entityId");
  assertNonEmpty(input.correlationId, "correlationId");
  assertNonEmpty(input.actor.id, "actor.id");
  assertTimestamp(input.occurredAt);

  const eventWithoutHash: Omit<AuditEvent, "eventHash"> = {
    ...input,
    sequence: previousEvent ? previousEvent.sequence + 1 : 1,
    schemaVersion: AUDIT_EVENT_SCHEMA_VERSION,
    previousHash: previousEvent?.eventHash ?? AUDIT_GENESIS_HASH,
  };

  return Object.freeze({
    ...eventWithoutHash,
    eventHash: hashEventPayload(eventWithoutHash),
  });
}

export function verifyAuditChain(
  events: readonly AuditEvent[],
): AuditChainVerification {
  let expectedPreviousHash = AUDIT_GENESIS_HASH;

  for (const [index, event] of events.entries()) {
    const expectedSequence = index + 1;

    if (event.sequence !== expectedSequence) {
      return {
        valid: false,
        checkedEvents: index,
        failedAtSequence: event.sequence,
        reason: "INVALID_SEQUENCE",
      };
    }

    if (Number.isNaN(Date.parse(event.occurredAt))) {
      return {
        valid: false,
        checkedEvents: index,
        failedAtSequence: event.sequence,
        reason: "INVALID_TIMESTAMP",
      };
    }

    if (event.previousHash !== expectedPreviousHash) {
      return {
        valid: false,
        checkedEvents: index,
        failedAtSequence: event.sequence,
        reason: "INVALID_PREVIOUS_HASH",
      };
    }

    const { eventHash: recordedHash, ...eventWithoutHash } = event;
    if (hashEventPayload(eventWithoutHash) !== recordedHash) {
      return {
        valid: false,
        checkedEvents: index,
        failedAtSequence: event.sequence,
        reason: "INVALID_EVENT_HASH",
      };
    }

    expectedPreviousHash = recordedHash;
  }

  return { valid: true, checkedEvents: events.length };
}
