/**
 * Tests for authentication and authorization
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { createSession, getSessionUser, clearSession, hasRole, requireAuth, requireRole } from "../../../src/platform/auth";
import { prisma } from "../../../src/platform/db/client";
import type { User, Membership, UserStatus } from "@prisma/client";

// Mock Prisma
vi.mock("../../../src/platform/db/client", () => {
  const mockPrisma = {
    user: {
      findUnique: vi.fn(),
    },
  };
  return { prisma: mockPrisma };
});

// Demo user IDs from the seed
const DEMO_FINANCE_USER_ID = "USR-SUNITA-RANE";
const DEMO_PROBLEM_OWNER_USER_ID = "USR-ANJALI-DESHMUKH";

// Mock user data
const mockFinanceUser: User & { memberships: Membership[] } = {
  id: DEMO_FINANCE_USER_ID,
  name: "Sunita Rane",
  email: "sunita.rane@example-gov.test",
  locale: "en-IN",
  status: "ACTIVE" as UserStatus,
  createdAt: new Date(),
  updatedAt: new Date(),
  memberships: [
    {
      id: "mem-1",
      userId: DEMO_FINANCE_USER_ID,
      organizationId: "ORG-GOV",
      role: "FINANCE_OFFICER",
      activeFrom: new Date(),
      activeTo: null,
    },
  ],
};

const mockProblemOwnerUser: User & { memberships: Membership[] } = {
  id: DEMO_PROBLEM_OWNER_USER_ID,
  name: "Anjali Deshmukh",
  email: "anjali.deshmukh@example-gov.test",
  locale: "en-IN",
  status: "ACTIVE" as UserStatus,
  createdAt: new Date(),
  updatedAt: new Date(),
  memberships: [
    {
      id: "mem-2",
      userId: DEMO_PROBLEM_OWNER_USER_ID,
      organizationId: "ORG-GOV",
      role: "PROBLEM_OWNER",
      activeFrom: new Date(),
      activeTo: null,
    },
  ],
};

describe("Authentication and Authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Session management", () => {
    it("creates and validates a session", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockFinanceUser);

      const sessionId = await createSession(DEMO_FINANCE_USER_ID);
      expect(sessionId).toContain(".");

      const user = await getSessionUser(sessionId);
      expect(user).not.toBeNull();
      expect(user?.id).toBe(DEMO_FINANCE_USER_ID);
    });

    it("returns null for invalid session ID", async () => {
      const user = await getSessionUser("invalid-session-id");
      expect(user).toBeNull();
    });

    it("rejects a tampered session", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockFinanceUser);

      const sessionId = await createSession(DEMO_FINANCE_USER_ID);

      clearSession();

      const user = await getSessionUser(`${sessionId}tampered`);
      expect(user).toBeNull();
    });

    it("loads user with memberships", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockFinanceUser);

      const sessionId = await createSession(DEMO_FINANCE_USER_ID);

      const user = await getSessionUser(sessionId);
      expect(user?.memberships).toBeDefined();
      expect(user?.memberships.length).toBeGreaterThan(0);
      expect(user?.memberships.some((m) => m.role === "FINANCE_OFFICER")).toBe(true);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: DEMO_FINANCE_USER_ID },
        include: {
          memberships: {
            where: {
              activeFrom: { lte: expect.any(Date) },
              OR: [
                { activeTo: null },
                { activeTo: { gt: expect.any(Date) } },
              ],
            },
          },
        },
      });
    });

    it("rejects a suspended database user despite a valid signed session", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        ...mockFinanceUser,
        status: "SUSPENDED",
      });

      const sessionId = await createSession(DEMO_FINANCE_USER_ID);

      await expect(getSessionUser(sessionId)).resolves.toBeNull();
    });

    it("rejects a signed session whose database user no longer exists", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const sessionId = await createSession(DEMO_FINANCE_USER_ID);

      await expect(getSessionUser(sessionId)).resolves.toBeNull();
    });
  });

  describe("Role checking", () => {
    it("detects when user has a role", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockFinanceUser);

      const sessionId = await createSession(DEMO_FINANCE_USER_ID);
      const user = await getSessionUser(sessionId);
      expect(user).not.toBeNull();

      expect(hasRole(user!, "FINANCE_OFFICER")).toBe(true);
    });

    it("detects when user does not have a role", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockFinanceUser);

      const sessionId = await createSession(DEMO_FINANCE_USER_ID);
      const user = await getSessionUser(sessionId);
      expect(user).not.toBeNull();

      expect(hasRole(user!, "PROCUREMENT_REVIEWER")).toBe(false);
    });
  });

  describe("Authorization guards", () => {
    it("requireAuth throws if user is null", () => {
      expect(() => requireAuth(null)).toThrow("Unauthorized: no session");
    });

    it("requireAuth does not throw if user exists", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockFinanceUser);

      const sessionId = await createSession(DEMO_FINANCE_USER_ID);
      const user = await getSessionUser(sessionId);
      expect(user).not.toBeNull();

      expect(() => requireAuth(user!)).not.toThrow();
    });

    it("requireRole throws if user lacks required role", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockProblemOwnerUser);

      const sessionId = await createSession(DEMO_PROBLEM_OWNER_USER_ID);
      const user = await getSessionUser(sessionId);
      expect(user).not.toBeNull();

      expect(() => requireRole(user!, "FINANCE_OFFICER")).toThrow("Unauthorized: required role FINANCE_OFFICER");
    });

    it("requireRole does not throw if user has required role", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockFinanceUser);

      const sessionId = await createSession(DEMO_FINANCE_USER_ID);
      const user = await getSessionUser(sessionId);
      expect(user).not.toBeNull();

      expect(() => requireRole(user!, "FINANCE_OFFICER")).not.toThrow();
    });
  });

  describe("Cross-role authorization denial", () => {
    it("finance user cannot be treated as problem owner", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockFinanceUser);
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockProblemOwnerUser);

      const sessionId = await createSession(DEMO_FINANCE_USER_ID);
      const user = await getSessionUser(sessionId);
      expect(user).not.toBeNull();

      // Simulate a function that only finance can call
      const financeOnlyFunction = (u: typeof user) => {
        if (!u || !hasRole(u, "FINANCE_OFFICER")) {
          throw new Error("Unauthorized");
        }
        return "success";
      };

      expect(financeOnlyFunction(user)).toBe("success");

      // Now test with problem owner
      const problemOwnerSessionId = await createSession(DEMO_PROBLEM_OWNER_USER_ID);
      const problemOwnerUser = await getSessionUser(problemOwnerSessionId);
      expect(problemOwnerUser).not.toBeNull();

      expect(() => financeOnlyFunction(problemOwnerUser)).toThrow("Unauthorized");
    });
  });
});
