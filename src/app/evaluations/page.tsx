import type { Metadata } from "next";

import { EvaluationWorkspace } from "./evaluation-workspace";

export const metadata: Metadata = {
  title: "Evaluations",
  description: "Conflict-aware independent scoring and human-authorized procurement moderation.",
};

export default function EvaluationsPage() {
  return <EvaluationWorkspace />;
}
