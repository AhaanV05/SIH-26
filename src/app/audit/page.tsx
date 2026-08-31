import { getAuditRouteData } from "@/lib/demo-data";
import { DEMO_DATA_LABEL } from "@/platform/demo";

const audit = getAuditRouteData();

export default function AuditPage() {
  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div className="hero-panel__content">
          <span className="eyebrow">Immutable review trail</span>
          <h1>Audit thread</h1>
          <p>
            Each decision is recorded in an append-only chain so officers can trace
            who approved what, why it changed, and when evidence was accepted.
          </p>
        </div>
        <div className="hero-panel__signal" aria-label="Audit summary">
          <span>Chain status</span>
          <strong>{audit.chainStatus === "verified" ? "Verified" : "Pending"}</strong>
          <p>
            {audit.eventCount} events recorded · {audit.continuityChecks} cryptographic continuity check passed
          </p>
          <small>{DEMO_DATA_LABEL}</small>
        </div>
      </section>

      <section className="content-grid">
        <article className="panel panel--wide">
          <div className="panel__heading">
            <div>
              <span className="eyebrow">Event ledger</span>
              <h2>Decision chronology</h2>
            </div>
            <span className="status-badge status-badge--active">Append-only</span>
          </div>
          <div className="metrics-grid">
            {audit.events.map((event, index) => (
              <div
                key={event.label}
                className={`metric-card ${
                  index === 0 ? "metric-card--positive" : index === audit.events.length - 1 ? "metric-card--warning" : ""
                }`}
              >
                <span>{event.label}</span>
                <strong>{event.time}</strong>
                <p>{event.detail}</p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
