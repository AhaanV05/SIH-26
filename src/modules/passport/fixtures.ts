import { buildPassportSummary } from "./passport";
import type { PassportProfile } from "./types";

export const DEMO_PASSPORT_AS_OF = "2026-09-01T10:00:00+05:30";
export const DEMO_REQUIRED_EVIDENCE = ["DPIIT_RECOGNITION", "MSME_UDYAM", "SECURITY_TEST_REPORT"] as const;

export const ecoScanPassport: PassportProfile = {
  startupId: "ORG-ECOSCAN",
  organizationName: "EcoScan Labs",
  summary: "Computer-vision overflow detection and route prioritization for municipal operations.",
  stage: "SEED",
  employeeBand: "11-25",
  deploymentModels: ["EDGE", "CLOUD"],
  supportedLanguages: ["en-IN", "mr-IN", "hi-IN"],
  capabilities: [
    { code: "civic-ops.cv.overflow-detection", name: "Overflow detection", proficiency: 5, evidenceSummary: "Synthetic benchmark recall 0.92." },
    { code: "civic-ops.geo.route-priority", name: "Route prioritization", proficiency: 4, evidenceSummary: "Controlled dispatch simulation." },
    { code: "trust.security.readiness", name: "Security readiness", proficiency: 4, evidenceSummary: "Simulated independent review." },
  ],
  evidence: [
    {
      id: "CRED-ECOSCAN-DPIIT",
      type: "DPIIT_RECOGNITION",
      issuer: "DPIIT adapter (simulated)",
      assuranceLevel: "AUTHORITY_ASSERTED",
      status: "VERIFIED",
      issuedAt: "2024-04-01T00:00:00+05:30",
      expiresAt: "2027-04-01T00:00:00+05:30",
      verifiedAt: "2026-06-01T09:00:00+05:30",
      verificationRef: "SYN-DPIIT-ECOSCAN-001",
      synthetic: true,
    },
    {
      id: "CRED-ECOSCAN-UDYAM",
      type: "MSME_UDYAM",
      issuer: "Udyam upload reviewed by demo officer",
      assuranceLevel: "OFFICER_VERIFIED",
      status: "VERIFIED",
      issuedAt: "2024-05-10T00:00:00+05:30",
      verifiedAt: "2026-06-02T10:00:00+05:30",
      verificationRef: "SYN-UDYAM-ECOSCAN-001",
      synthetic: true,
    },
    {
      id: "CRED-ECOSCAN-SECURITY",
      type: "SECURITY_TEST_REPORT",
      issuer: "Independent reviewer (simulated)",
      assuranceLevel: "SYSTEM_OBSERVED",
      status: "VERIFIED",
      issuedAt: "2026-05-15T00:00:00+05:30",
      expiresAt: "2027-05-15T00:00:00+05:30",
      verificationRef: "SYN-SECURITY-ECOSCAN-001",
      synthetic: true,
    },
  ],
};

export const ecoScanPassportSummary = buildPassportSummary(
  ecoScanPassport,
  DEMO_REQUIRED_EVIDENCE,
  DEMO_PASSPORT_AS_OF,
);
