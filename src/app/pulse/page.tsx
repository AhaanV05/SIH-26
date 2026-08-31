import { getPulseRouteData } from "@/lib/demo-data";
import { DEMO_DATA_LABEL } from "@/platform/demo";

const signal = getPulseRouteData();

export default function PulsePage() {
  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div className="hero-panel__content">
          <span className="eyebrow">Signal intake</span>
          <h1>Problem radar</h1>
          <p>
            Public service pain points are clustered, scored, and translated into
            challenge-ready briefs without prematurely locking technical design.
          </p>
        </div>
        <div className="hero-panel__signal" aria-label="Current signal summary">
          <span>Priority signal</span>
          <strong>{signal.signalTitle}</strong>
          <p>
            {signal.eventsPerWeek} events/week · {(signal.confidence * 100).toFixed(0)}% confidence ·{" "}
            {signal.affectedAgencies} agencies affected
          </p>
          <small>{DEMO_DATA_LABEL}</small>
        </div>
      </section>

      <section className="content-grid">
        <article className="panel panel--wide">
          <div className="panel__heading">
            <div>
              <span className="eyebrow">Operational hotspots</span>
              <h2>Public service pain map</h2>
            </div>
            <span className="status-badge status-badge--active">Live</span>
          </div>
          <div className="metrics-grid">
            <div className="metric-card">
              <span>Waste overflow</span>
              <strong>{signal.metrics.wasteOverflow}%</strong>
              <p>Signal concentration in the city&apos;s eastern wards.</p>
            </div>
            <div className="metric-card metric-card--warning">
              <span>Response delay</span>
              <strong>{signal.metrics.responseDelayHours} hrs</strong>
              <p>Average time between onset and collection dispatch.</p>
            </div>
            <div className="metric-card metric-card--positive">
              <span>Citizen complaints</span>
              <strong>{(signal.metrics.citizenComplaints / 1000).toFixed(1)}k</strong>
              <p>Escalations captured from the last six months.</p>
            </div>
            <div className="metric-card">
              <span>Cross-dept impact</span>
              <strong>{signal.metrics.crossDeptImpact}</strong>
              <p>Departments with shared operational dependencies.</p>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
