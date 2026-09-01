import { ecoScanPassportSummary } from "@/modules/passport";

function displayDate(value: string | undefined): string {
  if (!value) return "No expiry recorded";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" }).format(new Date(value));
}

export default function PassportPage() {
  const passport = ecoScanPassportSummary;
  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div className="hero-panel__content">
          <span className="eyebrow">Passport+</span>
          <h1>Reusable trust, with provenance.</h1>
          <p>Evidence stays attached to its issuer, method, assurance level, and freshness instead of becoming an unexplained green checkmark.</p>
        </div>
        <div className="hero-panel__signal" aria-label="Passport completeness summary">
          <span>{passport.displayLabel}</span>
          <strong>{passport.organizationName}</strong>
          <p>{passport.completenessPercent}% complete · {passport.freshnessPercent}% current</p>
          <small>Fixture-backed evidence; no live DPIIT, Udyam, or security integration</small>
        </div>
      </section>

      <section className="content-grid" aria-labelledby="evidence-heading">
        <article className="panel panel--wide">
          <div className="panel__heading">
            <div><span className="eyebrow">Evidence wallet</span><h2 id="evidence-heading">Verification and freshness</h2></div>
            <span className="status-badge status-badge--active">{passport.requiredEvidencePresent}/{passport.requiredEvidenceTotal} usable</span>
          </div>
          <div className="mt-5 grid gap-4">
            {passport.assessedEvidence.map((evidence) => (
              <article className="rounded-2xl border border-line bg-canvas p-4" key={evidence.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><h3 className="font-semibold text-ink">{evidence.type.replaceAll("_", " ")}</h3><p className="mt-1 text-sm text-ink-muted">{evidence.issuer}</p></div>
                  <span className="status-badge status-badge--active">{evidence.freshness}</span>
                </div>
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                  <div><dt className="text-ink-muted">Assurance</dt><dd className="font-semibold">{evidence.assuranceLevel.replaceAll("_", " ")}</dd></div>
                  <div><dt className="text-ink-muted">Expiry</dt><dd className="font-semibold">{displayDate(evidence.expiresAt)}</dd></div>
                  <div><dt className="text-ink-muted">Provenance</dt><dd className="font-semibold">{evidence.verificationRef ?? "Officer record"}</dd></div>
                </dl>
              </article>
            ))}
          </div>
        </article>

        <aside className="panel">
          <span className="eyebrow">Capability genome</span><h2>Evidence-backed fit</h2>
          <ul className="activity-list">
            {passport.capabilities.map((capability) => (
              <li className="!grid-cols-1" key={capability.code}><div><strong>{capability.name} · {capability.proficiency}/5</strong><p>{capability.evidenceSummary}</p></div></li>
            ))}
          </ul>
        </aside>
      </section>
    </div>
  );
}
