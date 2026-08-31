import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockFindUnique = vi.fn();
const mockFindMany = vi.fn();
const mockUpsert = vi.fn();

vi.mock("@/platform/db/client", () => ({
  prisma: {
    challenge: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
    startupProfile: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
    },
    match: {
      upsert: (...args: unknown[]) => mockUpsert(...args),
    },
  },
}));

import { GET, POST } from "@/app/api/challenges/[id]/matches/route";

function createMatchRequest(
  url = "http://localhost/api/challenges/CHAL-PUNE-001/matches",
  method = "GET",
): NextRequest {
  return new NextRequest(url, {
    method,
    headers: { "content-type": "application/json" },
  });
}

describe("API Route: /api/challenges/[id]/matches", () => {
  const mockChallenge = {
    id: "CHAL-PUNE-001",
    processId: "PROC-PUNE-001",
    departmentId: "DEPT-PUNE",
    ownerId: "USR-ANJALI",
    title: "AI-Powered Waste Overflow Detection",
    problem: "Community bins overflow leading to civic complaints.",
    status: "PUBLISHED",
    version: 1,
    publishedAt: new Date("2026-07-01T10:00:00Z"),
    specVersions: [
      {
        id: "SPEC-001",
        version: 1,
        schemaVersion: "mahasetu.challenge/1.0",
        contentHash: "hash-001",
        document: {
          problem: {
            title: "AI-Powered Waste Overflow Detection",
            statement: "Community bins overflow leading to civic complaints.",
            affectedUsers: ["residents", "sanitation workers"],
            geography: ["Pune", "Maharashtra"],
          },
          outcomes: [
            { id: "OUT-1", metricIds: ["civic-ops.cv.overflow-detection"] },
            { id: "OUT-2", metricIds: ["civic-ops.logistics.route-optimization"] },
          ],
          eligibility: [
            {
              id: "EL-1",
              kind: "STARTUP_RECOGNITION",
              mandatory: true,
              acceptedEvidence: ["AUTHORITY_ASSERTED", "OFFICER_VERIFIED", "SIMULATED_FOR_DEMO"],
            },
            {
              id: "EL-2",
              kind: "SECURITY_READINESS",
              mandatory: true,
              acceptedEvidence: ["OFFICER_VERIFIED", "THIRD_PARTY_ATTESTED", "SYSTEM_OBSERVED"],
            },
          ],
        },
      },
    ],
  };

  const mockStartups = [
    {
      id: "ORG-ECOSCAN",
      organizationId: "ORG-ECOSCAN",
      summary: "Computer vision and route optimization for municipal waste.",
      deploymentModels: ["ON_PREMISE_GOVERNMENT_CLOUD", "HYBRID"],
      supportedLanguages: ["en", "mr"],
      capabilityCodes: ["civic-ops.cv.overflow-detection", "civic-ops.logistics.route-optimization"],
      organization: {
        id: "ORG-ECOSCAN",
        legalName: "EcoScan Intelligence Private Limited",
        displayName: "EcoScan Labs",
      },
      capabilities: [
        {
          id: "SC-1",
          proficiency: 5,
          capability: {
            code: "civic-ops.cv.overflow-detection",
            name: "Overflow Detection",
            taxonomyPath: "civic-ops.cv.overflow-detection",
          },
        },
        {
          id: "SC-2",
          proficiency: 4,
          capability: {
            code: "civic-ops.logistics.route-optimization",
            name: "Route Optimization",
            taxonomyPath: "civic-ops.logistics.route-optimization",
          },
        },
      ],
      credentialEvidence: [
        {
          id: "EV-1",
          type: "DPIIT_RECOGNITION",
          assuranceLevel: "AUTHORITY_ASSERTED",
          status: "VERIFIED",
          issuedAt: new Date("2024-01-01"),
          expiresAt: new Date("2027-01-01"),
          synthetic: true,
        },
        {
          id: "EV-2",
          type: "SECURITY_TEST_REPORT",
          assuranceLevel: "SYSTEM_OBSERVED",
          status: "VERIFIED",
          issuedAt: new Date("2026-01-01"),
          expiresAt: new Date("2027-01-01"),
          synthetic: true,
        },
      ],
    },
    {
      id: "ORG-SAHAYAK",
      organizationId: "ORG-SAHAYAK",
      summary: "Offline mobile app for field staff.",
      deploymentModels: ["EDGE_DEVICE"],
      supportedLanguages: ["mr"],
      capabilityCodes: ["mobile.offline-first"],
      organization: {
        id: "ORG-SAHAYAK",
        legalName: "Sahayak Technologies LLP",
        displayName: "Sahayak",
      },
      capabilities: [
        {
          id: "SC-3",
          proficiency: 4,
          capability: {
            code: "mobile.offline-first",
            name: "Offline App",
            taxonomyPath: "mobile.offline-first",
          },
        },
      ],
      credentialEvidence: [
        {
          id: "EV-3",
          type: "DPIIT_RECOGNITION",
          assuranceLevel: "AUTHORITY_ASSERTED",
          status: "VERIFIED",
          issuedAt: new Date("2024-01-01"),
          expiresAt: new Date("2027-01-01"),
          synthetic: true,
        },
        // Missing SECURITY_READINESS evidence (fails mandatory EL-2)
      ],
    },
  ];

  beforeEach(() => {
    mockFindUnique.mockReset();
    mockFindMany.mockReset();
    mockUpsert.mockReset();
  });

  describe("GET /api/challenges/[id]/matches", () => {
    it("returns 400 if challenge id is missing or whitespace", async () => {
      const response = await GET(createMatchRequest(), {
        params: Promise.resolve({ id: "   " }),
      });

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toContain("Invalid or missing challenge ID");
    });

    it("returns 404 if challenge is not found in database", async () => {
      mockFindUnique.mockResolvedValueOnce(null);
      mockFindMany.mockResolvedValueOnce([]);

      const response = await GET(createMatchRequest(), {
        params: Promise.resolve({ id: "CHAL-NONEXISTENT" }),
      });

      expect(response.status).toBe(404);
      const json = await response.json();
      expect(json.error).toBe("Challenge not found");
      expect(json.challengeId).toBe("CHAL-NONEXISTENT");
    });

    it("evaluates and ranks startups for an existing challenge", async () => {
      mockFindUnique.mockResolvedValueOnce(mockChallenge);
      mockFindMany.mockResolvedValueOnce(mockStartups);

      const response = await GET(createMatchRequest(), {
        params: Promise.resolve({ id: "CHAL-PUNE-001" }),
      });

      expect(response.status).toBe(200);
      const json = await response.json();

      expect(json.challengeId).toBe("CHAL-PUNE-001");
      expect(json.totalEvaluated).toBe(2);
      expect(json.eligibleCount).toBe(1);
      expect(json.ineligibleCount).toBe(1);
      expect(json.rankedMatches).toHaveLength(2);

      // EcoScan should be top and eligible
      const topMatch = json.rankedMatches[0];
      expect(topMatch.startupId).toBe("ORG-ECOSCAN");
      expect(topMatch.eligibilityPass).toBe(true);
      expect(topMatch.overallScore).toBeGreaterThan(0.7);
      expect(topMatch.breakdown.capabilityOverlap.score).toBeGreaterThan(0.8);
      expect(topMatch.explanation.positiveReasons.length).toBeGreaterThan(0);
      expect(topMatch.explanation.sensitiveAttributesUsed).toBe(false);

      // Sahayak should be ineligible with score 0
      const bottomMatch = json.rankedMatches[1];
      expect(bottomMatch.startupId).toBe("ORG-SAHAYAK");
      expect(bottomMatch.eligibilityPass).toBe(false);
      expect(bottomMatch.overallScore).toBe(0);
      expect(bottomMatch.explanation.gaps.length).toBeGreaterThan(0);

      // Should not persist by default without ?persist=true
      expect(mockUpsert).not.toHaveBeenCalled();
    });

    it("persists matches when ?persist=true is specified in the query", async () => {
      mockFindUnique.mockResolvedValueOnce(mockChallenge);
      mockFindMany.mockResolvedValueOnce(mockStartups);
      mockUpsert.mockResolvedValue({});

      const response = await GET(
        createMatchRequest("http://localhost/api/challenges/CHAL-PUNE-001/matches?persist=true"),
        { params: Promise.resolve({ id: "CHAL-PUNE-001" }) },
      );

      expect(response.status).toBe(200);
      expect(mockUpsert).toHaveBeenCalledTimes(2);
    });

    it("returns 500 if an unexpected database error occurs", async () => {
      mockFindUnique.mockRejectedValueOnce(new Error("Database connection lost"));

      const response = await GET(createMatchRequest(), {
        params: Promise.resolve({ id: "CHAL-PUNE-001" }),
      });

      expect(response.status).toBe(500);
      const json = await response.json();
      expect(json.error).toBe("Failed to evaluate challenge matches");
      expect(json.details).toBe("Database connection lost");
    });
  });

  describe("POST /api/challenges/[id]/matches", () => {
    it("computes, ranks, and automatically persists matches", async () => {
      mockFindUnique.mockResolvedValueOnce(mockChallenge);
      mockFindMany.mockResolvedValueOnce(mockStartups);
      mockUpsert.mockResolvedValue({});

      const response = await POST(
        createMatchRequest("http://localhost/api/challenges/CHAL-PUNE-001/matches", "POST"),
        { params: Promise.resolve({ id: "CHAL-PUNE-001" }) },
      );

      expect(response.status).toBe(200);
      const json = await response.json();

      expect(json.persisted).toBe(true);
      expect(json.persistedCount).toBe(2);
      expect(mockUpsert).toHaveBeenCalledTimes(2);

      const firstCallArgs = mockUpsert.mock.calls[0]?.[0];
      expect(firstCallArgs.where.challengeId_startupId).toEqual({
        challengeId: "CHAL-PUNE-001",
        startupId: "ORG-ECOSCAN",
      });
      expect(firstCallArgs.create.eligibilityPass).toBe(true);
    });

    it("returns 404 if challenge is not found on POST", async () => {
      mockFindUnique.mockResolvedValueOnce(null);

      const response = await POST(
        createMatchRequest("http://localhost/api/challenges/CHAL-MISSING/matches", "POST"),
        { params: Promise.resolve({ id: "CHAL-MISSING" }) },
      );

      expect(response.status).toBe(404);
      const json = await response.json();
      expect(json.error).toBe("Challenge not found");
    });
  });
});
