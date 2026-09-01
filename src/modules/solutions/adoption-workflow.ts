import type {
  TransferabilityAssessment,
  TransferabilityRecommendation,
} from "./transferability";

export type AdoptionRequestState =
  | "DRAFT"
  | "ASSESSMENT_READY"
  | "SUBMITTED_FOR_AUTHORIZATION"
  | "AUTHORIZED"
  | "RETURNED";

export type AdoptionActorRole =
  | "PROBLEM_OWNER"
  | "TRANSFERABILITY_RULE_ENGINE"
  | "PROCUREMENT_REVIEWER";

export type AdoptionRequestSnapshot = Readonly<{
  requestId: string;
  solutionCardId: string;
  targetDepartmentId: string;
  state: AdoptionRequestState;
  version: number;
  recommendation: TransferabilityRecommendation | null;
  assessmentId: string | null;
  pathwayAuthorizedByHuman: boolean;
  history: readonly Readonly<{
    sequence: number;
    from: AdoptionRequestState;
    to: AdoptionRequestState;
    actorRole: AdoptionActorRole;
    reason: string;
  }>[];
}>;

export type AdoptionCommand = Readonly<{
  expectedVersion: number;
  to: AdoptionRequestState;
  actorRole: AdoptionActorRole;
  reason: string;
  assessment?: TransferabilityAssessment;
}>;

const ALLOWED: Readonly<Record<AdoptionRequestState, readonly AdoptionRequestState[]>> = {
  DRAFT: ["ASSESSMENT_READY"],
  ASSESSMENT_READY: ["SUBMITTED_FOR_AUTHORIZATION"],
  SUBMITTED_FOR_AUTHORIZATION: ["AUTHORIZED", "RETURNED"],
  AUTHORIZED: [],
  RETURNED: ["ASSESSMENT_READY"],
};

const REQUIRED_ROLE: Readonly<Record<AdoptionRequestState, AdoptionActorRole>> = {
  DRAFT: "PROBLEM_OWNER",
  ASSESSMENT_READY: "TRANSFERABILITY_RULE_ENGINE",
  SUBMITTED_FOR_AUTHORIZATION: "PROBLEM_OWNER",
  AUTHORIZED: "PROCUREMENT_REVIEWER",
  RETURNED: "PROCUREMENT_REVIEWER",
};

function canonical(value: string, field: string): string {
  if (!value.trim() || value !== value.trim()) {
    throw new Error(`${field} must be a non-empty canonical string`);
  }
  return value;
}

export function createAdoptionRequest(input: {
  requestId: string;
  solutionCardId: string;
  targetDepartmentId: string;
}): AdoptionRequestSnapshot {
  return Object.freeze({
    requestId: canonical(input.requestId, "requestId"),
    solutionCardId: canonical(input.solutionCardId, "solutionCardId"),
    targetDepartmentId: canonical(input.targetDepartmentId, "targetDepartmentId"),
    state: "DRAFT",
    version: 0,
    recommendation: null,
    assessmentId: null,
    pathwayAuthorizedByHuman: false,
    history: Object.freeze([]),
  });
}

export function transitionAdoptionRequest(
  snapshot: AdoptionRequestSnapshot,
  command: AdoptionCommand,
): AdoptionRequestSnapshot {
  if (snapshot.version !== command.expectedVersion) {
    throw new Error(
      `Adoption request version is ${snapshot.version}; expected ${command.expectedVersion}`,
    );
  }
  if (!ALLOWED[snapshot.state].includes(command.to)) {
    throw new Error(`Adoption transition ${snapshot.state} -> ${command.to} is not allowed`);
  }
  if (REQUIRED_ROLE[command.to] !== command.actorRole) {
    throw new Error(`${command.actorRole} cannot move an adoption request to ${command.to}`);
  }
  const reason = canonical(command.reason, "reason");

  let recommendation = snapshot.recommendation;
  let assessmentId = snapshot.assessmentId;
  if (command.to === "ASSESSMENT_READY") {
    const assessment = command.assessment;
    if (!assessment) throw new Error("A transferability assessment is required");
    if (assessment.solutionCardId !== snapshot.solutionCardId) {
      throw new Error("Assessment belongs to a different solution card");
    }
    if (assessment.targetContextId !== snapshot.targetDepartmentId) {
      throw new Error("Assessment belongs to a different target department");
    }
    if (!assessment.advisoryOnly || !assessment.humanAuthorizationRequired) {
      throw new Error("Transferability must remain advisory and human-authorized");
    }
    recommendation = assessment.recommendation;
    assessmentId = assessment.id;
  } else if (command.assessment !== undefined) {
    throw new Error("Assessment may only be attached when entering ASSESSMENT_READY");
  }

  if (
    (command.to === "SUBMITTED_FOR_AUTHORIZATION" || command.to === "AUTHORIZED") &&
    (!recommendation || !assessmentId)
  ) {
    throw new Error("An assessed pathway is required before authorization");
  }

  const history = Object.freeze([
    ...snapshot.history,
    Object.freeze({
      sequence: snapshot.history.length + 1,
      from: snapshot.state,
      to: command.to,
      actorRole: command.actorRole,
      reason,
    }),
  ]);

  return Object.freeze({
    requestId: snapshot.requestId,
    solutionCardId: snapshot.solutionCardId,
    targetDepartmentId: snapshot.targetDepartmentId,
    state: command.to,
    version: snapshot.version + 1,
    recommendation,
    assessmentId,
    pathwayAuthorizedByHuman: command.to === "AUTHORIZED",
    history,
  });
}

