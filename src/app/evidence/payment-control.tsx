"use client";

import { useMemo, useState } from "react";
import {
  createPaymentRequestSnapshot,
  evaluatePaymentReadiness,
  paymentStatusLabel,
  transitionPaymentRequest,
  type PaymentRequestSnapshot,
} from "@/modules/payments/payment-readiness";

const readiness = evaluatePaymentReadiness({
  milestoneId: "MS-SANDBOX-BENCHMARK",
  milestoneStatus: "ACCEPTED",
  milestoneAcceptanceId: "ACCEPTANCE-MS-001",
  milestoneAcceptanceMilestoneId: "MS-SANDBOX-BENCHMARK",
  requiredEvidenceIds: [
    "EVIDENCE-SANDBOX-TEST-RUN",
    "EVIDENCE-LIMITATIONS-NOTE",
  ],
  attachedEvidenceIds: [
    "EVIDENCE-SANDBOX-TEST-RUN",
    "EVIDENCE-LIMITATIONS-NOTE",
  ],
  evidenceMilestoneBindings: [
    {
      evidenceId: "EVIDENCE-SANDBOX-TEST-RUN",
      milestoneId: "MS-SANDBOX-BENCHMARK",
    },
    {
      evidenceId: "EVIDENCE-LIMITATIONS-NOTE",
      milestoneId: "MS-SANDBOX-BENCHMARK",
    },
  ],
  invoiceReference: "INVOICE-DEMO-001",
  amountInPaise: 250_000,
  budgetReference: "BUDGET-SIMULATED-001",
  beneficiaryReference: "BENEFICIARY-XXXX-001",
});

const ADAPTER_IDEMPOTENCY_KEY = "PAY-DEMO-001:SIMULATED";

function advance(snapshot: PaymentRequestSnapshot): PaymentRequestSnapshot {
  if (snapshot.state === "NOT_READY") {
    return transitionPaymentRequest({
      paymentRequest: snapshot,
      expectedState: "NOT_READY",
      to: "DRAFT",
      actorRole: "PILOT_REVIEWER",
      readiness,
    });
  }
  if (snapshot.state === "DRAFT") {
    return transitionPaymentRequest({
      paymentRequest: snapshot,
      expectedState: "DRAFT",
      to: "FINANCE_REVIEW",
      actorRole: "PILOT_REVIEWER",
    });
  }
  if (snapshot.state === "FINANCE_REVIEW") {
    return transitionPaymentRequest({
      paymentRequest: snapshot,
      expectedState: "FINANCE_REVIEW",
      to: "APPROVED",
      actorRole: "FINANCE_OFFICER",
    });
  }
  if (snapshot.state === "APPROVED") {
    return transitionPaymentRequest({
      paymentRequest: snapshot,
      expectedState: "APPROVED",
      to: "ADAPTER_SUBMITTED",
      actorRole: "PAYMENT_ADAPTER",
      adapterIdempotencyKey: ADAPTER_IDEMPOTENCY_KEY,
      adapterReplayKey: "REPLAY-SUBMIT-001",
    });
  }
  if (snapshot.state === "ADAPTER_SUBMITTED") {
    return transitionPaymentRequest({
      paymentRequest: snapshot,
      expectedState: "ADAPTER_SUBMITTED",
      to: "PROCESSING",
      actorRole: "PAYMENT_ADAPTER",
      adapterIdempotencyKey: ADAPTER_IDEMPOTENCY_KEY,
      adapterReplayKey: "REPLAY-PROCESSING-001",
    });
  }
  if (snapshot.state === "PROCESSING") {
    return transitionPaymentRequest({
      paymentRequest: snapshot,
      expectedState: "PROCESSING",
      to: "PAID",
      actorRole: "PAYMENT_ADAPTER",
      adapterIdempotencyKey: ADAPTER_IDEMPOTENCY_KEY,
      adapterReplayKey: "REPLAY-PAID-001",
    });
  }
  return snapshot;
}

const ACTION: Partial<Record<PaymentRequestSnapshot["state"], string>> = {
  NOT_READY: "Create payment-ready packet",
  DRAFT: "Submit to finance",
  FINANCE_REVIEW: "Approve as finance officer",
  APPROVED: "Send to simulated adapter",
  ADAPTER_SUBMITTED: "Simulate processing",
  PROCESSING: "Simulate paid confirmation",
};

export function PaymentControl() {
  const initial = useMemo(
    () =>
      createPaymentRequestSnapshot({
        requestId: "PAY-DEMO-001",
        integrationMode: "SIMULATED",
      }),
    [],
  );
  const [snapshot, setSnapshot] = useState(initial);
  const [message, setMessage] = useState(
    "The packet is complete, but no payment request exists until a reviewer acts.",
  );
  const action = ACTION[snapshot.state];

  const handleAdvance = () => {
    try {
      const updated = advance(snapshot);
      setSnapshot(updated);
      setMessage(`Recorded ${snapshot.state} → ${updated.state}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Payment transition failed.");
    }
  };

  return (
    <article className="panel panel--wide" aria-labelledby="payment-control-title">
      <div className="panel__heading">
        <div>
          <span className="eyebrow">Interactive PayFlow</span>
          <h2 id="payment-control-title">Payment readiness and status</h2>
        </div>
        <span className="status-badge status-badge--active">
          {paymentStatusLabel(snapshot)}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="metric-card metric-card--positive">
          <span>Packet completeness</span>
          <strong>{readiness.completenessPercent}%</strong>
          <p>{readiness.satisfiedChecks}/{readiness.totalChecks} deterministic checks passed.</p>
        </div>
        <div className="metric-card">
          <span>Integration mode</span>
          <strong>{snapshot.integrationMode}</strong>
          <p>Immutable for the lifetime of this payment request.</p>
        </div>
        <div className="metric-card">
          <span>Adapter receipts</span>
          <strong>{snapshot.adapterReplayReceipts.length}</strong>
          <p>Idempotent simulated external-status commands recorded.</p>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4" aria-live="polite">
        <strong>Latest action</strong>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{message}</p>
        <p className="mt-2 text-xs font-semibold text-[var(--color-text-secondary)]">
          SIMULATED_FOR_DEMO · No public funds are moved by this prototype.
        </p>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        {action ? (
          <button
            className="min-h-11 rounded-lg bg-[var(--color-accent)] px-5 py-2 font-semibold text-white"
            onClick={handleAdvance}
            type="button"
          >
            {action}
          </button>
        ) : null}
        <button
          className="min-h-11 rounded-lg border border-[var(--color-border)] px-5 py-2 font-semibold"
          onClick={() => {
            setSnapshot(initial);
            setMessage("Simulated request reset to NOT_READY.");
          }}
          type="button"
        >
          Reset simulated payment
        </button>
      </div>
    </article>
  );
}

