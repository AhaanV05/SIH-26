import type { MilestoneAcceptanceEvaluation } from "@/modules/evidence";

export type MilestoneWorkflowState =
  | "PLANNED"
  | "IN_PROGRESS"
  | "EVIDENCE_SUBMITTED"
  | "READY_FOR_HUMAN_ACCEPTANCE"
  | "ACCEPTED"
  | "RETURNED"
  | "REJECTED";

export type MilestoneActorRole =
  | "STARTUP_CONTRIBUTOR"
  | "PILOT_REVIEWER"
  | "EVIDENCE_RULE_ENGINE";

export type MilestoneWorkflowEvent = Readonly<{
  sequence: number;
  from: MilestoneWorkflowState;
  to: MilestoneWorkflowState;
  actorRole: MilestoneActorRole;
  reason: string;
  evidenceObjectIds: readonly string[];
  evaluationId?: string;
}>;

export type MilestoneWorkflowSnapshot = Readonly<{
  milestoneId: string;
  state: MilestoneWorkflowState;
  version: number;
  evidenceObjectIds: readonly string[];
  acceptanceEvaluationId: string | null;
  humanAuthorizationRequired: true;
  events: readonly MilestoneWorkflowEvent[];
}>;

export type MilestoneWorkflowCommand = Readonly<{
  expectedVersion: number;
  to: MilestoneWorkflowState;
  actorRole: MilestoneActorRole;
  reason: string;
  evidenceObjectIds?: readonly string[];
  acceptanceEvaluation?: MilestoneAcceptanceEvaluation;
}>;

const ALLOWED_TRANSITIONS: Readonly<
  Record<MilestoneWorkflowState, readonly MilestoneWorkflowState[]>
> = {
  PLANNED: ["IN_PROGRESS"],
  IN_PROGRESS: ["EVIDENCE_SUBMITTED"],
  EVIDENCE_SUBMITTED: ["READY_FOR_HUMAN_ACCEPTANCE", "RETURNED"],
  READY_FOR_HUMAN_ACCEPTANCE: ["ACCEPTED", "RETURNED", "REJECTED"],
  ACCEPTED: [],
  RETURNED: ["EVIDENCE_SUBMITTED"],
  REJECTED: [],
};

const ROLE_FOR_DESTINATION: Readonly<
  Record<MilestoneWorkflowState, MilestoneActorRole>
> = {
  PLANNED: "PILOT_REVIEWER",
  IN_PROGRESS: "PILOT_REVIEWER",
  EVIDENCE_SUBMITTED: "STARTUP_CONTRIBUTOR",
  READY_FOR_HUMAN_ACCEPTANCE: "EVIDENCE_RULE_ENGINE",
  ACCEPTED: "PILOT_REVIEWER",
  RETURNED: "PILOT_REVIEWER",
  REJECTED: "PILOT_REVIEWER",
};

function requireCanonicalText(value: string, field: string): string {
  if (!value.trim() || value !== value.trim()) {
    throw new Error(`${field} must be a non-empty canonical string`);
  }
  return value;
}

function uniqueCanonicalIds(values: readonly string[]): readonly string[] {
  const normalized = values.map((value) =>
    requireCanonicalText(value, "evidenceObjectId"),
  );
  if (new Set(normalized).size !== normalized.length) {
    throw new Error("evidenceObjectIds cannot contain duplicates");
  }
  return Object.freeze([...normalized].sort());
}

export function createMilestoneWorkflow(
  milestoneId: string,
): MilestoneWorkflowSnapshot {
  return Object.freeze({
    milestoneId: requireCanonicalText(milestoneId, "milestoneId"),
    state: "PLANNED",
    version: 0,
    evidenceObjectIds: Object.freeze([]),
    acceptanceEvaluationId: null,
    humanAuthorizationRequired: true,
    events: Object.freeze([]),
  });
}

export function transitionMilestoneWorkflow(
  snapshot: MilestoneWorkflowSnapshot,
  command: MilestoneWorkflowCommand,
): MilestoneWorkflowSnapshot {
  if (command.expectedVersion !== snapshot.version) {
    throw new Error(
      `Milestone version is ${snapshot.version}; expected ${command.expectedVersion}`,
    );
  }
  if (!ALLOWED_TRANSITIONS[snapshot.state].includes(command.to)) {
    throw new Error(
      `Milestone transition ${snapshot.state} -> ${command.to} is not allowed`,
    );
  }
  if (ROLE_FOR_DESTINATION[command.to] !== command.actorRole) {
    throw new Error(`${command.actorRole} cannot move a milestone to ${command.to}`);
  }

  const reason = requireCanonicalText(command.reason, "reason");
  let evidenceObjectIds = snapshot.evidenceObjectIds;
  let acceptanceEvaluationId = snapshot.acceptanceEvaluationId;

  if (command.to === "EVIDENCE_SUBMITTED") {
    evidenceObjectIds = uniqueCanonicalIds(command.evidenceObjectIds ?? []);
    if (evidenceObjectIds.length === 0) {
      throw new Error("Evidence submission requires at least one evidence object");
    }
    acceptanceEvaluationId = null;
  } else if (command.evidenceObjectIds !== undefined) {
    throw new Error("Evidence IDs may only be supplied with EVIDENCE_SUBMITTED");
  }

  if (command.to === "READY_FOR_HUMAN_ACCEPTANCE") {
    const evaluation = command.acceptanceEvaluation;
    if (!evaluation) {
      throw new Error("A deterministic acceptance evaluation is required");
    }
    if (evaluation.milestoneId !== snapshot.milestoneId) {
      throw new Error("Acceptance evaluation belongs to a different milestone");
    }
    if (
      evaluation.status !== "READY_FOR_HUMAN_ACCEPTANCE" ||
      !evaluation.rulesSatisfied ||
      evaluation.automaticAcceptancePerformed
    ) {
      throw new Error("Acceptance evaluation has unresolved deterministic blockers");
    }
    acceptanceEvaluationId = requireCanonicalText(evaluation.id, "evaluation.id");
  } else if (command.acceptanceEvaluation !== undefined) {
    throw new Error(
      "Acceptance evaluation may only be supplied for READY_FOR_HUMAN_ACCEPTANCE",
    );
  }

  if (
    (command.to === "ACCEPTED" || command.to === "REJECTED") &&
    !snapshot.acceptanceEvaluationId
  ) {
    throw new Error("A milestone decision requires a recorded acceptance evaluation");
  }

  const event: MilestoneWorkflowEvent = Object.freeze({
    sequence: snapshot.events.length + 1,
    from: snapshot.state,
    to: command.to,
    actorRole: command.actorRole,
    reason,
    evidenceObjectIds,
    ...(command.acceptanceEvaluation
      ? { evaluationId: command.acceptanceEvaluation.id }
      : {}),
  });

  return Object.freeze({
    milestoneId: snapshot.milestoneId,
    state: command.to,
    version: snapshot.version + 1,
    evidenceObjectIds,
    acceptanceEvaluationId,
    humanAuthorizationRequired: true,
    events: Object.freeze([...snapshot.events, event]),
  });
}

