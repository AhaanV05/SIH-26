import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { authorizeRouteRequest } = vi.hoisted(() => ({
  authorizeRouteRequest: vi.fn(),
}));

vi.mock("@/platform/route-authorization", () => ({
  authorizeRouteRequest,
}));

import { POST as readinessPOST } from "@/app/api/payments/readiness/route";
import { POST as disbursePOST } from "@/app/api/payments/disburse/route";
import type { PaymentPacketInput } from "@/modules/payments";

const validPacket: PaymentPacketInput = {
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

describe("Payment API Routes (/api/payments/*)", () => {
  beforeEach(() => {
    authorizeRouteRequest.mockReset();
    authorizeRouteRequest.mockResolvedValue({
      authorized: true,
      user: { id: "USR-SUNITA-RANE", name: "Sunita Rane" },
      actor: {
        id: "USR-SUNITA-RANE",
        membershipRole: "FINANCE_OFFICER",
        organizationId: "ORG-GOV",
      },
    });
  });

  it("POST /api/payments/readiness returns readiness assessment and creates audit event", async () => {
    const request = new Request("http://localhost:3000/api/payments/readiness", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packet: validPacket, actorId: "USR-SPOOFED-FINANCE" }),
    });

    const response = await readinessPOST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.readiness.ready).toBe(true);
    expect(body.readiness.satisfiedChecks).toBe(10);
    expect(body.auditEvent).toBeDefined();
    expect(body.auditEvent.action).toBe("PAYMENT_READINESS_EVALUATED");
    expect(body.auditEvent.actor.id).toBe("USR-SUNITA-RANE");
    expect(body.auditEvent.actor.role).toBe("FINANCE_OFFICER");
  });

  it("POST /api/payments/disburse succeeds with authorized officer and full readiness", async () => {
    const request = new Request("http://localhost:3000/api/payments/disburse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        packet: validPacket,
        actor: { id: "USR-SPOOFED-STARTUP", role: "STARTUP_CONTRIBUTOR" },
        reason: "Disbursement approved following verification of Ward 12 sandbox milestone deliverables.",
      }),
    });

    const response = await disbursePOST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.status).toBe("PAID");
    expect(body.transactionReference).toMatch(/^TXN-SBI-PFMS-/);
    expect(body.humanAuthorized).toBe(true);
    expect(body.autonomousDisbursement).toBe(false);
    expect(body.auditEvent).toBeDefined();
    expect(body.auditEvent.action).toBe("PAYMENT_DISBURSEMENT_AUTHORIZED");
    expect(body.auditEvent.actor.id).toBe("USR-SUNITA-RANE");
    expect(body.auditEvent.actor.role).toBe("FINANCE_OFFICER");
  });

  it("POST /api/payments/disburse rejects unauthorized roles", async () => {
    authorizeRouteRequest.mockResolvedValueOnce({
      authorized: false,
      response: NextResponse.json(
        { success: false, error: "Insufficient permissions." },
        { status: 403 },
      ),
    });
    const request = new Request("http://localhost:3000/api/payments/disburse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        packet: validPacket,
        actor: { id: "USR-UNAUTH", role: "STARTUP_CONTRIBUTOR" },
      }),
    });

    const response = await disbursePOST(request);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.success).toBe(false);
  });

  it("POST /api/payments/readiness rejects a missing session", async () => {
    authorizeRouteRequest.mockResolvedValueOnce({
      authorized: false,
      response: NextResponse.json(
        { success: false, error: "Authentication required." },
        { status: 401 },
      ),
    });
    const response = await readinessPOST(new Request("http://localhost:3000/api/payments/readiness", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packet: validPacket }),
    }));

    expect(response.status).toBe(401);
  });

  it("POST /api/payments/disburse blocks incomplete payment packets", async () => {
    const incompletePacket: PaymentPacketInput = {
      ...validPacket,
      milestoneStatus: "PLANNED", // Not accepted
    };

    const request = new Request("http://localhost:3000/api/payments/disburse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        packet: incompletePacket,
        actor: { id: "USR-DDO-1", role: "DRAWING_DISBURSING_OFFICER" },
      }),
    });

    const response = await disbursePOST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.readiness.ready).toBe(false);
  });
});
