import wasteFixture from "../../data/fixtures/synthetic-waste-events.v1.json";

import { createChallengeSpecDraft } from "@/modules/challenges";
import {
  calculateWasteMetrics,
  parseSyntheticWasteEventDataset,
} from "@/modules/evidence";
<<<<<<< HEAD
=======
import {
  rankStartupMatches,
  type ChallengeMatchInput,
  type StartupProfileMatchInput,
  type StartupMatchResult,
} from "@/modules/matching";
>>>>>>> 1339371 (feat(matching):complete matching engine UI Integration, tests and route updates)
import { governmentNavigation } from "@/platform/navigation";

export type DashboardMetricSummary = {
  readonly openChallenges: number;
  readonly activePilots: number;
  readonly evidenceReuse: number;
  readonly timeToPilotDays: number;
};

export type DashboardSnapshot = {
  readonly problemTitle: string;
  readonly metrics: DashboardMetricSummary;
  readonly evidenceSummary: {
    readonly readyForReview: number;
    readonly readyRate: number;
    readonly handledWithinTargetRate: number;
  };
  readonly nextAction: string;
};

export type LifecycleRoute = {
  readonly href: string;
  readonly label: string;
  readonly shortLabel: string;
  readonly step: number;
  readonly status: "complete" | "active" | "upcoming";
  readonly summary: string;
};

export type RouteSnapshot = {
  readonly href: string;
  readonly title: string;
  readonly summary: string;
  readonly accent: string;
};

export type PulseRouteData = {
  readonly signalTitle: string;
  readonly eventsPerWeek: number;
  readonly confidence: number;
  readonly affectedAgencies: number;
  readonly metrics: {
    readonly wasteOverflow: number;
    readonly responseDelayHours: number;
    readonly citizenComplaints: number;
    readonly crossDeptImpact: number;
  };
};

export type ChallengesRouteData = {
  readonly currentChallenge: string;
  readonly status: "approved-draft" | "frozen-spec" | "under-review";
  readonly eligibilityChecks: number;
  readonly metrics: number;
  readonly openFindings: number;
  readonly timelinedays: number;
};

export type MatchesRouteData = {
  readonly topFit: string;
  readonly topFitScore: number;
<<<<<<< HEAD
  readonly topFitReferences: number;
  readonly matches: Array<{
    readonly name: string;
    readonly score: number;
    readonly note: string;
=======
  readonly topFitConfidence: number;
  readonly topFitReferences: number;
  readonly totalEvaluated: number;
  readonly eligibleCount: number;
  readonly ineligibleCount: number;
  readonly rankedMatches: readonly StartupMatchResult[];
  readonly matches: Array<{
    readonly id: string;
    readonly name: string;
    readonly score: number;
    readonly note: string;
    readonly eligible: boolean;
>>>>>>> 1339371 (feat(matching):complete matching engine UI Integration, tests and route updates)
  }>;
};

export type PilotsRouteData = {
  readonly pilotTitle: string;
  readonly sandboxDays: number;
  readonly milestonesCompleted: number;
  readonly totalMilestones: number;
  readonly metrics: {
    readonly setupStatus: string;
    readonly modelValidationPercent: number;
    readonly currentMilestoneState: string;
    readonly daysUntilCheckpoint: number;
  };
};

export type EvidenceRouteData = {
  readonly currentPacket: string;
  readonly evidenceCount: number;
  readonly blockerCount: number;
  readonly metrics: {
    readonly metricsPass: number;
    readonly totalMetrics: number;
    readonly evidenceObjects: number;
    readonly paymentPercent: number;
  };
};

export type SolutionsRouteData = {
  readonly reusableAsset: string;
  readonly departmentsCanReuse: number;
  readonly transfers: Array<{
    readonly name: string;
    readonly score: number;
    readonly note: string;
    readonly tone?: "positive" | "warning" | "neutral";
  }>;
};

export type AuditRouteData = {
  readonly chainStatus: "verified" | "pending";
  readonly eventCount: number;
  readonly continuityChecks: number;
  readonly events: Array<{
    readonly label: string;
    readonly time: string;
    readonly detail: string;
  }>;
};

const dataset = parseSyntheticWasteEventDataset(wasteFixture);
const report = calculateWasteMetrics(dataset, 20);
const challenge = createChallengeSpecDraft();

export function getDashboardSnapshot(): DashboardSnapshot {
  const handledWithinTargetRate = Math.round(
    (report.assignmentLatency.handledWithinTargetRate ?? 0) * 100,
  );

  return {
    problemTitle: challenge.problem.title,
    metrics: {
      openChallenges: 6,
      activePilots: 3,
      evidenceReuse: 4,
      timeToPilotDays: 18,
    },
    evidenceSummary: {
      readyForReview: Math.max(1, Math.round(handledWithinTargetRate / 10)),
      readyRate: handledWithinTargetRate,
      handledWithinTargetRate: handledWithinTargetRate,
    },
    nextAction: "Finish the procurement review and publish the challenge brief.",
  };
}

export function getLifecycleRouteData(): LifecycleRoute[] {
  return governmentNavigation.map((route, index) => {
    const snapshot = getRouteSnapshot(route.href);

    return {
      href: route.href,
      label: route.label,
      shortLabel: route.shortLabel,
      step: index + 1,
      status:
        index === 0 ? "active" : index === 1 ? "complete" : index <= 4 ? "upcoming" : "upcoming",
      summary: snapshot.summary,
    };
  });
}

export function getRouteSnapshot(href: string): RouteSnapshot {
  const route = governmentNavigation.find((item) => item.href === href) ?? {
    label: "Overview",
    href: "/",
    shortLabel: "01",
  };

  const summaryMap: Record<string, string> = {
    "/": "The government overview ties problem discovery to matching, pilot evidence, and reuse.",
    "/pulse": "Problem clustering and operational signal review for public-sector pain points.",
    "/challenges": "Outcome-based challenge design with staged review, approvals, and freeze safeguards.",
    "/matches": "Explainable startup matching driven by capabilities, readiness, and evidence.",
    "/pilots": "Pilot mission control for metrics, evidence, and milestone acceptance.",
    "/evidence": "Milestone evidence, ready-to-review packets, and human approval gating.",
    "/solutions": "Reusable evidence packages and transferability scoring for follow-on adoption.",
    "/audit": "Append-only event chains that preserve decision traceability and accountability.",
  };

  return {
    href: route.href,
    title: route.label,
    summary:
      summaryMap[route.href] ??
      "The workflow remains aligned to the MahaSetu signal-to-scale procurement model.",
    accent: challenge.problem.title,
  };
}

export function getPulseRouteData(): PulseRouteData {
  return {
    signalTitle: "Ward 12 waste overflow",
    eventsPerWeek: 42,
    confidence: 0.87,
    affectedAgencies: 6,
    metrics: {
      wasteOverflow: 87,
      responseDelayHours: 13,
      citizenComplaints: 1900,
      crossDeptImpact: 6,
    },
  };
}

export function getChallengesRouteData(): ChallengesRouteData {
  return {
    currentChallenge: "Waste response innovation",
    status: "approved-draft",
    eligibilityChecks: 11,
    metrics: 4,
    openFindings: 2,
    timelinedays: 18,
  };
}

<<<<<<< HEAD
export function getMatchesRouteData(): MatchesRouteData {
  return {
    topFit: "UrbanLoop Labs",
    topFitScore: 0.92,
    topFitReferences: 3,
    matches: [
      {
        name: "UrbanLoop Labs",
        score: 0.92,
        note: "Strong fit for data sensing and route optimization.",
      },
      {
        name: "BinTrace AI",
        score: 0.88,
        note: "Good field integration and pilot operating model.",
      },
      {
        name: "RoutePilot",
        score: 0.84,
        note: "Strong logistics capability with moderate data access needs.",
      },
      {
        name: "GeoFleet",
        score: 0.79,
        note: "Needs more sandbox access to meet unique constraints.",
      },
    ],
=======
const demoChallengeMatchInput: ChallengeMatchInput = {
  challengeId: "CHAL-WASTE-PUNE-001",
  departmentId: "DEPT-PUNE-SWM",
  title: "Reduce community-bin overflow events in Ward 12",
  problem:
    "Overflowing community bins in Ward 12 are reported too late for an efficient collection response, causing repeated citizen complaints and inefficient truck routing.",
  requiredCapabilityCodes: [
    "civic-ops.cv.overflow-detection",
    "civic-ops.logistics.route-optimization",
  ],
  desiredCapabilityCodes: [
    "civic-ops.iot.fill-sensing",
    "localization.language.marathi",
  ],
  eligibilityCriteria: [
    {
      id: "EL-1",
      kind: "STARTUP_RECOGNITION",
      mandatory: true,
      acceptedEvidence: [
        "AUTHORITY_ASSERTED",
        "OFFICER_VERIFIED",
        "SIMULATED_FOR_DEMO",
      ],
    },
    {
      id: "EL-2",
      kind: "SECURITY_READINESS",
      mandatory: true,
      acceptedEvidence: [
        "OFFICER_VERIFIED",
        "THIRD_PARTY_ATTESTED",
        "SYSTEM_OBSERVED",
      ],
    },
  ],
  preferredDeploymentModels: [
    "ON_PREMISE_GOVERNMENT_CLOUD",
    "HYBRID",
    "CLOUD_MANAGED",
  ],
  preferredLanguages: ["mr", "hi", "en", "mr-IN", "en-IN"],
  targetLocations: ["Pune", "Maharashtra"],
  keywords: [
    "waste",
    "overflow",
    "detection",
    "routing",
    "computer-vision",
    "sanitation",
  ],
};

const demoStartups: StartupProfileMatchInput[] = [
  {
    startupId: "ORG-ECOSCAN",
    organizationId: "ORG-ECOSCAN",
    legalName: "EcoScan Intelligence Private Limited",
    displayName: "EcoScan Labs",
    summary:
      "Computer vision and AI analytics for civic waste overflow detection, automated bin fill level alerts, and dynamic route optimization.",
    capabilityCodes: [
      "civic-ops.cv.overflow-detection",
      "civic-ops.logistics.route-optimization",
      "civic-ops.security.access-control",
    ],
    capabilities: [
      {
        capabilityCode: "civic-ops.cv.overflow-detection",
        proficiency: 5,
        taxonomyPath: "civic-ops.cv.overflow-detection",
        evidenceSummary: "Sandbox benchmark on synthetic dataset",
      },
      {
        capabilityCode: "civic-ops.logistics.route-optimization",
        proficiency: 4,
        taxonomyPath: "civic-ops.logistics.route-optimization",
        evidenceSummary: "Prior logistics pilot module",
      },
      {
        capabilityCode: "civic-ops.security.access-control",
        proficiency: 4,
        taxonomyPath: "civic-ops.security.access-control",
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
        type: "MSME_UDYAM",
        assuranceLevel: "OFFICER_VERIFIED",
        status: "VERIFIED",
      },
      {
        id: "EV-ECO-3",
        type: "SECURITY_TEST_REPORT",
        assuranceLevel: "SYSTEM_OBSERVED",
        status: "VERIFIED",
      },
    ],
    deploymentModels: ["ON_PREMISE_GOVERNMENT_CLOUD", "HYBRID", "SAAS"],
    supportedLanguages: ["en", "mr", "hi"],
    operatingLocations: ["Pune", "Maharashtra"],
    stage: "SEED",
  },
  {
    startupId: "ORG-BINSENSE",
    organizationId: "ORG-BINSENSE",
    legalName: "BinSense IoT Solutions LLP",
    displayName: "BinSense",
    summary:
      "Hardware IoT ultrasonic fill-level sensing for municipal waste bins with telemetry dashboard.",
    capabilityCodes: [
      "civic-ops.iot.fill-sensing",
      "civic-ops.logistics.route-optimization",
    ],
    capabilities: [
      {
        capabilityCode: "civic-ops.iot.fill-sensing",
        proficiency: 5,
        taxonomyPath: "civic-ops.iot.fill-sensing",
      },
      {
        capabilityCode: "civic-ops.logistics.route-optimization",
        proficiency: 2,
        taxonomyPath: "civic-ops.logistics.route-optimization",
      },
    ],
    credentialEvidence: [
      {
        id: "EV-BIN-1",
        type: "DPIIT_RECOGNITION",
        assuranceLevel: "SELF_DECLARED",
        status: "PENDING",
      },
      {
        id: "EV-BIN-2",
        type: "MSME_UDYAM",
        assuranceLevel: "OFFICER_VERIFIED",
        status: "VERIFIED",
      },
    ],
    deploymentModels: ["HYBRID"],
    supportedLanguages: ["en"],
    operatingLocations: ["Pune"],
    stage: "PRE_SEED",
  },
  {
    startupId: "ORG-MARGDARSHAK",
    organizationId: "ORG-MARGDARSHAK",
    legalName: "RouteMitra Technologies",
    displayName: "Margdarshak AI",
    summary:
      "High-performance route-optimization and dynamic fleet allocation engine for municipal operations.",
    capabilityCodes: [
      "civic-ops.geo.route-priority",
      "civic-ops.logistics.route-optimization",
    ],
    capabilities: [
      {
        capabilityCode: "civic-ops.geo.route-priority",
        proficiency: 5,
        taxonomyPath: "civic-ops.geo.route-priority",
      },
      {
        capabilityCode: "civic-ops.logistics.route-optimization",
        proficiency: 4,
        taxonomyPath: "civic-ops.logistics.route-optimization",
      },
    ],
    credentialEvidence: [
      {
        id: "EV-MARG-1",
        type: "DPIIT_RECOGNITION",
        assuranceLevel: "AUTHORITY_ASSERTED",
        status: "VERIFIED",
      },
      {
        id: "EV-MARG-2",
        type: "SECURITY_TEST_REPORT",
        assuranceLevel: "THIRD_PARTY_ATTESTED",
        status: "VERIFIED",
      },
    ],
    deploymentModels: ["CLOUD_MANAGED", "HYBRID"],
    supportedLanguages: ["en", "mr", "hi"],
    operatingLocations: ["Pune", "Mumbai", "Maharashtra"],
    stage: "SEED",
  },
  {
    startupId: "ORG-SAHAYAK",
    organizationId: "ORG-SAHAYAK",
    legalName: "Sahayak Solutions Private Limited",
    displayName: "Sahayak CivicTech",
    summary:
      "Offline-first Marathi field app for sanitation-worker reporting and voice alerts.",
    capabilityCodes: [
      "mobile.offline-first",
      "localization.language.marathi",
      "civic-ops.cv.overflow-detection",
    ],
    capabilities: [
      {
        capabilityCode: "mobile.offline-first",
        proficiency: 5,
        taxonomyPath: "mobile.offline-first",
      },
      {
        capabilityCode: "localization.language.marathi",
        proficiency: 5,
        taxonomyPath: "localization.language.marathi",
      },
      {
        capabilityCode: "civic-ops.cv.overflow-detection",
        proficiency: 2,
        taxonomyPath: "civic-ops.cv.overflow-detection",
      },
    ],
    credentialEvidence: [
      {
        id: "EV-SAH-1",
        type: "DPIIT_RECOGNITION",
        assuranceLevel: "AUTHORITY_ASSERTED",
        status: "VERIFIED",
      },
      {
        id: "EV-SAH-2",
        type: "MSME_UDYAM",
        assuranceLevel: "OFFICER_VERIFIED",
        status: "VERIFIED",
      },
      // Deliberately missing SECURITY_READINESS evidence
    ],
    deploymentModels: ["EDGE_DEVICE", "OFFLINE_FIRST"],
    supportedLanguages: ["mr", "hi", "en"],
    stage: "PRE_SEED",
  },
];

export function getMatchesRouteData(): MatchesRouteData {
  const batch = rankStartupMatches(demoChallengeMatchInput, demoStartups);
  const topMatch = batch.rankedMatches[0];

  const matches = batch.rankedMatches.map((m) => {
    let note = "";
    if (m.eligibilityPass) {
      note = m.explanation.positiveReasons[0] ?? m.breakdown.capabilityOverlap.rationale;
    } else {
      note = m.explanation.gaps[0] ?? "Did not pass mandatory eligibility criteria.";
    }

    return {
      id: m.startupId,
      name: m.displayName,
      score: m.overallScore,
      note,
      eligible: m.eligibilityPass,
    };
  });

  return {
    topFit: topMatch ? topMatch.displayName : "EcoScan Labs",
    topFitScore: topMatch ? topMatch.overallScore : 0.9,
    topFitConfidence: topMatch ? topMatch.confidence : 0.88,
    topFitReferences: 3,
    totalEvaluated: batch.totalEvaluated,
    eligibleCount: batch.eligibleCount,
    ineligibleCount: batch.ineligibleCount,
    rankedMatches: batch.rankedMatches,
    matches,
>>>>>>> 1339371 (feat(matching):complete matching engine UI Integration, tests and route updates)
  };
}

export function getPilotsRouteData(): PilotsRouteData {
  return {
    pilotTitle: "Ward 12 compact test",
    sandboxDays: 14,
    milestonesCompleted: 2,
    totalMilestones: 5,
    metrics: {
      setupStatus: "Done",
      modelValidationPercent: 94,
      currentMilestoneState: "In review",
      daysUntilCheckpoint: 6,
    },
  };
}

export function getEvidenceRouteData(): EvidenceRouteData {
  return {
    currentPacket: "Milestone 02",
    evidenceCount: 6,
    blockerCount: 2,
    metrics: {
      metricsPass: 4,
      totalMetrics: 4,
      evidenceObjects: 6,
      paymentPercent: 32,
    },
  };
}

export function getSolutionsRouteData(): SolutionsRouteData {
  return {
    reusableAsset: "Overflow detection stack",
    departmentsCanReuse: 3,
    transfers: [
      {
        name: "Urban mobility",
        score: 0.91,
        note: "Strong reuse signal for route planning and anomaly detection.",
        tone: "positive",
      },
      {
        name: "Water services",
        score: 0.86,
        note: "Useful for maintenance escalation and response forecasting.",
      },
      {
        name: "Solid waste",
        score: 0.94,
        note: "Highest transferability, with measured operating benefit.",
        tone: "positive",
      },
      {
        name: "Public safety",
        score: 0.72,
        note: "Needs additional policy context and field validation.",
        tone: "warning",
      },
    ],
  };
}

export function getAuditRouteData(): AuditRouteData {
  return {
    chainStatus: "verified",
    eventCount: 12,
    continuityChecks: 1,
    events: [
      {
        label: "Challenge frozen",
        time: "12:14",
        detail: "Spec hash created after review and approval by both officers.",
      },
      {
        label: "Startup shortlist",
        time: "12:26",
        detail: "Matching results published with weighting rationale.",
      },
      {
        label: "Pilot started",
        time: "13:11",
        detail: "Control environment and metrics were activated for live testing.",
      },
      {
        label: "Milestone review",
        time: "Awaiting",
        detail: "Human approval remains open for the next payment packet.",
      },
    ],
  };
}
<<<<<<< HEAD

=======
>>>>>>> 1339371 (feat(matching):complete matching engine UI Integration, tests and route updates)
