import { NextRequest, NextResponse } from "next/server";

import {
  freezeChallengeSpec,
  hasBlockingProcurementFindings,
  lintChallengeSpec,
} from "@/modules/challenges";

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

export async function POST(request: NextRequest) {
  try {
    const input = (await request.json()) as Record<string, unknown>;
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      return NextResponse.json({ error: "Expected a JSON object" }, { status: 400 });
    }

    if (input.humanApproved !== true) {
      return NextResponse.json(
        { error: "Explicit human approval is required before freezing" },
        { status: 400 },
      );
    }

    const approverName = typeof input.approverName === "string" ? input.approverName.trim() : "";
    if (approverName.length < 3) {
      return NextResponse.json(
        { error: "The human approver name is required for the demo approval record" },
        { status: 400 },
      );
    }

    const findings = lintChallengeSpec(input.specification);
    if (hasBlockingProcurementFindings(findings)) {
      return NextResponse.json(
        {
          error: "Blocking procurement findings must be remediated before freezing",
          blockingFindingCodes: findings
            .filter((finding) => finding.severity === "BLOCKING")
            .map((finding) => finding.ruleCode),
        },
        { status: 409 },
      );
    }

    if (findings.length > 0) {
      return NextResponse.json(
        {
          error: "All procurement findings must be remediated before this demo version can be frozen",
          findingCodes: findings.map((finding) => finding.ruleCode),
        },
        { status: 409 },
      );
    }

    const frozenAt = typeof input.frozenAt === "string" ? input.frozenAt : "";
    const frozen = freezeChallengeSpec(input.specification, {
      frozenAt,
      satisfiedApproverRoles: strings(input.satisfiedApproverRoles),
      operatingMode: "DEMO",
    });

    return NextResponse.json(
      {
        status: "FROZEN_NOT_PUBLISHED",
        label: "SIMULATED_FOR_DEMO",
        approvedBy: approverName,
        humanAuthorizationRecorded: true,
        specification: frozen,
        contentHash: frozen.integrity.contentHash,
        notice: "Frozen for demo review. No tender was published and no external system was contacted.",
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to freeze challenge" },
      { status: 400 },
    );
  }
}
