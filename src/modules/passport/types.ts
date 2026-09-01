export const passportActorRoles = [
  "STARTUP_ADMIN",
  "STARTUP_CONTRIBUTOR",
  "PROBLEM_OWNER",
  "PROCUREMENT_REVIEWER",
  "FINANCE_OFFICER",
  "EVALUATOR",
  "PLATFORM_ADMIN",
  "AUDITOR",
] as const;

export type PassportActorRole = (typeof passportActorRoles)[number];

export type PassportActor = {
  userId: string;
  role: PassportActorRole;
  startupId?: string;
};

export const evidenceAssuranceLevels = [
  "AUTHORITY_ASSERTED",
  "OFFICER_VERIFIED",
  "SYSTEM_OBSERVED",
  "THIRD_PARTY_ATTESTED",
  "SELF_DECLARED",
  "SIMULATED_FOR_DEMO",
] as const;

export type EvidenceAssuranceLevel = (typeof evidenceAssuranceLevels)[number];
export type EvidenceFreshness = "CURRENT" | "EXPIRING_SOON" | "EXPIRED" | "REVOKED" | "UNDATED";

export type PassportEvidence = {
  id: string;
  type: string;
  issuer: string;
  assuranceLevel: EvidenceAssuranceLevel;
  status: "PENDING" | "VERIFIED" | "REJECTED" | "REVOKED";
  issuedAt?: string;
  expiresAt?: string;
  verifiedAt?: string;
  verificationRef?: string;
  synthetic: boolean;
};

export type EvidenceAssessment = PassportEvidence & {
  freshness: EvidenceFreshness;
  daysUntilExpiry: number | null;
  assuranceScore: number;
  usable: boolean;
};

export type PassportProfile = {
  startupId: string;
  organizationName: string;
  summary: string;
  stage: string;
  employeeBand: string;
  deploymentModels: string[];
  supportedLanguages: string[];
  capabilities: Array<{
    code: string;
    name: string;
    proficiency: number;
    evidenceSummary: string;
  }>;
  evidence: PassportEvidence[];
};

export type PassportSummary = PassportProfile & {
  assessedEvidence: EvidenceAssessment[];
  completenessPercent: number;
  freshnessPercent: number;
  requiredEvidencePresent: number;
  requiredEvidenceTotal: number;
  displayLabel: "SIMULATED_FOR_DEMO";
};
