import { getEvidenceRouteData } from "@/lib/demo-data";
import { DEMO_DATA_LABEL } from "@/platform/demo";
import { PaymentControl } from "./payment-control";

const evidence = getEvidenceRouteData();

export default function EvidencePage() {
  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div className="hero-panel__content">
          <span className="eyebrow">Evidence and payment</span>
          <h1>Evidence & pay</h1>
          <p>
            Milestones generate auditable proof, decision logs, and human-ready
            payment packets rather than opaque approvals or undocumented invoices.
          </p>
        </div>
        <div className="hero-panel__signal" aria-label="Evidence summary">
          <span>Current packet</span>
          <strong>{evidence.currentPacket}</strong>
          <p>
            {evidence.evidenceCount} evidence objects · {evidence.blockerCount} blockers · ready for review
          </p>
          <small>{DEMO_DATA_LABEL}</small>
        </div>
      </section>

      <section className="content-grid">
        <article className="panel panel--wide">
          <div className="panel__heading">
            <div>
              <span className="eyebrow">Readiness status</span>
              <h2>Milestone acceptance</h2>
            </div>
            <span className="status-badge status-badge--active">Human review</span>
          </div>
          <div className="metrics-grid">
            <div className="metric-card metric-card--positive">
              <span>Metric pass</span>
              <strong>
                {evidence.metrics.metricsPass}/{evidence.metrics.totalMetrics}
              </strong>
              <p>All required outcome thresholds have been observed.</p>
            </div>
            <div className="metric-card">
              <span>Evidence</span>
              <strong>{evidence.metrics.evidenceObjects}</strong>
              <p>Audit-ready artifacts stored with provenance metadata.</p>
            </div>
            <div className="metric-card metric-card--warning">
              <span>Blockers</span>
              <strong>{evidence.blockerCount}</strong>
              <p>Need final reviewer confirmation and invoice packaging.</p>
            </div>
            <div className="metric-card">
              <span>Payment state</span>
              <strong>{evidence.metrics.paymentPercent}%</strong>
              <p>Submitted for approval against the declared milestone value.</p>
            </div>
          </div>
        </article>
        <PaymentControl />
      </section>
    </div>
  );
}
