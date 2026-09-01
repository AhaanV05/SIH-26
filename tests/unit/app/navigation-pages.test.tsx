import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { AppShell } from "../../../src/components/app-shell";
import { getRoleProfile } from "../../../src/components/role-switcher";
import OverviewPage from "../../../src/app/page";
import AuditPage from "../../../src/app/audit/page";
import ChallengesPage from "../../../src/app/challenges/page";
import EvidencePage from "../../../src/app/evidence/page";
import MatchesPage from "../../../src/app/matches/page";
import PassportPage from "../../../src/app/passport/page";
import PilotsPage from "../../../src/app/pilots/page";
import ProposalsPage from "../../../src/app/proposals/page";
import PulsePage from "../../../src/app/pulse/page";
import SolutionsPage from "../../../src/app/solutions/page";
import EvaluationsPage from "../../../src/app/evaluations/page";

vi.mock("next/navigation", () => ({
  usePathname: () => "/pulse",
}));

describe("core lifecycle route pages", () => {
  it("renders the overview dashboard and the core lifecycle narrative", () => {
    const html = renderToStaticMarkup(<OverviewPage />);

    expect(html).toContain("Turn public problems into proof that can travel.");
    expect(html).toContain("Portfolio pulse");
    expect(html).toContain("Reduce community-bin overflow events");
  });

  it("marks the current route as active in the app shell navigation", () => {
    const html = renderToStaticMarkup(
      <AppShell>
        <div>Child content</div>
      </AppShell>,
    );

    expect(html).toContain('nav-link nav-link--active');
    expect(html).toContain('href="/pulse"');
  });

  it("exposes the correct account identity for the selected demo role", () => {
    expect(getRoleProfile("problem-owner")).toMatchObject({
      personName: "Aditi Kulkarni",
      label: "Problem owner",
    });
    expect(getRoleProfile("finance")).toMatchObject({
      personName: "Meera Nair",
      label: "Finance",
      personLabel: "Finance · Demo account",
    });
  });

  it("renders all lifecycle route screens with expected content", () => {
    const pages = [
      [PulsePage, "Problem radar"],
      [ChallengesPage, "Challenge forge"],
      [PassportPage, "Reusable trust"],
      [MatchesPage, "Startup matches"],
      [ProposalsPage, "Outcome-first proposal"],
      [EvaluationsPage, "Frozen-rubric evaluation room"],
      [PilotsPage, "Pilot lab"],
      [EvidencePage, "Evidence &amp; pay"],
      [SolutionsPage, "Scale graph"],
      [AuditPage, "Audit thread"],
    ] as const;

    for (const [Page, label] of pages) {
      const html = renderToStaticMarkup(<Page />);
      expect(html).toContain(label);
    }
  });
});
