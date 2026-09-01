import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { POST as compileRoute } from "@/app/api/challenges/compile/route";
import { POST as freezeRoute } from "@/app/api/challenges/freeze/route";
import { verifyChallengeSpecContentHash } from "@/modules/challenges";

const intake = {
  problemStatement:
    "Bins overflow for hours before ward teams know, and the solution must use AI and Microsoft Azure for every alert.",
  department: "Urban Development Department",
  geography: "Pune, Maharashtra",
};

function post(path: string, body: unknown): NextRequest {
  return new NextRequest(`http://localhost${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function compiledSpecification(acceptedRemediationCodes: string[] = []) {
  const response = await compileRoute(
    post("/api/challenges/compile", { ...intake, acceptedRemediationCodes }),
  );
  expect(response.status).toBe(200);
  return (await response.json()).specification;
}

describe("Challenge Forge command routes", () => {
  it("rejects a freeze without explicit human authorization", async () => {
    const specification = await compiledSpecification(["MS-PROC-005"]);
    const response = await freezeRoute(
      post("/api/challenges/freeze", { specification, humanApproved: false }),
    );

    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain("Explicit human approval");
  });

  it("rejects a freeze while procurement findings remain open", async () => {
    const specification = await compiledSpecification();
    const response = await freezeRoute(
      post("/api/challenges/freeze", {
        specification,
        humanApproved: true,
        approverName: "Anjali Deshmukh",
      }),
    );

    expect(response.status).toBe(409);
    expect((await response.json()).findingCodes).toContain("MS-PROC-005");
  });

  it("freezes a remediated human-approved specification without publishing it", async () => {
    const specification = await compiledSpecification(["MS-PROC-005"]);
    const response = await freezeRoute(
      post("/api/challenges/freeze", {
        specification,
        humanApproved: true,
        approverName: "Anjali Deshmukh",
        satisfiedApproverRoles: ["PROBLEM_OWNER", "PROCUREMENT_REVIEWER"],
        frozenAt: "2026-09-01T10:00:00+05:30",
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("FROZEN_NOT_PUBLISHED");
    expect(body.humanAuthorizationRecorded).toBe(true);
    expect(body.contentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(verifyChallengeSpecContentHash(body.specification)).toBe(true);
  });

  it("rejects a freeze when a required approver role is missing", async () => {
    const specification = await compiledSpecification(["MS-PROC-005"]);
    const response = await freezeRoute(
      post("/api/challenges/freeze", {
        specification,
        humanApproved: true,
        approverName: "Anjali Deshmukh",
        satisfiedApproverRoles: ["PROBLEM_OWNER"],
        frozenAt: "2026-09-01T10:00:00+05:30",
      }),
    );

    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain("PROCUREMENT_REVIEWER");
  });
});
