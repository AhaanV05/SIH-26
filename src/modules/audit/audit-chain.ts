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

const TIMEZONE_AWARE_ISO_TIMESTAMP =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|[+-](?:(?:0\d|1[0-3]):[0-5]\d|14:00))$/;

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function parseTimestamp(value: string): number | undefined {
  const match = TIMEZONE_AWARE_ISO_TIMESTAMP.exec(value);
  if (!match) {
    return undefined;
  }

  const [
    ,
    yearPart,
    monthPart,
    dayPart,
    hourPart,
    minutePart,
    secondPart,
    ,
    timezonePart,
  ] = match;
  const year = Number(yearPart);
  const month = Number(monthPart);
  const day = Number(dayPart);
  const hour = Number(hourPart);
  const minute = Number(minutePart);
  const second = Number(secondPart);
  const daysInMonth = [
    31,
    isLeapYear(year) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];

  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > (daysInMonth[month - 1] ?? 0) ||
    hour > 23 ||
    minute > 59 ||
    second > 59 ||
    timezonePart === "-00:00"
  ) {
    return undefined;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : undefined;
}

function assertTimestamp(value: string): number {
  const timestamp = parseTimestamp(value);
  if (timestamp === undefined) {
    throw new Error(
      "occurredAt must be a valid timezone-aware ISO timestamp",
    );
  }

  return timestamp;
}

/**
 * Produces deterministic JSON for hashing. Object keys are sorted recursively;
 * array order is preserved because it is semantically meaningful. Only plain,
 * unambiguous JSON values are accepted.
 */
export function canonicalJson(value: unknown): string {
  return canonicalJsonValue(value, new Set<object>(), "$");
}

function canonicalJsonValue(
  value: unknown,
  ancestors: Set<object>,
  path: string,
): string {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    const serialized = JSON.stringify(value);
    if (serialized === undefined) {
      throw new Error(`Unsupported canonical JSON value at ${path}`);
    }
    return serialized;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(`Canonical JSON numbers must be finite at ${path}`);
    }

    return JSON.stringify(value);
  }

  if (typeof value !== "object") {
    throw new Error(`Unsupported canonical JSON value at ${path}`);
  }

  if (ancestors.has(value)) {
    throw new Error(`Canonical JSON must not contain cycles at ${path}`);
  }

  ancestors.add(value);

  try {
    if (Array.isArray(value)) {
      if (Object.getPrototypeOf(value) !== Array.prototype) {
        throw new Error(`Canonical JSON arrays must be plain arrays at ${path}`);
      }

      const items: string[] = [];
      for (let index = 0; index < value.length; index += 1) {
        const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
        if (
          !descriptor ||
          !descriptor.enumerable ||
          !("value" in descriptor)
        ) {
          throw new Error(
            `Canonical JSON arrays must be dense data arrays at ${path}`,
          );
        }

        items.push(
          canonicalJsonValue(
            descriptor.value,
            ancestors,
            `${path}[${index}]`,
          ),
        );
      }

      const arrayKeys = Reflect.ownKeys(value);
      if (arrayKeys.length !== value.length + 1) {
        throw new Error(
          `Canonical JSON arrays must not have custom properties at ${path}`,
        );
      }

      return `[${items.join(",")}]`;
    }

    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new Error(`Canonical JSON objects must be plain objects at ${path}`);
    }

    const entries = Reflect.ownKeys(value).map((key) => {
      if (typeof key !== "string") {
        throw new Error(
          `Canonical JSON objects must not have symbol keys at ${path}`,
        );
      }

      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor?.enumerable || !("value" in descriptor)) {
        throw new Error(
          `Canonical JSON properties must be enumerable data properties at ${path}`,
        );
      }

      return [key, descriptor.value] as const;
    });

    entries.sort(([left], [right]) =>
      left < right ? -1 : left > right ? 1 : 0,
    );

    return `{${entries
      .map(
        ([key, entryValue]) =>
          `${JSON.stringify(key)}:${canonicalJsonValue(
            entryValue,
            ancestors,
            `${path}.${key}`,
          )}`,
      )
      .join(",")}}`;
  } finally {
    ancestors.delete(value);
  }
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
  const occurredAt = assertTimestamp(input.occurredAt);

  if (previousEvent) {
    const previousOccurredAt = assertTimestamp(previousEvent.occurredAt);
    if (occurredAt < previousOccurredAt) {
      throw new Error("occurredAt must not precede the previous audit event");
    }
  }

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
  let previousOccurredAt: number | undefined;

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

    const occurredAt = parseTimestamp(event.occurredAt);
    if (
      occurredAt === undefined ||
      (previousOccurredAt !== undefined && occurredAt < previousOccurredAt)
    ) {
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
    let calculatedHash: string;
    try {
      calculatedHash = hashEventPayload(eventWithoutHash);
    } catch {
      return {
        valid: false,
        checkedEvents: index,
        failedAtSequence: event.sequence,
        reason: "INVALID_EVENT_HASH",
      };
    }

    if (calculatedHash !== recordedHash) {
      return {
        valid: false,
        checkedEvents: index,
        failedAtSequence: event.sequence,
        reason: "INVALID_EVENT_HASH",
      };
    }

    expectedPreviousHash = recordedHash;
    previousOccurredAt = occurredAt;
  }

  return { valid: true, checkedEvents: events.length };
}
