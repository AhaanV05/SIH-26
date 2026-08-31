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

export type EvidenceMilestoneBinding = Readonly<{
  evidenceId: string;
  milestoneId: string;
}>;

/**
 * The ownership fields extend the original packet shape without making existing
 * callers fail to compile. A packet is not ready, however, until those fields
 * prove that its acceptance and attached evidence belong to its milestone.
 */
export type PaymentPacketInput = Readonly<{
  milestoneId?: string;
  milestoneStatus: "PLANNED" | "EVIDENCE_SUBMITTED" | "ACCEPTED" | "REJECTED";
  milestoneAcceptanceId?: string;
  milestoneAcceptanceMilestoneId?: string;
  requiredEvidenceIds: readonly string[];
  attachedEvidenceIds: readonly string[];
  evidenceMilestoneBindings?: readonly EvidenceMilestoneBinding[];
  invoiceReference?: string;
  amountInPaise?: number;
  budgetReference?: string;
  beneficiaryReference?: string;
}>;

export type PaymentReadinessCode =
  | "MILESTONE_REFERENCE_MISSING"
  | "MILESTONE_NOT_ACCEPTED"
  | "ACCEPTANCE_RECORD_MISSING"
  | "ACCEPTANCE_MILESTONE_MISMATCH"
  | "REQUIRED_EVIDENCE_MISSING"
  | "EVIDENCE_MILESTONE_BINDING_INVALID"
  | "INVOICE_REFERENCE_MISSING"
  | "INVALID_AMOUNT"
  | "BUDGET_REFERENCE_MISSING"
  | "BENEFICIARY_REFERENCE_MISSING";

export type PaymentReadinessFinding = Readonly<{
  code: PaymentReadinessCode;
  message: string;
  missingIds?: readonly string[];
  affectedIds?: readonly string[];
}>;

export type PaymentReadiness = Readonly<{
  ready: boolean;
  completenessPercent: number;
  satisfiedChecks: number;
  totalChecks: number;
  findings: readonly PaymentReadinessFinding[];
}>;

const TOTAL_READINESS_CHECKS = 10;

function hasValue(value: string | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

export function evaluatePaymentReadiness(
  packet: PaymentPacketInput,
): PaymentReadiness {
  const findings: PaymentReadinessFinding[] = [];
  const milestoneId = packet.milestoneId?.trim();

  if (!hasValue(packet.milestoneId)) {
    findings.push({
      code: "MILESTONE_REFERENCE_MISSING",
      message: "A target milestone reference is required.",
    });
  }

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

  if (
    !hasValue(packet.milestoneAcceptanceMilestoneId) ||
    !milestoneId ||
    packet.milestoneAcceptanceMilestoneId.trim() !== milestoneId
  ) {
    findings.push({
      code: "ACCEPTANCE_MILESTONE_MISMATCH",
      message: "The acceptance record must be bound to the target milestone.",
    });
  }

  const attached = new Set(packet.attachedEvidenceIds);
  const missingEvidence = unique(
    packet.requiredEvidenceIds.filter((id) => !attached.has(id)),
  );
  if (missingEvidence.length > 0) {
    findings.push({
      code: "REQUIRED_EVIDENCE_MISSING",
      message: "One or more required evidence objects are not attached.",
      missingIds: Object.freeze(missingEvidence),
    });
  }

  const evidenceBindings = packet.evidenceMilestoneBindings ?? [];
  const invalidEvidenceBindings = unique(packet.attachedEvidenceIds).filter(
    (evidenceId) => {
      const matchingBindings = evidenceBindings.filter(
        (binding) => binding.evidenceId === evidenceId,
      );

      return (
        !milestoneId ||
        matchingBindings.length !== 1 ||
        matchingBindings[0]?.milestoneId.trim() !== milestoneId
      );
    },
  );
  if (invalidEvidenceBindings.length > 0) {
    findings.push({
      code: "EVIDENCE_MILESTONE_BINDING_INVALID",
      message: "Each attached evidence object must be bound once to the target milestone.",
      affectedIds: Object.freeze(invalidEvidenceBindings),
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

export type PaymentActorRole =
  | "PILOT_REVIEWER"
  | "FINANCE_OFFICER"
  | "PAYMENT_ADAPTER";

export type PaymentAdapterReplayReceipt = Readonly<{
  replayKey: string;
  idempotencyKey: string;
  expectedState: PaymentRequestState;
  to: PaymentRequestState;
  reason?: string;
}>;

/**
 * This is the persisted domain snapshot. Integration mode is chosen once when
 * the request is initialized and every transition preserves it.
 */
export type PaymentRequestSnapshot = Readonly<{
  requestId: string;
  state: PaymentRequestState;
  integrationMode: IntegrationMode;
  adapterIdempotencyKey: string | null;
  adapterReplayReceipts: readonly PaymentAdapterReplayReceipt[];
}>;

export type CreatePaymentRequestSnapshotInput = Readonly<{
  requestId: string;
  integrationMode: IntegrationMode;
}>;

export function createPaymentRequestSnapshot(
  input: CreatePaymentRequestSnapshotInput,
): PaymentRequestSnapshot {
  if (!hasValue(input.requestId) || input.requestId !== input.requestId.trim()) {
    throw new Error("A canonical payment request ID is required");
  }

  return Object.freeze({
    requestId: input.requestId,
    state: "NOT_READY",
    integrationMode: input.integrationMode,
    adapterIdempotencyKey: null,
    adapterReplayReceipts: Object.freeze([]),
  });
}

export type PaymentTransitionRequest = Readonly<{
  paymentRequest: PaymentRequestSnapshot;
  expectedState: PaymentRequestState;
  to: PaymentRequestState;
  actorRole: PaymentActorRole;
  readiness?: PaymentReadiness;
  reason?: string;
  adapterIdempotencyKey?: string;
  adapterReplayKey?: string;
}>;

export type PaymentTransitionDisposition = "APPLY" | "IDEMPOTENT_REPLAY";

function roleCanEnter(state: PaymentRequestState, role: PaymentActorRole): boolean {
  if (state === "DRAFT" || state === "FINANCE_REVIEW") {
    return role === "PILOT_REVIEWER";
  }

  if (["APPROVED", "RETURNED", "REJECTED"].includes(state)) {
    return role === "FINANCE_OFFICER";
  }

  return role === "PAYMENT_ADAPTER";
}

function isCanonicalKey(value: string | undefined): value is string {
  return hasValue(value) && value === value.trim();
}

function normalizedReason(reason: string | undefined): string | undefined {
  return hasValue(reason) ? reason.trim() : undefined;
}

function assertAdapterSafeguards(
  request: PaymentTransitionRequest,
): PaymentTransitionDisposition {
  const isAdapterCommand = request.actorRole === "PAYMENT_ADAPTER";
  const hasAdapterKey =
    request.adapterIdempotencyKey !== undefined ||
    request.adapterReplayKey !== undefined;

  if (!isAdapterCommand && hasAdapterKey) {
    throw new Error("Adapter keys are only valid for payment-adapter transitions");
  }

  if (!isAdapterCommand) return "APPLY";

  if (!isCanonicalKey(request.adapterIdempotencyKey)) {
    throw new Error("A canonical adapter idempotency key is required");
  }

  if (!isCanonicalKey(request.adapterReplayKey)) {
    throw new Error("A canonical adapter replay key is required");
  }

  const priorReceipt = request.paymentRequest.adapterReplayReceipts.find(
    (receipt) => receipt.replayKey === request.adapterReplayKey,
  );
  if (priorReceipt) {
    const isExactReplay =
      priorReceipt.idempotencyKey === request.adapterIdempotencyKey &&
      priorReceipt.expectedState === request.expectedState &&
      priorReceipt.to === request.to &&
      priorReceipt.reason === normalizedReason(request.reason);

    if (!isExactReplay) {
      throw new Error("An adapter replay key cannot be reused for a different command");
    }

    return "IDEMPOTENT_REPLAY";
  }

  if (
    request.paymentRequest.adapterIdempotencyKey !== null &&
    request.paymentRequest.adapterIdempotencyKey !== request.adapterIdempotencyKey
  ) {
    throw new Error("The adapter idempotency key cannot change for a payment request");
  }

  return "APPLY";
}

export function assertPaymentTransition(
  request: PaymentTransitionRequest,
): PaymentTransitionDisposition {
  const disposition = assertAdapterSafeguards(request);
  if (disposition === "IDEMPOTENT_REPLAY") return disposition;

  if (request.paymentRequest.state !== request.expectedState) {
    throw new Error(
      `Payment request is ${request.paymentRequest.state}; expected ${request.expectedState}`,
    );
  }

  if (!ALLOWED_TRANSITIONS[request.paymentRequest.state].includes(request.to)) {
    throw new Error(
      `Payment transition ${request.paymentRequest.state} -> ${request.to} is not allowed`,
    );
  }

  if (!roleCanEnter(request.to, request.actorRole)) {
    throw new Error(`${request.actorRole} cannot move a payment request to ${request.to}`);
  }

  if (
    request.to === "DRAFT" &&
    request.paymentRequest.state === "NOT_READY" &&
    !request.readiness?.ready
  ) {
    throw new Error("A payment request cannot be drafted until its packet is ready");
  }

  if (["RETURNED", "REJECTED", "FAILED"].includes(request.to) && !hasValue(request.reason)) {
    throw new Error(`A reason is required when moving a payment request to ${request.to}`);
  }

  return "APPLY";
}

export function transitionPaymentRequest(
  request: PaymentTransitionRequest,
): PaymentRequestSnapshot {
  const disposition = assertPaymentTransition(request);
  if (disposition === "IDEMPOTENT_REPLAY") return request.paymentRequest;

  const isAdapterCommand = request.actorRole === "PAYMENT_ADAPTER";
  const adapterIdempotencyKey = isAdapterCommand
    ? request.paymentRequest.adapterIdempotencyKey ?? request.adapterIdempotencyKey ?? null
    : request.paymentRequest.adapterIdempotencyKey;
  const adapterReplayReceipts = isAdapterCommand
    ? Object.freeze([
        ...request.paymentRequest.adapterReplayReceipts,
        Object.freeze({
          replayKey: request.adapterReplayKey as string,
          idempotencyKey: request.adapterIdempotencyKey as string,
          expectedState: request.expectedState,
          to: request.to,
          ...(normalizedReason(request.reason)
            ? { reason: normalizedReason(request.reason) }
            : {}),
        }),
      ])
    : request.paymentRequest.adapterReplayReceipts;

  return Object.freeze({
    requestId: request.paymentRequest.requestId,
    state: request.to,
    integrationMode: request.paymentRequest.integrationMode,
    adapterIdempotencyKey,
    adapterReplayReceipts,
  });
}

export function paymentStatusLabel(
  paymentRequest: Pick<PaymentRequestSnapshot, "state" | "integrationMode">,
): string {
  if (paymentRequest.integrationMode === "LIVE") return paymentRequest.state;
  return `${paymentRequest.state} · ${paymentRequest.integrationMode}_FOR_DEMO`;
}
