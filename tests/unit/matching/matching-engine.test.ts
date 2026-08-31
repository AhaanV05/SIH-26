import { describe, expect, it } from "vitest";
import {
  evaluateEligibility,
  calculateCapabilityOverlap,
  calculateSemanticSimilarity,
  calculateEvidenceStrength,
  calculateDeliveryFit,
  computeStartupMatch,
  rankStartupMatches,
  MATCH_WEIGHTS,
  MATCHING_METHOD_VERSION,
  type ChallengeMatchInput,
  type StartupProfileMatchInput,
} from "../../../src/modules/matching";

describe("MATCH-001: Deterministic Explainable Matching Engine", () => {
  const mockChallenge: ChallengeMatchInput = {
    challengeId: "CHAL-WASTE-PUNE-001",
    departmentId: "DEPT-PUNE-SWM",
    title: "AI-Powered Community Waste Overflow Detection and Dynamic Routing",
    problem:
      "Community waste bins in densely populated wards overflow before scheduled collection, leading to civic complaints and delayed response times.",
    requiredCapabilityCodes: ["CAP-CV-OVERFLOW", "CAP-ROUTE-OPT"],
    desiredCapabilityCodes: ["CAP-IOT-SENSING", "CAP-MARATHI-UX"],
    eligibilityCriteria: [
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
    preferredDeploymentModels: ["ON_PREMISE_GOVERNMENT_CLOUD", "HYBRID"],
    preferredLanguages: ["mr-IN", "en-IN"],
    targetLocations: ["Pune", "Maharashtra"],
    keywords: ["waste", "overflow", "detection", "routing", "computer-vision"],
  };

  const startupEcoScan: StartupProfileMatchInput = {
    startupId: "ORG-ECOSCAN",
    organizationId: "ORG-ECOSCAN",
    legalName: "EcoScan Intelligence Private Limited",
    displayName: "EcoScan Labs",
    summary:
      "Computer vision and AI analytics for civic waste overflow detection, automated bin fill level alerts, and dynamic route optimization.",
    capabilityCodes: ["CAP-CV-OVERFLOW", "CAP-ROUTE-OPT", "CAP-MARATHI-UX"],
    capabilities: [
      {
        capabilityCode: "CAP-CV-OVERFLOW",
        proficiency: 5,
        taxonomyPath: "civic-ops.cv.overflow-detection",
      },
      {
        capabilityCode: "CAP-ROUTE-OPT",
        proficiency: 4,
        taxonomyPath: "civic-ops.logistics.route-optimization",
      },
      {
        capabilityCode: "CAP-MARATHI-UX",
        proficiency: 4,
        taxonomyPath: "localization.language.marathi",
      },
    ],
    credentialEvidence: [
      {
        id: "EV-ECO-1",
        type: "DPIIT_RECOGNITION",
        assuranceLevel: "AUTHORITY_ASSERTED",
        status: "VERIFIED",
      },
      {
        id: "EV-ECO-2",
        type: "SECURITY_TEST_REPORT",
        assuranceLevel: "SYSTEM_OBSERVED",
        status: "VERIFIED",
      },
    ],
    deploymentModels: ["ON_PREMISE_GOVERNMENT_CLOUD", "HYBRID", "SAAS"],
    supportedLanguages: ["en-IN", "mr-IN", "hi-IN"],
    operatingLocations: ["Pune", "Mumbai", "Maharashtra"],
  };

  const startupBinSense: StartupProfileMatchInput = {
    startupId: "ORG-BINSENSE",
    organizationId: "ORG-BINSENSE",
    legalName: "BinSense IoT Solutions LLP",
    displayName: "BinSense",
    summary:
      "Hardware IoT ultrasonic sensing for municipal waste bins with telemetry dashboard.",
    capabilityCodes: ["CAP-IOT-SENSING", "CAP-ROUTE-OPT"],
    capabilities: [
      {
        capabilityCode: "CAP-IOT-SENSING",
        proficiency: 5,
        taxonomyPath: "civic-ops.iot.fill-sensing",
      },
      {
        capabilityCode: "CAP-ROUTE-OPT",
        proficiency: 2,
        taxonomyPath: "civic-ops.logistics.route-optimization",
      },
    ],
    credentialEvidence: [
      {
        id: "EV-BIN-1",
        type: "UDYAM_REGISTRATION",
        assuranceLevel: "OFFICER_VERIFIED",
        status: "VERIFIED",
      },
      {
        id: "EV-BIN-2",
        type: "SECURITY_AUDIT",
        assuranceLevel: "THIRD_PARTY_ATTESTED",
        status: "VERIFIED",
      },
    ],
    deploymentModels: ["HYBRID"],
    supportedLanguages: ["en-IN"],
    operatingLocations: ["Pune"],
  };

  const startupSahayakIneligible: StartupProfileMatchInput = {
    startupId: "ORG-SAHAYAK",
    organizationId: "ORG-SAHAYAK",
    legalName: "Sahayak Solutions Private Limited",
    displayName: "Sahayak CivicTech",
    summary: "Voice assistant and civic complaint helpline technology.",
    capabilityCodes: ["CAP-MARATHI-UX"],
    capabilities: [
      {
        capabilityCode: "CAP-MARATHI-UX",
        proficiency: 4,
        taxonomyPath: "localization.language.marathi",
      },
    ],
    credentialEvidence: [
      {
        id: "EV-SAH-1",
        type: "DPIIT_RECOGNITION",
        assuranceLevel: "AUTHORITY_ASSERTED",
        status: "VERIFIED",
      },
      // Deliberately missing SECURITY_READINESS evidence
    ],
    deploymentModels: ["SAAS"],
    supportedLanguages: ["mr-IN", "en-IN"],
  };

  describe("evaluateEligibility()", () => {
    it("passes when all mandatory criteria have verified accepted evidence", () => {
      const result = evaluateEligibility(mockChallenge, startupEcoScan);
      expect(result.passed).toBe(true);
      expect(result.mandatoryCount).toBe(2);
      expect(result.mandatoryPassed).toBe(2);
      expect(result.ineligibilityReasons).toHaveLength(0);
      expect(result.criteriaEvaluations).toHaveLength(2);
      expect(result.criteriaEvaluations[0]?.passed).toBe(true);
      expect(result.criteriaEvaluations[1]?.passed).toBe(true);
    });

    it("fails when a mandatory criterion is missing valid evidence", () => {
      const result = evaluateEligibility(mockChallenge, startupSahayakIneligible);
      expect(result.passed).toBe(false);
      expect(result.mandatoryCount).toBe(2);
      expect(result.mandatoryPassed).toBe(1);
      expect(result.ineligibilityReasons).toHaveLength(1);
      expect(result.ineligibilityReasons[0]).toContain("SECURITY_READINESS");
    });

    it("rejects evidence with unaccepted assurance levels", () => {
      const startupWithUnacceptedAssurance: StartupProfileMatchInput = {
        ...startupEcoScan,
        credentialEvidence: [
          {
            id: "EV-1",
            type: "DPIIT_RECOGNITION",
            assuranceLevel: "AUTHORITY_ASSERTED",
            status: "VERIFIED",
          },
          {
            id: "EV-2",
            type: "SECURITY_TEST_REPORT",
            assuranceLevel: "SELF_DECLARED", // Not accepted in EL-2
            status: "VERIFIED",
          },
        ],
      };

      const result = evaluateEligibility(mockChallenge, startupWithUnacceptedAssurance);
      expect(result.passed).toBe(false);
      expect(result.ineligibilityReasons[0]).toContain("SECURITY_READINESS");
    });

    it("rejects expired evidence", () => {
      const startupWithExpiredEvidence: StartupProfileMatchInput = {
        ...startupEcoScan,
        credentialEvidence: [
          {
            id: "EV-1",
            type: "DPIIT_RECOGNITION",
            assuranceLevel: "AUTHORITY_ASSERTED",
            status: "VERIFIED",
            expiresAt: "2020-01-01T00:00:00Z", // Expired
          },
          {
            id: "EV-2",
            type: "SECURITY_TEST_REPORT",
            assuranceLevel: "SYSTEM_OBSERVED",
            status: "VERIFIED",
          },
        ],
      };

      const result = evaluateEligibility(mockChallenge, startupWithExpiredEvidence);
      expect(result.passed).toBe(false);
      expect(result.ineligibilityReasons[0]).toContain("STARTUP_RECOGNITION");
    });
  });

  describe("calculateCapabilityOverlap()", () => {
    it("awards high score for matching all required capabilities with high proficiency", () => {
      const factor = calculateCapabilityOverlap(mockChallenge, startupEcoScan);
      expect(factor.score).toBeGreaterThanOrEqual(0.9);
      expect(factor.matchedRequired).toEqual(["CAP-CV-OVERFLOW", "CAP-ROUTE-OPT"]);
      expect(factor.missingRequired).toHaveLength(0);
      expect(factor.matchedDesired).toContain("CAP-MARATHI-UX");
      expect(factor.weight).toBe(MATCH_WEIGHTS.capabilityOverlap);
      expect(factor.weightedContribution).toBe(Number((factor.score * 0.4).toFixed(4)));
    });

    it("accurately records missing required capabilities and lowers score", () => {
      const factor = calculateCapabilityOverlap(mockChallenge, startupBinSense);
      expect(factor.matchedRequired).toEqual(["CAP-ROUTE-OPT"]);
      expect(factor.missingRequired).toEqual(["CAP-CV-OVERFLOW"]);
      expect(factor.score).toBeLessThan(0.8);
      expect(factor.rationale).toContain("Missing: CAP-CV-OVERFLOW");
    });
  });

  describe("calculateSemanticSimilarity()", () => {
    it("computes keyword and taxonomy overlap", () => {
      const factor = calculateSemanticSimilarity(mockChallenge, startupEcoScan);
      expect(factor.score).toBeGreaterThan(0.5);
      expect(factor.matchedKeywords.length).toBeGreaterThan(0);
      expect(factor.weight).toBe(MATCH_WEIGHTS.semanticSimilarity);
      expect(factor.weightedContribution).toBe(Number((factor.score * 0.25).toFixed(4)));
    });
  });

  describe("calculateEvidenceStrength()", () => {
    it("evaluates verified evidence items and high assurance levels", () => {
      const factor = calculateEvidenceStrength(mockChallenge, startupEcoScan);
      expect(factor.score).toBeGreaterThan(0.7);
      expect(factor.verifiedEvidenceCount).toBe(2);
      expect(factor.highAssuranceCount).toBe(2);
      expect(factor.weight).toBe(MATCH_WEIGHTS.evidenceStrength);
    });

    it("assigns minimal baseline when no evidence is present", () => {
      const factor = calculateEvidenceStrength(mockChallenge, {
        ...startupEcoScan,
        credentialEvidence: [],
      });
      expect(factor.score).toBe(0.1);
      expect(factor.verifiedEvidenceCount).toBe(0);
    });
  });

  describe("calculateDeliveryFit()", () => {
    it("awards high score for matching deployment models and languages", () => {
      const factor = calculateDeliveryFit(mockChallenge, startupEcoScan);
      expect(factor.score).toBeGreaterThanOrEqual(0.9);
      expect(factor.matchedDeploymentModels).toContain("on_premise_government_cloud");
      expect(factor.matchedLanguages).toContain("mr-in");
    });
  });

  describe("computeStartupMatch()", () => {
    it("computes a complete explainable match result for an eligible startup", () => {
      const result = computeStartupMatch(mockChallenge, startupEcoScan);

      expect(result.id).toBe("MATCH-CHAL-WASTE-PUNE-001-ORG-ECOSCAN");
      expect(result.eligibilityPass).toBe(true);
      expect(result.overallScore).toBeGreaterThan(0.8);
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.advisoryOnly).toBe(true);
      expect(result.humanAuthorizationRequired).toBe(true);
      expect(result.explanation.sensitiveAttributesUsed).toBe(false);
      expect(result.explanation.positiveReasons.length).toBeGreaterThan(0);
      expect(result.modelVersion).toBe(MATCHING_METHOD_VERSION);

      // Verify formula exactness: 0.40*cap + 0.25*sem + 0.20*ev + 0.15*del
      const expectedSum =
        result.breakdown.capabilityOverlap.weightedContribution +
        result.breakdown.semanticSimilarity.weightedContribution +
        result.breakdown.evidenceStrength.weightedContribution +
        result.breakdown.deliveryFit.weightedContribution;

      expect(result.overallScore).toBeCloseTo(expectedSum, 3);
    });

    it("sets overallScore = 0 for an ineligible startup while retaining factor breakdown", () => {
      const result = computeStartupMatch(mockChallenge, startupSahayakIneligible);

      expect(result.eligibilityPass).toBe(false);
      expect(result.overallScore).toBe(0);
      expect(result.explanation.gaps.length).toBeGreaterThan(0);
      expect(result.explanation.feedbackSuggestions).toContain(
        "Upload verified credential evidence for missing mandatory criteria to unlock eligibility.",
      );
      // Factors are still calculated for transparency
      expect(result.breakdown.capabilityOverlap.score).toBeGreaterThanOrEqual(0);
    });

    it("throws error if challengeId or startupId is missing", () => {
      expect(() =>
        computeStartupMatch({ ...mockChallenge, challengeId: "" }, startupEcoScan),
      ).toThrow("challengeId and startupId are required");

      expect(() =>
        computeStartupMatch(mockChallenge, { ...startupEcoScan, startupId: "" }),
      ).toThrow("challengeId and startupId are required");
    });
  });

  describe("rankStartupMatches()", () => {
    it("correctly ranks multiple startups with eligible on top and ineligible at the bottom", () => {
      const startups = [startupBinSense, startupSahayakIneligible, startupEcoScan];
      const batch = rankStartupMatches(mockChallenge, startups);

      expect(batch.totalEvaluated).toBe(3);
      expect(batch.eligibleCount).toBe(2);
      expect(batch.ineligibleCount).toBe(1);
      expect(batch.rankedMatches).toHaveLength(3);

      // Top match should be EcoScan (highest overall score)
      expect(batch.rankedMatches[0]?.startupId).toBe("ORG-ECOSCAN");
      expect(batch.rankedMatches[0]?.eligibilityPass).toBe(true);

      // Second match should be BinSense (eligible, lower capability score)
      expect(batch.rankedMatches[1]?.startupId).toBe("ORG-BINSENSE");
      expect(batch.rankedMatches[1]?.eligibilityPass).toBe(true);

      // Bottom match should be Sahayak (ineligible, overallScore 0)
      expect(batch.rankedMatches[2]?.startupId).toBe("ORG-SAHAYAK");
      expect(batch.rankedMatches[2]?.eligibilityPass).toBe(false);
      expect(batch.rankedMatches[2]?.overallScore).toBe(0);
    });
  });
});
