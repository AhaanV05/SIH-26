import { NextResponse } from "next/server";
import { appendAuditEvent, type AuditEvent } from "@/modules/audit/audit-chain";
import {
  buildPaymentReadinessEvaluatedAuditEvent,
  evaluatePaymentReadiness,
  type PaymentPacketInput,
} from "@/modules/payments";

const auditEventLog: AuditEvent[] = [];

function recordAuditEvent(
  eventInput: ReturnType<typeof buildPaymentReadinessEvaluatedAuditEvent>,
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
    const actorId = (body.actorId as string) ?? "USR-FINANCE-1";

    if (!packet) {
      return NextResponse.json(
        { success: false, error: "Missing required 'packet' in request body." },
        { status: 400 },
      );
    }

    const readiness = evaluatePaymentReadiness(packet);

    let auditEvent: AuditEvent | null = null;
    if (packet.milestoneId) {
      auditEvent = recordAuditEvent(
        buildPaymentReadinessEvaluatedAuditEvent(packet.milestoneId, readiness, actorId),
      );
    }

    return NextResponse.json({
      success: true,
      readiness,
      auditEvent,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error evaluating payment readiness",
      },
      { status: 400 },
    );
  }
}
