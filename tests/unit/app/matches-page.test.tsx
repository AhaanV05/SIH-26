import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import MatchesPage from "@/app/matches/page";

describe("MatchesPage UI component", () => {
  it("renders the hero panel with top recommended startup and stats", () => {
    const html = renderToStaticMarkup(<MatchesPage />);

    expect(html).toContain("Startup discovery");
    expect(html).toContain("Startup matches");
    expect(html).toContain("Top recommended fit");
    expect(html).toContain("EcoScan Labs");
    expect(html).toContain("Evaluated startups");
    expect(html).toContain("Eligible shortlist");
    expect(html).toContain("Gaps / Ineligible");
  });

  it("renders 4-factor breakdown and explainability details for ranked startups", () => {
    const html = renderToStaticMarkup(<MatchesPage />);

    // 4 Factors
    expect(html).toContain("Capability (40%)");
    expect(html).toContain("Semantic (25%)");
    expect(html).toContain("Evidence (20%)");
    expect(html).toContain("Delivery Fit (15%)");

    // Explainability elements
    expect(html).toContain("Key match reasons:");
    expect(html).toContain("Actionable feedback for founder:");
    expect(html).toContain("Sensitive attributes used:");
    expect(html).toContain("None (Fairness Guaranteed)");

    // Eligibility states
    expect(html).toContain("✓ Eligible");
    expect(html).toContain("✕ Mandatory Gate Failed");

    // Governance guardrails
    expect(html).toContain("Matching Principles");
    expect(html).toContain("Deterministic, not generative");
    expect(html).toContain("Mandatory eligibility gates");
    expect(html).toContain("Human authorization");
  });
});
