import { afterEach, describe, expect, it } from "vitest";

import { createSession } from "@/platform/session";
import { getSessionUser } from "@/platform/auth";

describe("session fallback for offline demo mode", () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;

  afterEach(() => {
    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = originalDatabaseUrl;
    }
  });

  it("returns a synthetic demo user when no database configuration is present", async () => {
    delete process.env.DATABASE_URL;

    const sessionId = await createSession("USR-ANJALI-DESHMUKH");
    const user = await getSessionUser(sessionId);

    expect(user).not.toBeNull();
    expect(user?.id).toBe("USR-ANJALI-DESHMUKH");
    expect(user?.name).toBe("Anjali Deshmukh");
    expect(user?.memberships).toContainEqual(
      expect.objectContaining({ role: "PROBLEM_OWNER", organizationId: "ORG-GOV-MAHARASHTRA" }),
    );
  });
});
