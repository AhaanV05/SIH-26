export type IntegrationMode =
  | "LIVE"
  | "SANDBOX"
  | "SIMULATED"
  | "OFFLINE_FIXTURE";

export type PaymentRequestState =
  | "NOT_READY"
  | "DRAFT"
  | "FINANCE_REVIEW"
  | "APPROVED"
  | "ADAPTER_SUBMITTED"
  | "PROCESSING"
  | "PAID"
  | "RETURNED"
  | "REJECTED"
  | "FAILED";

export type PaymentPacketInput = Readonly<{
  milestoneStatus: "PLANNED" | "EVIDENCE_SUBMITTED" | "ACCEPTED" | "REJECTED";
  milestoneAcceptanceId?: string;
  requiredEvidenceIds: readonly string[];
  attachedEvidenceIds: readonly string[];
  invoiceReference?: string;
  amountInPaise?: number;
  budgetReference?: string;
  beneficiaryReference?: string;
}>;

export type PaymentReadinessCode =
  | "MILESTONE_NOT_ACCEPTED"
  | "ACCEPTANCE_RECORD_MISSING"
  | "REQUIRED_EVIDENCE_MISSING"
  | "INVOICE_REFERENCE_MISSING"
  | "INVALID_AMOUNT"
  | "BUDGET_REFERENCE_MISSING"
  | "BENEFICIARY_REFERENCE_MISSING";

export type PaymentReadinessFinding = Readonly<{
  code: PaymentReadinessCode;
  message: string;
  missingIds?: readonly string[];
}>;

export type PaymentReadiness = Readonly<{
  ready: boolean;
  completenessPercent: number;
  satisfiedChecks: number;
  totalChecks: number;
  findings: readonly PaymentReadinessFinding[];
}>;

const TOTAL_READINESS_CHECKS = 7;

function hasValue(value: string | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function evaluatePaymentReadiness(
  packet: PaymentPacketInput,
): PaymentReadiness {
  const findings: PaymentReadinessFinding[] = [];

  if (packet.milestoneStatus !== "ACCEPTED") {
    findings.push({
      code: "MILESTONE_NOT_ACCEPTED",
      message: "The milestone must be accepted before a payment request can be created.",
    });
  }

  if (!hasValue(packet.milestoneAcceptanceId)) {
    findings.push({
      code: "ACCEPTANCE_RECORD_MISSING",
      message: "A milestone acceptance record is required.",
    });
  }

  const attached = new Set(packet.attachedEvidenceIds);
  const missingEvidence = packet.requiredEvidenceIds.filter((id) => !attached.has(id));
  if (missingEvidence.length > 0) {
    findings.push({
      code: "REQUIRED_EVIDENCE_MISSING",
      message: "One or more required evidence objects are not attached.",
      missingIds: missingEvidence,
    });
  }

  if (!hasValue(packet.invoiceReference)) {
    findings.push({
      code: "INVOICE_REFERENCE_MISSING",
      message: "An invoice reference is required.",
    });
  }

  if (
    packet.amountInPaise === undefined ||
    !Number.isSafeInteger(packet.amountInPaise) ||
    packet.amountInPaise <= 0
  ) {
    findings.push({
      code: "INVALID_AMOUNT",
      message: "The payment amount must be a positive integer number of paise.",
    });
  }

  if (!hasValue(packet.budgetReference)) {
    findings.push({
      code: "BUDGET_REFERENCE_MISSING",
      message: "A budget or fund reservation reference is required.",
    });
  }

  if (!hasValue(packet.beneficiaryReference)) {
    findings.push({
      code: "BENEFICIARY_REFERENCE_MISSING",
      message: "A masked or internal beneficiary reference is required.",
    });
  }

  const satisfiedChecks = TOTAL_READINESS_CHECKS - findings.length;
  return Object.freeze({
    ready: findings.length === 0,
    completenessPercent: Math.round((satisfiedChecks / TOTAL_READINESS_CHECKS) * 100),
    satisfiedChecks,
    totalChecks: TOTAL_READINESS_CHECKS,
    findings: Object.freeze(findings),
  });
}

const ALLOWED_TRANSITIONS: Readonly<Record<PaymentRequestState, readonly PaymentRequestState[]>> = {
  NOT_READY: ["DRAFT"],
  DRAFT: ["FINANCE_REVIEW"],
  FINANCE_REVIEW: ["APPROVED", "RETURNED", "REJECTED"],
  APPROVED: ["ADAPTER_SUBMITTED"],
  ADAPTER_SUBMITTED: ["PROCESSING", "FAILED"],
  PROCESSING: ["PAID", "FAILED"],
  PAID: [],
  RETURNED: ["DRAFT"],
  REJECTED: [],
  FAILED: ["ADAPTER_SUBMITTED", "RETURNED"],
};

export type PaymentTransitionRequest = Readonly<{
  from: PaymentRequestState;
  to: PaymentRequestState;
  actorRole: "PILOT_REVIEWER" | "FINANCE_OFFICER" | "PAYMENT_ADAPTER";
  integrationMode: IntegrationMode;
  readiness?: PaymentReadiness;
  reason?: string;
}>;

function roleCanEnter(
  state: PaymentRequestState,
  role: PaymentTransitionRequest["actorRole"],
): boolean {
  if (state === "DRAFT") return role === "PILOT_REVIEWER";
  if (["FINANCE_REVIEW", "APPROVED", "RETURNED", "REJECTED"].includes(state)) {
    return role === "FINANCE_OFFICER";
  }
  return role === "PAYMENT_ADAPTER";
}

export function assertPaymentTransition(request: PaymentTransitionRequest): void {
  if (!ALLOWED_TRANSITIONS[request.from].includes(request.to)) {
    throw new Error(`Payment transition ${request.from} -> ${request.to} is not allowed`);
  }

  if (!roleCanEnter(request.to, request.actorRole)) {
    throw new Error(`${request.actorRole} cannot move a payment request to ${request.to}`);
  }

  if (request.to === "DRAFT" && request.from === "NOT_READY" && !request.readiness?.ready) {
    throw new Error("A payment request cannot be drafted until its packet is ready");
  }

  if (["RETURNED", "REJECTED", "FAILED"].includes(request.to) && !hasValue(request.reason)) {
    throw new Error(`A reason is required when moving a payment request to ${request.to}`);
  }

  if (request.integrationMode !== "LIVE" && request.to === "PAID") {
    // The state is permitted for a demo timeline, but callers must preserve the mode.
    // Consumers must render this as a simulated completion, never a real payment claim.
    return;
  }
}

export function paymentStatusLabel(
  state: PaymentRequestState,
  integrationMode: IntegrationMode,
): string {
  if (integrationMode === "LIVE") return state;
  return `${state} · ${integrationMode}_FOR_DEMO`;
}
