import { describe, expect, it } from "vitest";

import {
  getDashboardSnapshot,
  getLifecycleRouteData,
  getRouteSnapshot,
} from "../../../src/lib/demo-data";

describe("demo data integration", () => {
  it("builds a dashboard snapshot from the real synthetic fixtures", () => {
    const snapshot = getDashboardSnapshot();

    expect(snapshot.problemTitle.toLowerCase()).toContain("overflow");
    expect(snapshot.metrics.openChallenges).toBeGreaterThan(0);
    expect(snapshot.metrics.activePilots).toBeGreaterThan(0);
    expect(snapshot.evidenceSummary.readyForReview).toBeGreaterThanOrEqual(0);
  });

  it("exposes the lifecycle routes and challenge context from the validated modules", () => {
    const routes = getLifecycleRouteData();
    const challenge = getRouteSnapshot("/challenges");

    expect(routes.map((route) => route.href)).toContain("/pulse");
    expect(challenge.title).toContain("Challenge");
    expect(challenge.summary.length).toBeGreaterThan(0);
  });
});
