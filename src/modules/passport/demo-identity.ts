import type { PassportActor } from "./types";

export type DemoRequestActor = PassportActor & {
  assignedProposalIds?: readonly string[];
};

const actorsByUserId: Record<string, DemoRequestActor> = {
  "USR-ADITI-KULKARNI": { userId: "USR-ADITI-KULKARNI", role: "STARTUP_ADMIN", startupId: "ORG-ECOSCAN" },
  "USR-ANJALI-DESHMUKH": { userId: "USR-ANJALI-DESHMUKH", role: "PROBLEM_OWNER" },
  "USR-RAHUL-KULKARNI": { userId: "USR-RAHUL-KULKARNI", role: "PROCUREMENT_REVIEWER" },
  "USR-SUNITA-RANE": { userId: "USR-SUNITA-RANE", role: "FINANCE_OFFICER" },
  "USR-FARHAN-SHEIKH": {
    userId: "USR-FARHAN-SHEIKH",
    role: "EVALUATOR",
    assignedProposalIds: ["PROP-ECOSCAN-001"],
  },
  "USR-IRA-FERNANDES": { userId: "USR-IRA-FERNANDES", role: "AUDITOR" },
};

export function demoActorForUserId(userId: string): DemoRequestActor | null {
  return actorsByUserId[userId] ?? null;
}
