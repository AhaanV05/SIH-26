import { NextRequest, NextResponse } from "next/server";

import {
  freezeChallengeSpec,
  hasBlockingProcurementFindings,
  lintChallengeSpec,
} from "@/modules/challenges";
import { authorizeRouteRequest } from "@/platform/route-authorization";

const DEMO_SERVER_RECORDED_APPROVER_ROLES = [
  "PROBLEM_OWNER",
  "PROCUREMENT_REVIEWER",
] as const;

export async function POST(request: NextRequest) {
  try {
    const authorization = await authorizeRouteRequest(request, [
      "PROBLEM_OWNER",
      "PROCUREMENT_REVIEWER",
    ]);
    if (!authorization.authorized) return authorization.response;

    const input = (await request.json()) as Record<string, unknown>;
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      return NextResponse.json({ error: "Expected a JSON object" }, { status: 400 });
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

    const frozen = freezeChallengeSpec(input.specification, {
      frozenAt: new Date().toISOString(),
      satisfiedApproverRoles: DEMO_SERVER_RECORDED_APPROVER_ROLES,
      operatingMode: "DEMO",
    });

    return NextResponse.json(
      {
        status: "FROZEN_NOT_PUBLISHED",
        label: "SIMULATED_FOR_DEMO",
        approvedBy: authorization.user.name,
        approvedByUserId: authorization.actor.id,
        approvedByMembershipRole: authorization.actor.membershipRole,
        approvalBasis: "SIMULATED_FOR_DEMO_SERVER_FIXTURE",
        humanAuthorizationRecorded: true,
        specification: frozen,
        contentHash: frozen.integrity.contentHash,
        notice: "Frozen by an authenticated demo reviewer using server-recorded synthetic approval roles. No tender was published and no external system was contacted.",
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
