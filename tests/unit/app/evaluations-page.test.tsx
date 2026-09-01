import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import EvaluationsPage from "@/app/evaluations/page";

describe("EvaluationsPage", () => {
  it("renders the conflict gate, frozen rubric, advisories, and human moderation controls", () => {
    const markup = renderToStaticMarkup(<EvaluationsPage />);

    expect(markup).toContain("Frozen-rubric evaluation room");
    expect(markup).toContain("SIMULATED_FOR_DEMO");
    expect(markup).toContain("Conflict declaration");
    expect(markup).toContain("Independent scoring");
    expect(markup).toContain("Security and privacy");
    expect(markup).toContain("CRITERION_SCORE_DIVERGENCE");
    expect(markup).toContain("ADVISORY ONLY");
    expect(markup).toContain("authorized human only");
    expect(markup).toContain("Record human decision");
  });

  it("keeps score and moderation actions disabled before prerequisite gates complete", () => {
    const markup = renderToStaticMarkup(<EvaluationsPage />);

    expect(markup).toMatch(/<fieldset[^>]*disabled/);
    expect(markup).toMatch(/<button[^>]*disabled[^>]*>Submit immutable scores/);
    expect(markup).toMatch(/<button[^>]*disabled[^>]*>Record human decision/);
  });
});
