import { getMatchesRouteData } from "@/lib/demo-data";
import { DEMO_DATA_LABEL } from "@/platform/demo";

const matches = getMatchesRouteData();

export default function MatchesPage() {
  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div className="hero-panel__content">
          <span className="eyebrow">Startup discovery</span>
          <h1>Startup matches</h1>
          <p>
            Matching ranks founders by capability fit, evidence quality, and
            readiness to deliver against the department&apos;s challenge constraints.
          </p>
        </div>
        <div className="hero-panel__signal" aria-label="Match summary">
          <span>Top fit</span>
          <strong>{matches.topFit}</strong>
          <p>
            {Math.round(matches.topFitScore * 100)}% capability match · {matches.topFitReferences} prior pilot references
          </p>
          <small>{DEMO_DATA_LABEL}</small>
        </div>
      </section>

      <section className="content-grid">
        <article className="panel panel--wide">
          <div className="panel__heading">
            <div>
              <span className="eyebrow">Match queue</span>
              <h2>Recommended startup shortlist</h2>
            </div>
            <span className="status-badge status-badge--active">{matches.matches.length} matched</span>
          </div>
          <div className="metrics-grid">
            {matches.matches.map((match, index) => (
              <div
                key={match.name}
                className={`metric-card ${
                  index === 0 ? "metric-card--positive" : index === matches.matches.length - 1 ? "metric-card--warning" : ""
                }`}
              >
                <span>{match.name}</span>
                <strong>{Math.round(match.score * 100)}%</strong>
                <p>{match.note}</p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
