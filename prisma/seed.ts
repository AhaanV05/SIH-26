/**
 * Deterministic golden-path seed for the MahaSetu waste-management reference
 * scenario (Truth.md section 5.1/5.2). Every entity below is fictional and
 * every dataset used is explicitly synthetic; nothing here represents real
 * government process references, real citizens, or real startups.
 *
 * This script does not compute domain results by hand where a tested
 * pure-logic module already exists — it calls the real modules under
 * `src/modules/**` (challenge freeze/hash, waste metric calculation,
 * milestone acceptance, payment-request state machine, transferability
 * scoring, audit hash-chaining) so the seed doubles as an integration proof
 * for those modules, not just a set of hand-typed fixture rows.
 *
 * Idempotency: this script truncates every application table before
 * inserting, so `pnpm db:seed` (or `pnpm db:reset`, which runs migrations
 * then this script) always produces the same deterministic demo state.
 */
import { PrismaClient, Prisma } from "@prisma/client";

import {
  freezeChallengeSpec,
  parseChallengeSpec,
  type ChallengeSpec,
} from "../src/modules/challenges";
import {
  SYNTHETIC_DEMO_LABEL,
  calculateWasteMetrics,
  createWasteMetricObservations,
  evaluateMilestoneAcceptance,
  parseSyntheticWasteEventDataset,
  type EvidenceObject,
  type MilestoneDefinition,
} from "../src/modules/evidence";
import {
  createPaymentRequestSnapshot,
  evaluatePaymentReadiness,
  paymentStatusLabel,
  transitionPaymentRequest,
  type PaymentRequestSnapshot,
} from "../src/modules/payments/payment-readiness";
import { assessTransferability } from "../src/modules/solutions";
import {
  appendAuditEvent,
  type AuditActor,
  type AuditEvent,
  type AuditEventInput,
} from "../src/modules/audit/audit-chain";
import type { $Enums } from "@prisma/client";

import wasteEventFixture from "../data/fixtures/synthetic-waste-events.v1.json";
import transferabilityFixture from "../data/fixtures/synthetic-transferability.v1.json";

const prisma = new PrismaClient();

/** Strips readonly/branding so pure-module output satisfies Prisma's Json input types. */
function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

const iso = (value: string): Date => new Date(value);

// ---------------------------------------------------------------------------
// Stable, human-readable IDs (no reliance on Prisma's default cuid()).
// ---------------------------------------------------------------------------

const ORG_GOV = "ORG-GOV-MAHARASHTRA";
const ORG_PLATFORM = "ORG-MAHASETU-PLATFORM";
const ORG_ECOSCAN = "ORG-ECOSCAN";
const ORG_BINSENSE = "ORG-BINSENSE";
const ORG_MARGDARSHAK = "ORG-MARGDARSHAK";
const ORG_SAHAYAK = "ORG-SAHAYAK";

const DEPT_PUNE = "DEPT-PUNE-SWM";
const DEPT_NASHIK = "DEPT-NASHIK-SWM";

const USR_ANJALI = "USR-ANJALI-DESHMUKH"; // Pune SWM problem owner / pilot owner
const USR_RAHUL = "USR-RAHUL-KULKARNI"; // Pune procurement reviewer
const USR_SUNITA = "USR-SUNITA-RANE"; // Pune finance officer
const USR_EVAL_1 = "USR-FARHAN-SHEIKH"; // evaluator
const USR_EVAL_2 = "USR-MEERA-JOSHI"; // evaluator
const USR_EVAL_3 = "USR-VIKRAM-RAO"; // evaluator
const USR_AUDITOR = "USR-IRA-FERNANDES"; // platform admin / auditor
const USR_NASHIK_OFFICER = "USR-PRAKASH-WAGH"; // Nashik SWM problem owner

const USR_ECOSCAN_FOUNDER = "USR-ADITI-KULKARNI";
const USR_ECOSCAN_LEAD = "USR-ROHAN-BHATT"; // pilot startup lead
const USR_BINSENSE_FOUNDER = "USR-KARAN-MEHTA";
const USR_MARGDARSHAK_FOUNDER = "USR-NEHA-IYER";
const USR_SAHAYAK_FOUNDER = "USR-IMRAN-SHAIKH";

const CAP_CV = "CAP-CV-OVERFLOW";
const CAP_ROUTE = "CAP-ROUTE-OPT";
const CAP_IOT = "CAP-IOT-SENSING";
const CAP_OFFLINE = "CAP-OFFLINE-FIELD";
const CAP_MARATHI = "CAP-MARATHI-UX";
const CAP_SECURITY = "CAP-SECURITY-READY";

const CHALLENGE_ID = "CHAL-WASTE-PUNE-001";
const SPEC_ID = "SPEC-WASTE-PUNE-001-V1";

const PROPOSAL_ECOSCAN = "PROP-ECOSCAN-001";
const PROPOSAL_BINSENSE = "PROP-BINSENSE-001";
const PROPOSAL_MARGDARSHAK = "PROP-MARGDARSHAK-001";

const PILOT_ID = "PILOT-WASTE-PUNE-001";
const MILESTONE_ID = "MS-WASTE-PUNE-001-MS1";
const SANDBOX_RUN_ID = "SYN-RUN-WASTE-001";
const PAYMENT_REQUEST_ID = "PAY-WASTE-PUNE-001-MS1";
const SOLUTION_CARD_ID = "SOL-WASTE-PUNE-001";
const TRANSFERABILITY_ID = "TRANSFER-WASTE-PUNE-TO-NASHIK-001";
const ADOPTION_REQUEST_ID = "ADOPT-NASHIK-001";

// A fictional synthetic Maharashtra government process reference — never a
// real GeM/e-tendering/PFMS identifier.
const PROCESS_ID = "SYN-MH-SWM-2026-000123";

// ---------------------------------------------------------------------------
// Truncate every application table so reseeding is deterministic and
// repeatable (README/Truth.md P0-J: "a reset/seed command for repeatable
// judging"). CASCADE lets Postgres resolve the FK dependency order for us.
// ---------------------------------------------------------------------------

const TABLES = [
  "AdoptionRequest",
  "TransferabilityAssessment",
  "SolutionCard",
  "PaymentEvent",
  "PaymentRequest",
  "ChangeRequest",
  "RiskItem",
  "MilestoneReview",
  "MilestoneAcceptanceEvaluation",
  "EvidenceClaim",
  "MetricObservation",
  "EvidenceObject",
  "SandboxRun",
  "Milestone",
  "PilotMetric",
  "PilotAttestation",
  "Pilot",
  "ModerationDecision",
  "Score",
  "ConflictDeclaration",
  "EvaluatorAssignment",
  "ProposalAttachment",
  "Proposal",
  "Match",
  "ChallengeSpecVersion",
  "Challenge",
  "CredentialEvidence",
  "StartupCapability",
  "StartupProfile",
  "Capability",
  "Membership",
  "Department",
  "Organization",
  "User",
  "AuditEvent",
  "OutboxEvent",
] as const;

async function resetDatabase(): Promise<void> {
  const quoted = TABLES.map((table) => `"${table}"`).join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${quoted} RESTART IDENTITY CASCADE;`);
}

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

async function seedIdentity(): Promise<void> {
  await prisma.organization.createMany({
    data: [
      { id: ORG_GOV, type: "GOVERNMENT", legalName: "Government of Maharashtra", displayName: "Government of Maharashtra" },
      { id: ORG_PLATFORM, type: "PLATFORM", legalName: "MahaSetu Platform Operations", displayName: "MahaSetu Platform Operations" },
      { id: ORG_ECOSCAN, type: "STARTUP", legalName: "EcoScan Vision Labs Private Limited", displayName: "EcoScan Vision Labs" },
      { id: ORG_BINSENSE, type: "STARTUP", legalName: "BinSense IoT Private Limited", displayName: "BinSense IoT" },
      { id: ORG_MARGDARSHAK, type: "STARTUP", legalName: "Margdarshak Mobility Private Limited", displayName: "Margdarshak Mobility" },
      { id: ORG_SAHAYAK, type: "STARTUP", legalName: "Sahayak Field Systems Private Limited", displayName: "Sahayak Field Systems" },
    ],
  });

  await prisma.department.createMany({
    data: [
      { id: DEPT_PUNE, organizationId: ORG_GOV, name: "Pune Municipal Corporation — Solid Waste Management", jurisdiction: "Pune" },
      { id: DEPT_NASHIK, organizationId: ORG_GOV, name: "Nashik Municipal Corporation — Solid Waste Management", jurisdiction: "Nashik" },
    ],
  });

  await prisma.user.createMany({
    data: [
      { id: USR_ANJALI, name: "Anjali Deshmukh", email: "anjali.deshmukh@example-gov.test" },
      { id: USR_RAHUL, name: "Rahul Kulkarni", email: "rahul.kulkarni@example-gov.test" },
      { id: USR_SUNITA, name: "Sunita Rane", email: "sunita.rane@example-gov.test" },
      { id: USR_EVAL_1, name: "Dr. Farhan Sheikh", email: "farhan.sheikh@example-eval.test" },
      { id: USR_EVAL_2, name: "Meera Joshi", email: "meera.joshi@example-eval.test" },
      { id: USR_EVAL_3, name: "Vikram Rao", email: "vikram.rao@example-eval.test" },
      { id: USR_AUDITOR, name: "Ira Fernandes", email: "ira.fernandes@example-platform.test" },
      { id: USR_NASHIK_OFFICER, name: "Prakash Wagh", email: "prakash.wagh@example-gov.test" },
      { id: USR_ECOSCAN_FOUNDER, name: "Aditi Kulkarni", email: "aditi@ecoscan.example-startup.test" },
      { id: USR_ECOSCAN_LEAD, name: "Rohan Bhatt", email: "rohan@ecoscan.example-startup.test" },
      { id: USR_BINSENSE_FOUNDER, name: "Karan Mehta", email: "karan@binsense.example-startup.test" },
      { id: USR_MARGDARSHAK_FOUNDER, name: "Neha Iyer", email: "neha@margdarshak.example-startup.test" },
      { id: USR_SAHAYAK_FOUNDER, name: "Imran Shaikh", email: "imran@sahayak.example-startup.test" },
    ],
  });

  await prisma.membership.createMany({
    data: [
      { userId: USR_ANJALI, organizationId: ORG_GOV, role: "PROBLEM_OWNER" },
      { userId: USR_RAHUL, organizationId: ORG_GOV, role: "PROCUREMENT_REVIEWER" },
      { userId: USR_SUNITA, organizationId: ORG_GOV, role: "FINANCE_OFFICER" },
      { userId: USR_NASHIK_OFFICER, organizationId: ORG_GOV, role: "PROBLEM_OWNER" },
      { userId: USR_EVAL_1, organizationId: ORG_PLATFORM, role: "EVALUATOR" },
      { userId: USR_EVAL_2, organizationId: ORG_PLATFORM, role: "EVALUATOR" },
      { userId: USR_EVAL_3, organizationId: ORG_PLATFORM, role: "EVALUATOR" },
      { userId: USR_AUDITOR, organizationId: ORG_PLATFORM, role: "PLATFORM_ADMIN" },
      { userId: USR_AUDITOR, organizationId: ORG_PLATFORM, role: "AUDITOR" },
      { userId: USR_ECOSCAN_FOUNDER, organizationId: ORG_ECOSCAN, role: "STARTUP_ADMIN" },
      { userId: USR_ECOSCAN_LEAD, organizationId: ORG_ECOSCAN, role: "STARTUP_CONTRIBUTOR" },
      { userId: USR_BINSENSE_FOUNDER, organizationId: ORG_BINSENSE, role: "STARTUP_ADMIN" },
      { userId: USR_MARGDARSHAK_FOUNDER, organizationId: ORG_MARGDARSHAK, role: "STARTUP_ADMIN" },
      { userId: USR_SAHAYAK_FOUNDER, organizationId: ORG_SAHAYAK, role: "STARTUP_ADMIN" },
    ],
  });
}

// ---------------------------------------------------------------------------
// Startup Passport
// ---------------------------------------------------------------------------

async function seedPassport(): Promise<void> {
  await prisma.capability.createMany({
    data: [
      { id: CAP_CV, code: "civic-ops.cv.overflow-detection", name: "Overflow computer-vision detection", taxonomyPath: "civic-operations.computer-vision.waste" },
      { id: CAP_ROUTE, code: "civic-ops.geo.route-priority", name: "Collection route prioritization", taxonomyPath: "civic-operations.geospatial.routing" },
      { id: CAP_IOT, code: "civic-ops.iot.fill-sensing", name: "IoT fill-level sensing", taxonomyPath: "civic-operations.iot.sensing" },
      { id: CAP_OFFLINE, code: "mobile.offline-first", name: "Offline-first field data capture", taxonomyPath: "civic-operations.mobile.offline" },
      { id: CAP_MARATHI, code: "a11y.localization.marathi", name: "Marathi/Hindi language UX", taxonomyPath: "accessibility.localization.marathi" },
      { id: CAP_SECURITY, code: "trust.security.readiness", name: "Security and privacy readiness", taxonomyPath: "trust.security.readiness" },
    ],
  });

  await prisma.startupProfile.createMany({
    data: [
      {
        id: ORG_ECOSCAN,
        organizationId: ORG_ECOSCAN,
        summary: "Computer-vision overflow detection fused with route-prioritization for municipal solid-waste operations.",
        website: "https://ecoscan.example-startup.test",
        stage: "SEED",
        employeeBand: "11-25",
        deploymentModels: ["CLOUD_MANAGED", "EDGE_DEVICE"],
        supportedLanguages: ["en", "mr"],
        capabilityCodes: ["civic-ops.cv.overflow-detection", "civic-ops.geo.route-priority", "trust.security.readiness"],
      },
      {
        id: ORG_BINSENSE,
        organizationId: ORG_BINSENSE,
        summary: "Low-power IoT fill-level sensors with a route-priority dashboard.",
        website: "https://binsense.example-startup.test",
        stage: "PRE_SERIES_A",
        employeeBand: "26-50",
        deploymentModels: ["CLOUD_MANAGED"],
        supportedLanguages: ["en"],
        capabilityCodes: ["civic-ops.iot.fill-sensing", "civic-ops.geo.route-priority"],
      },
      {
        id: ORG_MARGDARSHAK,
        organizationId: ORG_MARGDARSHAK,
        summary: "Route-optimization engine for municipal collection fleets.",
        website: "https://margdarshak.example-startup.test",
        stage: "SEED",
        employeeBand: "1-10",
        deploymentModels: ["CLOUD_MANAGED"],
        supportedLanguages: ["en", "mr", "hi"],
        capabilityCodes: ["civic-ops.geo.route-priority"],
      },
      {
        id: ORG_SAHAYAK,
        organizationId: ORG_SAHAYAK,
        summary: "Offline-first Marathi field app for sanitation-worker reporting, with early computer-vision experiments.",
        website: "https://sahayak.example-startup.test",
        stage: "PRE_SEED",
        employeeBand: "1-10",
        deploymentModels: ["EDGE_DEVICE", "OFFLINE_FIRST"],
        supportedLanguages: ["mr", "hi", "en"],
        capabilityCodes: ["mobile.offline-first", "a11y.localization.marathi"],
      },
    ],
  });

  await prisma.startupCapability.createMany({
    data: [
      { startupId: ORG_ECOSCAN, capabilityId: CAP_CV, proficiency: 5, evidenceSummary: "Sandbox precision/recall benchmark on synthetic waste-event dataset." },
      { startupId: ORG_ECOSCAN, capabilityId: CAP_ROUTE, proficiency: 4, evidenceSummary: "Route-priority module reused from a prior logistics pilot." },
      { startupId: ORG_ECOSCAN, capabilityId: CAP_SECURITY, proficiency: 4, evidenceSummary: "Third-party security review of the edge-device firmware." },
      { startupId: ORG_BINSENSE, capabilityId: CAP_IOT, proficiency: 5, evidenceSummary: "Deployed fill-level sensors in a prior municipal trial." },
      { startupId: ORG_BINSENSE, capabilityId: CAP_ROUTE, proficiency: 2, evidenceSummary: "Basic threshold-based routing only; no prioritization model yet." },
      { startupId: ORG_MARGDARSHAK, capabilityId: CAP_ROUTE, proficiency: 5, evidenceSummary: "Production route-optimization engine used by two logistics customers." },
      { startupId: ORG_SAHAYAK, capabilityId: CAP_OFFLINE, proficiency: 5, evidenceSummary: "Offline queueing and resync tested across three field pilots." },
      { startupId: ORG_SAHAYAK, capabilityId: CAP_MARATHI, proficiency: 5, evidenceSummary: "Fully localized Marathi field-worker UI with voice input." },
      { startupId: ORG_SAHAYAK, capabilityId: CAP_CV, proficiency: 2, evidenceSummary: "Early-stage overflow-detection prototype, not yet benchmarked." },
    ],
  });

  await prisma.credentialEvidence.createMany({
    data: [
      { startupId: ORG_ECOSCAN, type: "DPIIT_RECOGNITION", issuer: "DPIIT (simulated)", sourceType: "SYSTEM_EXPORT", assuranceLevel: "AUTHORITY_ASSERTED", status: "VERIFIED", issuedAt: iso("2024-04-01T00:00:00+05:30"), expiresAt: iso("2027-04-01T00:00:00+05:30"), verifiedAt: iso("2026-06-01T09:00:00+05:30"), verificationRef: "SYN-DPIIT-ECOSCAN-001" },
      { startupId: ORG_ECOSCAN, type: "MSME_UDYAM", issuer: "Udyam Registration (simulated)", sourceType: "HUMAN_UPLOAD", assuranceLevel: "OFFICER_VERIFIED", status: "VERIFIED", issuedAt: iso("2024-05-10T00:00:00+05:30"), verifiedAt: iso("2026-06-02T10:00:00+05:30") },
      { startupId: ORG_ECOSCAN, type: "SECURITY_TEST_REPORT", issuer: "Independent security reviewer (simulated)", sourceType: "SYSTEM_EXPORT", assuranceLevel: "SYSTEM_OBSERVED", status: "VERIFIED", issuedAt: iso("2026-05-15T00:00:00+05:30"), expiresAt: iso("2027-05-15T00:00:00+05:30") },
      { startupId: ORG_BINSENSE, type: "DPIIT_RECOGNITION", issuer: "DPIIT (simulated)", sourceType: "HUMAN_UPLOAD", assuranceLevel: "SELF_DECLARED", status: "PENDING" },
      { startupId: ORG_BINSENSE, type: "MSME_UDYAM", issuer: "Udyam Registration (simulated)", sourceType: "HUMAN_UPLOAD", assuranceLevel: "OFFICER_VERIFIED", status: "VERIFIED", issuedAt: iso("2023-11-20T00:00:00+05:30"), verifiedAt: iso("2026-06-01T09:30:00+05:30") },
      { startupId: ORG_MARGDARSHAK, type: "DPIIT_RECOGNITION", issuer: "DPIIT (simulated)", sourceType: "SYSTEM_EXPORT", assuranceLevel: "AUTHORITY_ASSERTED", status: "VERIFIED", issuedAt: iso("2022-09-01T00:00:00+05:30"), verifiedAt: iso("2026-06-01T09:45:00+05:30") },
      { startupId: ORG_SAHAYAK, type: "DPIIT_RECOGNITION", issuer: "DPIIT (simulated)", sourceType: "SYSTEM_EXPORT", assuranceLevel: "AUTHORITY_ASSERTED", status: "VERIFIED", issuedAt: iso("2025-01-15T00:00:00+05:30"), verifiedAt: iso("2026-06-01T10:00:00+05:30") },
      { startupId: ORG_SAHAYAK, type: "MSME_UDYAM", issuer: "Udyam Registration (simulated)", sourceType: "HUMAN_UPLOAD", assuranceLevel: "OFFICER_VERIFIED", status: "VERIFIED", issuedAt: iso("2025-02-01T00:00:00+05:30"), verifiedAt: iso("2026-06-01T10:15:00+05:30") },
      // Deliberately no SECURITY_READINESS evidence for Sahayak: this is the
      // gap that fails eligibility criterion EL-2 in the Match step below —
      // an explainable, evidence-based rejection rather than an opaque one.
    ],
  });
}

// ---------------------------------------------------------------------------
// Challenge (Forge) — built and frozen through the real challenge-spec module
// ---------------------------------------------------------------------------

function buildChallengeDraft(): ChallengeSpec {
  return {
    schemaVersion: "mahasetu.challenge/1.0",
    challengeId: CHALLENGE_ID,
    version: 1,
    status: "UNDER_REVIEW",
    problem: {
      title: "Reduce community-bin overflow events in Ward 12",
      statement:
        "Overflowing community bins in Ward 12 are reported too late for an efficient collection response, causing repeated citizen complaints and inefficient truck routing.",
      affectedUsers: ["residents", "sanitation workers", "ward collection crews"],
      geography: ["synthetic-ward-12"],
      baseline: [
        { metric: "overflow_events_per_week", value: 42, unit: "events/week", source: "synthetic-baseline-v1" },
        { metric: "median_assignment_minutes", value: 45, unit: "minutes", source: "synthetic-baseline-v1" },
      ],
      constraints: [
        { id: "CON-1", statement: "Must operate without access to real citizen personal data.", category: "DATA", mandatory: true },
      ],
    },
    outcomes: [
      { id: "OUT-1", statement: "Detect overflow early enough for an operational collection response.", metricIds: ["MET-1", "MET-3"] },
      { id: "OUT-2", statement: "Assign a collection crew to a confirmed alert quickly.", metricIds: ["MET-2", "MET-4"] },
    ],
    metrics: [
      { id: "MET-1", name: "detection_recall", direction: "GTE", target: 0.9, unit: "ratio", window: "synthetic-waste-v1", measurementSource: "synthetic-observations-v1", calculatorVersion: "1.0.0", minimumSampleSize: 100 },
      { id: "MET-2", name: "median_assignment_minutes", direction: "LTE", target: 20, unit: "minutes", window: "synthetic-waste-v1", measurementSource: "synthetic-observations-v1", calculatorVersion: "1.0.0", minimumSampleSize: 50 },
      { id: "MET-3", name: "detection_precision", direction: "GTE", target: 0.85, unit: "ratio", window: "synthetic-waste-v1", measurementSource: "synthetic-observations-v1", calculatorVersion: "1.0.0", minimumSampleSize: 100 },
      { id: "MET-4", name: "alerts_assigned_within_target_rate", direction: "GTE", target: 0.8, unit: "ratio", window: "synthetic-waste-v1", measurementSource: "synthetic-observations-v1", calculatorVersion: "1.0.0", minimumSampleSize: 50 },
    ],
    eligibility: [
      { id: "EL-1", kind: "STARTUP_RECOGNITION", mandatory: true, acceptedEvidence: ["AUTHORITY_ASSERTED", "OFFICER_VERIFIED", "SIMULATED_FOR_DEMO"], verificationMethod: "Verify a current DPIIT-recognition evidence claim and its provenance metadata." },
      { id: "EL-2", kind: "SECURITY_READINESS", mandatory: true, acceptedEvidence: ["OFFICER_VERIFIED", "THIRD_PARTY_ATTESTED", "SYSTEM_OBSERVED"], verificationMethod: "Verify a current security or privacy readiness evidence claim." },
    ],
    rubric: [
      { id: "R-1", name: "Outcome approach", weight: 30, scoreMin: 0, scoreMax: 10 },
      { id: "R-2", name: "Pilot feasibility", weight: 25, scoreMin: 0, scoreMax: 10 },
      { id: "R-3", name: "Security and privacy", weight: 20, scoreMin: 0, scoreMax: 10 },
      { id: "R-4", name: "Interoperability and exit", weight: 15, scoreMin: 0, scoreMax: 10 },
      { id: "R-5", name: "Pilot cost", weight: 10, scoreMin: 0, scoreMax: 10 },
    ],
    timeline: {
      applicationsOpenAt: "2026-07-06T09:00:00+05:30",
      applicationsCloseAt: "2026-07-20T17:00:00+05:30",
      pilotStartAt: "2026-08-15T09:00:00+05:30",
      pilotEndAt: "2026-09-03T18:00:00+05:30",
      dependencyLeadTimeDays: 5,
    },
    sandbox: {
      datasetVersion: "synthetic-waste-v1",
      apiContractVersion: "waste-events-openapi/1.0",
      egress: "DENY_ALL",
      retentionHours: 24,
      testSuiteVersion: "waste-pilot/1.0",
      usesProductionCitizenData: false,
      dataClassification: "PUBLIC",
    },
    milestones: [
      {
        id: "MS-1",
        name: "Sandbox benchmark and early live-ward validation",
        paymentPercent: 100,
        requiredMetricIds: ["MET-1", "MET-2"],
        requiredEvidenceTypes: ["TEST_RUN", "LIMITATIONS_NOTE"],
        acceptanceStatement: "Accept when the recall and assignment-latency targets both pass and both evidence artifacts are reviewed.",
      },
    ],
    requirements: {
      accessibility: "Meet WCAG 2.2 AA checks for every user-facing pilot workflow.",
      interoperability: "Expose versioned open API contracts and documented export formats.",
      exitAndPortability: "Export government-owned data and provide a documented transition package.",
      securityAndPrivacy: "Use synthetic data and provide access-control and security test evidence.",
      grievanceRoute: "Publish one clarification channel with response windows and review ownership.",
    },
    governance: {
      policyPackVersion: "demo-maharashtra-innovation/0.1",
      requiredApproverRoles: ["PROBLEM_OWNER", "PROCUREMENT_REVIEWER"],
      publicationProfile: "PUBLIC_CHALLENGE_V1",
    },
    integrity: { frozenAt: null, contentHash: null },
  };
}

async function seedChallenge(): Promise<ChallengeSpec> {
  const draft = buildChallengeDraft();
  const frozen = freezeChallengeSpec(draft, {
    frozenAt: "2026-07-01T10:00:00+05:30",
    satisfiedApproverRoles: ["PROBLEM_OWNER", "PROCUREMENT_REVIEWER"],
    operatingMode: "DEMO",
  });
  // The content hash excludes `status`, so publishing after freeze does not
  // invalidate it — verified below by re-parsing the published document.
  const published: ChallengeSpec = { ...frozen, status: "PUBLISHED" };
  const validated = parseChallengeSpec(published);

  await prisma.challenge.create({
    data: {
      id: CHALLENGE_ID,
      processId: PROCESS_ID,
      departmentId: DEPT_PUNE,
      ownerId: USR_ANJALI,
      title: validated.problem.title,
      problem: validated.problem.statement,
      status: "PUBLISHED",
      version: 1,
      publishedAt: iso("2026-07-01T10:00:00+05:30"),
    },
  });

  await prisma.challengeSpecVersion.create({
    data: {
      id: SPEC_ID,
      challengeId: CHALLENGE_ID,
      version: 1,
      schemaVersion: validated.schemaVersion,
      document: toJson(validated),
      contentHash: validated.integrity.contentHash!,
      status: "FROZEN",
      createdBy: USR_RAHUL,
      frozenAt: iso(validated.integrity.frozenAt!),
    },
  });

  return validated;
}

// ---------------------------------------------------------------------------
// Matching — explainable, advisory recommendations (no pure module yet;
// MATCH-001 is not started, so these are hand-authored SIMULATED_FOR_DEMO
// scores following the Truth.md section 7.8 weighting formula).
// ---------------------------------------------------------------------------

async function seedMatches(): Promise<void> {
  const explain = (
    positiveReasons: string[],
    missingCapabilities: string[],
    evidenceSummary: string[],
  ) => ({
    positiveReasons,
    missingCapabilities,
    evidenceSummary,
    sensitiveAttributesUsed: false,
    formula: "0.40*capability_overlap + 0.25*semantic_similarity + 0.20*evidence_strength + 0.15*delivery_fit",
  });

  await prisma.match.createMany({
    data: [
      {
        challengeId: CHALLENGE_ID,
        startupId: ORG_ECOSCAN,
        eligibilityPass: true,
        semanticScore: 0.93,
        evidenceScore: 0.88,
        overallScore: 0.9,
        confidence: 0.91,
        modelVersion: "SIMULATED_FOR_DEMO/match-v0",
        explanation: toJson(
          explain(
            ["Overflow computer-vision detection matches the challenge outcome directly.", "Route-prioritization capability covers the second outcome.", "Verified security-test evidence satisfies EL-2."],
            [],
            ["StartupCapability civic-ops.cv.overflow-detection (proficiency 5)", "CredentialEvidence SECURITY_TEST_REPORT (SYSTEM_OBSERVED)"],
          ),
        ),
      },
      {
        challengeId: CHALLENGE_ID,
        startupId: ORG_BINSENSE,
        eligibilityPass: true,
        semanticScore: 0.61,
        evidenceScore: 0.62,
        overallScore: 0.64,
        confidence: 0.7,
        modelVersion: "SIMULATED_FOR_DEMO/match-v0",
        explanation: toJson(
          explain(
            ["IoT fill-level sensing is a plausible complementary detection approach.", "Udyam evidence is verified."],
            ["No computer-vision detection capability evidenced.", "Route-prioritization proficiency is low (2/5)."],
            ["StartupCapability civic-ops.iot.fill-sensing (proficiency 5)"],
          ),
        ),
      },
      {
        challengeId: CHALLENGE_ID,
        startupId: ORG_MARGDARSHAK,
        eligibilityPass: true,
        semanticScore: 0.58,
        evidenceScore: 0.55,
        overallScore: 0.57,
        confidence: 0.65,
        modelVersion: "SIMULATED_FOR_DEMO/match-v0",
        explanation: toJson(
          explain(
            ["Strong, production-proven route-prioritization capability."],
            ["No overflow-detection capability of any kind."],
            ["StartupCapability civic-ops.geo.route-priority (proficiency 5)"],
          ),
        ),
      },
      {
        challengeId: CHALLENGE_ID,
        startupId: ORG_SAHAYAK,
        eligibilityPass: false,
        semanticScore: 0.5,
        evidenceScore: 0.3,
        overallScore: 0.42,
        confidence: 0.4,
        modelVersion: "SIMULATED_FOR_DEMO/match-v0",
        explanation: toJson(
          explain(
            ["Offline-first field capture and Marathi UX are strong operating-context fits."],
            ["No verified evidence satisfies mandatory eligibility criterion EL-2 (security readiness).", "Overflow-detection capability is early-stage and unbenchmarked."],
            ["No CredentialEvidence of type matching EL-2 acceptedEvidence levels."],
          ),
        ),
      },
    ],
  });
}

// ---------------------------------------------------------------------------
// Applications and evaluation
// ---------------------------------------------------------------------------

async function seedProposalsAndEvaluation(): Promise<void> {
  await prisma.proposal.createMany({
    data: [
      {
        id: PROPOSAL_ECOSCAN,
        challengeId: CHALLENGE_ID,
        startupId: ORG_ECOSCAN,
        approach: "Fuse per-bin computer-vision overflow detection with a route-prioritization layer, deployed on edge devices with periodic sync.",
        outcomes: "Detect at least 90% of true overflow events and assign a crew within a 20-minute median once alerted.",
        timeline: toJson([
          { phase: "Sandbox benchmark", weeks: 2 },
          { phase: "Live-ward validation", weeks: 1 },
        ]),
        pilotCostInPaise: 185_000_00n,
        risks: "Camera coverage gaps in newly added bin clusters; intermittent ward connectivity.",
        status: "SELECTED",
        submittedAt: iso("2026-07-15T11:00:00+05:30"),
      },
      {
        id: PROPOSAL_BINSENSE,
        challengeId: CHALLENGE_ID,
        startupId: ORG_BINSENSE,
        approach: "Deploy IoT fill-level sensors on priority bins and route alerts through a threshold-based dashboard.",
        outcomes: "Detect fill-level threshold breaches and notify crews for assignment.",
        timeline: toJson([{ phase: "Sensor rollout", weeks: 3 }]),
        pilotCostInPaise: 210_000_00n,
        risks: "Detection depends on sensor battery life and placement accuracy, not direct visual confirmation.",
        status: "NOT_SELECTED",
        submittedAt: iso("2026-07-16T10:00:00+05:30"),
      },
      {
        id: PROPOSAL_MARGDARSHAK,
        challengeId: CHALLENGE_ID,
        startupId: ORG_MARGDARSHAK,
        approach: "Apply the existing route-optimization engine to reported overflow locations, without a dedicated detection layer.",
        outcomes: "Reduce assignment and travel time once an overflow is reported by any channel.",
        timeline: toJson([{ phase: "Route-engine integration", weeks: 2 }]),
        pilotCostInPaise: 140_000_00n,
        risks: "No independent overflow-detection capability; still depends on manual reporting.",
        status: "NOT_SELECTED",
        submittedAt: iso("2026-07-17T09:30:00+05:30"),
      },
    ],
  });

  await prisma.proposalAttachment.createMany({
    data: [
      { proposalId: PROPOSAL_ECOSCAN, type: "ARCHITECTURE_DIAGRAM", fileRef: "SIMULATED_FOR_DEMO/ecoscan-architecture.pdf", hash: "d".repeat(64), visibility: "EVALUATOR_ONLY" },
      { proposalId: PROPOSAL_BINSENSE, type: "DEMO_VIDEO_LINK", fileRef: "SIMULATED_FOR_DEMO/binsense-demo.mp4", hash: "e".repeat(64), visibility: "EVALUATOR_ONLY" },
      { proposalId: PROPOSAL_MARGDARSHAK, type: "ARCHITECTURE_DIAGRAM", fileRef: "SIMULATED_FOR_DEMO/margdarshak-architecture.pdf", hash: "f".repeat(64), visibility: "EVALUATOR_ONLY" },
    ],
  });

  const rubricScores: Record<string, Record<string, [number, number, number]>> = {
    // proposalId -> rubricCriterionId -> [eval1, eval2, eval3]
    [PROPOSAL_ECOSCAN]: {
      "R-1": [9, 8, 9],
      "R-2": [8, 8, 7],
      "R-3": [9, 5, 8], // deliberate divergence on R-3 (security) for FAIR-001-style review
      "R-4": [7, 7, 8],
      "R-5": [7, 6, 7],
    },
    [PROPOSAL_BINSENSE]: {
      "R-1": [6, 6, 5],
      "R-2": [6, 7, 6],
      "R-3": [6, 6, 5],
      "R-4": [6, 5, 6],
      "R-5": [5, 5, 6],
    },
    [PROPOSAL_MARGDARSHAK]: {
      "R-1": [4, 5, 4],
      "R-2": [7, 6, 7],
      "R-3": [6, 6, 6],
      "R-4": [6, 6, 5],
      "R-5": [8, 8, 7],
    },
  };
  const evaluators = [USR_EVAL_1, USR_EVAL_2, USR_EVAL_3];

  for (const [proposalId, criteria] of Object.entries(rubricScores)) {
    for (const [evaluatorIndex, evaluatorId] of evaluators.entries()) {
      const assignmentId = `ASSIGN-${proposalId}-${evaluatorId}`;
      // Evaluator 2 has a declared conflict on the Margdarshak proposal (a
      // prior consulting relationship) and recuses from scoring it — this is
      // the fairness pattern from Truth.md 6.7: independent scoring closes
      // before moderation, and a conflict removes the evaluator entirely.
      const hasConflict = proposalId === PROPOSAL_MARGDARSHAK && evaluatorId === USR_EVAL_2;

      await prisma.evaluatorAssignment.create({
        data: {
          id: assignmentId,
          proposalId,
          evaluatorId,
          status: hasConflict ? "CONFLICT_DECLARED" : "SCORED",
        },
      });
      await prisma.conflictDeclaration.create({
        data: {
          assignmentId,
          hasConflict,
          details: hasConflict ? "Prior paid consulting engagement with this startup within the last 12 months." : null,
        },
      });
      if (hasConflict) continue;

      await prisma.score.createMany({
        data: Object.entries(criteria).map(([rubricCriterionId, values]) => ({
          assignmentId,
          rubricCriterionId,
          value: values[evaluatorIndex] ?? 0,
          rationale: `Scored against the frozen rubric criterion ${rubricCriterionId} using the submitted proposal and attachments.`,
        })),
      });
    }
  }

  const weights: Record<string, number> = { "R-1": 30, "R-2": 25, "R-3": 20, "R-4": 15, "R-5": 10 };
  const finalScoreOf = (criteria: Record<string, [number, number, number]>, excludeEval2 = false): number => {
    let total = 0;
    for (const [criterionId, values] of Object.entries(criteria)) {
      const usable = excludeEval2 ? [values[0], values[2]] : values;
      const average = usable.reduce((sum, v) => sum + v, 0) / usable.length;
      total += (average * (weights[criterionId] ?? 0)) / 100;
    }
    return Math.round(total * 100) / 100;
  };

  await prisma.moderationDecision.createMany({
    data: [
      {
        proposalId: PROPOSAL_ECOSCAN,
        finalScore: finalScoreOf(rubricScores[PROPOSAL_ECOSCAN]!),
        decision: "SELECTED",
        rationale: "Highest weighted score with the only proposal offering an independent overflow-detection capability plus verified security evidence. The R-3 score divergence (5 vs 9) was reviewed and attributed to differing weight on unverified vs. verified evidence; retained per moderation panel discussion.",
        decidedBy: USR_RAHUL,
        decidedAt: iso("2026-07-24T15:00:00+05:30"),
      },
      {
        proposalId: PROPOSAL_BINSENSE,
        finalScore: finalScoreOf(rubricScores[PROPOSAL_BINSENSE]!),
        decision: "NOT_SELECTED",
        rationale: "Sensor-only detection is a weaker fit for the visual-overflow outcome than a computer-vision approach at comparable cost.",
        decidedBy: USR_RAHUL,
        decidedAt: iso("2026-07-24T15:05:00+05:30"),
      },
      {
        proposalId: PROPOSAL_MARGDARSHAK,
        finalScore: finalScoreOf(rubricScores[PROPOSAL_MARGDARSHAK]!, true),
        decision: "NOT_SELECTED",
        rationale: "No independent overflow-detection capability; still depends on manual reporting, which does not address the core detection-latency problem.",
        decidedBy: USR_RAHUL,
        decidedAt: iso("2026-07-24T15:10:00+05:30"),
      },
    ],
  });
}

// ---------------------------------------------------------------------------
// Pilot Mission Control — evidence and metrics computed by the real modules
// ---------------------------------------------------------------------------

async function seedPilot(spec: ChallengeSpec): Promise<{
  evidenceObjects: EvidenceObject[];
  metricObservationRows: Array<{
    id: string;
    metricDefinitionId: string;
    metricDefinitionVersion: string;
    name: string;
    value: number;
    unit: string;
    sampleSize: number;
    datasetVersion: string;
    calculatorVersion: string;
    qualityStatus: "PASS" | "FAIL";
    qualityIssues: string[];
    sourceEvidenceObjectIds: string[];
  }>;
}> {
  await prisma.pilot.create({
    data: {
      id: PILOT_ID,
      challengeId: CHALLENGE_ID,
      proposalId: PROPOSAL_ECOSCAN,
      ownerId: USR_ANJALI,
      startupLeadId: USR_ECOSCAN_LEAD,
      status: "COMPLETED",
      startAt: iso("2026-08-15T09:00:00+05:30"),
      endAt: iso("2026-09-03T18:00:00+05:30"),
      budgetInPaise: 185_000_00n,
      finalDecision: "GO",
    },
  });

  await prisma.pilotMetric.createMany({
    data: spec.metrics.map((metric) => ({
      pilotId: PILOT_ID,
      metricDefinitionId: metric.id,
      name: metric.name,
      baseline: metric.id === "MET-2" ? 45 : 0,
      target: metric.target,
      unit: metric.unit,
      source: "synthetic-baseline-v1",
      frequency: "per-sandbox-run",
    })),
  });

  const milestoneSpec = spec.milestones[0]!;
  await prisma.milestone.create({
    data: {
      id: MILESTONE_ID,
      pilotId: PILOT_ID,
      sequence: 1,
      name: milestoneSpec.name,
      dueAt: iso("2026-09-03T18:00:00+05:30"),
      paymentPercent: milestoneSpec.paymentPercent,
      status: "ACCEPTED",
      requiredMetricIds: milestoneSpec.requiredMetricIds,
      requiredEvidenceKinds: milestoneSpec.requiredEvidenceTypes as Array<
        "DATASET" | "TEST_RUN" | "LIMITATIONS_NOTE" | "TELEMETRY" | "OFFICER_OBSERVATION" | "ACCESSIBILITY_REPORT" | "SECURITY_REPORT"
      >,
      acceptanceStatement: milestoneSpec.acceptanceStatement ?? null,
    },
  });

  // --- Real evidence pipeline: parse the synthetic dataset, compute metrics,
  // build MetricObservation rows, and evaluate milestone acceptance — all via
  // the tested src/modules/evidence functions, not hand-typed numbers. ---
  const dataset = parseSyntheticWasteEventDataset(wasteEventFixture);
  const report = calculateWasteMetrics(dataset, 20);
  const observations = createWasteMetricObservations(report, SANDBOX_RUN_ID, ["SYN-EVIDENCE-DATASET-001"]);

  const evidenceObjects: EvidenceObject[] = [
    {
      id: "SYN-EVIDENCE-DATASET-001",
      kind: "DATASET",
      displayName: "Synthetic waste events v1",
      mediaType: "application/json",
      sizeBytes: 1,
      sha256: "a".repeat(64),
      classification: "INTERNAL",
      assuranceLevel: "SIMULATED_FOR_DEMO",
      sourceType: "SYSTEM_EXPORT",
      sourceReference: "data/fixtures/synthetic-waste-events.v1.json",
      synthetic: true,
      displayLabel: SYNTHETIC_DEMO_LABEL,
    },
    {
      id: "SYN-EVIDENCE-TEST-RUN-001",
      kind: "TEST_RUN",
      displayName: "Waste benchmark test run",
      mediaType: "application/json",
      sizeBytes: 1,
      sha256: "b".repeat(64),
      classification: "INTERNAL",
      assuranceLevel: "SYSTEM_OBSERVED",
      sourceType: "CONTROLLED_RUN",
      sourceReference: SANDBOX_RUN_ID,
      synthetic: true,
      displayLabel: SYNTHETIC_DEMO_LABEL,
    },
    {
      id: "SYN-EVIDENCE-LIMITATIONS-001",
      kind: "LIMITATIONS_NOTE",
      displayName: "Synthetic benchmark limitations",
      mediaType: "text/markdown",
      sizeBytes: 1,
      sha256: "c".repeat(64),
      classification: "INTERNAL",
      assuranceLevel: "SIMULATED_FOR_DEMO",
      sourceType: "HUMAN_UPLOAD",
      sourceReference: "SYN-LIMITATIONS-NOTE-001",
      synthetic: true,
      displayLabel: SYNTHETIC_DEMO_LABEL,
    },
  ];

  await prisma.sandboxRun.create({
    data: {
      id: SANDBOX_RUN_ID,
      pilotId: PILOT_ID,
      manifestVersion: "waste-sandbox/1.0.0",
      datasetVersion: report.datasetVersion,
      calculatorVersion: report.calculatorVersion,
      status: "COMPLETED",
      sourceEvidenceObjectIds: ["SYN-EVIDENCE-DATASET-001"],
      synthetic: true,
    },
  });

  await prisma.evidenceObject.createMany({
    data: evidenceObjects.map((evidence) => ({
      id: evidence.id,
      pilotId: PILOT_ID,
      milestoneId: MILESTONE_ID,
      kind: evidence.kind,
      displayName: evidence.displayName,
      mediaType: evidence.mediaType,
      sizeBytes: evidence.sizeBytes,
      sha256: evidence.sha256,
      classification: evidence.classification,
      assuranceLevel: evidence.assuranceLevel,
      sourceType: evidence.sourceType,
      sourceReference: evidence.sourceReference,
      synthetic: evidence.synthetic,
    })),
  });

  const metricObservationRows = observations.map((observation) => ({
    id: observation.id,
    metricDefinitionId: observation.metricDefinitionId,
    metricDefinitionVersion: observation.metricDefinitionVersion,
    name: observation.name,
    value: observation.value,
    unit: observation.unit,
    sampleSize: observation.sampleSize,
    datasetVersion: observation.datasetVersion,
    calculatorVersion: observation.calculatorVersion,
    qualityStatus: observation.quality.status,
    qualityIssues: [...observation.quality.issues],
    sourceEvidenceObjectIds: [...observation.sourceEvidenceObjectIds],
  }));

  await prisma.metricObservation.createMany({
    data: metricObservationRows.map((observation) => ({
      id: observation.id,
      pilotId: PILOT_ID,
      runId: SANDBOX_RUN_ID,
      metricDefinitionId: observation.metricDefinitionId,
      metricDefinitionVersion: observation.metricDefinitionVersion,
      name: observation.name,
      value: observation.value,
      unit: observation.unit,
      sampleSize: observation.sampleSize,
      datasetVersion: observation.datasetVersion,
      calculatorVersion: observation.calculatorVersion,
      sourceEvidenceObjectIds: observation.sourceEvidenceObjectIds,
      qualityStatus: observation.qualityStatus,
      qualityIssues: observation.qualityIssues,
      synthetic: true,
    })),
  });

  await prisma.evidenceClaim.create({
    data: {
      id: "SYN-CLAIM-MS-1-RECALL",
      subjectType: "MILESTONE",
      subjectId: MILESTONE_ID,
      predicate: "detection_recall_gte_0_90",
      value: toJson(true),
      assuranceLevel: "SYSTEM_OBSERVED",
      verificationMethod: "HYBRID",
      supportingEvidenceObjectIds: ["SYN-EVIDENCE-TEST-RUN-001"],
      supportingMetricObservationIds: [`${SANDBOX_RUN_ID}:MET-1`],
      contradictingEvidenceObjectIds: [],
      issuerId: "SYN-MAHASETU-SANDBOX",
      synthetic: true,
    },
  });

  const milestoneDefinition: MilestoneDefinition = {
    id: "MS-1",
    name: milestoneSpec.name,
    requiredMetrics: [
      { metricDefinitionId: "MET-1", metricDefinitionVersion: "1.0.0", direction: "GTE", target: 0.9, minimumSampleSize: 100, requiredDatasetVersion: "synthetic-waste-v1", requiredCalculatorVersion: "1.0.0" },
      { metricDefinitionId: "MET-2", metricDefinitionVersion: "1.0.0", direction: "LTE", target: 20, minimumSampleSize: 50, requiredDatasetVersion: "synthetic-waste-v1", requiredCalculatorVersion: "1.0.0" },
    ],
    requiredEvidenceKinds: ["TEST_RUN", "LIMITATIONS_NOTE"],
  };
  const evaluation = evaluateMilestoneAcceptance({
    evaluationId: "SYN-EVALUATION-MS-1-SEED",
    milestone: milestoneDefinition,
    metricObservations: observations,
    evidenceObjects,
  });

  await prisma.milestoneAcceptanceEvaluation.create({
    data: {
      id: evaluation.id,
      milestoneId: MILESTONE_ID,
      status: evaluation.status,
      rulesSatisfied: evaluation.rulesSatisfied,
      blockerCodes: [...evaluation.blockerCodes],
      summary: evaluation.summary,
      metricEvaluations: toJson(evaluation.metricEvaluations),
      evidenceEvaluations: toJson(evaluation.evidenceEvaluations),
    },
  });

  await prisma.milestoneReview.create({
    data: {
      milestoneId: MILESTONE_ID,
      reviewerId: USR_ANJALI,
      decision: "ACCEPTED",
      reason: "Sandbox benchmark and live-ward validation both meet their targets; both required evidence artifacts are present. Approved for milestone payment.",
      reviewedAt: iso("2026-09-04T10:00:00+05:30"),
    },
  });

  await prisma.riskItem.create({
    data: {
      pilotId: PILOT_ID,
      title: "Ward 12 network connectivity gaps during monsoon",
      probability: "MEDIUM",
      impact: "MEDIUM",
      mitigation: "Cache detections locally on the edge device and sync when connectivity resumes.",
      ownerId: USR_ECOSCAN_LEAD,
      status: "MITIGATED",
    },
  });

  await prisma.changeRequest.create({
    data: {
      pilotId: PILOT_ID,
      requestedBy: USR_ECOSCAN_LEAD,
      change: "Extend the sandbox-benchmark window by 3 days to capture a full weekly cycle.",
      impact: "Pilot end date shifts by 3 days; no additional budget required.",
      decision: "APPROVED",
      reason: "Improves metric sample size without changing pilot cost.",
    },
  });

  return { evidenceObjects, metricObservationRows };
}

// ---------------------------------------------------------------------------
// Payments — driven through the real state machine, one PaymentEvent per
// transition, exactly as src/modules/payments/payment-readiness.ts requires.
// ---------------------------------------------------------------------------

async function seedPayment(): Promise<void> {
  let snapshot: PaymentRequestSnapshot = createPaymentRequestSnapshot({
    requestId: PAYMENT_REQUEST_ID,
    integrationMode: "OFFLINE_FIXTURE",
  });

  const readiness = evaluatePaymentReadiness({
    milestoneId: MILESTONE_ID,
    milestoneStatus: "ACCEPTED",
    milestoneAcceptanceId: "SYN-EVALUATION-MS-1-SEED",
    milestoneAcceptanceMilestoneId: MILESTONE_ID,
    requiredEvidenceIds: ["SYN-EVIDENCE-TEST-RUN-001", "SYN-EVIDENCE-LIMITATIONS-001"],
    attachedEvidenceIds: ["SYN-EVIDENCE-TEST-RUN-001", "SYN-EVIDENCE-LIMITATIONS-001"],
    evidenceMilestoneBindings: [
      { evidenceId: "SYN-EVIDENCE-TEST-RUN-001", milestoneId: MILESTONE_ID },
      { evidenceId: "SYN-EVIDENCE-LIMITATIONS-001", milestoneId: MILESTONE_ID },
    ],
    invoiceReference: "SYN-INVOICE-ECOSCAN-MS1",
    amountInPaise: 185_000_00,
    budgetReference: "SYN-BUDGET-DEPT-PUNE-SWM-2026",
    beneficiaryReference: "SYN-BENEFICIARY-ECOSCAN-MASKED",
  });
  if (!readiness.ready) {
    throw new Error(`Seed payment packet is not ready: ${readiness.findings.map((f) => f.code).join(", ")}`);
  }

  type Step = {
    to: PaymentRequestSnapshot["state"];
    actorRole: "PILOT_REVIEWER" | "FINANCE_OFFICER" | "PAYMENT_ADAPTER";
    actorId: string;
    reason?: string;
    adapterIdempotencyKey?: string;
    adapterReplayKey?: string;
  };
  const steps: Step[] = [
    { to: "DRAFT", actorRole: "PILOT_REVIEWER", actorId: USR_ANJALI },
    { to: "FINANCE_REVIEW", actorRole: "PILOT_REVIEWER", actorId: USR_ANJALI },
    { to: "APPROVED", actorRole: "FINANCE_OFFICER", actorId: USR_SUNITA },
    { to: "ADAPTER_SUBMITTED", actorRole: "PAYMENT_ADAPTER", actorId: "SYN-PFMS-MOCK-ADAPTER", adapterIdempotencyKey: `IDEMP-${PAYMENT_REQUEST_ID}`, adapterReplayKey: `REPLAY-${PAYMENT_REQUEST_ID}-1` },
    { to: "PROCESSING", actorRole: "PAYMENT_ADAPTER", actorId: "SYN-PFMS-MOCK-ADAPTER", adapterIdempotencyKey: `IDEMP-${PAYMENT_REQUEST_ID}`, adapterReplayKey: `REPLAY-${PAYMENT_REQUEST_ID}-2` },
    { to: "PAID", actorRole: "PAYMENT_ADAPTER", actorId: "SYN-PFMS-MOCK-ADAPTER", adapterIdempotencyKey: `IDEMP-${PAYMENT_REQUEST_ID}`, adapterReplayKey: `REPLAY-${PAYMENT_REQUEST_ID}-3` },
  ];

  const events: Array<{ fromState: string; toState: string; actorId: string; actorRole: string; reason: string | null; adapterReplayKey: string | null; occurredAt: Date }> = [];
  const baseTime = iso("2026-09-04T10:30:00+05:30").getTime();
  steps.forEach((step, index) => {
    const from = snapshot.state;
    snapshot = transitionPaymentRequest({
      paymentRequest: snapshot,
      expectedState: from,
      to: step.to,
      actorRole: step.actorRole,
      readiness,
      reason: step.reason,
      adapterIdempotencyKey: step.adapterIdempotencyKey,
      adapterReplayKey: step.adapterReplayKey,
    });
    events.push({
      fromState: from,
      toState: step.to,
      actorId: step.actorId,
      actorRole: step.actorRole,
      reason: step.reason ?? null,
      adapterReplayKey: step.adapterReplayKey ?? null,
      occurredAt: new Date(baseTime + index * 15 * 60_000),
    });
  });

  await prisma.paymentRequest.create({
    data: {
      id: PAYMENT_REQUEST_ID,
      milestoneId: MILESTONE_ID,
      state: snapshot.state,
      integrationMode: snapshot.integrationMode,
      amountInPaise: 185_000_00n,
      invoiceReference: "SYN-INVOICE-ECOSCAN-MS1",
      budgetReference: "SYN-BUDGET-DEPT-PUNE-SWM-2026",
      beneficiaryReference: "SYN-BENEFICIARY-ECOSCAN-MASKED",
      adapterIdempotencyKey: snapshot.adapterIdempotencyKey,
      requestedAt: iso("2026-09-04T10:30:00+05:30"),
      paidAt: iso("2026-09-04T11:15:00+05:30"),
    },
  });

  await prisma.paymentEvent.createMany({
    data: events.map((event) => ({
      paymentRequestId: PAYMENT_REQUEST_ID,
      fromState: event.fromState as never,
      toState: event.toState as never,
      actorId: event.actorId,
      actorRole: event.actorRole as never,
      reason: event.reason,
      adapterReplayKey: event.adapterReplayKey,
      occurredAt: event.occurredAt,
    })),
  });

  // Sanity check: the label must always carry the simulation marker for a
  // non-LIVE integration mode (Truth.md section 10.3 safe-wording rule).
  const label = paymentStatusLabel(snapshot);
  if (!label.includes("OFFLINE_FIXTURE")) {
    throw new Error(`Payment status label lost its simulation marker: ${label}`);
  }
}

// ---------------------------------------------------------------------------
// Proven Solutions Exchange — transferability computed by the real module
// ---------------------------------------------------------------------------

async function seedExchange(): Promise<void> {
  await prisma.solutionCard.create({
    data: {
      id: SOLUTION_CARD_ID,
      pilotId: PILOT_ID,
      startupId: ORG_ECOSCAN,
      title: "Overflow Vision + Route Prioritization for Municipal Solid Waste",
      summary: "Computer-vision overflow detection fused with route-prioritization, validated in a synthetic Ward 12 sandbox and live-ward pilot.",
      outcomes: toJson({
        detectionRecall: 0.92,
        detectionPrecision: 0.958333,
        medianAssignmentMinutes: 15,
        alertsAssignedWithinTargetRate: 0.916667,
        displayLabel: SYNTHETIC_DEMO_LABEL,
      }),
      limitations: "Requires camera coverage per bin cluster; intermittent connectivity requires local caching (see the pilot's risk register).",
      evidenceStrength: "STRONG — sandbox precision/recall plus live-ward assignment-latency evidence, both machine-observed.",
      status: "PUBLISHED",
      attestedById: USR_ANJALI,
      publishedAt: iso("2026-09-05T09:00:00+05:30"),
    },
  });

  await prisma.pilotAttestation.create({
    data: {
      startupId: ORG_ECOSCAN,
      pilotId: PILOT_ID,
      issuerDepartmentId: DEPT_PUNE,
      outcomeHash: "9".repeat(64),
      issuedAt: iso("2026-09-05T09:00:00+05:30"),
      status: "ISSUED",
    },
  });

  const scenario = (transferabilityFixture as {
    scenarios: {
      intermittentConnectivityGap: {
        assessmentId: string;
        solutionCardId: string;
        sourceContextId: string;
        targetContextId: string;
        synthetic: true;
        displayLabel: "Synthetic demonstration data";
        factors: Array<{
          key: string;
          score: number;
          rationale: string;
          evidenceIds: string[];
          gaps: string[];
          constraint: string;
        }>;
      };
    };
  }).scenarios.intermittentConnectivityGap;

  const assessment = assessTransferability({
    assessmentId: TRANSFERABILITY_ID,
    solutionCardId: SOLUTION_CARD_ID,
    sourceContextId: scenario.sourceContextId,
    targetContextId: scenario.targetContextId,
    synthetic: true,
    displayLabel: "Synthetic demonstration data",
    factors: scenario.factors as never,
  });

  await prisma.transferabilityAssessment.create({
    data: {
      id: assessment.id,
      solutionCardId: SOLUTION_CARD_ID,
      sourceContextId: assessment.sourceContextId,
      targetDepartmentId: DEPT_NASHIK,
      score: assessment.score,
      recommendation: assessment.recommendation,
      factors: toJson(assessment.factors),
      bindingConstraints: [...assessment.bindingConstraints],
      reasons: [...assessment.reasons],
      gaps: [...assessment.gaps],
      synthetic: true,
    },
  });

  const pathwayByRecommendation: Record<string, "REUSE_EVIDENCE" | "LOCALIZED_MICRO_PILOT" | "FRAMEWORK_ROUTE" | "FRESH_EVALUATION"> = {
    REUSE_EVIDENCE_AND_ROUTE_TO_AUTHORIZED_PROCUREMENT: "REUSE_EVIDENCE",
    RUN_LOCALIZED_MICRO_PILOT: "LOCALIZED_MICRO_PILOT",
    REQUIRE_FRESH_COMPETITIVE_DISCOVERY: "FRESH_EVALUATION",
    NOT_CURRENTLY_TRANSFERABLE: "FRESH_EVALUATION",
  };

  await prisma.adoptionRequest.create({
    data: {
      id: ADOPTION_REQUEST_ID,
      solutionCardId: SOLUTION_CARD_ID,
      targetDepartmentId: DEPT_NASHIK,
      requesterId: USR_NASHIK_OFFICER,
      pathway: pathwayByRecommendation[assessment.recommendation] ?? "FRESH_EVALUATION",
      status: "REQUESTED",
    },
  });
}

// ---------------------------------------------------------------------------
// Audit timeline — a real hash chain built through appendAuditEvent, so the
// stored rows pass verifyAuditChain unmodified once read back.
// ---------------------------------------------------------------------------

/**
 * `AuditEventInput` (the pure module's type) only carries what actually feeds
 * the hash — id/occurredAt/actor/action/entity/correlationId/reason/metadata.
 * `causationId` and `classification` are Prisma-only columns layered on top,
 * tracked here by event id and merged back in after chaining.
 */
interface AuditDraftExtra {
  readonly causationId?: string;
  readonly classification?: $Enums.DataClassification;
}

async function seedAuditTrail(): Promise<void> {
  const actor = (id: string, role?: string, type: AuditActor["type"] = "USER"): AuditActor =>
    role ? { id, type, role } : { id, type };
  // `appendAuditEvent` hashes `occurredAt` as an exact string, but a Postgres
  // `DateTime` column round-trips through `.toISOString()` (UTC `Z`, padded
  // milliseconds). Normalizing every timestamp to that exact canonical form
  // *before* it is hashed is what makes the persisted rows verify unmodified
  // after a DB round-trip (see the AuditEvent.metadata schema comment for the
  // same class of issue with `metadata`).
  const at = (value: string): string => new Date(value).toISOString();

  const drafts: AuditEventInput[] = [
    { id: "AUD-001", occurredAt: at("2026-07-01T10:00:00+05:30"), actor: actor(USR_RAHUL, "PROCUREMENT_REVIEWER"), action: "challenge.frozen", entityType: "Challenge", entityId: CHALLENGE_ID, correlationId: CHALLENGE_ID, metadata: { contentHashPrefix: "computed" } },
    { id: "AUD-002", occurredAt: at("2026-07-01T10:05:00+05:30"), actor: actor(USR_ANJALI, "PROBLEM_OWNER"), action: "challenge.published", entityType: "Challenge", entityId: CHALLENGE_ID, correlationId: CHALLENGE_ID, metadata: { processId: PROCESS_ID } },
    { id: "AUD-003", occurredAt: at("2026-07-16T10:00:00+05:30"), actor: actor("SYN-MATCH-ENGINE", undefined, "SERVICE"), action: "match.generated", entityType: "Challenge", entityId: CHALLENGE_ID, correlationId: CHALLENGE_ID, metadata: { candidateCount: 4, modelVersion: "SIMULATED_FOR_DEMO/match-v0" } },
    { id: "AUD-004", occurredAt: at("2026-07-17T10:00:00+05:30"), actor: actor(USR_ECOSCAN_FOUNDER, "STARTUP_ADMIN"), action: "proposal.submitted", entityType: "Proposal", entityId: PROPOSAL_ECOSCAN, correlationId: CHALLENGE_ID },
    { id: "AUD-005", occurredAt: at("2026-07-24T15:00:00+05:30"), actor: actor(USR_RAHUL, "PROCUREMENT_REVIEWER"), action: "proposal.selected", entityType: "Proposal", entityId: PROPOSAL_ECOSCAN, correlationId: CHALLENGE_ID, reason: "Highest weighted rubric score with the only independent detection capability." },
    { id: "AUD-006", occurredAt: at("2026-08-15T09:00:00+05:30"), actor: actor(USR_ANJALI, "PROBLEM_OWNER"), action: "pilot.created", entityType: "Pilot", entityId: PILOT_ID, correlationId: PILOT_ID },
    { id: "AUD-007", occurredAt: at("2026-09-03T19:00:00+05:30"), actor: actor("SYN-MAHASETU-SANDBOX", undefined, "SERVICE"), action: "milestone.evidence_submitted", entityType: "Milestone", entityId: MILESTONE_ID, correlationId: PILOT_ID, metadata: { evidenceObjectCount: 3 } },
    { id: "AUD-008", occurredAt: at("2026-09-04T10:00:00+05:30"), actor: actor(USR_ANJALI, "PROBLEM_OWNER"), action: "milestone.accepted", entityType: "Milestone", entityId: MILESTONE_ID, correlationId: PILOT_ID },
    { id: "AUD-009", occurredAt: at("2026-09-04T11:15:00+05:30"), actor: actor("SYN-PFMS-MOCK-ADAPTER", undefined, "SERVICE"), action: "payment.paid", entityType: "PaymentRequest", entityId: PAYMENT_REQUEST_ID, correlationId: PILOT_ID },
    { id: "AUD-010", occurredAt: at("2026-09-05T09:00:00+05:30"), actor: actor(USR_ANJALI, "PROBLEM_OWNER"), action: "solution.published", entityType: "SolutionCard", entityId: SOLUTION_CARD_ID, correlationId: SOLUTION_CARD_ID },
    { id: "AUD-011", occurredAt: at("2026-09-05T09:30:00+05:30"), actor: actor(USR_NASHIK_OFFICER, "PROBLEM_OWNER"), action: "adoption.requested", entityType: "AdoptionRequest", entityId: ADOPTION_REQUEST_ID, correlationId: SOLUTION_CARD_ID },
  ];
  const extrasById: Record<string, AuditDraftExtra> = {
    "AUD-009": { causationId: "AUD-008", classification: "CONFIDENTIAL_BUSINESS" },
  };

  let previous: AuditEvent | undefined;
  const chained: AuditEvent[] = [];
  for (const draft of drafts) {
    const event = appendAuditEvent(previous, draft);
    chained.push(event);
    previous = event;
  }

  await prisma.auditEvent.createMany({
    data: chained.map((event) => {
      const extra = extrasById[event.id] ?? {};
      return {
        id: event.id,
        sequence: event.sequence,
        schemaVersion: event.schemaVersion,
        occurredAt: iso(event.occurredAt),
        actorType: event.actor.type,
        actorId: event.actor.id,
        actorRole: event.actor.role ?? null,
        action: event.action,
        entityType: event.entityType,
        entityId: event.entityId,
        correlationId: event.correlationId,
        causationId: extra.causationId ?? null,
        reason: event.reason ?? null,
        classification: extra.classification ?? "INTERNAL",
        // Preserve "no metadata key at all" as a real SQL NULL rather than
        // folding it into `{}` — see the schema comment on AuditEvent.metadata.
        metadata: event.metadata === undefined ? Prisma.DbNull : toJson(event.metadata),
        previousHash: event.previousHash,
        eventHash: event.eventHash,
      };
    }),
  });
}

async function main(): Promise<void> {
  console.log("MahaSetu deterministic seed — SIMULATED_FOR_DEMO / Synthetic demonstration data only.");
  await resetDatabase();
  await seedIdentity();
  await seedPassport();
  const spec = await seedChallenge();
  await seedMatches();
  await seedProposalsAndEvaluation();
  await seedPilot(spec);
  await seedPayment();
  await seedExchange();
  await seedAuditTrail();
  console.log("Seed complete: 2 departments, 4 startups, 1 published challenge, 3 proposals, 1 completed pilot with a paid milestone, 1 published solution, 1 follow-on adoption request.");
}

main()
  .catch((error: unknown) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
