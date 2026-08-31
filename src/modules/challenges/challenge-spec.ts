import { z } from "zod";

export const CHALLENGE_SPEC_SCHEMA_VERSION = "mahasetu.challenge/1.0" as const;

export const challengeStatuses = [
  "DRAFT",
  "UNDER_REVIEW",
  "APPROVED",
  "PUBLISHED",
  "SUPERSEDED",
] as const;

export const frozenChallengeStatuses = [
  "APPROVED",
  "PUBLISHED",
  "SUPERSEDED",
] as const;

export const evidenceAssuranceLevels = [
  "AUTHORITY_ASSERTED",
  "OFFICER_VERIFIED",
  "SYSTEM_OBSERVED",
  "THIRD_PARTY_ATTESTED",
  "SELF_DECLARED",
  "SIMULATED_FOR_DEMO",
] as const;

const identifierSchema = z
  .string()
  .trim()
  .min(3)
  .max(80)
  .regex(
    /^[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+$/,
    "Use an uppercase, hyphen-separated stable identifier",
  );

const shortTextSchema = z.string().trim().min(1).max(240);
const longTextSchema = z.string().trim().min(10).max(10_000);
const isoTimestampSchema = z.string().datetime({ offset: true });
const sha256Schema = z
  .string()
  .regex(/^[a-f0-9]{64}$/i, "Expected a 64-character SHA-256 digest");

export const baselineObservationSchema = z
  .object({
    metric: shortTextSchema,
    value: z.number().finite(),
    unit: shortTextSchema,
    source: shortTextSchema,
    observedAt: isoTimestampSchema.optional(),
  })
  .strict();

export const challengeConstraintSchema = z
  .object({
    id: identifierSchema,
    statement: shortTextSchema,
    category: z.enum([
      "LEGAL",
      "TECHNICAL",
      "OPERATIONAL",
      "SECURITY",
      "DATA",
      "OTHER",
    ]),
    mandatory: z.boolean(),
    justification: z.string().trim().min(10).max(2_000).optional(),
  })
  .strict();

export const outcomeSchema = z
  .object({
    id: identifierSchema,
    statement: longTextSchema,
    metricIds: z.array(identifierSchema).min(1),
  })
  .strict();

export const metricSchema = z
  .object({
    id: identifierSchema,
    name: shortTextSchema,
    direction: z.enum(["GTE", "LTE", "EQ"]),
    target: z.number().finite(),
    unit: shortTextSchema,
    window: shortTextSchema,
    measurementSource: shortTextSchema.optional(),
    calculatorVersion: shortTextSchema.optional(),
    minimumSampleSize: z.number().int().positive().optional(),
  })
  .strict();

export const eligibilityCriterionSchema = z
  .object({
    id: identifierSchema,
    kind: z.enum([
      "STARTUP_RECOGNITION",
      "INCORPORATION",
      "TAX_REGISTRATION",
      "MSME_UDYAM",
      "TECHNICAL_CAPABILITY",
      "SECURITY_READINESS",
      "PRIOR_EXPERIENCE",
      "TURNOVER",
      "EMD",
      "OTHER",
    ]),
    description: shortTextSchema.optional(),
    mandatory: z.boolean(),
    acceptedEvidence: z.array(z.enum(evidenceAssuranceLevels)).min(1),
    verificationMethod: shortTextSchema.optional(),
    justification: z.string().trim().min(10).max(2_000).optional(),
  })
  .strict();

export const rubricCriterionSchema = z
  .object({
    id: identifierSchema,
    name: shortTextSchema,
    description: z.string().trim().min(10).max(2_000).optional(),
    weight: z.number().finite().positive().max(100),
    scoreMin: z.number().finite().default(0),
    scoreMax: z.number().finite().positive().default(10),
  })
  .strict();

export const sandboxSchema = z
  .object({
    datasetVersion: shortTextSchema,
    apiContractVersion: shortTextSchema,
    egress: z.enum(["DENY_ALL", "ALLOW_LIST"]),
    egressJustification: z.string().trim().min(10).max(2_000).optional(),
    retentionHours: z.number().int().positive().max(720),
    testSuiteVersion: shortTextSchema,
    usesProductionCitizenData: z.boolean().default(false),
    dataClassification: z
      .enum(["PUBLIC", "INTERNAL", "CONFIDENTIAL_BUSINESS", "RESTRICTED"])
      .default("PUBLIC"),
    dataOwner: shortTextSchema.optional(),
    legalBasis: z.string().trim().min(10).max(2_000).optional(),
  })
  .strict();

export const milestoneSchema = z
  .object({
    id: identifierSchema,
    name: shortTextSchema,
    paymentPercent: z.number().finite().min(0).max(100),
    requiredMetricIds: z.array(identifierSchema).min(1),
    requiredEvidenceTypes: z.array(shortTextSchema).min(1),
    acceptanceStatement: z.string().trim().min(10).max(2_000).optional(),
  })
  .strict();

export const challengeRequirementsSchema = z
  .object({
    accessibility: z.string().trim().min(10).max(2_000).optional(),
    interoperability: z.string().trim().min(10).max(2_000).optional(),
    exitAndPortability: z.string().trim().min(10).max(2_000).optional(),
    securityAndPrivacy: z.string().trim().min(10).max(2_000).optional(),
    grievanceRoute: z.string().trim().min(10).max(2_000).optional(),
  })
  .strict();

export const challengeTimelineSchema = z
  .object({
    applicationsOpenAt: isoTimestampSchema,
    applicationsCloseAt: isoTimestampSchema,
    pilotStartAt: isoTimestampSchema,
    pilotEndAt: isoTimestampSchema,
    dependencyLeadTimeDays: z.number().int().nonnegative().default(0),
  })
  .strict();

export const challengeSpecBaseSchema = z
  .object({
    schemaVersion: z.literal(CHALLENGE_SPEC_SCHEMA_VERSION),
    challengeId: identifierSchema,
    version: z.number().int().positive(),
    status: z.enum(challengeStatuses),
    problem: z
      .object({
        title: z.string().trim().min(5).max(160),
        statement: longTextSchema,
        affectedUsers: z.array(shortTextSchema).min(1),
        geography: z.array(shortTextSchema).min(1),
        baseline: z.array(baselineObservationSchema).min(1),
        constraints: z.array(challengeConstraintSchema).default([]),
      })
      .strict(),
    outcomes: z.array(outcomeSchema).min(1),
    metrics: z.array(metricSchema).min(1),
    eligibility: z.array(eligibilityCriterionSchema).default([]),
    rubric: z.array(rubricCriterionSchema).min(1),
    timeline: challengeTimelineSchema.optional(),
    sandbox: sandboxSchema,
    milestones: z.array(milestoneSchema).min(1),
    requirements: challengeRequirementsSchema.optional(),
    governance: z
      .object({
        policyPackVersion: shortTextSchema,
        requiredApproverRoles: z.array(shortTextSchema).min(1),
        publicationProfile: shortTextSchema,
      })
      .strict(),
    integrity: z
      .object({
        frozenAt: isoTimestampSchema.nullable(),
        contentHash: sha256Schema.nullable(),
      })
      .strict(),
  })
  .strict();

type Identified = { id: string };

function findDuplicateIds(items: readonly Identified[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const item of items) {
    if (seen.has(item.id)) {
      duplicates.add(item.id);
    }
    seen.add(item.id);
  }

  return [...duplicates].sort();
}

function addDuplicateIdIssues(
  items: readonly Identified[],
  path: string,
  context: z.RefinementCtx,
): void {
  for (const duplicate of findDuplicateIds(items)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: [path],
      message: `Duplicate stable identifier: ${duplicate}`,
    });
  }
}

export const challengeSpecSchema = challengeSpecBaseSchema.superRefine(
  (specification, context) => {
    addDuplicateIdIssues(specification.problem.constraints, "problem.constraints", context);
    addDuplicateIdIssues(specification.outcomes, "outcomes", context);
    addDuplicateIdIssues(specification.metrics, "metrics", context);
    addDuplicateIdIssues(specification.eligibility, "eligibility", context);
    addDuplicateIdIssues(specification.rubric, "rubric", context);
    addDuplicateIdIssues(specification.milestones, "milestones", context);

    const metricIds = new Set(specification.metrics.map((metric) => metric.id));

    specification.outcomes.forEach((outcome, outcomeIndex) => {
      outcome.metricIds.forEach((metricId, metricIndex) => {
        if (!metricIds.has(metricId)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["outcomes", outcomeIndex, "metricIds", metricIndex],
            message: `Outcome references unknown metric ${metricId}`,
          });
        }
      });
    });

    specification.milestones.forEach((milestone, milestoneIndex) => {
      milestone.requiredMetricIds.forEach((metricId, metricIndex) => {
        if (!metricIds.has(metricId)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["milestones", milestoneIndex, "requiredMetricIds", metricIndex],
            message: `Milestone references unknown metric ${metricId}`,
          });
        }
      });
    });

    const rubricWeight = specification.rubric.reduce(
      (total, criterion) => total + criterion.weight,
      0,
    );
    if (Math.abs(rubricWeight - 100) > 1e-9) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["rubric"],
        message: `Rubric weights must total 100; received ${rubricWeight}`,
      });
    }

    specification.rubric.forEach((criterion, index) => {
      if (criterion.scoreMin >= criterion.scoreMax) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["rubric", index, "scoreMax"],
          message: "scoreMax must be greater than scoreMin",
        });
      }
    });

    const paymentTotal = specification.milestones.reduce(
      (total, milestone) => total + milestone.paymentPercent,
      0,
    );
    if (paymentTotal > 100 + 1e-9) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["milestones"],
        message: `Milestone payment percentages cannot exceed 100; received ${paymentTotal}`,
      });
    }

    if (specification.timeline) {
      const open = Date.parse(specification.timeline.applicationsOpenAt);
      const close = Date.parse(specification.timeline.applicationsCloseAt);
      const pilotStart = Date.parse(specification.timeline.pilotStartAt);
      const pilotEnd = Date.parse(specification.timeline.pilotEndAt);

      if (!(open < close && close <= pilotStart && pilotStart < pilotEnd)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["timeline"],
          message:
            "Expected applicationsOpenAt < applicationsCloseAt <= pilotStartAt < pilotEndAt",
        });
      }
    }

    const isFrozen = frozenChallengeStatuses.includes(
      specification.status as (typeof frozenChallengeStatuses)[number],
    );
    if (isFrozen && (!specification.integrity.frozenAt || !specification.integrity.contentHash)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["integrity"],
        message: "Approved, published, and superseded specifications require frozenAt and contentHash",
      });
    }

    if (
      !isFrozen &&
      (specification.integrity.frozenAt !== null ||
        specification.integrity.contentHash !== null)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["integrity"],
        message: "Mutable specifications cannot carry frozen integrity metadata",
      });
    }
  },
);

export type ChallengeSpec = z.infer<typeof challengeSpecSchema>;
export type ChallengeSpecInput = z.input<typeof challengeSpecSchema>;
export type ChallengeStatus = (typeof challengeStatuses)[number];
export type EvidenceAssuranceLevel = (typeof evidenceAssuranceLevels)[number];

export type DeepPartial<T> = T extends readonly (infer Item)[]
  ? DeepPartial<Item>[]
  : T extends object
    ? { [Key in keyof T]?: DeepPartial<T[Key]> }
    : T;

export type ChallengeSpecDraft = DeepPartial<ChallengeSpec>;

