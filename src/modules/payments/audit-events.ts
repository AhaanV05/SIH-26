import type { AuditEventInput } from "@/modules/audit/audit-chain";
import type { PaymentReadiness } from "./payment-readiness";

export function buildPaymentReadinessEvaluatedAuditEvent(
  milestoneId: string,
  readiness: PaymentReadiness,
  actorId: string,
  correlationId?: string,
  occurredAt?: string,
): AuditEventInput {
  return {
    id: `AUDIT-PAY-READY-${milestoneId}-${Date.now()}`,
    occurredAt: occurredAt ?? new Date().toISOString(),
    actor: {
      id: actorId,
      type: "USER",
      role: "FINANCE_REVIEWER",
    },
    action: "PAYMENT_READINESS_EVALUATED",
    entityType: "PAYMENT_REQUEST",
    entityId: milestoneId,
    correlationId: correlationId ?? `CORR-PAY-${milestoneId}`,
    reason: readiness.ready
      ? "All 10 deterministic payment readiness checks passed."
      : `Payment readiness incomplete: ${readiness.findings.length} findings identified.`,
    metadata: {
      milestoneId,
      ready: readiness.ready,
      completenessPercent: readiness.completenessPercent,
      satisfiedChecks: readiness.satisfiedChecks,
      totalChecks: readiness.totalChecks,
      findingsCount: readiness.findings.length,
      findingCodes: readiness.findings.map((f) => f.code),
    },
  };
}

export function buildPaymentDisbursementAuthorizedAuditEvent(
  input: {
    milestoneId: string;
    invoiceReference: string;
    amountInPaise: number;
    budgetReference: string;
    beneficiaryReference: string;
    adapterMode?: "SIMULATED" | "LIVE" | "SANDBOX";
    transactionReference?: string;
    reason?: string;
  },
  actorId: string,
  correlationId?: string,
  occurredAt?: string,
): AuditEventInput {
  return {
    id: `AUDIT-PAY-DISB-${input.milestoneId}-${Date.now()}`,
    occurredAt: occurredAt ?? new Date().toISOString(),
    actor: {
      id: actorId,
      type: "USER",
      role: "DRAWING_DISBURSING_OFFICER",
    },
    action: "PAYMENT_DISBURSEMENT_AUTHORIZED",
    entityType: "PAYMENT_DISBURSEMENT",
    entityId: input.milestoneId,
    correlationId: correlationId ?? `CORR-PAY-${input.milestoneId}`,
    reason: input.reason ?? "Milestone payment release authorized following verified evidence acceptance and treasury clearance.",
    metadata: {
      milestoneId: input.milestoneId,
      invoiceReference: input.invoiceReference,
      amountInPaise: input.amountInPaise,
      amountInRupees: (input.amountInPaise / 100).toFixed(2),
      budgetReference: input.budgetReference,
      beneficiaryReference: input.beneficiaryReference,
      adapterMode: input.adapterMode ?? "SIMULATED",
      transactionReference: input.transactionReference ?? `TXN-SBI-${Date.now()}`,
      humanAuthorized: true,
      autonomousPayment: false,
    },
  };
}
