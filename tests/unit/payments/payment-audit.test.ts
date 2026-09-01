import { describe, expect, it } from "vitest";
import {
  appendAuditEvent,
  verifyAuditChain,
  type AuditEvent,
} from "@/modules/audit/audit-chain";
import {
  buildPaymentDisbursementAuthorizedAuditEvent,
  buildPaymentReadinessEvaluatedAuditEvent,
  evaluatePaymentReadiness,
  type PaymentPacketInput,
} from "@/modules/payments";

describe("Payment Audit Trail Integration", () => {
  it("records tamper-evident audit events for readiness evaluation and disbursement", () => {
    const chain: AuditEvent[] = [];

    const packet: PaymentPacketInput = {
      milestoneId: "MS-PUNE-01",
      milestoneStatus: "ACCEPTED",
      milestoneAcceptanceId: "ACC-MS-PUNE-01",
      milestoneAcceptanceMilestoneId: "MS-PUNE-01",
      requiredEvidenceIds: ["EVID-01", "EVID-02"],
      attachedEvidenceIds: ["EVID-01", "EVID-02"],
      evidenceMilestoneBindings: [
        { evidenceId: "EVID-01", milestoneId: "MS-PUNE-01" },
        { evidenceId: "EVID-02", milestoneId: "MS-PUNE-01" },
      ],
      invoiceReference: "INV-2026-001",
      amountInPaise: 25000000,
      budgetReference: "BUDGET-SAN-2026-W12",
      beneficiaryReference: "BENEF-ECOSCAN-01",
    };

    // 1. Payment Readiness Evaluation Event
    const readiness = evaluatePaymentReadiness(packet);
    expect(readiness.ready).toBe(true);

    const readinessEventInput = buildPaymentReadinessEvaluatedAuditEvent(
      "MS-PUNE-01",
      readiness,
      "USR-FIN-1",
      undefined,
      "2026-08-15T10:00:00.000Z",
    );
    const readinessEvent = appendAuditEvent(undefined, readinessEventInput);
    chain.push(readinessEvent);

    expect(readinessEvent.action).toBe("PAYMENT_READINESS_EVALUATED");
    expect(readinessEvent.sequence).toBe(1);

    // 2. Payment Disbursement Event
    const disbursementEventInput = buildPaymentDisbursementAuthorizedAuditEvent(
      {
        milestoneId: "MS-PUNE-01",
        invoiceReference: packet.invoiceReference!,
        amountInPaise: packet.amountInPaise!,
        budgetReference: packet.budgetReference!,
        beneficiaryReference: packet.beneficiaryReference!,
        adapterMode: "SIMULATED",
        transactionReference: "TXN-SBI-001",
      },
      "USR-DDO-1",
      undefined,
      "2026-08-15T11:00:00.000Z",
    );
    const disbursementEvent = appendAuditEvent(chain[chain.length - 1], disbursementEventInput);
    chain.push(disbursementEvent);

    expect(disbursementEvent.action).toBe("PAYMENT_DISBURSEMENT_AUTHORIZED");
    expect(disbursementEvent.sequence).toBe(2);
    expect(disbursementEvent.previousHash).toBe(readinessEvent.eventHash);

    // 3. Verify Chain Integrity
    const verification = verifyAuditChain(chain);
    expect(verification.valid).toBe(true);
    if (verification.valid) {
      expect(verification.checkedEvents).toBe(2);
    }
  });
});
