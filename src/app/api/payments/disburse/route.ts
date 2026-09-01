import { NextResponse } from "next/server";
import { appendAuditEvent, type AuditEvent } from "@/modules/audit/audit-chain";
import {
  buildPaymentDisbursementAuthorizedAuditEvent,
  evaluatePaymentReadiness,
  type PaymentPacketInput,
} from "@/modules/payments";

const auditEventLog: AuditEvent[] = [];

function recordAuditEvent(
  eventInput: ReturnType<typeof buildPaymentDisbursementAuthorizedAuditEvent>,
): AuditEvent {
  const previous = auditEventLog[auditEventLog.length - 1];
  const event = appendAuditEvent(previous, eventInput);
  auditEventLog.push(event);
  return event;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const packet = body.packet as PaymentPacketInput;
    const actor = (body.actor as { id: string; role: string }) ?? {
      id: "USR-DDO-1",
      role: "DRAWING_DISBURSING_OFFICER",
    };
    const reason = body.reason as string | undefined;

    if (!packet) {
      return NextResponse.json(
        { success: false, error: "Missing required 'packet' in request body." },
        { status: 400 },
      );
    }

    if (
      actor.role !== "DRAWING_DISBURSING_OFFICER" &&
      actor.role !== "FINANCE_REVIEWER"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Only authorized DRAWING_DISBURSING_OFFICER or FINANCE_REVIEWER roles may disburse payments.",
        },
        { status: 403 },
      );
    }

    // Enforce 10-point deterministic readiness gate
    const readiness = evaluatePaymentReadiness(packet);
    if (!readiness.ready) {
      return NextResponse.json(
        {
          success: false,
          error: "Payment disbursement blocked: payment readiness checks failed.",
          readiness,
        },
        { status: 400 },
      );
    }

    // Execute simulated PFMS / SBI treasury disbursement adapter
    const transactionReference = `TXN-SBI-PFMS-${Date.now().toString(36).toUpperCase()}`;
    const disbursedAt = new Date().toISOString();

    const auditEvent = recordAuditEvent(
      buildPaymentDisbursementAuthorizedAuditEvent(
        {
          milestoneId: packet.milestoneId!,
          invoiceReference: packet.invoiceReference!,
          amountInPaise: packet.amountInPaise!,
          budgetReference: packet.budgetReference!,
          beneficiaryReference: packet.beneficiaryReference!,
          adapterMode: "SIMULATED",
          transactionReference,
          reason,
        },
        actor.id,
        undefined,
        disbursedAt,
      ),
    );

    return NextResponse.json({
      success: true,
      status: "PAID",
      transactionReference,
      disbursedAt,
      amountInRupees: (packet.amountInPaise! / 100).toFixed(2),
      humanAuthorized: true,
      autonomousDisbursement: false,
      auditEvent,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error processing payment disbursement",
      },
      { status: 500 },
    );
  }
}
