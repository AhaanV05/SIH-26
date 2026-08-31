import type {
  EvidenceClaim,
  EvidenceLineageEdge,
  EvidenceLineageGraph,
  EvidenceLineageNode,
  EvidenceObject,
  MetricObservation,
  MilestoneAcceptanceEvaluation,
  SandboxRunRecord,
} from "./types";

export interface BuildMilestoneEvidenceLineageInput {
  readonly evidenceObjects: readonly EvidenceObject[];
  readonly sandboxRuns: readonly SandboxRunRecord[];
  readonly metricObservations: readonly MetricObservation[];
  readonly claims: readonly EvidenceClaim[];
  readonly milestoneEvaluation: MilestoneAcceptanceEvaluation;
}

const addUniqueEdge = (
  edges: EvidenceLineageEdge[],
  edge: EvidenceLineageEdge,
): void => {
  if (
    !edges.some(
      (candidate) =>
        candidate.from === edge.from &&
        candidate.to === edge.to &&
        candidate.relationship === edge.relationship,
    )
  ) {
    edges.push(edge);
  }
};

export function buildMilestoneEvidenceLineage(
  input: BuildMilestoneEvidenceLineageInput,
): EvidenceLineageGraph {
  const evaluationNodeId = `milestone-evaluation:${input.milestoneEvaluation.id}`;
  const nodes: EvidenceLineageNode[] = [
    ...input.evidenceObjects.map(
      (evidence): EvidenceLineageNode => ({
        id: `evidence-object:${evidence.id}`,
        type: "EVIDENCE_OBJECT",
        label: evidence.displayName,
        evidenceKind: evidence.kind,
        synthetic: evidence.synthetic,
      }),
    ),
    ...input.sandboxRuns.map(
      (run): EvidenceLineageNode => ({
        id: `sandbox-run:${run.id}`,
        type: "SANDBOX_RUN",
        label: `Sandbox run ${run.id}`,
        synthetic: run.synthetic,
      }),
    ),
    ...input.metricObservations.map(
      (observation): EvidenceLineageNode => ({
        id: `metric-observation:${observation.id}`,
        type: "METRIC_OBSERVATION",
        label: observation.name,
        value: observation.value,
        unit: observation.unit,
        synthetic: observation.synthetic,
      }),
    ),
    ...input.claims.map(
      (claim): EvidenceLineageNode => ({
        id: `evidence-claim:${claim.id}`,
        type: "EVIDENCE_CLAIM",
        label: claim.predicate,
        synthetic: claim.synthetic,
      }),
    ),
    {
      id: evaluationNodeId,
      type: "MILESTONE_EVALUATION",
      label: `Milestone ${input.milestoneEvaluation.milestoneId} rule evaluation`,
      status: input.milestoneEvaluation.status,
      synthetic: input.evidenceObjects.some((evidence) => evidence.synthetic),
    },
  ];
  const nodeIds = new Set(nodes.map((node) => node.id));
  if (nodeIds.size !== nodes.length) {
    throw new Error("Evidence lineage contains duplicate node identifiers.");
  }

  const edges: EvidenceLineageEdge[] = [];
  for (const run of input.sandboxRuns) {
    for (const evidenceObjectId of run.sourceEvidenceObjectIds) {
      addUniqueEdge(edges, {
        from: `evidence-object:${evidenceObjectId}`,
        to: `sandbox-run:${run.id}`,
        relationship: "INPUT_TO_RUN",
      });
    }
  }
  for (const observation of input.metricObservations) {
    addUniqueEdge(edges, {
      from: `sandbox-run:${observation.runId}`,
      to: `metric-observation:${observation.id}`,
      relationship: "PRODUCED_METRIC",
    });
    for (const evidenceObjectId of observation.sourceEvidenceObjectIds) {
      addUniqueEdge(edges, {
        from: `evidence-object:${evidenceObjectId}`,
        to: `metric-observation:${observation.id}`,
        relationship: "PRODUCED_METRIC",
      });
    }
  }
  for (const claim of input.claims) {
    for (const evidenceObjectId of claim.supportingEvidenceObjectIds) {
      addUniqueEdge(edges, {
        from: `evidence-object:${evidenceObjectId}`,
        to: `evidence-claim:${claim.id}`,
        relationship: "SUPPORTS_CLAIM",
      });
    }
    for (const observationId of claim.supportingMetricObservationIds) {
      addUniqueEdge(edges, {
        from: `metric-observation:${observationId}`,
        to: `evidence-claim:${claim.id}`,
        relationship: "SUPPORTS_CLAIM",
      });
    }
    for (const evidenceObjectId of claim.contradictingEvidenceObjectIds) {
      addUniqueEdge(edges, {
        from: `evidence-object:${evidenceObjectId}`,
        to: `evidence-claim:${claim.id}`,
        relationship: "CONTRADICTS_CLAIM",
      });
    }
    if (
      claim.subject.type === "MILESTONE" &&
      claim.subject.id === input.milestoneEvaluation.milestoneId
    ) {
      addUniqueEdge(edges, {
        from: `evidence-claim:${claim.id}`,
        to: evaluationNodeId,
        relationship: "INFORMS_MILESTONE_EVALUATION",
      });
    }
  }
  for (const metricEvaluation of input.milestoneEvaluation.metricEvaluations) {
    if (metricEvaluation.observationId) {
      addUniqueEdge(edges, {
        from: `metric-observation:${metricEvaluation.observationId}`,
        to: evaluationNodeId,
        relationship: "INFORMS_MILESTONE_EVALUATION",
      });
    }
  }
  for (const evidenceEvaluation of input.milestoneEvaluation.evidenceEvaluations) {
    for (const evidenceObjectId of evidenceEvaluation.matchingEvidenceObjectIds) {
      addUniqueEdge(edges, {
        from: `evidence-object:${evidenceObjectId}`,
        to: evaluationNodeId,
        relationship: "INFORMS_MILESTONE_EVALUATION",
      });
    }
  }

  const danglingEdges = edges.filter(
    (edge) => !nodeIds.has(edge.from) || !nodeIds.has(edge.to),
  );
  if (danglingEdges.length > 0) {
    const first = danglingEdges[0]!;
    throw new Error(
      `Evidence lineage has a dangling ${first.relationship} edge from ${first.from} to ${first.to}.`,
    );
  }

  return { nodes, edges };
}

export function hasEvidenceLineagePath(
  graph: EvidenceLineageGraph,
  fromNodeId: string,
  toNodeId: string,
): boolean {
  if (fromNodeId === toNodeId) return true;
  const adjacency = new Map<string, string[]>();
  for (const edge of graph.edges) {
    const targets = adjacency.get(edge.from) ?? [];
    targets.push(edge.to);
    adjacency.set(edge.from, targets);
  }
  const visited = new Set<string>([fromNodeId]);
  const queue = [fromNodeId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const next of adjacency.get(current) ?? []) {
      if (next === toNodeId) return true;
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }
  return false;
}
