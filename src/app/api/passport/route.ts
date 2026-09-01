import { NextRequest, NextResponse } from "next/server";

import {
  authorizePassportRead,
  demoActorForUserId,
  ecoScanPassportSummary,
  recordSimulatedOfficerVerification,
} from "@/modules/passport";
import { readSession } from "@/platform/session";

export async function GET(request: NextRequest) {
  const session = await readSession(request.cookies.get("sid")?.value);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const actor = demoActorForUserId(session.userId);
  if (!actor) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (actor.role === "FINANCE_OFFICER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const requestedStartupId = request.nextUrl.searchParams.get("startupId") ?? actor.startupId;
  if (!requestedStartupId) {
    return NextResponse.json({ error: "startupId is required" }, { status: 400 });
  }
  try {
    authorizePassportRead(actor, requestedStartupId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (requestedStartupId !== ecoScanPassportSummary.startupId) {
    return NextResponse.json({ error: "Passport not found" }, { status: 404 });
  }
  return NextResponse.json({ passport: ecoScanPassportSummary, persisted: false });
}

export async function POST(request: NextRequest) {
  const session = await readSession(request.cookies.get("sid")?.value);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const actor = demoActorForUserId(session.userId);
  if (!actor) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const rawBody: unknown = await request.json();
    if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) {
      return NextResponse.json({ error: "JSON body must be an object" }, { status: 400 });
    }
    const body = rawBody as Record<string, unknown>;
    if (typeof body.evidenceId !== "string") {
      return NextResponse.json({ error: "evidenceId is required" }, { status: 400 });
    }
    const evidence = ecoScanPassportSummary.evidence.find((item) => item.id === body.evidenceId);
    if (!evidence) return NextResponse.json({ error: "Evidence not found" }, { status: 404 });
    const verified = recordSimulatedOfficerVerification(
      evidence,
      actor,
      new Date().toISOString(),
      `SYN-OFFICER-${evidence.id}`,
    );
    return NextResponse.json({ evidence: verified, persisted: false, displayLabel: "SIMULATED_FOR_DEMO" });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Verification failed";
    if (message.startsWith("FORBIDDEN")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (message === "REVOKED_EVIDENCE_CANNOT_BE_VERIFIED") {
      return NextResponse.json({ error: "Revoked evidence cannot be verified" }, { status: 409 });
    }
    return NextResponse.json({ error: "Verification failed" }, { status: 400 });
  }
}
