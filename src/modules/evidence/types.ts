export const SYNTHETIC_DEMO_LABEL = "Synthetic demonstration data" as const;

export type EvidenceClassification =
  | "PUBLIC"
  | "INTERNAL"
  | "CONFIDENTIAL_BUSINESS"
  | "RESTRICTED";

export type EvidenceAssuranceLevel =
  | "AUTHORITY_ASSERTED"
  | "OFFICER_VERIFIED"
  | "SYSTEM_OBSERVED"
  | "THIRD_PARTY_ATTESTED"
  | "SELF_DECLARED"
  | "SIMULATED_FOR_DEMO";

export type EvidenceObjectKind =
  | "DATASET"
  | "TEST_RUN"
  | "LIMITATIONS_NOTE"
  | "TELEMETRY"
  | "OFFICER_OBSERVATION"
  | "ACCESSIBILITY_REPORT"
  | "SECURITY_REPORT";

export interface EvidenceObject {
  readonly id: string;
  readonly kind: EvidenceObjectKind;
  readonly displayName: string;
  readonly mediaType: string;
  readonly sizeBytes: number;
  readonly sha256: string;
  readonly classification: EvidenceClassification;
  readonly assuranceLevel: EvidenceAssuranceLevel;
  readonly sourceType: "CONTROLLED_RUN" | "HUMAN_UPLOAD" | "SYSTEM_EXPORT";
  readonly sourceReference: string;
  readonly synthetic: boolean;
  readonly displayLabel?: typeof SYNTHETIC_DEMO_LABEL;
}

export type MetricDirection = "GTE" | "LTE" | "EQ";

export interface MetricDefinition {
  readonly id: string;
  readonly version: string;
  readonly name: string;
  readonly unit: string;
  readonly direction: MetricDirection;
  readonly target: number;
  readonly minimumSampleSize: number;
  readonly datasetVersion: string;
  readonly calculatorVersion: string;
}

export interface MetricObservation {
  readonly id: string;
  readonly metricDefinitionId: string;
  readonly metricDefinitionVersion: string;
  readonly name: string;
  readonly value: number;
  readonly unit: string;
  readonly sampleSize: number;
  readonly datasetVersion: string;
  readonly calculatorVersion: string;
  readonly runId: string;
  readonly sourceEvidenceObjectIds: readonly string[];
  readonly quality: {
    readonly status: "PASS" | "FAIL";
    readonly issues: readonly string[];
  };
  readonly synthetic: boolean;
  readonly displayLabel?: typeof SYNTHETIC_DEMO_LABEL;
}

export interface SandboxRunRecord {
  readonly id: string;
  readonly manifestVersion: string;
  readonly datasetVersion: string;
  readonly calculatorVersion: string;
  readonly status: "COMPLETED" | "FAILED";
  readonly sourceEvidenceObjectIds: readonly string[];
  readonly synthetic: boolean;
  readonly displayLabel?: typeof SYNTHETIC_DEMO_LABEL;
}

export interface EvidenceClaim {
  readonly id: string;
  readonly subject: {
    readonly type: "PILOT" | "MILESTONE" | "SOLUTION" | "STARTUP";
    readonly id: string;
  };
  readonly predicate: string;
  readonly value: unknown;
  readonly assuranceLevel: EvidenceAssuranceLevel;
  readonly verificationMethod: "AUTOMATIC" | "MANUAL" | "HYBRID";
  readonly supportingEvidenceObjectIds: readonly string[];
  readonly supportingMetricObservationIds: readonly string[];
  readonly contradictingEvidenceObjectIds: readonly string[];
  readonly issuerId: string;
  readonly synthetic: boolean;
  readonly displayLabel?: typeof SYNTHETIC_DEMO_LABEL;
}

export interface MetricAcceptanceCriterion {
  readonly metricDefinitionId: string;
  readonly metricDefinitionVersion: string;
  readonly direction: MetricDirection;
  readonly target: number;
  readonly minimumSampleSize: number;
  readonly requiredDatasetVersion?: string;
  readonly requiredCalculatorVersion?: string;
}

export interface MilestoneDefinition {
  readonly id: string;
  readonly name: string;
  readonly requiredMetrics: readonly MetricAcceptanceCriterion[];
  readonly requiredEvidenceKinds: readonly EvidenceObjectKind[];
}

export type MetricEvaluationCode =
  | "TARGET_MET"
  | "TARGET_MISSED"
  | "METRIC_OBSERVATION_MISSING"
  | "METRIC_DEFINITION_VERSION_MISMATCH"
  | "DATASET_VERSION_MISMATCH"
  | "CALCULATOR_VERSION_MISMATCH"
  | "SAMPLE_SIZE_TOO_SMALL"
  | "QUALITY_CHECK_FAILED";

export interface MetricRequirementEvaluation {
  readonly metricDefinitionId: string;
  readonly observationId?: string;
  readonly passed: boolean;
  readonly code: MetricEvaluationCode;
  readonly explanation: string;
  readonly actualValue?: number;
  readonly target: number;
  readonly direction: MetricDirection;
}

export interface EvidenceRequirementEvaluation {
  readonly kind: EvidenceObjectKind;
  readonly passed: boolean;
  readonly matchingEvidenceObjectIds: readonly string[];
  readonly explanation: string;
}

export interface MilestoneAcceptanceEvaluation {
  readonly id: string;
  readonly milestoneId: string;
  readonly status: "READY_FOR_HUMAN_ACCEPTANCE" | "NOT_READY";
  readonly rulesSatisfied: boolean;
  readonly humanAuthorizationRequired: true;
  readonly automaticAcceptancePerformed: false;
  readonly metricEvaluations: readonly MetricRequirementEvaluation[];
  readonly evidenceEvaluations: readonly EvidenceRequirementEvaluation[];
  readonly blockerCodes: readonly string[];
  readonly summary: string;
}

export type EvidenceLineageNode =
  | {
      readonly id: string;
      readonly type: "EVIDENCE_OBJECT";
      readonly label: string;
      readonly evidenceKind: EvidenceObjectKind;
      readonly synthetic: boolean;
    }
  | {
      readonly id: string;
      readonly type: "SANDBOX_RUN";
      readonly label: string;
      readonly synthetic: boolean;
    }
  | {
      readonly id: string;
      readonly type: "METRIC_OBSERVATION";
      readonly label: string;
      readonly value: number;
      readonly unit: string;
      readonly synthetic: boolean;
    }
  | {
      readonly id: string;
      readonly type: "EVIDENCE_CLAIM";
      readonly label: string;
      readonly synthetic: boolean;
    }
  | {
      readonly id: string;
      readonly type: "MILESTONE_EVALUATION";
      readonly label: string;
      readonly status: MilestoneAcceptanceEvaluation["status"];
      readonly synthetic: boolean;
    };

export type EvidenceLineageRelationship =
  | "INPUT_TO_RUN"
  | "PRODUCED_METRIC"
  | "SUPPORTS_CLAIM"
  | "CONTRADICTS_CLAIM"
  | "INFORMS_MILESTONE_EVALUATION";

export interface EvidenceLineageEdge {
  readonly from: string;
  readonly to: string;
  readonly relationship: EvidenceLineageRelationship;
}

export interface EvidenceLineageGraph {
  readonly nodes: readonly EvidenceLineageNode[];
  readonly edges: readonly EvidenceLineageEdge[];
}
