import { getSolutionsRouteData } from "@/lib/demo-data";
import { DEMO_DATA_LABEL } from "@/platform/demo";
import { AdoptionControl } from "./adoption-control";

const solutions = getSolutionsRouteData();

export default function SolutionsPage() {
  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div className="hero-panel__content">
          <span className="eyebrow">Reuse and scale</span>
          <h1>Scale graph</h1>
          <p>
            Proven pilots are translated into reusable capability records that make
            follow-on procurement easier and faster for other departments.
          </p>
        </div>
        <div className="hero-panel__signal" aria-label="Scaling summary">
          <span>Reusable asset</span>
          <strong>{solutions.reusableAsset}</strong>
          <p>{solutions.departmentsCanReuse} departments can reuse the validated workflow</p>
          <small>{DEMO_DATA_LABEL}</small>
        </div>
      </section>

      <section className="content-grid">
        <article className="panel panel--wide">
          <div className="panel__heading">
            <div>
              <span className="eyebrow">Transferability</span>
              <h2>Department reuse map</h2>
            </div>
            <span className="status-badge status-badge--active">Ready to reuse</span>
          </div>
          <div className="metrics-grid">
            {solutions.transfers.map((transfer) => (
              <div
                key={transfer.name}
                className={`metric-card ${
                  transfer.tone === "positive" ? "metric-card--positive" : transfer.tone === "warning" ? "metric-card--warning" : ""
                }`}
              >
                <span>{transfer.name}</span>
                <strong>{Math.round(transfer.score * 100)}%</strong>
                <p>{transfer.note}</p>
              </div>
            ))}
          </div>
        </article>
        <AdoptionControl />
      </section>
    </div>
  );
}
