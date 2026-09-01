"use client";

import { useMemo, useState } from "react";
import {
  assessTransferability,
  createAdoptionRequest,
  transitionAdoptionRequest,
  type AdoptionRequestSnapshot,
  type TransferabilityFactorInput,
} from "@/modules/solutions";

const factor = (
  key: TransferabilityFactorInput["key"],
  score: number,
  rationale: string,
  options?: Pick<TransferabilityFactorInput, "gaps" | "constraint">,
): TransferabilityFactorInput => ({
  key,
  score,
  rationale,
  evidenceIds: [`SYNTHETIC-${key.toUpperCase()}`],
  gaps: options?.gaps ?? [],
  constraint: options?.constraint ?? "NONE",
});

const assessment = assessTransferability({
  assessmentId: "ASSESS-SATARA-001",
  solutionCardId: "SOLUTION-WASTE-001",
  sourceContextId: "DEPT-PUNE-SWM",
  targetContextId: "DEPT-SATARA-SERVICES",
  synthetic: true,
  displayLabel: "Synthetic demonstration data",
  factors: [
    factor("problemSimilarity", 0.92, "Both contexts prioritize overflow response."),
    factor("operatingContextFit", 0.62, "Target field teams have intermittent connectivity.", {
      gaps: ["Offline field synchronization must be validated locally."],
      constraint: "LOCALIZED_MICRO_PILOT_REQUIRED",
    }),
    factor("dataFit", 0.84, "Core bin and route fields map to the target schema."),
    factor("integrationFit", 0.7, "A localized dispatch adapter is still required."),
    factor("scaleFit", 0.76, "Target transaction volume is below the proven range."),
    factor("evidenceStrength", 0.9, "Versioned sandbox and pilot evidence is available."),
    factor("evidenceFreshness", 0.94, "Evidence was generated in the current demo cycle."),
    factor("localizationCostFit", 0.6, "Marathi copy exists; offline testing adds effort."),
  ],
});

function advance(snapshot: AdoptionRequestSnapshot): AdoptionRequestSnapshot {
  if (snapshot.state === "DRAFT") {
    return transitionAdoptionRequest(snapshot, {
      expectedVersion: snapshot.version,
      to: "ASSESSMENT_READY",
      actorRole: "TRANSFERABILITY_RULE_ENGINE",
      reason: "Transparent context factors evaluated",
      assessment,
    });
  }
  if (snapshot.state === "ASSESSMENT_READY") {
    return transitionAdoptionRequest(snapshot, {
      expectedVersion: snapshot.version,
      to: "SUBMITTED_FOR_AUTHORIZATION",
      actorRole: "PROBLEM_OWNER",
      reason: "Problem owner requested the recommended localized micro-pilot",
    });
  }
  if (snapshot.state === "SUBMITTED_FOR_AUTHORIZATION") {
    return transitionAdoptionRequest(snapshot, {
      expectedVersion: snapshot.version,
      to: "AUTHORIZED",
      actorRole: "PROCUREMENT_REVIEWER",
      reason: "Reviewer authorized controlled follow-on discovery without bypassing procurement",
    });
  }
  return snapshot;
}

const action: Partial<Record<AdoptionRequestSnapshot["state"], string>> = {
  DRAFT: "Assess target context",
  ASSESSMENT_READY: "Request recommended pathway",
  SUBMITTED_FOR_AUTHORIZATION: "Authorize localized micro-pilot",
};

export function AdoptionControl() {
  const initial = useMemo(
    () =>
      createAdoptionRequest({
        requestId: "ADOPTION-SATARA-001",
        solutionCardId: "SOLUTION-WASTE-001",
        targetDepartmentId: "DEPT-SATARA-SERVICES",
      }),
    [],
  );
  const [snapshot, setSnapshot] = useState(initial);
  const [message, setMessage] = useState(
    "No pathway has been recommended or authorized yet.",
  );

  return (
    <article className="panel panel--wide" aria-labelledby="adoption-title">
      <div className="panel__heading">
        <div>
          <span className="eyebrow">Interactive reuse request</span>
          <h2 id="adoption-title">Satara context assessment</h2>
        </div>
        <span className="status-badge status-badge--active">
          {snapshot.state.replaceAll("_", " ")}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="metric-card">
          <span>Transparent score</span>
          <strong>{Math.round(assessment.score * 100)}%</strong>
          <p>Eight visible, weighted context factors.</p>
        </div>
        <div className="metric-card metric-card--warning">
          <span>Advisory recommendation</span>
          <strong>Micro-pilot</strong>
          <p>Intermittent connectivity is a binding local constraint.</p>
        </div>
        <div className={snapshot.pathwayAuthorizedByHuman ? "metric-card metric-card--positive" : "metric-card"}>
          <span>Human authorization</span>
          <strong>{snapshot.pathwayAuthorizedByHuman ? "Recorded" : "Required"}</strong>
          <p>A score cannot create or bypass a procurement route.</p>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4" aria-live="polite">
        <strong>Latest action</strong>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{message}</p>
        <p className="mt-2 text-xs font-semibold text-[var(--color-text-secondary)]">
          Synthetic demonstration data · Advisory only · Human authorization required
        </p>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        {action[snapshot.state] ? (
          <button
            className="min-h-11 rounded-lg bg-[var(--color-accent)] px-5 py-2 font-semibold text-white"
            onClick={() => {
              try {
                const updated = advance(snapshot);
                setSnapshot(updated);
                setMessage(updated.history.at(-1)?.reason ?? "Adoption request advanced.");
              } catch (error) {
                setMessage(error instanceof Error ? error.message : "Unable to advance request.");
              }
            }}
            type="button"
          >
            {action[snapshot.state]}
          </button>
        ) : null}
        <button
          className="min-h-11 rounded-lg border border-[var(--color-border)] px-5 py-2 font-semibold"
          onClick={() => {
            setSnapshot(initial);
            setMessage("Synthetic adoption request reset.");
          }}
          type="button"
        >
          Reset request
        </button>
      </div>
    </article>
  );
}

