"use client";

import { useState } from "react";

import type { ChallengeSpec } from "@/modules/challenges";
import type { CompileChallengeResult, CompilerFinding } from "@/modules/compiler";

const DEFAULT_PROBLEM = "Bins overflow for hours before ward teams know. The solution must use AI and Microsoft Azure to alert sanitation supervisors and help crews respond faster";

interface FrozenResult {
  readonly status: "FROZEN_NOT_PUBLISHED";
  readonly contentHash: string;
  readonly notice: string;
  readonly approvedBy: string;
}

function FindingCard({ finding, onApply, busy }: { readonly finding: CompilerFinding; readonly onApply: () => void; readonly busy: boolean }) {
  const tone = finding.severity === "BLOCKING" ? "border-red-300 bg-red-50" : finding.severity === "WARNING" ? "border-amber-300 bg-amber-50" : "border-sky-300 bg-sky-50";
  return (
    <li className={`rounded-2xl border p-4 ${tone}`}>
      <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-mono text-xs font-bold tracking-wide">{finding.ruleCode}</span><span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold">{finding.severity}</span></div>
      <p className="mt-3 font-semibold text-slate-950">{finding.message}</p>
      <p className="mt-1 text-sm leading-6 text-slate-700">{finding.explanation}</p>
      <div className="mt-3 rounded-xl bg-white/80 p-3 text-sm text-slate-800"><strong>Recommended change:</strong> {finding.remediation}</div>
      <button type="button" onClick={onApply} disabled={busy} className="mt-3 min-h-11 rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">Apply recommendation and recompile</button>
    </li>
  );
}

function SpecificationPreview({ specification }: { readonly specification: ChallengeSpec }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">Public outcome</p><h3 className="mt-2 text-lg font-bold text-slate-950">{specification.problem.title}</h3><p className="mt-2 text-sm leading-6 text-slate-700">{specification.problem.statement}</p>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-slate-500">Geography</dt><dd className="font-semibold">{specification.problem.geography.join(", ")}</dd></div><div><dt className="text-slate-500">Affected users</dt><dd className="font-semibold">{specification.problem.affectedUsers.join(", ")}</dd></div></dl>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">Executable contract</p>
        <dl className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-emerald-50 p-3"><dt className="text-xs text-slate-600">Metrics</dt><dd className="text-2xl font-black">{specification.metrics.length}</dd></div><div className="rounded-xl bg-emerald-50 p-3"><dt className="text-xs text-slate-600">Rubric criteria</dt><dd className="text-2xl font-black">{specification.rubric.length}</dd></div><div className="rounded-xl bg-emerald-50 p-3"><dt className="text-xs text-slate-600">Eligibility checks</dt><dd className="text-2xl font-black">{specification.eligibility.length}</dd></div><div className="rounded-xl bg-emerald-50 p-3"><dt className="text-xs text-slate-600">Milestones</dt><dd className="text-2xl font-black">{specification.milestones.length}</dd></div>
        </dl>
      </div>
    </div>
  );
}

export function ChallengeForge() {
  const [problemStatement, setProblemStatement] = useState(DEFAULT_PROBLEM);
  const [department, setDepartment] = useState("Urban Development Department");
  const [geography, setGeography] = useState("Pune, Maharashtra");
  const [acceptedCodes, setAcceptedCodes] = useState<string[]>([]);
  const [resolvedFindings, setResolvedFindings] = useState<CompilerFinding[]>([]);
  const [compiled, setCompiled] = useState<CompileChallengeResult | null>(null);
  const [humanApproved, setHumanApproved] = useState(false);
  const [approverName, setApproverName] = useState("Anjali Deshmukh");
  const [frozen, setFrozen] = useState<FrozenResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Ready to compile the problem statement.");

  function invalidateCompiledDraft() {
    setCompiled(null);
    setAcceptedCodes([]);
    setResolvedFindings([]);
    setHumanApproved(false);
    setFrozen(null);
    setMessage("Input changed. Compile a new draft before review.");
  }

  async function compile(remediationCodes = acceptedCodes) {
    setBusy(true); setFrozen(null); setHumanApproved(false); setMessage("Compiling with deterministic offline rules…");
    try {
      const response = await fetch("/api/challenges/compile", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ problemStatement, department, geography, acceptedRemediationCodes: remediationCodes }) });
      const body = (await response.json()) as CompileChallengeResult & { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Compilation failed");
      setCompiled(body);
      setMessage(body.findings.length > 0 ? `Compiled with ${body.findings.length} finding${body.findings.length === 1 ? "" : "s"} requiring review.` : "Compiled successfully. Deterministic checks found no unresolved findings.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Compilation failed"); }
    finally { setBusy(false); }
  }

  async function applyRemediation(finding: CompilerFinding) {
    const nextCodes = [...new Set([...acceptedCodes, finding.ruleCode])];
    setAcceptedCodes(nextCodes); setResolvedFindings((current) => [...current, finding]);
    await compile(nextCodes);
  }

  async function freeze() {
    if (!compiled || !humanApproved) return;
    setBusy(true); setMessage("Recording human authorization and calculating the immutable hash…");
    try {
      const response = await fetch("/api/challenges/freeze", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ specification: compiled.specification, humanApproved, approverName, satisfiedApproverRoles: ["PROBLEM_OWNER", "PROCUREMENT_REVIEWER"], frozenAt: new Date().toISOString() }) });
      const body = (await response.json()) as FrozenResult & { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Freeze failed");
      setFrozen(body); setMessage("Version frozen. It has not been published.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Freeze failed"); }
    finally { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="overflow-hidden rounded-3xl bg-slate-950 p-6 text-white shadow-xl md:p-8"><div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr] lg:items-end"><div><span className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">Challenge design · human-controlled</span><h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">Challenge forge</h1><p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">Turn an unclear department problem into a measurable ChallengeSpec, resolve procurement risks, and freeze an approved version without autonomously publishing it.</p></div><div className="rounded-2xl border border-amber-300/40 bg-amber-300/10 p-4"><strong className="text-sm text-amber-200">SIMULATED_FOR_DEMO · OFFLINE_FIXTURE</strong><p className="mt-2 text-sm leading-6 text-slate-300">No AI provider, government policy system, tender portal, or production citizen data is used.</p></div></div></section>
      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6" aria-labelledby="problem-input-heading"><p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">1 · Problem intake</p><h2 id="problem-input-heading" className="mt-2 text-2xl font-black text-slate-950">Paste the messy brief</h2><div className="mt-5 space-y-4"><label className="block text-sm font-bold text-slate-800">Public problem<textarea value={problemStatement} onChange={(event) => { setProblemStatement(event.target.value); invalidateCompiledDraft(); }} rows={7} className="mt-2 w-full rounded-2xl border border-slate-300 p-3 font-normal leading-6 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-200" /></label><label className="block text-sm font-bold text-slate-800">Department<input value={department} onChange={(event) => { setDepartment(event.target.value); invalidateCompiledDraft(); }} className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3 font-normal" /></label><label className="block text-sm font-bold text-slate-800">Geography<input value={geography} onChange={(event) => { setGeography(event.target.value); invalidateCompiledDraft(); }} className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3 font-normal" /></label><button type="button" onClick={() => void compile()} disabled={busy} className="min-h-12 w-full rounded-xl bg-emerald-800 px-5 py-3 font-bold text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50">{busy ? "Working…" : compiled ? "Recompile draft" : "Compile challenge draft"}</button><p aria-live="polite" className="rounded-xl bg-slate-100 p-3 text-sm text-slate-700">{message}</p></div></section>
        <section className="space-y-6" aria-label="Compiler output">
          {!compiled ? <div className="flex min-h-80 items-center justify-center rounded-3xl border-2 border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">Compile the brief to see the structured specification, deterministic findings, and human approval gate.</div> : <>
            <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5 md:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">2 · Structured draft</p><h2 className="mt-1 text-2xl font-black">Executable specification</h2></div><span className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-900">UNDER_REVIEW</span></div><div className="mt-5"><SpecificationPreview specification={compiled.specification} /></div><div className="mt-4 grid gap-2 sm:grid-cols-2">{Object.entries(compiled.projections).map(([name, value]) => <div key={name} className="rounded-xl bg-white p-3 text-sm"><span className="block text-xs font-bold uppercase tracking-wide text-slate-500">{name.replace(/([A-Z])/g, " $1")}</span><strong>{value}</strong></div>)}</div></article>
            <article className="rounded-3xl border border-slate-200 bg-white p-5 md:p-6"><p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">3 · Procurement lint</p><div className="mt-2 flex flex-wrap items-center justify-between gap-2"><h2 className="text-2xl font-black">Review findings</h2><span className={`rounded-full px-3 py-1 text-sm font-bold ${compiled.findings.length ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-900"}`}>{compiled.findings.length} open</span></div>{compiled.findings.length > 0 ? <ul className="mt-4 space-y-3">{compiled.findings.map((finding) => <FindingCard key={finding.id} finding={finding} busy={busy} onApply={() => void applyRemediation(finding)} />)}</ul> : <p className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-950">All deterministic checks pass. Human review is still mandatory.</p>}{resolvedFindings.length > 0 && <details className="mt-4 rounded-xl border border-slate-200 p-3"><summary className="cursor-pointer font-bold">Resolved recommendations ({resolvedFindings.length})</summary><ul className="mt-2 space-y-1 text-sm text-slate-700">{resolvedFindings.map((finding) => <li key={finding.id}>✓ {finding.ruleCode}: {finding.message}</li>)}</ul></details>}</article>
            <article className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 md:p-6"><p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">4 · Human authorization</p><h2 className="mt-2 text-2xl font-black">Freeze, never auto-publish</h2><p className="mt-2 text-sm leading-6 text-slate-700">Freezing locks the reviewed eligibility, rubric, metric and milestone definitions behind a SHA-256 content hash. Publication remains a separate authorized action.</p><label className="mt-4 block text-sm font-bold">Approver name<input value={approverName} onChange={(event) => setApproverName(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-emerald-300 bg-white px-3 font-normal" /></label><label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl bg-white p-4 text-sm leading-6"><input type="checkbox" checked={humanApproved} onChange={(event) => setHumanApproved(event.target.checked)} className="mt-1 size-5 accent-emerald-800" /><span><strong>I performed the human procurement review.</strong><br />I confirm the deterministic recommendations were reviewed and authorize freezing this demo version. This does not publish a tender.</span></label><button type="button" onClick={() => void freeze()} disabled={busy || !humanApproved || compiled.findings.length > 0 || approverName.trim().length < 3} className="mt-4 min-h-12 w-full rounded-xl bg-slate-950 px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">Freeze approved version</button>{frozen && <div className="mt-4 rounded-2xl border border-emerald-300 bg-white p-4" aria-live="polite"><div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-emerald-900">FROZEN · NOT PUBLISHED</strong><span className="text-xs font-bold">SIMULATED_FOR_DEMO</span></div><p className="mt-2 text-sm">Approved by {frozen.approvedBy}. {frozen.notice}</p><p className="mt-3 break-all rounded-lg bg-slate-950 p-3 font-mono text-xs text-emerald-200"><span className="text-slate-400">SHA-256 </span>{frozen.contentHash}</p></div>}</article>
          </>}
        </section>
      </div>
    </div>
  );
}
