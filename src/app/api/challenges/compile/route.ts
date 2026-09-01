import { NextRequest, NextResponse } from "next/server";

import { compileChallengeDraft } from "@/modules/compiler";
import { authorizeRouteRequest } from "@/platform/route-authorization";

export async function POST(request: NextRequest) {
  try {
    const authorization = await authorizeRouteRequest(request, ["PROBLEM_OWNER"]);
    if (!authorization.authorized) return authorization.response;

    const input = (await request.json()) as unknown;
    if (typeof input !== "object" || input === null || Array.isArray(input)) {
      return NextResponse.json({ error: "Expected a JSON object" }, { status: 400 });
    }

    const payload = input as Record<string, unknown>;
    const result = compileChallengeDraft({
      problemStatement: typeof payload.problemStatement === "string" ? payload.problemStatement : "",
      department: typeof payload.department === "string" ? payload.department : "",
      geography: typeof payload.geography === "string" ? payload.geography : "",
      acceptedRemediationCodes: Array.isArray(payload.acceptedRemediationCodes)
        ? payload.acceptedRemediationCodes.filter((value): value is string => typeof value === "string")
        : [],
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to compile challenge" },
      { status: 400 },
    );
  }
}
