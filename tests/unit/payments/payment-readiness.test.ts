import { describe, expect, it } from "vitest";

import {
  assertPaymentTransition,
  createPaymentRequestSnapshot,
  evaluatePaymentReadiness,
  paymentStatusLabel,
  transitionPaymentRequest,
  type PaymentRequestSnapshot,
  type PaymentTransitionRequest,
} from "../../../src/modules/payments/payment-readiness";

const completePacket = {
  milestoneId: "milestone-1",
  milestoneStatus: "ACCEPTED" as const,
  milestoneAcceptanceId: "acceptance-1",
  milestoneAcceptanceMilestoneId: "milestone-1",
  requiredEvidenceIds: ["test-run", "limitations-note"],
  attachedEvidenceIds: ["limitations-note", "test-run"],
  evidenceMilestoneBindings: [
    { evidenceId: "test-run", milestoneId: "milestone-1" },
    { evidenceId: "limitations-note", milestoneId: "milestone-1" },
  ],
  invoiceReference: "invoice-demo-001",
  amountInPaise: 300_000_00,
  budgetReference: "budget-demo-001",
  beneficiaryReference: "beneficiary-masked-001",
};

function newRequest(
  integrationMode: "LIVE" | "SIMULATED" = "SIMULATED",
): PaymentRequestSnapshot {
  return createPaymentRequestSnapshot({
    requestId: "payment-request-1",
    integrationMode,
  });
}

function move(
  paymentRequest: PaymentRequestSnapshot,
  command: Omit<PaymentTransitionRequest, "paymentRequest">,
): PaymentRequestSnapshot {
  return transitionPaymentRequest({ paymentRequest, ...command });
}

describe("payment readiness", () => {
  it("accepts a complete milestone-bound, evidence-backed packet", () => {
    expect(evaluatePaymentReadiness(completePacket)).toEqual({
      ready: true,
      completenessPercent: 100,
      satisfiedChecks: 10,
      totalChecks: 10,
      findings: [],
    });
  });

  it("identifies exactly which evidence objects are missing", () => {
    const result = evaluatePaymentReadiness({
      ...completePacket,
      attachedEvidenceIds: ["test-run"],
      evidenceMilestoneBindings: [
        { evidenceId: "test-run", milestoneId: "milestone-1" },
      ],
    });

    expect(result.ready).toBe(false);
    expect(result.completenessPercent).toBe(90);
    expect(result.findings).toContainEqual({
      code: "REQUIRED_EVIDENCE_MISSING",
      message: "One or more required evidence objects are not attached.",
      missingIds: ["limitations-note"],
    });
  });

  it("rejects acceptance and evidence from another milestone", () => {
    const result = evaluatePaymentReadiness({
      ...completePacket,
      milestoneAcceptanceMilestoneId: "milestone-2",
      evidenceMilestoneBindings: [
        { evidenceId: "test-run", milestoneId: "milestone-1" },
        { evidenceId: "limitations-note", milestoneId: "milestone-2" },
      ],
    });

    expect(result.ready).toBe(false);
    expect(result.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "ACCEPTANCE_MILESTONE_MISMATCH" }),
        expect.objectContaining({
          code: "EVIDENCE_MILESTONE_BINDING_INVALID",
          affectedIds: ["limitations-note"],
        }),
      ]),
    );
  });

  it("keeps the old packet fields source-compatible but blocks unbound packets", () => {
    const legacyPacket = {
      milestoneStatus: completePacket.milestoneStatus,
      milestoneAcceptanceId: completePacket.milestoneAcceptanceId,
      requiredEvidenceIds: completePacket.requiredEvidenceIds,
      attachedEvidenceIds: completePacket.attachedEvidenceIds,
      invoiceReference: completePacket.invoiceReference,
      amountInPaise: completePacket.amountInPaise,
      budgetReference: completePacket.budgetReference,
      beneficiaryReference: completePacket.beneficiaryReference,
    };

    const result = evaluatePaymentReadiness(legacyPacket);

    expect(result.ready).toBe(false);
    expect(result.findings.map(({ code }) => code)).toEqual(
      expect.arrayContaining([
        "MILESTONE_REFERENCE_MISSING",
        "ACCEPTANCE_MILESTONE_MISMATCH",
        "EVIDENCE_MILESTONE_BINDING_INVALID",
      ]),
    );
  });
});

describe("payment state transitions", () => {
  it("blocks creation until the packet is ready", () => {
    expect(() =>
      move(newRequest(), {
        expectedState: "NOT_READY",
        to: "DRAFT",
        actorRole: "PILOT_REVIEWER",
        readiness: evaluatePaymentReadiness({
          ...completePacket,
          milestoneStatus: "EVIDENCE_SUBMITTED",
        }),
      }),
    ).toThrow("packet is ready");
  });

  it("makes finance-review submission reviewer-driven and approval finance-driven", () => {
    const draft = move(newRequest(), {
      expectedState: "NOT_READY",
      to: "DRAFT",
      actorRole: "PILOT_REVIEWER",
      readiness: evaluatePaymentReadiness(completePacket),
    });

    expect(() =>
      assertPaymentTransition({
        paymentRequest: draft,
        expectedState: "DRAFT",
        to: "FINANCE_REVIEW",
        actorRole: "FINANCE_OFFICER",
      }),
    ).toThrow("cannot move");

    const submitted = move(draft, {
      expectedState: "DRAFT",
      to: "FINANCE_REVIEW",
      actorRole: "PILOT_REVIEWER",
    });

    expect(() =>
      assertPaymentTransition({
        paymentRequest: submitted,
        expectedState: "FINANCE_REVIEW",
        to: "APPROVED",
        actorRole: "PILOT_REVIEWER",
      }),
    ).toThrow("cannot move");
  });

  it("preserves the request integration mode through a full payment cycle", () => {
    const initial = newRequest();
    const draft = move(initial, {
      expectedState: "NOT_READY",
      to: "DRAFT",
      actorRole: "PILOT_REVIEWER",
      readiness: evaluatePaymentReadiness(completePacket),
    });
    const submitted = move(draft, {
      expectedState: "DRAFT",
      to: "FINANCE_REVIEW",
      actorRole: "PILOT_REVIEWER",
    });
    const approved = move(submitted, {
      expectedState: "FINANCE_REVIEW",
      to: "APPROVED",
      actorRole: "FINANCE_OFFICER",
    });
    const adapterSubmitted = move(approved, {
      expectedState: "APPROVED",
      to: "ADAPTER_SUBMITTED",
      actorRole: "PAYMENT_ADAPTER",
      adapterIdempotencyKey: "payment-request-1:submit",
      adapterReplayKey: "adapter-event-1",
    });
    const processing = move(adapterSubmitted, {
      expectedState: "ADAPTER_SUBMITTED",
      to: "PROCESSING",
      actorRole: "PAYMENT_ADAPTER",
      adapterIdempotencyKey: "payment-request-1:submit",
      adapterReplayKey: "adapter-event-2",
    });
    const paid = move(processing, {
      expectedState: "PROCESSING",
      to: "PAID",
      actorRole: "PAYMENT_ADAPTER",
      adapterIdempotencyKey: "payment-request-1:submit",
      adapterReplayKey: "adapter-event-3",
    });

    expect(Object.isFrozen(initial)).toBe(true);
    expect(paid).toMatchObject({
      state: "PAID",
      integrationMode: "SIMULATED",
      adapterIdempotencyKey: "payment-request-1:submit",
    });
    expect(paid.adapterReplayReceipts).toHaveLength(3);
    expect(paymentStatusLabel(paid)).toBe("PAID · SIMULATED_FOR_DEMO");
    expect(paymentStatusLabel({ ...paid, integrationMode: "LIVE" })).toBe("PAID");
  });

  it("makes an exact adapter replay a no-op and rejects replay-key collisions", () => {
    const approved: PaymentRequestSnapshot = Object.freeze({
      ...newRequest(),
      state: "APPROVED",
    });
    const command = {
      paymentRequest: approved,
      expectedState: "APPROVED" as const,
      to: "ADAPTER_SUBMITTED" as const,
      actorRole: "PAYMENT_ADAPTER" as const,
      adapterIdempotencyKey: "payment-request-1:submit",
      adapterReplayKey: "adapter-event-1",
    };
    const submitted = transitionPaymentRequest(command);

    expect(
      transitionPaymentRequest({ ...command, paymentRequest: submitted }),
    ).toBe(submitted);
    expect(() =>
      transitionPaymentRequest({
        ...command,
        paymentRequest: submitted,
        expectedState: "ADAPTER_SUBMITTED",
        to: "PROCESSING",
      }),
    ).toThrow("replay key cannot be reused");
  });

  it("rejects a changed idempotency key and missing adapter keys", () => {
    const adapterSubmitted: PaymentRequestSnapshot = Object.freeze({
      ...newRequest(),
      state: "ADAPTER_SUBMITTED",
      adapterIdempotencyKey: "payment-request-1:submit",
    });

    expect(() =>
      move(adapterSubmitted, {
        expectedState: "ADAPTER_SUBMITTED",
        to: "PROCESSING",
        actorRole: "PAYMENT_ADAPTER",
        adapterIdempotencyKey: "changed-key",
        adapterReplayKey: "adapter-event-2",
      }),
    ).toThrow("idempotency key cannot change");

    expect(() =>
      move(adapterSubmitted, {
        expectedState: "ADAPTER_SUBMITTED",
        to: "PROCESSING",
        actorRole: "PAYMENT_ADAPTER",
      }),
    ).toThrow("idempotency key is required");
  });

  it("requires a reason for an adapter failure", () => {
    const processing: PaymentRequestSnapshot = Object.freeze({
      ...newRequest(),
      state: "PROCESSING",
      adapterIdempotencyKey: "payment-request-1:submit",
    });

    expect(() =>
      move(processing, {
        expectedState: "PROCESSING",
        to: "FAILED",
        actorRole: "PAYMENT_ADAPTER",
        adapterIdempotencyKey: "payment-request-1:submit",
        adapterReplayKey: "adapter-event-failed",
      }),
    ).toThrow("reason is required");
  });
});
