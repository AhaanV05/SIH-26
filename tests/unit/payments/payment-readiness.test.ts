import { describe, expect, it } from "vitest";

import {
  assertPaymentTransition,
  evaluatePaymentReadiness,
  paymentStatusLabel,
} from "../../../src/modules/payments/payment-readiness";

const completePacket = {
  milestoneStatus: "ACCEPTED" as const,
  milestoneAcceptanceId: "acceptance-1",
  requiredEvidenceIds: ["test-run", "limitations-note"],
  attachedEvidenceIds: ["limitations-note", "test-run"],
  invoiceReference: "invoice-demo-001",
  amountInPaise: 300_000_00,
  budgetReference: "budget-demo-001",
  beneficiaryReference: "beneficiary-masked-001",
};

describe("payment readiness", () => {
  it("accepts a complete evidence-backed packet", () => {
    expect(evaluatePaymentReadiness(completePacket)).toEqual({
      ready: true,
      completenessPercent: 100,
      satisfiedChecks: 7,
      totalChecks: 7,
      findings: [],
    });
  });

  it("identifies exactly which evidence objects are missing", () => {
    const result = evaluatePaymentReadiness({
      ...completePacket,
      attachedEvidenceIds: ["test-run"],
    });

    expect(result.ready).toBe(false);
    expect(result.completenessPercent).toBe(86);
    expect(result.findings).toContainEqual({
      code: "REQUIRED_EVIDENCE_MISSING",
      message: "One or more required evidence objects are not attached.",
      missingIds: ["limitations-note"],
    });
  });
});

describe("payment state transitions", () => {
  it("blocks creation until the packet is ready", () => {
    expect(() =>
      assertPaymentTransition({
        from: "NOT_READY",
        to: "DRAFT",
        actorRole: "PILOT_REVIEWER",
        integrationMode: "SIMULATED",
        readiness: evaluatePaymentReadiness({
          ...completePacket,
          milestoneStatus: "EVIDENCE_SUBMITTED",
        }),
      }),
    ).toThrow("packet is ready");
  });

  it("enforces finance authorization", () => {
    expect(() =>
      assertPaymentTransition({
        from: "FINANCE_REVIEW",
        to: "APPROVED",
        actorRole: "PILOT_REVIEWER",
        integrationMode: "SIMULATED",
      }),
    ).toThrow("cannot move");
  });

  it("requires reasons for failure states", () => {
    expect(() =>
      assertPaymentTransition({
        from: "PROCESSING",
        to: "FAILED",
        actorRole: "PAYMENT_ADAPTER",
        integrationMode: "SIMULATED",
      }),
    ).toThrow("reason is required");
  });

  it("labels non-live states unmistakably", () => {
    expect(paymentStatusLabel("PAID", "SIMULATED")).toBe(
      "PAID · SIMULATED_FOR_DEMO",
    );
    expect(paymentStatusLabel("PAID", "LIVE")).toBe("PAID");
  });
});
