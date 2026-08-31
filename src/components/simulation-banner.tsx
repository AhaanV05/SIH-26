import { integrationMode, integrationModeCopy } from "@/platform/demo";

export function SimulationBanner() {
  return (
    <div className="simulation-banner" role="status">
      <span className="simulation-banner__pulse" aria-hidden="true" />
      <strong>{integrationModeCopy[integrationMode]}</strong>
      <span>
        Government verification, sandbox, and payment connections use labelled
        fixtures in this prototype.
      </span>
    </div>
  );
}
