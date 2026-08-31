import Link from "next/link";

import { LifecycleRail } from "@/components/lifecycle-rail";
import { MetricCard } from "@/components/metric-card";
import { DEMO_DATA_LABEL } from "@/platform/demo";

const activity = [
  {
    time: "10:42",
    title: "ChallengeSpec v1 frozen",
    detail: "Two authorized reviewers resolved all blocking findings.",
  },
  {
    time: "10:31",
    title: "Inclusion finding accepted",
    detail: "Unnecessary three-year turnover clause removed from the draft.",
  },
  {
    time: "10:18",
    title: "Problem cluster nominated",
    detail: "Ward 12 overflow signal promoted with evidence and baseline.",
  },
];

export default function OverviewPage() {
  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div className="hero-panel__content">
          <span className="eyebrow">Good morning, Aditi</span>
          <h1>Turn public problems into proof that can travel.</h1>
          <p>
            One accountable thread connects problem discovery, startup matching,
            controlled pilots, milestone evidence, and responsible reuse.
          </p>
          <div className="button-row">
            <Link className="primary-button" href={{ pathname: "/pulse" }}>
              Review problem radar
            </Link>
            <Link className="secondary-button" href={{ pathname: "/challenges" }}>
              Open challenge forge
            </Link>
          </div>
        </div>
        <div className="hero-panel__signal" aria-label="Current priority signal">
          <span>Priority signal</span>
          <strong>Ward 12 waste overflow</strong>
          <p>42 synthetic events per week · confidence 0.87</p>
          <div className="signal-chart" aria-hidden="true">
            {[34, 44, 31, 58, 65, 72, 86, 74, 91, 96].map((height, index) => (
              <span key={index} style={{ height: `${height}%` }} />
            ))}
          </div>
          <small>{DEMO_DATA_LABEL}</small>
        </div>
      </section>

      <section aria-labelledby="portfolio-heading">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Portfolio pulse</span>
            <h2 id="portfolio-heading">Where attention is needed</h2>
          </div>
          <span className="data-label">{DEMO_DATA_LABEL}</span>
        </div>
        <div className="metrics-grid">
          <MetricCard
            label="Time to pilot"
            value="18 days"
            detail="12 days faster than the seeded baseline"
            tone="positive"
          />
          <MetricCard
            label="Open challenges"
            value="06"
            detail="2 awaiting procurement review"
          />
          <MetricCard
            label="Active pilots"
            value="03"
            detail="1 milestone due this week"
            tone="warning"
          />
          <MetricCard
            label="Evidence reuse"
            value="04"
            detail="Across 3 fictional departments"
            tone="positive"
          />
        </div>
      </section>

      <section className="content-grid">
        <article className="panel panel--wide">
          <div className="panel__heading">
            <div>
              <span className="eyebrow">Live procurement thread</span>
              <h2>Waste-response innovation pilot</h2>
            </div>
            <span className="status-badge status-badge--active">Matching</span>
          </div>
          <LifecycleRail />
        </article>

        <article className="panel">
          <div className="panel__heading">
            <div>
              <span className="eyebrow">Recent evidence</span>
              <h2>Audit-ready activity</h2>
            </div>
            <Link href={{ pathname: "/audit" }}>View thread</Link>
          </div>
          <ol className="activity-list">
            {activity.map((item) => (
              <li key={`${item.time}-${item.title}`}>
                <time>{item.time}</time>
                <span>
                  <strong>{item.title}</strong>
                  <p>{item.detail}</p>
                </span>
              </li>
            ))}
          </ol>
        </article>

        <article className="panel action-panel">
          <span className="eyebrow">Action required</span>
          <h2>2 compiler findings need review</h2>
          <p>
            The draft is schema-valid, but publication remains human-authorized.
          </p>
          <Link className="secondary-button" href={{ pathname: "/challenges" }}>
            Review findings
          </Link>
        </article>
      </section>
    </div>
  );
}
