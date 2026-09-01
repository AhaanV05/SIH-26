import { getPilotsRouteData } from "@/lib/demo-data";
import { DEMO_DATA_LABEL } from "@/platform/demo";
import { PilotMissionControl } from "./mission-control";

const pilot = getPilotsRouteData();

export default function PilotsPage() {
  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div className="hero-panel__content">
          <span className="eyebrow">Controlled experimentation</span>
          <h1>Pilot lab</h1>
          <p>
            Selected pilots run under a bounded, evidence-focused workspace where
            success metrics, access terms, and human oversight are explicit.
          </p>
        </div>
        <div className="hero-panel__signal" aria-label="Pilot summary">
          <span>Live pilot</span>
          <strong>{pilot.pilotTitle}</strong>
          <p>
            {pilot.sandboxDays}-day sandbox window · {pilot.milestonesCompleted} of {pilot.totalMilestones} milestones passed
          </p>
          <small>{DEMO_DATA_LABEL}</small>
        </div>
      </section>

      <section className="content-grid">
        <article className="panel panel--wide">
          <div className="panel__heading">
            <div>
              <span className="eyebrow">Pilot pipeline</span>
              <h2>Milestone flow</h2>
            </div>
            <span className="status-badge status-badge--active">Running</span>
          </div>
          <div className="metrics-grid">
            <div className="metric-card metric-card--positive">
              <span>Sandbox setup</span>
              <strong>{pilot.metrics.setupStatus}</strong>
              <p>Access controls, synthetic dataset, and telemetry are live.</p>
            </div>
            <div className="metric-card">
              <span>Model validation</span>
              <strong>{pilot.metrics.modelValidationPercent}%</strong>
              <p>Detection performance remains within the agreed expectation.</p>
            </div>
            <div className="metric-card metric-card--warning">
              <span>Milestone {pilot.milestonesCompleted + 1}</span>
              <strong>{pilot.metrics.currentMilestoneState}</strong>
              <p>Evidence requires a human verification check.</p>
            </div>
            <div className="metric-card">
              <span>Decision gate</span>
              <strong>{pilot.metrics.daysUntilCheckpoint}d</strong>
              <p>Time remaining before the next procurement checkpoint.</p>
            </div>
          </div>
        </article>
        <PilotMissionControl />
      </section>
    </div>
  );
}
