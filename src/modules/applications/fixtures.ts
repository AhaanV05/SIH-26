import type { Proposal } from "./proposal";

export const demoProposals: Proposal[] = [
  {
    id: "PROP-ECOSCAN-001",
    challengeId: "CHAL-WASTE-PUNE-001",
    startupId: "ORG-ECOSCAN",
    approach: "Fuse per-bin computer-vision overflow detection with route prioritization, deployed at the edge with periodic encrypted synchronization and an open dispatch API.",
    outcomes: "Detect at least 90% of true overflow events and assign a collection crew within a 20-minute median after alert generation.",
    timeline: [{ phase: "Sandbox benchmark", weeks: 2 }, { phase: "Ward validation", weeks: 1 }],
    pilotCostInPaise: 18_500_000,
    risks: "Camera occlusion and intermittent connectivity are mitigated through confidence thresholds, local caching, and manual fallback.",
    declarationsAccepted: true,
    status: "SELECTED",
    submittedAt: "2026-07-17T10:00:00+05:30",
    displayLabel: "SIMULATED_FOR_DEMO",
  },
  {
    id: "PROP-BINSENSE-001",
    challengeId: "CHAL-WASTE-PUNE-001",
    startupId: "ORG-BINSENSE",
    approach: "Install fill-level sensors on selected community bins and transmit threshold alerts to a lightweight municipal dashboard for dispatch planning.",
    outcomes: "Provide timely fill-level alerts for instrumented bins and reduce unnecessary visits through threshold-based scheduling.",
    timeline: [{ phase: "Sensor deployment", weeks: 3 }],
    pilotCostInPaise: 15_000_000,
    risks: "Sensor damage and calibration drift require weekly inspection, replacement stock, and conservative alert thresholds.",
    declarationsAccepted: true,
    status: "NOT_SELECTED",
    submittedAt: "2026-07-17T10:15:00+05:30",
    displayLabel: "SIMULATED_FOR_DEMO",
  },
];
