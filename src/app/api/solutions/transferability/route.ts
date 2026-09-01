import { NextResponse } from "next/server";
import { appendAuditEvent, type AuditEvent } from "@/modules/audit/audit-chain";
import {
  assessTransferability,
  buildTransferabilityEvaluatedAuditEvent,
  type TransferabilityAssessmentInput,
} from "@/modules/solutions";

const auditEventLog: AuditEvent[] = [];

function recordAuditEvent(
  eventInput: ReturnType<typeof buildTransferabilityEvaluatedAuditEvent>,
): AuditEvent {
  const previous = auditEventLog[auditEventLog.length - 1];
  const event = appendAuditEvent(previous, eventInput);
  auditEventLog.push(event);
  return event;
}

const DEFAULT_FACTORS = [
  {
    key: "problemSimilarity" as const,
    score: 0.92,
    rationale: "Both contexts prioritize solid waste overflow response and prompt clearance.",
    evidenceIds: ["EVID-PROVEN-01"],
    gaps: [],
    constraint: "NONE" as const,
  },
  {
    key: "operatingContextFit" as const,
    score: 0.62,
    rationale: "Target field teams in Satara have intermittent cellular connectivity.",
    evidenceIds: ["EVID-FIELD-01"],
    gaps: ["Offline field synchronization must be validated locally."],
    constraint: "LOCALIZED_MICRO_PILOT_REQUIRED" as const,
  },
  {
    key: "dataFit" as const,
    score: 0.84,
    rationale: "Core bin telemetry and ward route fields map directly to target municipal schemas.",
    evidenceIds: ["EVID-SCHEMA-01"],
    gaps: [],
    constraint: "NONE" as const,
  },
  {
    key: "integrationFit" as const,
    score: 0.7,
    rationale: "A localized dispatch and notification adapter is required.",
    evidenceIds: ["EVID-ADAPTER-01"],
    gaps: ["Local SMS gateway binding needed."],
    constraint: "NONE" as const,
  },
  {
    key: "scaleFit" as const,
    score: 0.76,
    rationale: "Target transaction volume is well within proven sandbox operational parameters.",
    evidenceIds: ["EVID-PERF-01"],
    gaps: [],
    constraint: "NONE" as const,
  },
  {
    key: "evidenceStrength" as const,
    score: 0.9,
    rationale: "Versioned Pune sandbox and Ward 12 pilot benchmark evidence is available.",
    evidenceIds: ["EVID-PILOT-01"],
    gaps: [],
    constraint: "NONE" as const,
  },
  {
    key: "evidenceFreshness" as const,
    score: 0.94,
    rationale: "Evidence was generated and verified within the current 90-day cycle.",
    evidenceIds: ["EVID-AUDIT-01"],
    gaps: [],
    constraint: "NONE" as const,
  },
  {
    key: "localizationCostFit" as const,
    score: 0.6,
    rationale: "Marathi UI copy is pre-existing; offline edge sync testing adds minor localization effort.",
    evidenceIds: ["EVID-LOCAL-01"],
    gaps: [],
    constraint: "NONE" as const,
  },
];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const solutionCardId = searchParams.get("solutionCardId") ?? "SOLUTION-WASTE-001";
    const sourceContextId = searchParams.get("sourceContextId") ?? "DEPT-PUNE-SWM";
    const targetContextId = searchParams.get("targetContextId") ?? "DEPT-SATARA-SERVICES";

    const assessment = assessTransferability({
      assessmentId: `ASSESS-${targetContextId}-${Date.now().toString(36)}`,
      solutionCardId,
      sourceContextId,
      targetContextId,
      synthetic: true,
      displayLabel: "Synthetic demonstration data",
      factors: DEFAULT_FACTORS,
    });

    return NextResponse.json({
      success: true,
      assessment,
      auditEventsCount: auditEventLog.length,
      latestAuditHash: auditEventLog[auditEventLog.length - 1]?.eventHash ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to generate transferability assessment",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = body.assessmentInput as TransferabilityAssessmentInput;
    const actorId = (body.actorId as string) ?? "USR-SCALE-ANALYST-1";

    if (!input || !input.factors || input.factors.length === 0) {
      return NextResponse.json(
        { success: false, error: "Missing required 'assessmentInput' with factors." },
        { status: 400 },
      );
    }

    const assessment = assessTransferability(input);
    const auditEvent = recordAuditEvent(
      buildTransferabilityEvaluatedAuditEvent(assessment, actorId),
    );

    return NextResponse.json({
      success: true,
      assessment,
      auditEvent,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error evaluating transferability",
      },
      { status: 400 },
    );
  }
}
