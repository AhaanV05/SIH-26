import { getMatchesRouteData } from "@/lib/demo-data";
import { DEMO_DATA_LABEL } from "@/platform/demo";

<<<<<<< HEAD
const matches = getMatchesRouteData();

export default function MatchesPage() {
  return (
    <div className="page-stack">
=======
export default function MatchesPage() {
  const matchesData = getMatchesRouteData();

  return (
    <div className="page-stack">
      {/* Hero Panel */}
>>>>>>> 1339371 (feat(matching):complete matching engine UI Integration, tests and route updates)
      <section className="hero-panel">
        <div className="hero-panel__content">
          <span className="eyebrow">Startup discovery</span>
          <h1>Startup matches</h1>
          <p>
<<<<<<< HEAD
            Matching ranks founders by capability fit, evidence quality, and
            readiness to deliver against the department&apos;s challenge constraints.
          </p>
        </div>
        <div className="hero-panel__signal" aria-label="Match summary">
          <span>Top fit</span>
          <strong>{matches.topFit}</strong>
          <p>
            {Math.round(matches.topFitScore * 100)}% capability match · {matches.topFitReferences} prior pilot references
=======
            Deterministic, explainable matching ranks startups by verified capability fit,
            credential evidence quality, and readiness to deliver against Maharashtra
            department challenge constraints.
          </p>
        </div>
        <div className="hero-panel__signal" aria-label="Match summary">
          <span>Top recommended fit</span>
          <strong>{matchesData.topFit}</strong>
          <p>
            {Math.round(matchesData.topFitScore * 100)}% overall fit ·{" "}
            {Math.round(matchesData.topFitConfidence * 100)}% confidence score
>>>>>>> 1339371 (feat(matching):complete matching engine UI Integration, tests and route updates)
          </p>
          <small>{DEMO_DATA_LABEL}</small>
        </div>
      </section>

<<<<<<< HEAD
=======
      {/* Summary KPI Grid */}
      <section className="metrics-grid" aria-label="Matching overview statistics">
        <div className="metric-card metric-card--positive">
          <span>Evaluated startups</span>
          <strong>{matchesData.totalEvaluated}</strong>
          <p>Startups screened against challenge criteria.</p>
        </div>
        <div className="metric-card metric-card--positive">
          <span>Eligible shortlist</span>
          <strong>{matchesData.eligibleCount}</strong>
          <p>Satisfied all mandatory governance &amp; security gates.</p>
        </div>
        <div className="metric-card metric-card--warning">
          <span>Gaps / Ineligible</span>
          <strong>{matchesData.ineligibleCount}</strong>
          <p>Missing mandatory evidence or readiness credentials.</p>
        </div>
        <div className="metric-card">
          <span>Weighting model</span>
          <strong style={{ fontSize: "1.25rem", marginTop: "0.85rem" }}>
            40/25/20/15
          </strong>
          <p>Cap (40%) + Sem (25%) + Ev (20%) + Del (15%).</p>
        </div>
      </section>

      {/* Main Content Grid */}
>>>>>>> 1339371 (feat(matching):complete matching engine UI Integration, tests and route updates)
      <section className="content-grid">
        <article className="panel panel--wide">
          <div className="panel__heading">
            <div>
<<<<<<< HEAD
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
=======
              <span className="eyebrow">Discovery queue</span>
              <h2>Explainable startup shortlist</h2>
            </div>
            <span className="status-badge status-badge--active">
              {matchesData.eligibleCount} eligible of {matchesData.totalEvaluated} evaluated
            </span>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1.5rem",
              marginTop: "1.5rem",
            }}
          >
            {matchesData.rankedMatches.map((match, index) => {
              const overallPercent = Math.round(match.overallScore * 100);
              const confidencePercent = Math.round(match.confidence * 100);
              const isTop = index === 0;
              const isEligible = match.eligibilityPass;

              return (
                <div
                  key={match.id}
                  style={{
                    background: "var(--paper)",
                    border: `1px solid ${
                      isTop
                        ? "var(--forest-soft)"
                        : isEligible
                        ? "var(--line)"
                        : "#e8d5c4"
                    }`,
                    borderRadius: "var(--radius-md)",
                    padding: "1.5rem",
                    boxShadow: isTop ? "0 4px 14px rgba(11, 59, 50, 0.08)" : "none",
                  }}
                >
                  {/* Card Header */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      flexWrap: "wrap",
                      gap: "1rem",
                      borderBottom: "1px solid var(--line)",
                      paddingBottom: "1rem",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.75rem",
                          flexWrap: "wrap",
                        }}
                      >
                        <h3
                          style={{
                            margin: 0,
                            fontSize: "1.25rem",
                            fontFamily: "Georgia, serif",
                            fontWeight: 600,
                          }}
                        >
                          {match.displayName}
                        </h3>
                        <span
                          className={`status-badge ${
                            isEligible ? "status-badge--active" : ""
                          }`}
                          style={{
                            background: isEligible ? "var(--mint)" : "var(--saffron-soft)",
                            color: isEligible ? "var(--forest)" : "#7b520c",
                          }}
                        >
                          {isEligible ? "✓ Eligible" : "✕ Mandatory Gate Failed"}
                        </span>
                        {isTop && (
                          <span
                            style={{
                              background: "var(--forest)",
                              color: "white",
                              borderRadius: "999px",
                              fontSize: "0.65rem",
                              fontWeight: 800,
                              padding: "0.25rem 0.65rem",
                              textTransform: "uppercase",
                            }}
                          >
                            Top match
                          </span>
                        )}
                      </div>
                      <p
                        style={{
                          color: "var(--ink-muted)",
                          fontSize: "0.78rem",
                          margin: "0.4rem 0 0",
                        }}
                      >
                        Organization ID: <code>{match.organizationId}</code> · Model:{" "}
                        <code>{match.modelVersion}</code>
                      </p>
                    </div>

                    <div
                      style={{
                        textAlign: "right",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-end",
                      }}
                    >
                      <strong
                        style={{
                          fontSize: "2rem",
                          fontFamily: "Georgia, serif",
                          color: isEligible ? "var(--forest)" : "var(--ink-muted)",
                          lineHeight: 1,
                        }}
                      >
                        {overallPercent}%
                      </strong>
                      <span
                        style={{
                          fontSize: "0.72rem",
                          color: "var(--ink-muted)",
                          marginTop: "0.3rem",
                        }}
                      >
                        {confidencePercent}% confidence
                      </span>
                    </div>
                  </div>

                  {/* 4-Factor Breakdown Grid */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(11rem, 1fr))",
                      gap: "0.85rem",
                      margin: "1.2rem 0",
                    }}
                  >
                    <div
                      style={{
                        background: "var(--canvas)",
                        padding: "0.85rem",
                        borderRadius: "var(--radius-sm)",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.68rem",
                          color: "var(--ink-muted)",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          display: "block",
                        }}
                      >
                        Capability (40%)
                      </span>
                      <strong
                        style={{
                          fontSize: "1.15rem",
                          color: "var(--forest)",
                          display: "block",
                          margin: "0.25rem 0",
                        }}
                      >
                        {Math.round(match.breakdown.capabilityOverlap.score * 100)}%
                      </strong>
                      <p
                        style={{
                          fontSize: "0.68rem",
                          color: "var(--ink-muted)",
                          margin: 0,
                          lineHeight: 1.35,
                        }}
                      >
                        {match.breakdown.capabilityOverlap.rationale}
                      </p>
                    </div>

                    <div
                      style={{
                        background: "var(--canvas)",
                        padding: "0.85rem",
                        borderRadius: "var(--radius-sm)",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.68rem",
                          color: "var(--ink-muted)",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          display: "block",
                        }}
                      >
                        Semantic (25%)
                      </span>
                      <strong
                        style={{
                          fontSize: "1.15rem",
                          color: "var(--forest)",
                          display: "block",
                          margin: "0.25rem 0",
                        }}
                      >
                        {Math.round(match.breakdown.semanticSimilarity.score * 100)}%
                      </strong>
                      <p
                        style={{
                          fontSize: "0.68rem",
                          color: "var(--ink-muted)",
                          margin: 0,
                          lineHeight: 1.35,
                        }}
                      >
                        {match.breakdown.semanticSimilarity.rationale}
                      </p>
                    </div>

                    <div
                      style={{
                        background: "var(--canvas)",
                        padding: "0.85rem",
                        borderRadius: "var(--radius-sm)",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.68rem",
                          color: "var(--ink-muted)",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          display: "block",
                        }}
                      >
                        Evidence (20%)
                      </span>
                      <strong
                        style={{
                          fontSize: "1.15rem",
                          color: "var(--forest)",
                          display: "block",
                          margin: "0.25rem 0",
                        }}
                      >
                        {Math.round(match.breakdown.evidenceStrength.score * 100)}%
                      </strong>
                      <p
                        style={{
                          fontSize: "0.68rem",
                          color: "var(--ink-muted)",
                          margin: 0,
                          lineHeight: 1.35,
                        }}
                      >
                        {match.breakdown.evidenceStrength.rationale}
                      </p>
                    </div>

                    <div
                      style={{
                        background: "var(--canvas)",
                        padding: "0.85rem",
                        borderRadius: "var(--radius-sm)",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.68rem",
                          color: "var(--ink-muted)",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          display: "block",
                        }}
                      >
                        Delivery Fit (15%)
                      </span>
                      <strong
                        style={{
                          fontSize: "1.15rem",
                          color: "var(--forest)",
                          display: "block",
                          margin: "0.25rem 0",
                        }}
                      >
                        {Math.round(match.breakdown.deliveryFit.score * 100)}%
                      </strong>
                      <p
                        style={{
                          fontSize: "0.68rem",
                          color: "var(--ink-muted)",
                          margin: 0,
                          lineHeight: 1.35,
                        }}
                      >
                        {match.breakdown.deliveryFit.rationale}
                      </p>
                    </div>
                  </div>

                  {/* Explainability Section */}
                  <div
                    style={{
                      background: "rgba(11, 59, 50, 0.03)",
                      border: "1px solid var(--line)",
                      borderRadius: "var(--radius-sm)",
                      padding: "1rem",
                      fontSize: "0.78rem",
                    }}
                  >
                    <div style={{ marginBottom: "0.75rem" }}>
                      <strong
                        style={{
                          color: "var(--forest)",
                          display: "block",
                          marginBottom: "0.35rem",
                        }}
                      >
                        Key match reasons:
                      </strong>
                      <ul
                        style={{
                          margin: 0,
                          paddingLeft: "1.25rem",
                          color: "var(--ink)",
                          lineHeight: 1.45,
                        }}
                      >
                        {match.explanation.positiveReasons.map((reason, rIdx) => (
                          <li key={rIdx}>{reason}</li>
                        ))}
                      </ul>
                    </div>

                    {match.explanation.gaps.length > 0 && (
                      <div style={{ marginBottom: "0.75rem" }}>
                        <strong
                          style={{
                            color: "#8e4a10",
                            display: "block",
                            marginBottom: "0.35rem",
                          }}
                        >
                          Identified gaps &amp; constraints:
                        </strong>
                        <ul
                          style={{
                            margin: 0,
                            paddingLeft: "1.25rem",
                            color: "#6b3c10",
                            lineHeight: 1.45,
                          }}
                        >
                          {match.explanation.gaps.map((gap, gIdx) => (
                            <li key={gIdx}>{gap}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {match.explanation.feedbackSuggestions.length > 0 && (
                      <div
                        style={{
                          marginTop: "0.65rem",
                          paddingTop: "0.65rem",
                          borderTop: "1px dashed var(--line)",
                        }}
                      >
                        <strong
                          style={{
                            color: "var(--forest-soft)",
                            display: "block",
                            marginBottom: "0.35rem",
                          }}
                        >
                          Actionable feedback for founder:
                        </strong>
                        <ul
                          style={{
                            margin: 0,
                            paddingLeft: "1.25rem",
                            color: "var(--ink-muted)",
                            lineHeight: 1.45,
                          }}
                        >
                          {match.explanation.feedbackSuggestions.map((sug, sIdx) => (
                            <li key={sIdx}>{sug}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div
                      style={{
                        marginTop: "0.75rem",
                        paddingTop: "0.75rem",
                        borderTop: "1px solid var(--line)",
                        display: "flex",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: "0.5rem",
                        color: "var(--ink-muted)",
                        fontSize: "0.68rem",
                      }}
                    >
                      <span>
                        Formula: <code>{match.explanation.formula}</code>
                      </span>
                      <span>
                        Sensitive attributes used: <strong>None (Fairness Guaranteed)</strong>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </article>

        {/* Side Panel: Procurement Principles */}
        <aside style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div className="panel">
            <span className="eyebrow">Governance &amp; Trust</span>
            <h2 style={{ fontSize: "1.2rem", margin: "0.35rem 0 0.85rem" }}>
              Matching Principles
            </h2>
            <ul
              style={{
                margin: 0,
                paddingLeft: "1.2rem",
                fontSize: "0.76rem",
                color: "var(--ink)",
                lineHeight: 1.6,
                display: "flex",
                flexDirection: "column",
                gap: "0.6rem",
              }}
            >
              <li>
                <strong>Deterministic, not generative:</strong> Match scores are calculated
                by strict, auditable weighting formulas rather than unverified LLM rankings.
              </li>
              <li>
                <strong>Mandatory eligibility gates:</strong> Missing security readiness or
                DPIIT recognition automatically results in a 0% overall score with clear
                remediation steps.
              </li>
              <li>
                <strong>Assurance level hierarchy:</strong> Government and third-party
                verified credentials carry higher weight than self-declarations.
              </li>
              <li>
                <strong>Human authorization:</strong> All match scores are strictly advisory;
                no procurement contract or pilot is awarded without officer review.
              </li>
            </ul>
          </div>

          <div className="panel action-panel">
            <span className="eyebrow">API Discovery</span>
            <h2 style={{ fontSize: "1.1rem", margin: "0.35rem 0 0.65rem" }}>
              Live API Endpoint
            </h2>
            <p style={{ margin: "0 0 0.85rem" }}>
              Integrate challenge discovery into external agency workflows via authenticated
              JSON endpoints:
            </p>
            <code
              style={{
                display: "block",
                background: "rgba(0,0,0,0.06)",
                padding: "0.6rem",
                borderRadius: "var(--radius-sm)",
                fontSize: "0.72rem",
                wordBreak: "break-all",
              }}
            >
              GET /api/challenges/[id]/matches
            </code>
          </div>
        </aside>
>>>>>>> 1339371 (feat(matching):complete matching engine UI Integration, tests and route updates)
      </section>
    </div>
  );
}
