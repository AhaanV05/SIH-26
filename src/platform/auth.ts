/**
 * Authentication and authorization layer for the MahaSetu demo.
 *
 * This is a hackathon-safe seeded authentication system:
 * - Demo users are pre-seeded in the database
 * - Sessions are signed, short-lived cookies (not persistent identities)
 * - No passwords, hashing, or real identity verification
 * - All data is synthetic and labeled SIMULATED_FOR_DEMO
 */

import { prisma } from "./db/client";
import { readSession } from "./session";
import type { User, Membership } from "@prisma/client";

export type SessionUser = User & {
  memberships: Membership[];
};

export { createSession } from "./session";

/**
 * Validate a session and return the user if valid
 */
export async function getSessionUser(
  sessionId: string | undefined,
): Promise<SessionUser | null> {
  const session = await readSession(sessionId);
  if (!session) return null;

  const now = new Date();
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      memberships: {
        where: {
          activeFrom: { lte: now },
          OR: [{ activeTo: null }, { activeTo: { gt: now } }],
        },
      },
    },
  });

  return user?.status === "ACTIVE" ? user : null;
}

/**
 * Clear a session
 */
export function clearSession(): void {
  // Sessions are stateless. Clearing the cookie invalidates the browser session.
}

/**
 * Check if user has a specific membership role
 */
export function hasRole(user: SessionUser, role: string): boolean {
  return user.memberships.some((m) => m.role === role);
}

/**
 * Check if user is authorized for a specific role
 * Throws an error if not authorized
 */
export function requireRole(user: SessionUser | null, role: string): asserts user is SessionUser {
  if (!user) {
    throw new Error("Unauthorized: no session");
  }
  if (!hasRole(user, role)) {
    throw new Error(`Unauthorized: required role ${role}, but user has ${user.memberships.map((m) => m.role).join(", ")}`);
  }
}

/**
 * Check if user is authenticated
 * Throws an error if not authenticated
 */
export function requireAuth(user: SessionUser | null): asserts user is SessionUser {
  if (!user) {
    throw new Error("Unauthorized: no session");
  }
}

/**
 * Get demo users for testing
 * Maps to the seeded demo user IDs from prisma/seed.ts
 */
export const DEMO_USERS = {
  PROBLEM_OWNER: "USR-ANJALI-DESHMUKH",
  PROCUREMENT: "USR-RAHUL-KULKARNI",
  FINANCE: "USR-SUNITA-RANE",
  EVALUATOR: "USR-FARHAN-SHEIKH",
  STARTUP: "USR-ADITI-KULKARNI",
} as const;

/**
 * Map demo role names (from role-switcher) to demo user IDs
 */
export const DEMO_ROLE_TO_USER_ID: Record<string, string> = {
  "problem-owner": DEMO_USERS.PROBLEM_OWNER,
  procurement: DEMO_USERS.PROCUREMENT,
  finance: DEMO_USERS.FINANCE,
  evaluator: DEMO_USERS.EVALUATOR,
  startup: DEMO_USERS.STARTUP,
};
