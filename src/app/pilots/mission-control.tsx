"use client";

import { useMemo, useState } from "react";
import type { MilestoneAcceptanceEvaluation } from "@/modules/evidence";
import {
  createMilestoneWorkflow,
  transitionMilestoneWorkflow,
  type MilestoneWorkflowSnapshot,
  type MilestoneWorkflowState,
} from "@/modules/pilots";

const STATE_LABEL: Record<MilestoneWorkflowState, string> = {
  PLANNED: "Planned",
  IN_PROGRESS: "Pilot running",
  EVIDENCE_SUBMITTED: "Evidence submitted",
  READY_FOR_HUMAN_ACCEPTANCE: "Ready for human review",
  ACCEPTED: "Accepted by reviewer",
  RETURNED: "Returned for clarification",
  REJECTED: "Rejected with reasons",
};

const readyEvaluation: MilestoneAcceptanceEvaluation = {
  id: "EVAL-SANDBOX-BENCHMARK-001",
  milestoneId: "MS-SANDBOX-BENCHMARK",
  status: "READY_FOR_HUMAN_ACCEPTANCE",
  rulesSatisfied: true,
  humanAuthorizationRequired: true,
  automaticAcceptancePerformed: false,
  metricEvaluations: [],
  evidenceEvaluations: [],
  blockerCodes: [],
  summary:
    "Versioned recall, response-time, dataset, and limitations-note checks passed.",
};

function nextSnapshot(
  snapshot: MilestoneWorkflowSnapshot,
): MilestoneWorkflowSnapshot {
  switch (snapshot.state) {
    case "PLANNED":
      return transitionMilestoneWorkflow(snapshot, {
        expectedVersion: snapshot.version,
        to: "IN_PROGRESS",
        actorRole: "PILOT_REVIEWER",
        reason: "Authorized reviewer started the controlled sandbox pilot",
      });
    case "IN_PROGRESS":
      return transitionMilestoneWorkflow(snapshot, {
        expectedVersion: snapshot.version,
        to: "EVIDENCE_SUBMITTED",
        actorRole: "STARTUP_CONTRIBUTOR",
        reason: "Startup submitted sandbox results and limitations",
        evidenceObjectIds: [
          "EVIDENCE-SANDBOX-TEST-RUN",
          "EVIDENCE-LIMITATIONS-NOTE",
        ],
      });
    case "EVIDENCE_SUBMITTED":
      return transitionMilestoneWorkflow(snapshot, {
        expectedVersion: snapshot.version,
        to: "READY_FOR_HUMAN_ACCEPTANCE",
        actorRole: "EVIDENCE_RULE_ENGINE",
        reason: "Deterministic metric and evidence checks passed",
        acceptanceEvaluation: readyEvaluation,
      });
    case "READY_FOR_HUMAN_ACCEPTANCE":
      return transitionMilestoneWorkflow(snapshot, {
        expectedVersion: snapshot.version,
        to: "ACCEPTED",
        actorRole: "PILOT_REVIEWER",
        reason: "Reviewer confirmed the measured outcome and limitations",
      });
    default:
      return snapshot;
  }
}

function actionLabel(state: MilestoneWorkflowState): string | null {
  if (state === "PLANNED") return "Start controlled pilot";
  if (state === "IN_PROGRESS") return "Submit evidence packet";
  if (state === "EVIDENCE_SUBMITTED") return "Run deterministic checks";
  if (state === "READY_FOR_HUMAN_ACCEPTANCE") return "Accept as authorized reviewer";
  return null;
}

export function PilotMissionControl() {
  const initial = useMemo(
    () => createMilestoneWorkflow("MS-SANDBOX-BENCHMARK"),
    [],
  );
  const [snapshot, setSnapshot] = useState(initial);
  const [message, setMessage] = useState(
    "Begin with an authorized pilot reviewer. No state advances automatically.",
  );
  const action = actionLabel(snapshot.state);

  const advance = () => {
    try {
      const updated = nextSnapshot(snapshot);
      setSnapshot(updated);
      setMessage(updated.events.at(-1)?.reason ?? "Milestone advanced.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to advance milestone.");
    }
  };

  const reset = () => {
    setSnapshot(initial);
    setMessage("Demo reset. No production record or public fund was changed.");
  };

  return (
    <article className="panel panel--wide" aria-labelledby="mission-control-title">
      <div className="panel__heading">
        <div>
          <span className="eyebrow">Interactive workflow</span>
          <h2 id="mission-control-title">Milestone mission control</h2>
        </div>
        <span className="status-badge status-badge--active">
          {STATE_LABEL[snapshot.state]}
        </span>
      </div>

      <p className="max-w-3xl text-sm leading-6 text-[var(--color-text-secondary)]">
        Advance the synthetic sandbox milestone through startup evidence,
        deterministic checks, and an explicit government-review decision. Rule
        evaluation can declare readiness; it cannot accept the milestone.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          "IN_PROGRESS",
          "EVIDENCE_SUBMITTED",
          "READY_FOR_HUMAN_ACCEPTANCE",
          "ACCEPTED",
        ].map((state, index) => {
          const reached = snapshot.version > index;
          return (
            <div
              className={`metric-card ${reached ? "metric-card--positive" : ""}`}
              key={state}
            >
              <span>Step {index + 1}</span>
              <strong>{STATE_LABEL[state as MilestoneWorkflowState]}</strong>
              <p>{reached ? "Recorded in this demo run" : "Waiting for prior gate"}</p>
            </div>
          );
        })}
      </div>

      <div
        className="mt-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4"
        aria-live="polite"
      >
        <strong>Latest decision</strong>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{message}</p>
        <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
          Version {snapshot.version} · {snapshot.evidenceObjectIds.length} evidence
          object(s) · SIMULATED_FOR_DEMO
        </p>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        {action ? (
          <button
            className="min-h-11 rounded-lg bg-[var(--color-accent)] px-5 py-2 font-semibold text-white"
            onClick={advance}
            type="button"
          >
            {action}
          </button>
        ) : null}
        <button
          className="min-h-11 rounded-lg border border-[var(--color-border)] px-5 py-2 font-semibold"
          onClick={reset}
          type="button"
        >
          Reset synthetic workflow
        </button>
      </div>
    </article>
  );
}

