import {
  SYNTHETIC_DEMO_LABEL,
  type MetricObservation,
} from "./types";

export const WASTE_METRIC_CALCULATOR = {
  id: "waste-metrics",
  version: "1.0.0",
} as const;

export interface WasteEventObservation {
  readonly id: string;
  readonly synthetic: true;
  readonly sourceLabel: typeof SYNTHETIC_DEMO_LABEL;
  readonly wardCode: string;
  readonly actualOverflow: boolean;
  readonly predictedOverflow: boolean;
  readonly priority: "LOW" | "MEDIUM" | "HIGH";
  readonly alertAt: string | null;
  readonly assignedAt: string | null;
}

export interface SyntheticWasteEventDataset {
  readonly metadata: {
    readonly fixtureId: string;
    readonly fixtureVersion: string;
    readonly datasetVersion: string;
    readonly fixtureType: "SYNTHETIC_FOR_DEMO_ONLY";
    readonly isSynthetic: true;
    readonly displayLabel: typeof SYNTHETIC_DEMO_LABEL;
    readonly containsPersonalData: false;
    readonly calculatorCompatibility: readonly string[];
    readonly windowStart: string;
    readonly windowEnd: string;
  };
  readonly observations: readonly WasteEventObservation[];
}

export interface ConfusionMatrix {
  readonly truePositive: number;
  readonly falsePositive: number;
  readonly trueNegative: number;
  readonly falseNegative: number;
}

export interface WasteMetricReport {
  readonly calculatorId: typeof WASTE_METRIC_CALCULATOR.id;
  readonly calculatorVersion: typeof WASTE_METRIC_CALCULATOR.version;
  readonly datasetVersion: string;
  readonly synthetic: true;
  readonly displayLabel: typeof SYNTHETIC_DEMO_LABEL;
  readonly classification: {
    readonly sampleSize: number;
    readonly matrix: ConfusionMatrix;
    readonly precision: number | null;
    readonly recall: number | null;
    readonly specificity: number | null;
    readonly f1Score: number | null;
    readonly accuracy: number | null;
  };
  readonly assignmentLatency: {
    readonly eligibleAlerts: number;
    readonly assignedAlerts: number;
    readonly unassignedAlerts: number;
    readonly latenciesMinutes: readonly number[];
    readonly medianMinutes: number | null;
    readonly p95Minutes: number | null;
    readonly handledWithinTargetMinutes: number;
    readonly handledWithinTargetCount: number;
    readonly handledWithinTargetRate: number | null;
  };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isIsoTimestamp = (value: unknown): value is string =>
  typeof value === "string" && Number.isFinite(Date.parse(value));

const round = (value: number, places = 6): number => {
  const factor = 10 ** places;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

const safeRatio = (numerator: number, denominator: number): number | null =>
  denominator === 0 ? null : round(numerator / denominator);

const median = (sortedValues: readonly number[]): number | null => {
  if (sortedValues.length === 0) return null;
  const middle = Math.floor(sortedValues.length / 2);
  if (sortedValues.length % 2 === 1) return round(sortedValues[middle]!);
  return round((sortedValues[middle - 1]! + sortedValues[middle]!) / 2);
};

const nearestRankPercentile = (
  sortedValues: readonly number[],
  percentile: number,
): number | null => {
  if (sortedValues.length === 0) return null;
  const rank = Math.max(1, Math.ceil(percentile * sortedValues.length));
  return round(sortedValues[rank - 1]!);
};

export function parseSyntheticWasteEventDataset(
  value: unknown,
): SyntheticWasteEventDataset {
  if (!isRecord(value) || !isRecord(value.metadata)) {
    throw new Error("Waste-event fixture must contain a metadata object.");
  }

  const metadata = value.metadata;
  if (
    metadata.fixtureType !== "SYNTHETIC_FOR_DEMO_ONLY" ||
    metadata.isSynthetic !== true ||
    metadata.displayLabel !== SYNTHETIC_DEMO_LABEL ||
    metadata.containsPersonalData !== false
  ) {
    throw new Error(
      "Waste-event fixture must be explicitly labeled as synthetic demonstration data with no personal data.",
    );
  }

  for (const field of ["fixtureId", "fixtureVersion", "datasetVersion"] as const) {
    if (typeof metadata[field] !== "string" || metadata[field].length === 0) {
      throw new Error(`Waste-event fixture metadata.${field} is required.`);
    }
  }

  if (!isIsoTimestamp(metadata.windowStart) || !isIsoTimestamp(metadata.windowEnd)) {
    throw new Error("Waste-event fixture window timestamps must be valid ISO timestamps.");
  }

  if (
    !Array.isArray(metadata.calculatorCompatibility) ||
    !metadata.calculatorCompatibility.includes(WASTE_METRIC_CALCULATOR.version)
  ) {
    throw new Error(
      `Waste-event fixture is not compatible with calculator ${WASTE_METRIC_CALCULATOR.version}.`,
    );
  }

  if (!Array.isArray(value.observations) || value.observations.length === 0) {
    throw new Error("Waste-event fixture must contain at least one observation.");
  }

  const seenIds = new Set<string>();
  value.observations.forEach((candidate, index) => {
    if (!isRecord(candidate)) {
      throw new Error(`Observation at index ${index} must be an object.`);
    }
    if (typeof candidate.id !== "string" || candidate.id.length === 0) {
      throw new Error(`Observation at index ${index} requires an id.`);
    }
    if (seenIds.has(candidate.id)) {
      throw new Error(`Duplicate observation id: ${candidate.id}.`);
    }
    seenIds.add(candidate.id);
    if (
      candidate.synthetic !== true ||
      candidate.sourceLabel !== SYNTHETIC_DEMO_LABEL
    ) {
      throw new Error(`Observation ${candidate.id} is not explicitly labeled synthetic.`);
    }
    if (
      typeof candidate.actualOverflow !== "boolean" ||
      typeof candidate.predictedOverflow !== "boolean"
    ) {
      throw new Error(`Observation ${candidate.id} requires boolean labels.`);
    }
    if (!["LOW", "MEDIUM", "HIGH"].includes(String(candidate.priority))) {
      throw new Error(`Observation ${candidate.id} has an invalid priority.`);
    }
    if (typeof candidate.wardCode !== "string" || candidate.wardCode.length === 0) {
      throw new Error(`Observation ${candidate.id} requires a wardCode.`);
    }
    if (candidate.predictedOverflow && !isIsoTimestamp(candidate.alertAt)) {
      throw new Error(`Predicted overflow ${candidate.id} requires alertAt.`);
    }
    if (!candidate.predictedOverflow && candidate.alertAt !== null) {
      throw new Error(`Non-alert observation ${candidate.id} must use null alertAt.`);
    }
    if (candidate.assignedAt !== null && !isIsoTimestamp(candidate.assignedAt)) {
      throw new Error(`Observation ${candidate.id} has an invalid assignedAt.`);
    }
    if (candidate.assignedAt !== null && candidate.alertAt === null) {
      throw new Error(`Observation ${candidate.id} cannot be assigned without an alert.`);
    }
    if (
      typeof candidate.alertAt === "string" &&
      typeof candidate.assignedAt === "string" &&
      Date.parse(candidate.assignedAt) < Date.parse(candidate.alertAt)
    ) {
      throw new Error(`Observation ${candidate.id} is assigned before its alert.`);
    }
  });

  return value as unknown as SyntheticWasteEventDataset;
}

export function calculateWasteMetrics(
  dataset: SyntheticWasteEventDataset,
  handledWithinTargetMinutes = 20,
): WasteMetricReport {
  if (!Number.isFinite(handledWithinTargetMinutes) || handledWithinTargetMinutes < 0) {
    throw new Error("Assignment target must be a non-negative finite number.");
  }

  const matrix = dataset.observations.reduce<ConfusionMatrix>(
    (current, observation) => {
      if (observation.actualOverflow && observation.predictedOverflow) {
        return { ...current, truePositive: current.truePositive + 1 };
      }
      if (!observation.actualOverflow && observation.predictedOverflow) {
        return { ...current, falsePositive: current.falsePositive + 1 };
      }
      if (!observation.actualOverflow && !observation.predictedOverflow) {
        return { ...current, trueNegative: current.trueNegative + 1 };
      }
      return { ...current, falseNegative: current.falseNegative + 1 };
    },
    { truePositive: 0, falsePositive: 0, trueNegative: 0, falseNegative: 0 },
  );

  const predictedAlerts = dataset.observations.filter(
    (observation) => observation.predictedOverflow,
  );
  const latenciesMinutes = predictedAlerts
    .filter(
      (observation): observation is WasteEventObservation & {
        alertAt: string;
        assignedAt: string;
      } => observation.alertAt !== null && observation.assignedAt !== null,
    )
    .map((observation) =>
      round((Date.parse(observation.assignedAt) - Date.parse(observation.alertAt)) / 60_000),
    )
    .sort((left, right) => left - right);

  const handledWithinTargetCount = latenciesMinutes.filter(
    (latency) => latency <= handledWithinTargetMinutes,
  ).length;
  const precision = safeRatio(
    matrix.truePositive,
    matrix.truePositive + matrix.falsePositive,
  );
  const recall = safeRatio(
    matrix.truePositive,
    matrix.truePositive + matrix.falseNegative,
  );
  const f1Score =
    precision === null || recall === null || precision + recall === 0
      ? null
      : round((2 * precision * recall) / (precision + recall));

  return {
    calculatorId: WASTE_METRIC_CALCULATOR.id,
    calculatorVersion: WASTE_METRIC_CALCULATOR.version,
    datasetVersion: dataset.metadata.datasetVersion,
    synthetic: true,
    displayLabel: SYNTHETIC_DEMO_LABEL,
    classification: {
      sampleSize: dataset.observations.length,
      matrix,
      precision,
      recall,
      specificity: safeRatio(
        matrix.trueNegative,
        matrix.trueNegative + matrix.falsePositive,
      ),
      f1Score,
      accuracy: safeRatio(
        matrix.truePositive + matrix.trueNegative,
        dataset.observations.length,
      ),
    },
    assignmentLatency: {
      eligibleAlerts: predictedAlerts.length,
      assignedAlerts: latenciesMinutes.length,
      unassignedAlerts: predictedAlerts.length - latenciesMinutes.length,
      latenciesMinutes,
      medianMinutes: median(latenciesMinutes),
      p95Minutes: nearestRankPercentile(latenciesMinutes, 0.95),
      handledWithinTargetMinutes,
      handledWithinTargetCount,
      handledWithinTargetRate: safeRatio(
        handledWithinTargetCount,
        predictedAlerts.length,
      ),
    },
  };
}

export function createWasteMetricObservations(
  report: WasteMetricReport,
  runId: string,
  sourceEvidenceObjectIds: readonly string[],
): MetricObservation[] {
  if (!runId) throw new Error("runId is required for metric lineage.");
  if (sourceEvidenceObjectIds.length === 0) {
    throw new Error("At least one source evidence object is required for metric lineage.");
  }

  const createObservation = (
    metricDefinitionId: string,
    name: string,
    value: number | null,
    unit: string,
    sampleSize: number,
  ): MetricObservation => ({
    id: `${runId}:${metricDefinitionId}`,
    metricDefinitionId,
    metricDefinitionVersion: "1.0.0",
    name,
    value: value ?? 0,
    unit,
    sampleSize,
    datasetVersion: report.datasetVersion,
    calculatorVersion: report.calculatorVersion,
    runId,
    sourceEvidenceObjectIds: [...sourceEvidenceObjectIds],
    quality: {
      status: value === null ? "FAIL" : "PASS",
      issues: value === null ? ["Metric denominator or sample was empty."] : [],
    },
    synthetic: true,
    displayLabel: SYNTHETIC_DEMO_LABEL,
  });

  return [
    createObservation(
      "MET-1",
      "detection_recall",
      report.classification.recall,
      "ratio",
      report.classification.sampleSize,
    ),
    createObservation(
      "MET-2",
      "median_assignment_minutes",
      report.assignmentLatency.medianMinutes,
      "minutes",
      report.assignmentLatency.assignedAlerts,
    ),
    createObservation(
      "MET-3",
      "detection_precision",
      report.classification.precision,
      "ratio",
      report.classification.sampleSize,
    ),
    createObservation(
      "MET-4",
      "alerts_assigned_within_target_rate",
      report.assignmentLatency.handledWithinTargetRate,
      "ratio",
      report.assignmentLatency.eligibleAlerts,
    ),
  ];
}
