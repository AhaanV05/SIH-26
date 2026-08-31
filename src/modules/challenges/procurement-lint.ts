import type { ChallengeSpec, ChallengeSpecDraft, DeepPartial } from "./challenge-spec";

export const procurementLintSeverities = ["BLOCKING", "WARNING", "INFO"] as const;

export type ProcurementLintSeverity = (typeof procurementLintSeverities)[number];

export interface ProcurementLintFinding {
  readonly ruleCode: string;
  readonly severity: ProcurementLintSeverity;
  readonly path: string;
  readonly message: string;
  readonly explanation: string;
  readonly remediation: string;
  readonly evidence?: readonly string[];
}

export interface ProcurementLintRule {
  readonly code: string;
  readonly title: string;
  readonly defaultSeverity: ProcurementLintSeverity;
  readonly evaluate: (specification: ChallengeSpecDraft) => readonly ProcurementLintFinding[];
}

type PartialMetric = DeepPartial<ChallengeSpec["metrics"][number]>;
type PartialEligibility = DeepPartial<ChallengeSpec["eligibility"][number]>;
type PartialMilestone = DeepPartial<ChallengeSpec["milestones"][number]>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeDraft(input: unknown): ChallengeSpecDraft {
  return (isRecord(input) ? input : {}) as ChallengeSpecDraft;
}

function records<T>(value: unknown): DeepPartial<T>[] {
  return Array.isArray(value)
    ? (value.filter(isRecord) as DeepPartial<T>[])
    : [];
}

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function finiteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function finding(
  rule: Pick<ProcurementLintRule, "code" | "defaultSeverity">,
  path: string,
  message: string,
  explanation: string,
  remediation: string,
  overrides?: {
    readonly severity?: ProcurementLintSeverity;
    readonly evidence?: readonly string[];
  },
): ProcurementLintFinding {
  return {
    ruleCode: rule.code,
    severity: overrides?.severity ?? rule.defaultSeverity,
    path,
    message,
    explanation,
    remediation,
    ...(overrides?.evidence ? { evidence: overrides.evidence } : {}),
  };
}

const baselineRule: ProcurementLintRule = {
  code: "MS-PROC-001",
  title: "Measurable baseline",
  defaultSeverity: "BLOCKING",
  evaluate(specification) {
    const baselines = records(specification.problem?.baseline);
    if (baselines.length === 0) {
      return [
        finding(
          this,
          "problem.baseline",
          "The challenge has no measurable baseline.",
          "An outcome cannot be evaluated fairly without a documented starting point.",
          "Add at least one baseline value with its unit and evidence source.",
        ),
      ];
    }

    return baselines.flatMap((baseline, index) => {
      const issues: ProcurementLintFinding[] = [];
      if (!finiteNumber(baseline.value)) {
        issues.push(
          finding(
            this,
            `problem.baseline.${index}.value`,
            "Baseline value is missing or non-numeric.",
            "A machine-checkable baseline requires a finite numeric value.",
            "Provide the observed numeric value and retain its underlying evidence.",
          ),
        );
      }
      if (!hasText(baseline.unit) || !hasText(baseline.source)) {
        issues.push(
          finding(
            this,
            `problem.baseline.${index}`,
            "Baseline unit or source is missing.",
            "A number without a unit and provenance cannot be reproduced or compared.",
            "Specify both the measurement unit and a traceable source/version.",
          ),
        );
      }
      return issues;
    });
  },
};

const outcomeMetricRule: ProcurementLintRule = {
  code: "MS-PROC-002",
  title: "Outcome-to-metric linkage",
  defaultSeverity: "BLOCKING",
  evaluate(specification) {
    const outcomes = records<ChallengeSpec["outcomes"][number]>(specification.outcomes);
    const metrics = records<ChallengeSpec["metrics"][number]>(specification.metrics);
    const metricIds = new Set(metrics.map((metric) => metric.id).filter(hasText));

    if (outcomes.length === 0) {
      return [
        finding(
          this,
          "outcomes",
          "No desired outcome is defined.",
          "A challenge should state the public outcome it intends to improve.",
          "Add an outcome and link it to one or more measurable metric IDs.",
        ),
      ];
    }

    return outcomes.flatMap((outcome, index) => {
      const references = Array.isArray(outcome.metricIds) ? outcome.metricIds : [];
      if (references.length === 0) {
        return [
          finding(
            this,
            `outcomes.${index}.metricIds`,
            "Outcome is not linked to a metric.",
            "Unmeasured outcomes make proposal comparison and pilot acceptance subjective.",
            "Link the outcome to at least one metric with an explicit target.",
          ),
        ];
      }

      const unknown = references.filter(
        (reference): reference is string => hasText(reference) && !metricIds.has(reference),
      );
      return unknown.length > 0
        ? [
            finding(
              this,
              `outcomes.${index}.metricIds`,
              `Outcome references unknown metric IDs: ${unknown.join(", ")}.`,
              "Dangling metric references prevent the executable specification from being evaluated.",
              "Add the referenced metric definitions or remove the stale references.",
              { evidence: unknown },
            ),
          ]
        : [];
    });
  },
};

const metricMeasurabilityRule: ProcurementLintRule = {
  code: "MS-PROC-003",
  title: "Complete metric contract",
  defaultSeverity: "BLOCKING",
  evaluate(specification) {
    const metrics = records<ChallengeSpec["metrics"][number]>(specification.metrics);
    if (metrics.length === 0) {
      return [
        finding(
          this,
          "metrics",
          "No metrics are defined.",
          "The pilot cannot produce an objective acceptance decision without metrics.",
          "Define at least one metric with target, direction, unit, window, and source.",
        ),
      ];
    }

    return metrics.flatMap((metric: PartialMetric, index) => {
      const missing: string[] = [];
      if (!finiteNumber(metric.target)) missing.push("target");
      if (!hasText(metric.unit)) missing.push("unit");
      if (!hasText(metric.window)) missing.push("window");
      if (!hasText(metric.measurementSource)) missing.push("measurementSource");

      return missing.length > 0
        ? [
            finding(
              this,
              `metrics.${index}`,
              `Metric contract is missing: ${missing.join(", ")}.`,
              "Targets need a unit, observation window, and source to be reproducible.",
              "Complete every missing field and identify the versioned evidence source.",
              { evidence: missing },
            ),
          ]
        : [];
    });
  },
};

const rubricWeightRule: ProcurementLintRule = {
  code: "MS-PROC-004",
  title: "Frozen rubric arithmetic",
  defaultSeverity: "BLOCKING",
  evaluate(specification) {
    const rubric = records<ChallengeSpec["rubric"][number]>(specification.rubric);
    const weights = rubric.map((criterion) => criterion.weight).filter(finiteNumber);
    const total = weights.reduce((sum, weight) => sum + weight, 0);

    if (rubric.length === 0 || weights.length !== rubric.length || Math.abs(total - 100) > 1e-9) {
      return [
        finding(
          this,
          "rubric",
          `Evaluation weights must total 100; current total is ${total}.`,
          "Incomplete or inconsistent weights make scoring non-comparable and difficult to audit.",
          "Give every criterion a numeric weight and rebalance the total to exactly 100.",
        ),
      ];
    }

    return [];
  },
};

const prescriptiveLanguageRule: ProcurementLintRule = {
  code: "MS-PROC-005",
  title: "Vendor-lock-in and solution prescription",
  defaultSeverity: "WARNING",
  evaluate(specification) {
    const textSources: { path: string; text: string }[] = [];
    if (hasText(specification.problem?.title)) {
      textSources.push({ path: "problem.title", text: specification.problem.title });
    }
    if (hasText(specification.problem?.statement)) {
      textSources.push({ path: "problem.statement", text: specification.problem.statement });
    }
    records<ChallengeSpec["problem"]["constraints"][number]>(
      specification.problem?.constraints,
    ).forEach((constraint, index) => {
      if (hasText(constraint.statement) && !hasText(constraint.justification)) {
        textSources.push({
          path: `problem.constraints.${index}.statement`,
          text: constraint.statement,
        });
      }
    });

    const pattern =
      /\b(must use|only acceptable|built (?:exclusively )?(?:on|with)|aws|microsoft azure|oracle|sap|mongodb|postgresql|hyperledger|polygon blockchain)\b/gi;

    return textSources.flatMap(({ path, text }) => {
      const matches = [...text.matchAll(pattern)].map((match) => match[0]);
      return matches.length > 0
        ? [
            finding(
              this,
              path,
              `Potentially solution-prescriptive wording detected: ${[...new Set(matches)].join(", ")}.`,
              "Unjustified product or architecture mandates can exclude capable startups and create vendor lock-in.",
              "Rewrite this as an outcome/interoperability constraint, or record a specific necessity and reviewer-approved justification.",
              { evidence: [...new Set(matches)] },
            ),
          ]
        : [];
    });
  },
};

const startupBarrierRule: ProcurementLintRule = {
  code: "MS-PROC-006",
  title: "Startup barrier justification",
  defaultSeverity: "WARNING",
  evaluate(specification) {
    const criteria = records<ChallengeSpec["eligibility"][number]>(specification.eligibility);
    const barrierKinds = new Set(["PRIOR_EXPERIENCE", "TURNOVER", "EMD"]);

    return criteria.flatMap((criterion: PartialEligibility, index) => {
      if (
        criterion.mandatory === true &&
        hasText(criterion.kind) &&
        barrierKinds.has(criterion.kind) &&
        !hasText(criterion.justification)
      ) {
        return [
          finding(
            this,
            `eligibility.${index}.justification`,
            `Mandatory ${criterion.kind} criterion has no recorded justification.`,
            "Experience, turnover, and bid-security requirements can unintentionally exclude otherwise capable startups; their applicability is policy-specific.",
            "Review the selected policy pack, relax the criterion where authorized, or record a challenge-specific rationale for procurement review.",
          ),
        ];
      }
      return [];
    });
  },
};

const verifiableEligibilityRule: ProcurementLintRule = {
  code: "MS-PROC-007",
  title: "Verifiable eligibility",
  defaultSeverity: "BLOCKING",
  evaluate(specification) {
    const criteria = records<ChallengeSpec["eligibility"][number]>(specification.eligibility);
    return criteria.flatMap((criterion: PartialEligibility, index) => {
      const acceptedEvidence = Array.isArray(criterion.acceptedEvidence)
        ? criterion.acceptedEvidence
        : [];
      if (acceptedEvidence.length === 0 && !hasText(criterion.verificationMethod)) {
        return [
          finding(
            this,
            `eligibility.${index}`,
            "Eligibility criterion has no accepted evidence or verification method.",
            "A criterion that cannot be objectively checked invites inconsistent eligibility decisions.",
            "List accepted assurance levels and/or document a deterministic verification method.",
          ),
        ];
      }
      return [];
    });
  },
};

const timelineRule: ProcurementLintRule = {
  code: "MS-PROC-008",
  title: "Feasible timeline",
  defaultSeverity: "WARNING",
  evaluate(specification) {
    const timeline = specification.timeline;
    if (!isRecord(timeline)) {
      return [
        finding(
          this,
          "timeline",
          "No application and pilot timeline is defined.",
          "Startups and reviewers need predictable windows, and dependency feasibility cannot otherwise be checked.",
          "Add application open/close and pilot start/end timestamps plus known dependency lead time.",
        ),
      ];
    }

    if (
      !hasText(timeline.pilotStartAt) ||
      !hasText(timeline.pilotEndAt) ||
      !finiteNumber(timeline.dependencyLeadTimeDays)
    ) {
      return [];
    }

    const durationDays =
      (Date.parse(timeline.pilotEndAt) - Date.parse(timeline.pilotStartAt)) /
      (24 * 60 * 60 * 1_000);
    if (Number.isFinite(durationDays) && durationDays < timeline.dependencyLeadTimeDays) {
      return [
        finding(
          this,
          "timeline.pilotEndAt",
          `Pilot window is ${durationDays} days but dependencies require ${timeline.dependencyLeadTimeDays} days.`,
          "A pilot shorter than its external lead times is unlikely to produce fair outcome evidence.",
          "Extend the pilot window, reduce dependencies, or document an approved pre-pilot dependency plan.",
          { severity: "BLOCKING" },
        ),
      ];
    }

    return [];
  },
};

const productionDataRule: ProcurementLintRule = {
  code: "MS-PROC-009",
  title: "Production citizen-data governance",
  defaultSeverity: "BLOCKING",
  evaluate(specification) {
    if (specification.sandbox?.usesProductionCitizenData !== true) {
      return [];
    }

    const missing = [
      !hasText(specification.sandbox.dataOwner) ? "dataOwner" : null,
      !hasText(specification.sandbox.legalBasis) ? "legalBasis" : null,
    ].filter((field): field is string => field !== null);

    return missing.length > 0
      ? [
          finding(
            this,
            "sandbox",
            `Production citizen data is requested without: ${missing.join(", ")}.`,
            "Sensitive pilot data requires accountable ownership and a verified lawful purpose before access is designed.",
            "Use synthetic data for the demo, or add an authorized data owner and reviewed legal basis before publication.",
            { evidence: missing },
          ),
        ]
      : [];
  },
};

const milestonePaymentRule: ProcurementLintRule = {
  code: "MS-PROC-010",
  title: "Milestone payment allocation",
  defaultSeverity: "WARNING",
  evaluate(specification) {
    const milestones = records<ChallengeSpec["milestones"][number]>(specification.milestones);
    const percentages = milestones
      .map((milestone: PartialMilestone) => milestone.paymentPercent)
      .filter(finiteNumber);
    const total = percentages.reduce((sum, percentage) => sum + percentage, 0);

    if (milestones.length === 0 || percentages.length !== milestones.length) {
      return [
        finding(
          this,
          "milestones",
          "One or more milestones lack a payment percentage.",
          "An incomplete allocation makes startup cash-flow and finance review unpredictable.",
          "Assign each milestone a payment percentage, including zero where payment is intentionally not linked.",
        ),
      ];
    }

    if (Math.abs(total - 100) > 1e-9) {
      return [
        finding(
          this,
          "milestones",
          `Milestone payment percentages total ${total}, not 100.`,
          total > 100
            ? "The contract promises more than the available payment allocation."
            : "Part of the payment allocation is not tied to a visible acceptance milestone.",
          "Rebalance milestone percentages to 100 or explicitly model the non-milestone allocation.",
          { severity: total > 100 ? "BLOCKING" : "WARNING" },
        ),
      ];
    }

    return [];
  },
};

function requiredClauseRule(
  code: string,
  title: string,
  field: keyof NonNullable<ChallengeSpecDraft["requirements"]>,
  message: string,
  explanation: string,
  remediation: string,
  severity: ProcurementLintSeverity = "WARNING",
): ProcurementLintRule {
  return {
    code,
    title,
    defaultSeverity: severity,
    evaluate(specification) {
      return hasText(specification.requirements?.[field])
        ? []
        : [
            finding(
              this,
              `requirements.${field}`,
              message,
              explanation,
              remediation,
            ),
          ];
    },
  };
}

const accessibilityRule = requiredClauseRule(
  "MS-PROC-011",
  "Accessibility requirement",
  "accessibility",
  "Accessibility requirements are missing.",
  "Public digital services must be usable by people with disabilities and across assisted channels.",
  "Add testable accessibility expectations, including the applicable standard and evidence type.",
);

const interoperabilityRule = requiredClauseRule(
  "MS-PROC-012",
  "Interoperability requirement",
  "interoperability",
  "Interoperability requirements are missing.",
  "Undefined interfaces make integration effort and future reuse difficult to evaluate.",
  "Specify open data/API formats, versioning expectations, and required integration boundaries.",
);

const exitRule = requiredClauseRule(
  "MS-PROC-013",
  "Exit and portability requirement",
  "exitAndPortability",
  "An exit and portability clause is missing.",
  "Government data and service continuity should not depend on an avoidable vendor lock-in.",
  "Specify export format, data ownership, transition artifacts, and an exit rehearsal or handover requirement.",
);

const securityRule = requiredClauseRule(
  "MS-PROC-014",
  "Security and privacy requirement",
  "securityAndPrivacy",
  "Security and privacy requirements are missing.",
  "Startups cannot price or demonstrate safeguards fairly when the security evidence expected is undefined.",
  "Add proportionate, testable security/privacy controls and the evidence required during the pilot.",
  "BLOCKING",
);

const grievanceRule = requiredClauseRule(
  "MS-PROC-015",
  "Clarification and grievance route",
  "grievanceRoute",
  "No clarification or grievance route is defined.",
  "A fair challenge must provide a consistent way to ask questions and contest process errors.",
  "Name the channel, responsible role, response window, and visibility rules for clarifications and grievances.",
  "BLOCKING",
);

const egressRule: ProcurementLintRule = {
  code: "MS-PROC-016",
  title: "Sandbox network egress",
  defaultSeverity: "WARNING",
  evaluate(specification) {
    if (
      specification.sandbox?.egress === "ALLOW_LIST" &&
      !hasText(specification.sandbox.egressJustification)
    ) {
      return [
        finding(
          this,
          "sandbox.egressJustification",
          "Sandbox network egress is allowed without justification.",
          "Unbounded or unexplained network access increases data-exfiltration and supply-chain risk.",
          "Prefer DENY_ALL, or document each required destination and the reviewer-approved purpose.",
        ),
      ];
    }
    return [];
  },
};

export const procurementLintRules: readonly ProcurementLintRule[] = [
  baselineRule,
  outcomeMetricRule,
  metricMeasurabilityRule,
  rubricWeightRule,
  prescriptiveLanguageRule,
  startupBarrierRule,
  verifiableEligibilityRule,
  timelineRule,
  productionDataRule,
  milestonePaymentRule,
  accessibilityRule,
  interoperabilityRule,
  exitRule,
  securityRule,
  grievanceRule,
  egressRule,
];

export function lintChallengeSpec(input: unknown): readonly ProcurementLintFinding[] {
  const specification = normalizeDraft(input);
  return procurementLintRules.flatMap((rule) => rule.evaluate(specification));
}

export function hasBlockingProcurementFindings(
  findings: readonly ProcurementLintFinding[],
): boolean {
  return findings.some((item) => item.severity === "BLOCKING");
}

