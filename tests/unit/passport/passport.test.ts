import { describe, expect, it } from "vitest";

import {
  assessEvidenceFreshness,
  authorizePassportRead,
  buildPassportSummary,
  ecoScanPassport,
  recordSimulatedOfficerVerification,
} from "@/modules/passport";

describe("Startup Passport evidence", () => {
  it("calculates freshness from an explicit clock without flattening assurance", () => {
    const current = assessEvidenceFreshness(ecoScanPassport.evidence[0]!, "2026-09-01T10:00:00+05:30");
    expect(current).toMatchObject({ freshness: "CURRENT", usable: true, assuranceScore: 1 });

    const expiring = assessEvidenceFreshness(
      { ...ecoScanPassport.evidence[0]!, expiresAt: "2026-09-20T00:00:00+05:30" },
      "2026-09-01T10:00:00+05:30",
    );
    expect(expiring.freshness).toBe("EXPIRING_SOON");
  });

  it("treats expired and revoked claims as unusable", () => {
    expect(assessEvidenceFreshness(
      { ...ecoScanPassport.evidence[0]!, expiresAt: "2026-08-01T00:00:00+05:30" },
      "2026-09-01T10:00:00+05:30",
    )).toMatchObject({ freshness: "EXPIRED", usable: false });
    expect(assessEvidenceFreshness(
      { ...ecoScanPassport.evidence[0]!, status: "REVOKED" },
      "2026-09-01T10:00:00+05:30",
    )).toMatchObject({ freshness: "REVOKED", usable: false });
  });

  it("reports completeness only for usable required evidence", () => {
    const summary = buildPassportSummary(
      { ...ecoScanPassport, evidence: ecoScanPassport.evidence.slice(0, 2) },
      ["DPIIT_RECOGNITION", "MSME_UDYAM", "SECURITY_TEST_REPORT"],
      "2026-09-01T10:00:00+05:30",
    );
    expect(summary).toMatchObject({ completenessPercent: 67, requiredEvidencePresent: 2, requiredEvidenceTotal: 3 });
    expect(summary.displayLabel).toBe("SIMULATED_FOR_DEMO");
  });

  it("allows startup users to read only their own passport", () => {
    const actor = { userId: "founder", role: "STARTUP_ADMIN" as const, startupId: "ORG-ECOSCAN" };
    expect(() => authorizePassportRead(actor, "ORG-ECOSCAN")).not.toThrow();
    expect(() => authorizePassportRead(actor, "ORG-COMPETITOR")).toThrow("FORBIDDEN_PASSPORT_READ");
    expect(() => authorizePassportRead({ userId: "officer", role: "PROCUREMENT_REVIEWER" }, "ORG-ECOSCAN")).not.toThrow();
  });

  it("keeps simulated verification human-authorized and provenance-labelled", () => {
    expect(() => recordSimulatedOfficerVerification(
      ecoScanPassport.evidence[0]!,
      { userId: "founder", role: "STARTUP_ADMIN", startupId: "ORG-ECOSCAN" },
      "2026-09-01T10:00:00+05:30",
      "SYN-OFFICER-001",
    )).toThrow("FORBIDDEN_EVIDENCE_VERIFICATION");
    expect(recordSimulatedOfficerVerification(
      { ...ecoScanPassport.evidence[0]!, status: "PENDING" },
      { userId: "reviewer", role: "PROCUREMENT_REVIEWER" },
      "2026-09-01T10:00:00+05:30",
      "SYN-OFFICER-001",
    )).toMatchObject({ status: "VERIFIED", assuranceLevel: "OFFICER_VERIFIED", synthetic: true, verificationRef: "SYN-OFFICER-001" });
  });
});
