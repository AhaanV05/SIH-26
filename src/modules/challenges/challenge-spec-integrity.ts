import { createHash, timingSafeEqual } from "node:crypto";

import { z } from "zod";

import { canonicalizeJson } from "./canonical-json";
import {
  challengeSpecSchema,
  frozenChallengeStatuses,
  type ChallengeSpec,
} from "./challenge-spec";

export interface ChallengeSpecValidationIssue {
  readonly path: string;
  readonly message: string;
  readonly code: string;
}

export type ChallengeSpecValidationResult =
  | { readonly success: true; readonly data: ChallengeSpec }
  | {
      readonly success: false;
      readonly issues: readonly ChallengeSpecValidationIssue[];
    };

function contentHashPayload(specification: ChallengeSpec): Record<string, unknown> {
  const { contentHash: _storedHash, ...integrityWithoutHash } = specification.integrity;

  return {
    ...specification,
    integrity: integrityWithoutHash,
  };
}

export function computeChallengeSpecContentHash(specification: ChallengeSpec): string {
  const canonicalDocument = canonicalizeJson(contentHashPayload(specification));
  return createHash("sha256").update(canonicalDocument, "utf8").digest("hex");
}

export function verifyChallengeSpecContentHash(specification: ChallengeSpec): boolean {
  const storedHash = specification.integrity.contentHash;
  if (!storedHash) {
    return false;
  }

  const expected = Buffer.from(computeChallengeSpecContentHash(specification), "hex");
  const actual = Buffer.from(storedHash, "hex");

  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function validateChallengeSpec(input: unknown): ChallengeSpecValidationResult {
  const parsed = challengeSpecSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
        code: issue.code,
      })),
    };
  }

  const isFrozen = frozenChallengeStatuses.includes(
    parsed.data.status as (typeof frozenChallengeStatuses)[number],
  );
  if (isFrozen && !verifyChallengeSpecContentHash(parsed.data)) {
    return {
      success: false,
      issues: [
        {
          path: "integrity.contentHash",
          message: "Content hash does not match the canonical ChallengeSpec document",
          code: "integrity_mismatch",
        },
      ],
    };
  }

  return { success: true, data: parsed.data };
}

export function parseChallengeSpec(input: unknown): ChallengeSpec {
  const result = validateChallengeSpec(input);
  if (result.success) {
    return result.data;
  }

  throw new z.ZodError(
    result.issues.map((issue) => ({
      code: z.ZodIssueCode.custom,
      path: issue.path ? issue.path.split(".") : [],
      message: issue.message,
    })),
  );
}

export function freezeChallengeSpec(
  input: unknown,
  frozenAt: string,
): ChallengeSpec {
  const timestamp = z.string().datetime({ offset: true }).parse(frozenAt);
  const draft = challengeSpecSchema.parse(input);

  if (draft.status !== "DRAFT" && draft.status !== "UNDER_REVIEW") {
    throw new Error(`Only mutable ChallengeSpecs can be frozen; received ${draft.status}`);
  }

  const pendingHash = {
    ...draft,
    status: "APPROVED" as const,
    integrity: {
      frozenAt: timestamp,
      contentHash: "0".repeat(64),
    },
  } satisfies ChallengeSpec;

  const frozen = {
    ...pendingHash,
    integrity: {
      ...pendingHash.integrity,
      contentHash: computeChallengeSpecContentHash(pendingHash),
    },
  } satisfies ChallengeSpec;

  return parseChallengeSpec(frozen);
}

