import { createHash, timingSafeEqual } from "node:crypto";

import { z } from "zod";

import { canonicalizeJson } from "./canonical-json";
import {
  challengeTimestampSchema,
  challengeSpecSchema,
  frozenChallengeStatuses,
  parseChallengeTimestamp,
  type ChallengeSpec,
} from "./challenge-spec";
import {
  hasBlockingProcurementFindings,
  lintChallengeSpec,
} from "./procurement-lint";

export const challengeSpecOperatingModes = ["DEMO", "PRODUCTION"] as const;

export interface FreezeChallengeSpecRequest {
  readonly frozenAt: string;
  readonly satisfiedApproverRoles: readonly string[];
  readonly operatingMode: (typeof challengeSpecOperatingModes)[number];
}

const freezeChallengeSpecRequestSchema = z
  .object({
    frozenAt: challengeTimestampSchema,
    satisfiedApproverRoles: z.array(z.string().trim().min(1)),
    operatingMode: z.enum(challengeSpecOperatingModes),
  })
  .strict();

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
  const immutableSpecification: Partial<ChallengeSpec> = { ...specification };
  delete immutableSpecification.status;
  const integrityWithoutHash = {
    frozenAt: specification.integrity.frozenAt,
  };

  return {
    ...immutableSpecification,
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
  const parsed = challengeSpecSchema.safeParse(input);
  if (!parsed.success) {
    throw parsed.error;
  }

  const isFrozen = frozenChallengeStatuses.includes(
    parsed.data.status as (typeof frozenChallengeStatuses)[number],
  );
  if (isFrozen && !verifyChallengeSpecContentHash(parsed.data)) {
    throw new z.ZodError([
      {
        code: z.ZodIssueCode.custom,
        path: ["integrity", "contentHash"],
        message: "Content hash does not match the canonical ChallengeSpec document",
      },
    ]);
  }

  return parsed.data;
}

export function freezeChallengeSpec(
  input: unknown,
  requestInput: FreezeChallengeSpecRequest,
): ChallengeSpec {
  const request = freezeChallengeSpecRequestSchema.parse(requestInput);
  const draft = challengeSpecSchema.parse(input);

  if (draft.status !== "UNDER_REVIEW") {
    throw new Error(
      `Only UNDER_REVIEW ChallengeSpecs can be frozen; received ${draft.status}`,
    );
  }

  const findings = lintChallengeSpec(draft);
  if (hasBlockingProcurementFindings(findings)) {
    const blockingCodes = findings
      .filter((finding) => finding.severity === "BLOCKING")
      .map((finding) => finding.ruleCode);
    throw new Error(
      `ChallengeSpec has unresolved blocking procurement findings: ${[
        ...new Set(blockingCodes),
      ].join(", ")}`,
    );
  }

  const satisfiedRoles = new Set(request.satisfiedApproverRoles);
  const missingApproverRoles = draft.governance.requiredApproverRoles.filter(
    (role) => !satisfiedRoles.has(role),
  );
  if (missingApproverRoles.length > 0) {
    throw new Error(
      `ChallengeSpec is missing required approvals from: ${missingApproverRoles.join(", ")}`,
    );
  }

  if (
    request.operatingMode === "DEMO" &&
    draft.sandbox.usesProductionCitizenData
  ) {
    throw new Error("DEMO ChallengeSpecs must not use production citizen data");
  }

  if (draft.timeline) {
    const frozenAt = parseChallengeTimestamp(request.frozenAt);
    const applicationsOpenAt = parseChallengeTimestamp(
      draft.timeline.applicationsOpenAt,
    );
    if (
      frozenAt === undefined ||
      applicationsOpenAt === undefined ||
      frozenAt > applicationsOpenAt
    ) {
      throw new Error(
        "ChallengeSpec must be frozen no later than applicationsOpenAt",
      );
    }
  }

  const pendingHash = {
    ...draft,
    status: "APPROVED" as const,
    integrity: {
      frozenAt: request.frozenAt,
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
