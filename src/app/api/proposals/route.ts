import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import {
  authorizeProposalRead,
  createProposalDraft,
  demoProposals,
  transitionProposal,
  type ProposalActor,
} from "@/modules/applications";
import { demoActorForUserId } from "@/modules/passport";
import { readSession } from "@/platform/session";

async function requestActor(request: NextRequest): Promise<ProposalActor | null> {
  const session = await readSession(request.cookies.get("sid")?.value);
  if (!session) return null;
  return demoActorForUserId(session.userId) as ProposalActor | null;
}

export async function GET(request: NextRequest) {
  const actor = await requestActor(request);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (actor.role === "FINANCE_OFFICER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const requestedId = request.nextUrl.searchParams.get("id");
  const candidates = requestedId ? demoProposals.filter((proposal) => proposal.id === requestedId) : demoProposals;
  if (requestedId && candidates.length === 0) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }

  const visible = candidates.filter((proposal) => {
    try {
      authorizeProposalRead(actor, proposal);
      return true;
    } catch {
      return false;
    }
  });
  if (requestedId && visible.length === 0) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json({ proposals: visible, persisted: false, displayLabel: "SIMULATED_FOR_DEMO" });
}

export async function POST(request: NextRequest) {
  const actor = await requestActor(request);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const rawBody: unknown = await request.json();
    if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) {
      return NextResponse.json({ error: "JSON body must be an object" }, { status: 400 });
    }
    const body = rawBody as Record<string, unknown>;
    const submit = body.submit === true;
    const draft = createProposalDraft(
      body,
      actor,
      `DEMO-${String(body.challengeId ?? "CHALLENGE")}-${actor.startupId ?? "STARTUP"}`,
    );
    const proposal = submit
      ? transitionProposal(draft, "SUBMITTED", actor, new Date().toISOString(), "PUBLISHED")
      : draft;
    return NextResponse.json(
      {
        proposal,
        persisted: false,
        notice: "Validated in the offline fixture adapter. Connect Prisma persistence before production use.",
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Validation failed", issues: error.issues }, { status: 400 });
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Proposal request failed";
    if (message.startsWith("FORBIDDEN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (message === "CHALLENGE_NOT_OPEN") {
      return NextResponse.json({ error: "Challenge is not open" }, { status: 409 });
    }
    return NextResponse.json({ error: "Proposal request failed" }, { status: 500 });
  }
}
