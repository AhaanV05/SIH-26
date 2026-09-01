import type {
  EvidenceAssessment,
  PassportActor,
  PassportEvidence,
  PassportProfile,
  PassportSummary,
} from "./types";

const assuranceScore = {
  AUTHORITY_ASSERTED: 1,
  OFFICER_VERIFIED: 0.9,
  SYSTEM_OBSERVED: 0.85,
  THIRD_PARTY_ATTESTED: 0.75,
  SELF_DECLARED: 0.35,
  SIMULATED_FOR_DEMO: 0.25,
} as const;

const governmentPassportReaders = new Set<PassportActor["role"]>([
  "PROBLEM_OWNER",
  "PROCUREMENT_REVIEWER",
  "EVALUATOR",
  "PLATFORM_ADMIN",
  "AUDITOR",
]);

function parseDate(value: string | undefined, field: string): number | null {
  if (!value) return null;
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) throw new Error(`${field} must be a valid ISO timestamp`);
  return milliseconds;
}

export function authorizePassportRead(actor: PassportActor, requestedStartupId: string): void {
  if (governmentPassportReaders.has(actor.role)) return;
  if (
    (actor.role === "STARTUP_ADMIN" || actor.role === "STARTUP_CONTRIBUTOR") &&
    actor.startupId === requestedStartupId
  ) {
    return;
  }
  throw new Error("FORBIDDEN_PASSPORT_READ");
}

export function recordSimulatedOfficerVerification(
  evidence: PassportEvidence,
  actor: PassportActor,
  verifiedAtIso: string,
  verificationRef: string,
): PassportEvidence {
  if (actor.role !== "PROCUREMENT_REVIEWER" && actor.role !== "PLATFORM_ADMIN") {
    throw new Error("FORBIDDEN_EVIDENCE_VERIFICATION");
  }
  if (evidence.status === "REVOKED") throw new Error("REVOKED_EVIDENCE_CANNOT_BE_VERIFIED");
  if (!Number.isFinite(Date.parse(verifiedAtIso))) throw new Error("verifiedAtIso must be a valid ISO timestamp");
  if (!verificationRef.startsWith("SYN-") || verificationRef.length < 8) {
    throw new Error("Simulated verification reference must start with SYN-");
  }
  return {
    ...evidence,
    assuranceLevel: "OFFICER_VERIFIED",
    status: "VERIFIED",
    synthetic: true,
    verificationRef,
    verifiedAt: verifiedAtIso,
  };
}

export function assessEvidenceFreshness(
  evidence: PassportEvidence,
  asOfIso: string,
  expiringSoonDays = 60,
): EvidenceAssessment {
  const asOf = parseDate(asOfIso, "asOfIso");
  if (asOf === null) throw new Error("asOfIso is required");
  const expiresAt = parseDate(evidence.expiresAt, "expiresAt");

  let freshness: EvidenceAssessment["freshness"] = "UNDATED";
  let daysUntilExpiry: number | null = null;

  if (evidence.status === "REVOKED") {
    freshness = "REVOKED";
  } else if (expiresAt !== null) {
    daysUntilExpiry = Math.ceil((expiresAt - asOf) / 86_400_000);
    freshness = daysUntilExpiry < 0
      ? "EXPIRED"
      : daysUntilExpiry <= expiringSoonDays
        ? "EXPIRING_SOON"
        : "CURRENT";
  }

  return {
    ...evidence,
    assuranceScore: assuranceScore[evidence.assuranceLevel],
    daysUntilExpiry,
    freshness,
    usable: evidence.status === "VERIFIED" && freshness !== "EXPIRED" && freshness !== "REVOKED",
  };
}

export function buildPassportSummary(
  profile: PassportProfile,
  requiredEvidenceTypes: readonly string[],
  asOfIso: string,
): PassportSummary {
  const assessedEvidence = profile.evidence.map((item) => assessEvidenceFreshness(item, asOfIso));
  const requiredEvidencePresent = requiredEvidenceTypes.filter((type) =>
    assessedEvidence.some((item) => item.type === type && item.usable),
  ).length;
  const completenessPercent = requiredEvidenceTypes.length === 0
    ? 100
    : Math.round((requiredEvidencePresent / requiredEvidenceTypes.length) * 100);
  const verified = assessedEvidence.filter((item) => item.status === "VERIFIED");
  const fresh = verified.filter((item) => item.freshness === "CURRENT" || item.freshness === "EXPIRING_SOON");
  const freshnessPercent = verified.length === 0 ? 0 : Math.round((fresh.length / verified.length) * 100);

  return {
    ...profile,
    assessedEvidence,
    completenessPercent,
    displayLabel: "SIMULATED_FOR_DEMO",
    freshnessPercent,
    requiredEvidencePresent,
    requiredEvidenceTotal: requiredEvidenceTypes.length,
  };
}
