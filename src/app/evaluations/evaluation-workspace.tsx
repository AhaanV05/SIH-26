"use client";

import { useMemo, useState, type FormEvent } from "react";

import {
  DEMO_DEFAULT_SCORES,
  DEMO_EVALUATION_LABEL,
  DEMO_EXISTING_SUBMISSIONS,
  DEMO_FROZEN_RUBRIC,
  DEMO_PENDING_ASSIGNMENT,
  EvaluationRuleError,
  analyzeEvaluationIntegrity,
  declareEvaluationConflict,
  moderateProposal,
  submitIndependentEvaluation,
  type CriterionScoreInput,
  type EvaluationAssignment,
  type EvaluationSubmission,
  type ModerationDecision,
} from "@/modules/evaluations";

type ScoreDraft = Record<string, { value: number; rationale: string }>;

const initialScores = Object.fromEntries(
  DEMO_DEFAULT_SCORES.map((score) => [
    score.rubricCriterionId,
    { value: score.value, rationale: score.rationale },
  ]),
) as ScoreDraft;

function errorMessage(error: unknown): string {
  if (error instanceof EvaluationRuleError) return `${error.code}: ${error.message}`;
  return error instanceof Error ? error.message : "The command could not be completed.";
}

export function EvaluationWorkspace() {
  const [assignment, setAssignment] = useState<EvaluationAssignment>(DEMO_PENDING_ASSIGNMENT);
  const [hasConflict, setHasConflict] = useState(false);
  const [conflictDetails, setConflictDetails] = useState("");
  const [scoreDraft, setScoreDraft] = useState<ScoreDraft>(initialScores);
  const [submission, setSubmission] = useState<EvaluationSubmission | null>(null);
  const [moderationReason, setModerationReason] = useState(
    "Selected after human moderation because the proposal best addresses the frozen outcomes while retaining an auditable exit path.",
  );
  const [advisoryReason, setAdvisoryReason] = useState(
    "Reviewed proposal evidence and evaluator rationales; the security spread reflects different evidence-weight interpretations.",
  );
  const [decisionType, setDecisionType] = useState<"SELECTED" | "NOT_SELECTED">("SELECTED");
  const [decision, setDecision] = useState<ModerationDecision | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const allSubmissions = useMemo(
    () => (submission ? [...DEMO_EXISTING_SUBMISSIONS, submission] : DEMO_EXISTING_SUBMISSIONS),
    [submission],
  );
  const advisories = useMemo(
    () => analyzeEvaluationIntegrity(DEMO_FROZEN_RUBRIC, allSubmissions),
    [allSubmissions],
  );

  function declare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const next = declareEvaluationConflict(
        assignment,
        { id: DEMO_PENDING_ASSIGNMENT.evaluatorId, role: "EVALUATOR" },
        {
          hasConflict,
          details: conflictDetails,
          declaredAt: new Date().toISOString(),
        },
      );
      setAssignment(next);
      setMessage(
        next.status === "RECUSED"
          ? "Conflict recorded. This evaluator is recused and scoring remains locked."
          : "No-conflict declaration recorded. The frozen rubric is now available.",
      );
    } catch (error) {
      setMessage(errorMessage(error));
    }
  }

  function submitScores(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const scores: CriterionScoreInput[] = DEMO_FROZEN_RUBRIC.criteria.map((criterion) => ({
        rubricCriterionId: criterion.id,
        value: scoreDraft[criterion.id]?.value ?? Number.NaN,
        rationale: scoreDraft[criterion.id]?.rationale ?? "",
      }));
      const result = submitIndependentEvaluation({
        assignment,
        actor: { id: DEMO_PENDING_ASSIGNMENT.evaluatorId, role: "EVALUATOR" },
        rubric: DEMO_FROZEN_RUBRIC,
        scores,
        submittedAt: new Date().toISOString(),
        existingSubmission: submission,
      });
      setAssignment(result.assignment);
      setSubmission(result.submission);
      setMessage(`Independent evaluation submitted at ${result.submission.weightedScore}/100. It is now immutable.`);
    } catch (error) {
      setMessage(errorMessage(error));
    }
  }

  function recordModeration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const result = moderateProposal({
        actor: { id: "USR-PROCUREMENT-REVIEWER", role: "PROCUREMENT_REVIEWER" },
        proposalId: DEMO_PENDING_ASSIGNMENT.proposalId,
        decision: decisionType,
        rationale: moderationReason,
        decidedAt: new Date().toISOString(),
        rubric: DEMO_FROZEN_RUBRIC,
        eligibleAssignmentIds: allSubmissions.map((item) => item.assignmentId),
        submissions: allSubmissions,
        advisories,
        advisoryReviews: advisories.map((advisory) => ({
          advisoryId: advisory.id,
          disposition: "EXPLAINED" as const,
          reason: advisoryReason,
        })),
      });
      setDecision(result);
      setMessage(`Human decision recorded: ${result.decision}. No winner was selected automatically.`);
    } catch (error) {
      setMessage(errorMessage(error));
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-emerald-950/10 bg-emerald-950 p-6 text-white shadow-lg md:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-200">Transparent evaluation</p>
        <div className="mt-3 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <h1 className="font-serif text-3xl font-semibold md:text-4xl">Frozen-rubric evaluation room</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-emerald-50/85">
              Evaluators declare conflicts, score independently, and explain every criterion. Divergence creates a review advisory—not an accusation or an automatic award.
            </p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 p-4 text-sm">
            <p className="font-semibold">Rubric v{DEMO_FROZEN_RUBRIC.version}</p>
            <p className="mt-1 font-mono text-xs text-emerald-100">{DEMO_FROZEN_RUBRIC.contentHash.slice(0, 16)}…</p>
          </div>
        </div>
        <p className="mt-5 inline-flex rounded-full bg-amber-300 px-3 py-1 text-xs font-extrabold text-amber-950">{DEMO_EVALUATION_LABEL}</p>
      </section>

      {message && <div role="status" aria-live="polite" className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-950">{message}</div>}

      <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <form onSubmit={declare} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" aria-labelledby="conflict-heading">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Gate 1</p>
          <h2 id="conflict-heading" className="mt-2 font-serif text-2xl font-semibold text-slate-950">Conflict declaration</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Assignment {assignment.id}. Declaration is mandatory before any score field unlocks.</p>
          <label className="mt-5 flex items-start gap-3 rounded-xl border border-slate-200 p-4">
            <input type="checkbox" checked={hasConflict} onChange={(event) => setHasConflict(event.target.checked)} disabled={assignment.status !== "ASSIGNED"} className="mt-1 h-4 w-4" />
            <span><strong className="block text-sm text-slate-950">I have a conflict</strong><span className="text-xs text-slate-600">A conflict recuses this assignment; it does not create a negative score.</span></span>
          </label>
          <label className="mt-4 block text-sm font-semibold text-slate-800" htmlFor="conflict-details">Relationship details {hasConflict ? "(required)" : "(optional)"}</label>
          <textarea id="conflict-details" value={conflictDetails} onChange={(event) => setConflictDetails(event.target.value)} disabled={assignment.status !== "ASSIGNED"} className="mt-2 min-h-24 w-full rounded-xl border border-slate-300 p-3 text-sm disabled:bg-slate-100" />
          <button type="submit" disabled={assignment.status !== "ASSIGNED"} className="mt-4 rounded-lg bg-emerald-800 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-400">Record declaration</button>
          <p className="mt-4 text-sm"><span className="font-semibold">Current state:</span> {assignment.status}</p>
        </form>

        <form onSubmit={submitScores} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" aria-labelledby="scoring-heading">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Gate 2</p>
          <h2 id="scoring-heading" className="mt-2 font-serif text-2xl font-semibold text-slate-950">Independent scoring</h2>
          <p className="mt-2 text-sm text-slate-600">All {DEMO_FROZEN_RUBRIC.criteria.length} frozen criteria and substantive rationales are required.</p>
          <fieldset disabled={assignment.status !== "READY_TO_SCORE"} className="mt-5 space-y-4 disabled:opacity-60">
            <legend className="sr-only">Frozen rubric scores</legend>
            {DEMO_FROZEN_RUBRIC.criteria.map((criterion) => (
              <div key={criterion.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label htmlFor={`score-${criterion.id}`} className="font-semibold text-slate-950">{criterion.name}</label>
                  <span className="text-xs font-bold text-slate-500">{criterion.weight}% · {criterion.scoreMin}–{criterion.scoreMax}</span>
                </div>
                <input id={`score-${criterion.id}`} type="number" min={criterion.scoreMin} max={criterion.scoreMax} step="0.5" value={scoreDraft[criterion.id]?.value ?? 0} onChange={(event) => setScoreDraft((current) => ({ ...current, [criterion.id]: { value: Number(event.target.value), rationale: current[criterion.id]?.rationale ?? "" } }))} className="mt-3 w-24 rounded-lg border border-slate-300 p-2" />
                <label htmlFor={`rationale-${criterion.id}`} className="mt-3 block text-xs font-semibold uppercase tracking-wide text-slate-600">Evidence-backed rationale</label>
                <textarea id={`rationale-${criterion.id}`} value={scoreDraft[criterion.id]?.rationale ?? ""} onChange={(event) => setScoreDraft((current) => ({ ...current, [criterion.id]: { value: current[criterion.id]?.value ?? 0, rationale: event.target.value } }))} className="mt-1 min-h-20 w-full rounded-lg border border-slate-300 p-2 text-sm" />
              </div>
            ))}
          </fieldset>
          <button type="submit" disabled={assignment.status !== "READY_TO_SCORE"} className="mt-5 rounded-lg bg-emerald-800 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-400">Submit immutable scores</button>
        </form>
      </section>

      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6" aria-labelledby="advisory-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-xs font-bold uppercase tracking-wider text-amber-800">Integrity radar</p><h2 id="advisory-heading" className="mt-1 font-serif text-2xl font-semibold text-slate-950">Review advisories</h2></div>
          <span className="rounded-full bg-amber-200 px-3 py-1 text-xs font-bold text-amber-950">{advisories.length} review signal{advisories.length === 1 ? "" : "s"}</span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {advisories.length === 0 ? <p className="text-sm text-slate-700">No threshold-based divergence detected yet.</p> : advisories.map((advisory) => <article key={advisory.id} className="rounded-xl border border-amber-200 bg-white p-4"><p className="text-xs font-extrabold text-amber-900">{advisory.code} · {advisory.severity}</p><p className="mt-2 text-sm leading-6 text-slate-700">{advisory.explanation}</p><p className="mt-2 text-xs font-semibold text-slate-500">ADVISORY ONLY · NOT AN ACCUSATION</p></article>)}
        </div>
      </section>

      <form onSubmit={recordModeration} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" aria-labelledby="moderation-heading">
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Gate 3 · authorized human only</p>
        <h2 id="moderation-heading" className="mt-2 font-serif text-2xl font-semibold text-slate-950">Moderation and selection record</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">The average score is evidence for moderation. It never selects a winner. All non-recused assignments must close first.</p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="text-sm font-semibold text-slate-800">Human decision<select value={decisionType} onChange={(event) => setDecisionType(event.target.value as typeof decisionType)} className="mt-2 block w-full rounded-xl border border-slate-300 bg-white p-3"><option value="SELECTED">Select for pilot</option><option value="NOT_SELECTED">Do not select</option></select></label>
          <label className="text-sm font-semibold text-slate-800">Advisory resolution reason<textarea value={advisoryReason} onChange={(event) => setAdvisoryReason(event.target.value)} className="mt-2 min-h-24 w-full rounded-xl border border-slate-300 p-3 text-sm" /></label>
        </div>
        <label htmlFor="moderation-reason" className="mt-4 block text-sm font-semibold text-slate-800">Selection/non-selection rationale</label>
        <textarea id="moderation-reason" value={moderationReason} onChange={(event) => setModerationReason(event.target.value)} className="mt-2 min-h-24 w-full rounded-xl border border-slate-300 p-3 text-sm" />
        <button type="submit" disabled={!submission} className="mt-4 rounded-lg bg-emerald-950 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-400">Record human decision</button>
        {decision && <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4"><strong className="text-emerald-950">{decision.decision} · {decision.finalScore}/100 moderated score</strong><p className="mt-1 text-sm text-emerald-900">Human authorized: yes · Autonomous selection: no</p></div>}
      </form>
    </div>
  );
}
