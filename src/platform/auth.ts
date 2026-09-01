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

const DEMO_OFFLINE_USERS: Record<string, SessionUser> = {
  "USR-ANJALI-DESHMUKH": {
    id: "USR-ANJALI-DESHMUKH",
    name: "Anjali Deshmukh",
    email: "anjali.deshmukh@example-gov.test",
    status: "ACTIVE",
    locale: "en-IN",
    createdAt: new Date("2026-08-31T00:00:00+05:30"),
    updatedAt: new Date("2026-08-31T00:00:00+05:30"),
    memberships: [
      {
        id: "MEM-ANJALI-PROBLEM-OWNER",
        userId: "USR-ANJALI-DESHMUKH",
        organizationId: "ORG-GOV-MAHARASHTRA",
        role: "PROBLEM_OWNER",
        activeFrom: new Date("2026-08-01T00:00:00+05:30"),
        activeTo: null,
      },
    ],
  },
  "USR-RAHUL-KULKARNI": {
    id: "USR-RAHUL-KULKARNI",
    name: "Rahul Kulkarni",
    email: "rahul.kulkarni@example-gov.test",
    status: "ACTIVE",
    locale: "en-IN",
    createdAt: new Date("2026-08-31T00:00:00+05:30"),
    updatedAt: new Date("2026-08-31T00:00:00+05:30"),
    memberships: [
      {
        id: "MEM-RAHUL-PROCUREMENT",
        userId: "USR-RAHUL-KULKARNI",
        organizationId: "ORG-GOV-MAHARASHTRA",
        role: "PROCUREMENT_REVIEWER",
        activeFrom: new Date("2026-08-01T00:00:00+05:30"),
        activeTo: null,
      },
    ],
  },
  "USR-SUNITA-RANE": {
    id: "USR-SUNITA-RANE",
    name: "Sunita Rane",
    email: "sunita.rane@example-gov.test",
    status: "ACTIVE",
    locale: "en-IN",
    createdAt: new Date("2026-08-31T00:00:00+05:30"),
    updatedAt: new Date("2026-08-31T00:00:00+05:30"),
    memberships: [
      {
        id: "MEM-SUNITA-FINANCE",
        userId: "USR-SUNITA-RANE",
        organizationId: "ORG-GOV-MAHARASHTRA",
        role: "FINANCE_OFFICER",
        activeFrom: new Date("2026-08-01T00:00:00+05:30"),
        activeTo: null,
      },
    ],
  },
  "USR-FARHAN-SHEIKH": {
    id: "USR-FARHAN-SHEIKH",
    name: "Dr. Farhan Sheikh",
    email: "farhan.sheikh@example-eval.test",
    status: "ACTIVE",
    locale: "en-IN",
    createdAt: new Date("2026-08-31T00:00:00+05:30"),
    updatedAt: new Date("2026-08-31T00:00:00+05:30"),
    memberships: [
      {
        id: "MEM-FARHAN-EVALUATOR",
        userId: "USR-FARHAN-SHEIKH",
        organizationId: "ORG-MAHASETU-PLATFORM",
        role: "EVALUATOR",
        activeFrom: new Date("2026-08-01T00:00:00+05:30"),
        activeTo: null,
      },
    ],
  },
  "USR-ADITI-KULKARNI": {
    id: "USR-ADITI-KULKARNI",
    name: "Aditi Kulkarni",
    email: "aditi@ecoscan.example-startup.test",
    status: "ACTIVE",
    locale: "en-IN",
    createdAt: new Date("2026-08-31T00:00:00+05:30"),
    updatedAt: new Date("2026-08-31T00:00:00+05:30"),
    memberships: [
      {
        id: "MEM-ADITI-STARTUP-ADMIN",
        userId: "USR-ADITI-KULKARNI",
        organizationId: "ORG-ECOSCAN",
        role: "STARTUP_ADMIN",
        activeFrom: new Date("2026-08-01T00:00:00+05:30"),
        activeTo: null,
      },
    ],
  },
};

function isMockedPrismaClient(): boolean {
  const userAccessor = (prisma as { user?: { findUnique?: unknown } } | undefined)?.user;
  return typeof userAccessor?.findUnique === "function" && "mock" in (userAccessor.findUnique as object);
}

function getOfflineDemoUser(userId: string): SessionUser | null {
  if (!process.env.DATABASE_URL && !isMockedPrismaClient()) {
    return DEMO_OFFLINE_USERS[userId] ?? null;
  }
  return null;
}

/**
 * Validate a session and return the user if valid
 */
export async function getSessionUser(
  sessionId: string | undefined,
): Promise<SessionUser | null> {
  const session = await readSession(sessionId);
  if (!session) return null;

  const offlineUser = getOfflineDemoUser(session.userId);
  if (offlineUser) return offlineUser;

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

export const DEMO_USER_ID_TO_ROLE: Record<string, string> = Object.fromEntries(
  Object.entries(DEMO_ROLE_TO_USER_ID).map(([role, userId]) => [userId, role]),
);

export function getDemoRoleForUserId(userId: string): string | null {
  return DEMO_USER_ID_TO_ROLE[userId] ?? null;
}
