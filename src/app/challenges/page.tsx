import { getChallengesRouteData } from "@/lib/demo-data";
import { DEMO_DATA_LABEL } from "@/platform/demo";

const challenge = getChallengesRouteData();

export default function ChallengesPage() {
  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div className="hero-panel__content">
          <span className="eyebrow">Challenge design</span>
          <h1>Challenge forge</h1>
          <p>
            Problem owners convert public pain into measurable, reviewable
            outcome briefs with scope, constraints, rubric, and approval trail.
          </p>
        </div>
        <div className="hero-panel__signal" aria-label="Challenge signal summary">
          <span>Current challenge</span>
          <strong>{challenge.currentChallenge}</strong>
          <p>
            {challenge.status === "frozen-spec" ? "Frozen spec" : "Draft"} · {challenge.openFindings} review findings ·
            human approval pending
          </p>
          <small>{DEMO_DATA_LABEL}</small>
        </div>
      </section>

      <section className="content-grid">
        <article className="panel panel--wide">
          <div className="panel__heading">
            <div>
              <span className="eyebrow">Specification status</span>
              <h2>Challenge brief summary</h2>
            </div>
            <span className="status-badge status-badge--active">Approved draft</span>
          </div>
          <div className="metrics-grid">
            <div className="metric-card metric-card--positive">
              <span>Eligibility</span>
              <strong>{challenge.eligibilityChecks}</strong>
              <p>Documented checks with evidence-backed review criteria.</p>
            </div>
            <div className="metric-card">
              <span>Metrics</span>
              <strong>{challenge.metrics}</strong>
              <p>Outcome measures tied to operational recovery and safety.</p>
            </div>
            <div className="metric-card metric-card--warning">
              <span>Approval</span>
              <strong>{challenge.openFindings}</strong>
              <p>Open findings require human review before publication.</p>
            </div>
            <div className="metric-card">
              <span>Timeline</span>
              <strong>{challenge.timelinedays}d</strong>
              <p>Window from issue discovery to pilot launch.</p>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
