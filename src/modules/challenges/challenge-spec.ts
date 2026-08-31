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
const TIMEZONE_AWARE_ISO_TIMESTAMP =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|[+-](?:(?:0\d|1[0-3]):[0-5]\d|14:00))$/;

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

export function parseChallengeTimestamp(value: string): number | undefined {
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

export const challengeTimestampSchema = z.string().refine(
  (value) => parseChallengeTimestamp(value) !== undefined,
  "Expected a valid timezone-aware ISO timestamp",
);
const sha256Schema = z
  .string()
  .regex(/^[a-f0-9]{64}$/i, "Expected a 64-character SHA-256 digest");

export const baselineObservationSchema = z
  .object({
    metric: shortTextSchema,
    value: z.number().finite(),
    unit: shortTextSchema,
    source: shortTextSchema,
    observedAt: challengeTimestampSchema.optional(),
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
    applicationsOpenAt: challengeTimestampSchema,
    applicationsCloseAt: challengeTimestampSchema,
    pilotStartAt: challengeTimestampSchema,
    pilotEndAt: challengeTimestampSchema,
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
        frozenAt: challengeTimestampSchema.nullable(),
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
      const open = parseChallengeTimestamp(specification.timeline.applicationsOpenAt);
      const close = parseChallengeTimestamp(specification.timeline.applicationsCloseAt);
      const pilotStart = parseChallengeTimestamp(specification.timeline.pilotStartAt);
      const pilotEnd = parseChallengeTimestamp(specification.timeline.pilotEndAt);

      if (
        open === undefined ||
        close === undefined ||
        pilotStart === undefined ||
        pilotEnd === undefined ||
        !(open < close && close <= pilotStart && pilotStart < pilotEnd)
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["timeline"],
          message:
            "Expected applicationsOpenAt < applicationsCloseAt <= pilotStartAt < pilotEndAt",
        });
      }
    }

    if (specification.sandbox.usesProductionCitizenData) {
      if (specification.sandbox.dataClassification !== "RESTRICTED") {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["sandbox", "dataClassification"],
          message: "Production citizen data must be classified RESTRICTED",
        });
      }

      if (!specification.sandbox.dataOwner) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["sandbox", "dataOwner"],
          message: "Production citizen data requires an accountable data owner",
        });
      }

      if (!specification.sandbox.legalBasis) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["sandbox", "legalBasis"],
          message: "Production citizen data requires a reviewed legal basis",
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

export function createChallengeSpecDraft(): ChallengeSpec {
  return {
    schemaVersion: "mahasetu.challenge/1.0",
    challengeId: "CH-WASTE-001",
    version: 1,
    status: "DRAFT",
    problem: {
      title: "Reduce community-bin overflow events",
      statement:
        "Overflow is detected too late for a safe and efficient collection response.",
      affectedUsers: ["residents", "sanitation workers"],
      geography: ["synthetic-ward-12"],
      baseline: [
        {
          metric: "overflow_events_per_week",
          value: 42,
          unit: "events/week",
          source: "synthetic-baseline-v1",
        },
      ],
      constraints: [],
    },
    outcomes: [
      {
        id: "OUT-1",
        statement: "Detect overflow early enough for an operational collection response.",
        metricIds: ["MET-1"],
      },
    ],
    metrics: [
      {
        id: "MET-1",
        name: "detection_recall",
        direction: "GTE",
        target: 0.9,
        unit: "ratio",
        window: "sandbox-dataset-v1",
        measurementSource: "synthetic-observations-v1",
        calculatorVersion: "waste-metrics/1.0",
        minimumSampleSize: 100,
      },
    ],
    eligibility: [
      {
        id: "EL-1",
        kind: "STARTUP_RECOGNITION",
        mandatory: true,
        acceptedEvidence: [
          "AUTHORITY_ASSERTED",
          "OFFICER_VERIFIED",
          "SIMULATED_FOR_DEMO",
        ],
        verificationMethod: "Verify a current evidence claim and its provenance metadata.",
      },
    ],
    rubric: [
      { id: "R-1", name: "Outcome approach", weight: 30, scoreMin: 0, scoreMax: 10 },
      { id: "R-2", name: "Pilot feasibility", weight: 25, scoreMin: 0, scoreMax: 10 },
      {
        id: "R-3",
        name: "Security and privacy",
        weight: 20,
        scoreMin: 0,
        scoreMax: 10,
      },
      {
        id: "R-4",
        name: "Interoperability and exit",
        weight: 15,
        scoreMin: 0,
        scoreMax: 10,
      },
      { id: "R-5", name: "Pilot cost", weight: 10, scoreMin: 0, scoreMax: 10 },
    ],
    timeline: {
      applicationsOpenAt: "2026-09-01T09:00:00+05:30",
      applicationsCloseAt: "2026-09-05T17:00:00+05:30",
      pilotStartAt: "2026-09-07T09:00:00+05:30",
      pilotEndAt: "2026-09-21T17:00:00+05:30",
      dependencyLeadTimeDays: 5,
    },
    sandbox: {
      datasetVersion: "synthetic-waste-v1",
      apiContractVersion: "waste-events-openapi/1.0",
      egress: "DENY_ALL",
      retentionHours: 24,
      testSuiteVersion: "waste-pilot/1.0",
      usesProductionCitizenData: false,
      dataClassification: "PUBLIC",
    },
    milestones: [
      {
        id: "MS-1",
        name: "Sandbox benchmark",
        paymentPercent: 100,
        requiredMetricIds: ["MET-1"],
        requiredEvidenceTypes: ["TEST_RUN", "LIMITATIONS_NOTE"],
        acceptanceStatement:
          "Accept when the metric target passes and both evidence artifacts are reviewed.",
      },
    ],
    requirements: {
      accessibility: "Meet WCAG 2.2 AA checks for every user-facing pilot workflow.",
      interoperability: "Expose versioned open API contracts and documented export formats.",
      exitAndPortability: "Export government-owned data and provide a documented transition package.",
      securityAndPrivacy: "Use synthetic data and provide access-control and security test evidence.",
      grievanceRoute: "Publish one clarification channel with response windows and review ownership.",
    },
    governance: {
      policyPackVersion: "demo-maharashtra-innovation/0.1",
      requiredApproverRoles: ["PROBLEM_OWNER", "PROCUREMENT_REVIEWER"],
      publicationProfile: "PUBLIC_CHALLENGE_V1",
    },
    integrity: {
      frozenAt: null,
      contentHash: null,
    },
  };
}

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
