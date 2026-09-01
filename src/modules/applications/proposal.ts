import { z } from "zod";

export const proposalStatuses = [
  "DRAFT", "SUBMITTED", "ELIGIBILITY_REVIEW", "ELIGIBLE", "INELIGIBLE", "EVALUATION",
  "SHORTLISTED", "SELECTED", "NOT_SELECTED", "WITHDRAWN",
] as const;
export type ProposalStatus = (typeof proposalStatuses)[number];

export type ProposalActor = {
  userId: string;
  role: "STARTUP_ADMIN" | "STARTUP_CONTRIBUTOR" | "PROBLEM_OWNER" | "PROCUREMENT_REVIEWER" | "FINANCE_OFFICER" | "EVALUATOR" | "PLATFORM_ADMIN" | "AUDITOR";
  startupId?: string;
  assignedProposalIds?: readonly string[];
};

export const proposalInputSchema = z.object({
  challengeId: z.string().trim().min(1).max(120),
  startupId: z.string().trim().min(1).max(120),
  approach: z.string().trim().min(80).max(5_000),
  outcomes: z.string().trim().min(40).max(3_000),
  timeline: z.array(z.object({
    phase: z.string().trim().min(3).max(120),
    weeks: z.number().int().positive().max(52),
  })).min(1).max(12),
  pilotCostInPaise: z.number().int().positive().max(1_000_000_000),
  risks: z.string().trim().min(20).max(3_000),
  declarationsAccepted: z.literal(true),
});

export type ProposalInput = z.infer<typeof proposalInputSchema>;
export type Proposal = ProposalInput & {
  id: string;
  status: ProposalStatus;
  submittedAt?: string;
  displayLabel: "SIMULATED_FOR_DEMO";
};

const transitions: Record<ProposalStatus, readonly ProposalStatus[]> = {
  DRAFT: ["SUBMITTED"],
  SUBMITTED: ["ELIGIBILITY_REVIEW", "WITHDRAWN"],
  ELIGIBILITY_REVIEW: ["ELIGIBLE", "INELIGIBLE", "WITHDRAWN"],
  ELIGIBLE: ["EVALUATION", "WITHDRAWN"],
  INELIGIBLE: [],
  EVALUATION: ["SHORTLISTED", "NOT_SELECTED"],
  SHORTLISTED: ["SELECTED", "NOT_SELECTED"],
  SELECTED: [],
  NOT_SELECTED: [],
  WITHDRAWN: [],
};

const governmentProposalReaders = new Set<ProposalActor["role"]>([
  "PROBLEM_OWNER",
  "PROCUREMENT_REVIEWER",
  "PLATFORM_ADMIN",
  "AUDITOR",
]);

function isStartupRole(actor: ProposalActor): boolean {
  return actor.role === "STARTUP_ADMIN" || actor.role === "STARTUP_CONTRIBUTOR";
}

function canAuthorizeSubmission(actor: ProposalActor): boolean {
  return actor.role === "STARTUP_ADMIN";
}

export function authorizeProposalRead(actor: ProposalActor, proposal: Pick<Proposal, "id" | "startupId">): void {
  if (isStartupRole(actor)) {
    if (actor.startupId === proposal.startupId) return;
    throw new Error("FORBIDDEN_PROPOSAL_READ");
  }
  if (actor.role === "EVALUATOR" && !actor.assignedProposalIds?.includes(proposal.id)) {
    throw new Error("FORBIDDEN_PROPOSAL_READ");
  }
  if (actor.role === "EVALUATOR" || governmentProposalReaders.has(actor.role)) return;
  throw new Error("FORBIDDEN_PROPOSAL_READ");
}

export function createProposalDraft(input: unknown, actor: ProposalActor, id: string): Proposal {
  if (!isStartupRole(actor) || !actor.startupId) throw new Error("FORBIDDEN_PROPOSAL_CREATE");
  const parsed = proposalInputSchema.parse(input);
  if (actor.startupId !== parsed.startupId) {
    throw new Error("FORBIDDEN_PROPOSAL_CREATE");
  }
  return { ...parsed, displayLabel: "SIMULATED_FOR_DEMO", id, status: "DRAFT" };
}

export function transitionProposal(
  proposal: Proposal,
  to: ProposalStatus,
  actor: ProposalActor,
  atIso: string,
  challengeStatus: "PUBLISHED" | "APPLICATIONS_CLOSED" | "OTHER" = "OTHER",
): Proposal {
  if (!transitions[proposal.status].includes(to)) {
    throw new Error(`INVALID_PROPOSAL_TRANSITION:${proposal.status}->${to}`);
  }
  const startupAction = to === "SUBMITTED" || to === "WITHDRAWN";
  if (startupAction) {
    if (!canAuthorizeSubmission(actor) || actor.startupId !== proposal.startupId) throw new Error("FORBIDDEN_PROPOSAL_TRANSITION");
  } else if (actor.role !== "PROCUREMENT_REVIEWER" && actor.role !== "PLATFORM_ADMIN") {
    throw new Error("FORBIDDEN_PROPOSAL_TRANSITION");
  }
  if (to === "SUBMITTED" && challengeStatus !== "PUBLISHED") {
    throw new Error("CHALLENGE_NOT_OPEN");
  }
  if (!Number.isFinite(Date.parse(atIso))) throw new Error("atIso must be a valid ISO timestamp");
  return { ...proposal, status: to, submittedAt: to === "SUBMITTED" ? atIso : proposal.submittedAt };
}
