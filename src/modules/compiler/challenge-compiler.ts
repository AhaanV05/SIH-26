import {
  createChallengeSpecDraft,
  lintChallengeSpec,
  parseChallengeSpec,
  type ChallengeSpec,
  type ProcurementLintFinding,
} from "@/modules/challenges";

export const CHALLENGE_COMPILER_MODE = "OFFLINE_FIXTURE" as const;
export const CHALLENGE_COMPILER_LABEL = "SIMULATED_FOR_DEMO · OFFLINE_FIXTURE";

export interface CompileChallengeInput {
  readonly problemStatement: string;
  readonly department: string;
  readonly geography: string;
  readonly acceptedRemediationCodes?: readonly string[];
}

export interface CompilerFinding extends ProcurementLintFinding {
  readonly id: string;
}

export interface CompileChallengeResult {
  readonly mode: typeof CHALLENGE_COMPILER_MODE;
  readonly providerName: "MahaSetu deterministic fixture compiler";
  readonly label: typeof CHALLENGE_COMPILER_LABEL;
  readonly limitations: readonly string[];
  readonly specification: ChallengeSpec;
  readonly findings: readonly CompilerFinding[];
  readonly projections: {
    readonly publicBrief: string;
    readonly evaluationContract: string;
    readonly pilotContract: string;
    readonly interoperabilityRelease: string;
  };
}

const MIN_PROBLEM_LENGTH = 20;

function sentence(value: string): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return normalized;
  return /[.!?]$/.test(normalized) ? normalized : `${normalized}.`;
}

function outcomeRewrite(value: string): string {
  const withoutPrescriptions = value
    .replace(/\bmust use\s+(?:AI|artificial intelligence)\b/gi, "should improve service outcomes")
    .replace(/\b(?:microsoft\s+azure|aws|oracle|sap|mongodb|postgresql|hyperledger|polygon blockchain)\b/gi, "interoperable technology")
    .replace(/\bonly acceptable\b/gi, "measurably effective")
    .replace(/\bbuilt (?:exclusively )?(?:on|with)\b/gi, "compatible with");

  return sentence(withoutPrescriptions);
}

function inferTemplate(problemStatement: string): {
  readonly title: string;
  readonly affectedUsers: readonly string[];
  readonly baselineMetric: string;
  readonly baselineValue: number;
  readonly baselineUnit: string;
  readonly outcome: string;
  readonly metricName: string;
  readonly metricDirection: "GTE" | "LTE";
  readonly metricTarget: number;
  readonly metricUnit: string;
} {
  const normalized = problemStatement.toLowerCase();
  if (/waste|garbage|bin|sanitation/.test(normalized)) {
    return {
      title: "Reduce community-bin overflow events",
      affectedUsers: ["Residents", "Sanitation workers"],
      baselineMetric: "overflow_events_per_week",
      baselineValue: 42,
      baselineUnit: "events/week",
      outcome: "Detect overflow early enough for an operational collection response.",
      metricName: "detection_recall",
      metricDirection: "GTE",
      metricTarget: 0.9,
      metricUnit: "ratio",
    };
  }
  if (/traffic|congestion|transport|bus/.test(normalized)) {
    return {
      title: "Reduce delays in public mobility services",
      affectedUsers: ["Commuters", "Transport operations teams"],
      baselineMetric: "average_service_delay_minutes",
      baselineValue: 35,
      baselineUnit: "minutes",
      outcome: "Reduce average public-mobility service delay during the controlled pilot.",
      metricName: "average_service_delay_minutes",
      metricDirection: "LTE",
      metricTarget: 20,
      metricUnit: "minutes",
    };
  }
  if (/health|hospital|clinic|patient/.test(normalized)) {
    return {
      title: "Reduce delays in access to public health services",
      affectedUsers: ["Patients", "Public health workers"],
      baselineMetric: "average_service_wait_minutes",
      baselineValue: 75,
      baselineUnit: "minutes",
      outcome: "Reduce average wait time for the selected public health service.",
      metricName: "average_service_wait_minutes",
      metricDirection: "LTE",
      metricTarget: 45,
      metricUnit: "minutes",
    };
  }
  return {
    title: "Improve response time for a public service",
    affectedUsers: ["Residents", "Frontline government workers"],
    baselineMetric: "average_resolution_time_hours",
    baselineValue: 48,
    baselineUnit: "hours",
    outcome: "Reduce average resolution time for the selected public service request.",
    metricName: "average_resolution_time_hours",
    metricDirection: "LTE",
    metricTarget: 24,
    metricUnit: "hours",
  };
}

function validateInput(input: CompileChallengeInput): void {
  if (input.problemStatement.trim().length < MIN_PROBLEM_LENGTH) {
    throw new Error(`Problem statement must contain at least ${MIN_PROBLEM_LENGTH} characters`);
  }
  if (!input.department.trim()) {
    throw new Error("Department is required");
  }
  if (!input.geography.trim()) {
    throw new Error("Geography is required");
  }
}

function findingId(finding: ProcurementLintFinding, index: number): string {
  return `${finding.ruleCode}:${finding.path}:${index}`;
}

export function compileChallengeDraft(input: CompileChallengeInput): CompileChallengeResult {
  validateInput(input);

  const acceptedRemediations = new Set(input.acceptedRemediationCodes ?? []);
  const template = inferTemplate(input.problemStatement);
  const base = createChallengeSpecDraft();
  const problemStatement = acceptedRemediations.has("MS-PROC-005")
    ? outcomeRewrite(input.problemStatement)
    : sentence(input.problemStatement);

  const specification = parseChallengeSpec({
    ...base,
    status: "UNDER_REVIEW",
    problem: {
      ...base.problem,
      title: template.title,
      statement: problemStatement,
      affectedUsers: [...template.affectedUsers],
      geography: [input.geography.trim()],
      baseline: [
        {
          metric: template.baselineMetric,
          value: template.baselineValue,
          unit: template.baselineUnit,
          source: "synthetic-compiler-baseline-v1",
        },
      ],
      constraints: [
        {
          id: "CTX-DEPARTMENT-1",
          statement: `Department context: ${input.department.trim()}`,
          category: "OPERATIONAL",
          mandatory: false,
          justification: "Preserves the officer-provided context for human review.",
        },
      ],
    },
    outcomes: [
      {
        id: "OUT-1",
        statement: template.outcome,
        metricIds: ["MET-1"],
      },
    ],
    metrics: [
      {
        id: "MET-1",
        name: template.metricName,
        direction: template.metricDirection,
        target: template.metricTarget,
        unit: template.metricUnit,
        window: "synthetic-sandbox-dataset-v1",
        measurementSource: "synthetic-compiler-observations-v1",
        calculatorVersion: "mahasetu-compiler-metrics/1.0",
        minimumSampleSize: 100,
      },
    ],
    timeline: {
      applicationsOpenAt: "2026-09-05T09:00:00+05:30",
      applicationsCloseAt: "2026-09-05T17:00:00+05:30",
      pilotStartAt: "2026-09-07T09:00:00+05:30",
      pilotEndAt: "2026-09-21T17:00:00+05:30",
      dependencyLeadTimeDays: 1,
    },
  });

  const findings = lintChallengeSpec(specification).map((finding, index) => ({
    ...finding,
    id: findingId(finding, index),
  }));

  return {
    mode: CHALLENGE_COMPILER_MODE,
    providerName: "MahaSetu deterministic fixture compiler",
    label: CHALLENGE_COMPILER_LABEL,
    limitations: [
      "No live AI provider or government policy system was contacted.",
      "The generated specification requires authorized procurement review.",
      "Freezing approves an immutable demo version; it does not publish a tender.",
    ],
    specification,
    findings,
    projections: {
      publicBrief: `${template.title} · ${input.geography.trim()}`,
      evaluationContract: `${specification.rubric.length} frozen scoring criteria`,
      pilotContract: `${specification.metrics.length} metric · ${specification.milestones.length} milestone`,
      interoperabilityRelease: "OCDS-shaped release preview (not transmitted)",
    },
  };
}
