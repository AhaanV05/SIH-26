"use client";

import { useState, type FormEvent } from "react";

import { demoProposals } from "@/modules/applications";

const defaultApproach = "Fuse computer-vision overflow detection with route prioritization, deployed at the edge with encrypted synchronization and an open dispatch API.";
const defaultOutcomes = "Detect at least 90% of true overflow events and assign a crew within a 20-minute median after alert generation.";

export default function ProposalsPage() {
  const [result, setResult] = useState<string>("");
  const [busy, setBusy] = useState(false);

  async function submitProposal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setResult("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/proposals", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        challengeId: "CHAL-WASTE-PUNE-001",
        startupId: "ORG-ECOSCAN",
        approach: form.get("approach"),
        outcomes: form.get("outcomes"),
        timeline: [{ phase: "Sandbox benchmark", weeks: Number(form.get("weeks")) }],
        pilotCostInPaise: Math.round(Number(form.get("costInRupees")) * 100),
        risks: form.get("risks"),
        declarationsAccepted: form.get("declarations") === "on",
        submit: true,
      }),
    });
    const payload = await response.json() as { error?: string; proposal?: { status: string } };
    setResult(response.ok ? `Proposal validated: ${payload.proposal?.status}. Offline fixture only; not persisted.` : payload.error ?? "Submission failed");
    setBusy(false);
  }

  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div className="hero-panel__content"><span className="eyebrow">Startup workspace</span><h1>Outcome-first proposal.</h1><p>Submit a concise pilot plan against frozen outcomes. Server-side ownership checks prevent one startup from reading another startup&apos;s proposal.</p></div>
        <div className="hero-panel__signal"><span>SIMULATED_FOR_DEMO</span><strong>{demoProposals[0]?.status}</strong><p>Current EcoScan proposal state</p><small>Confidential business fixture</small></div>
      </section>

      <section className="content-grid">
        <article className="panel panel--wide">
          <div className="panel__heading"><div><span className="eyebrow">New application</span><h2>Waste overflow pilot</h2></div><span className="data-label">Offline validation adapter</span></div>
          <form className="mt-6 grid gap-5" onSubmit={submitProposal} aria-describedby="proposal-result">
            <label className="grid gap-2 text-sm font-semibold">Approach<textarea className="min-h-32 rounded-xl border border-line bg-white p-3 font-normal" name="approach" defaultValue={defaultApproach} required minLength={80} /></label>
            <label className="grid gap-2 text-sm font-semibold">Measurable outcomes<textarea className="min-h-24 rounded-xl border border-line bg-white p-3 font-normal" name="outcomes" defaultValue={defaultOutcomes} required minLength={40} /></label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold">Sandbox duration (weeks)<input className="rounded-xl border border-line bg-white p-3 font-normal" name="weeks" type="number" defaultValue="2" min="1" max="52" required /></label>
              <label className="grid gap-2 text-sm font-semibold">Pilot cost (₹)<input className="rounded-xl border border-line bg-white p-3 font-normal" name="costInRupees" type="number" defaultValue="185000" min="1" required /></label>
            </div>
            <label className="grid gap-2 text-sm font-semibold">Risks and mitigations<textarea className="min-h-24 rounded-xl border border-line bg-white p-3 font-normal" name="risks" defaultValue="Camera occlusion and intermittent connectivity are mitigated through confidence thresholds, local caching, and a manual fallback." required minLength={20} /></label>
            <label className="flex items-start gap-3 text-sm"><input className="mt-1 size-4" name="declarations" type="checkbox" required /><span>I confirm this proposal is authorized by the startup and understand that the demo does not create a government award or payment.</span></label>
            <div className="button-row"><button className="primary-button" disabled={busy} type="submit">{busy ? "Validating…" : "Validate and submit"}</button></div>
            <p id="proposal-result" role="status" className="text-sm font-semibold text-forest-soft">{result}</p>
          </form>
        </article>
        <aside className="panel"><span className="eyebrow">Submission guardrails</span><h2>Before submission</h2><ul className="activity-list"><li className="!grid-cols-1"><div><strong>Reusable Passport</strong><p>Eligibility evidence remains provenance-aware and challenge-specific.</p></div></li><li className="!grid-cols-1"><div><strong>Frozen rubric</strong><p>Criteria cannot be rewritten after proposals open.</p></div></li><li className="!grid-cols-1"><div><strong>Human decision</strong><p>Validation does not shortlist or select a startup.</p></div></li></ul></aside>
      </section>
    </div>
  );
}
