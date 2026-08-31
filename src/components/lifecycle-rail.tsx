type LifecycleRailStage = {
  readonly label: string;
  readonly shortLabel: string;
  readonly href: string;
  readonly step: number;
  readonly status: "complete" | "active" | "upcoming";
  readonly summary: string;
};

const fallbackStages: readonly LifecycleRailStage[] = [
  {
    label: "Pulse",
    shortLabel: "01",
    href: "/pulse",
    step: 1,
    status: "complete",
    summary: "Problem nominated",
  },
  {
    label: "Forge",
    shortLabel: "02",
    href: "/challenges",
    step: 2,
    status: "complete",
    summary: "Challenge frozen",
  },
  {
    label: "Match",
    shortLabel: "03",
    href: "/matches",
    step: 3,
    status: "active",
    summary: "4 eligible startups",
  },
  {
    label: "Lab",
    shortLabel: "04",
    href: "/pilots",
    step: 4,
    status: "upcoming",
    summary: "Pilot ready",
  },
  {
    label: "Proof",
    shortLabel: "05",
    href: "/evidence",
    step: 5,
    status: "upcoming",
    summary: "Evidence pending",
  },
  {
    label: "PayFlow",
    shortLabel: "06",
    href: "/evidence",
    step: 6,
    status: "upcoming",
    summary: "Packet gated",
  },
  {
    label: "ScaleGraph",
    shortLabel: "07",
    href: "/solutions",
    step: 7,
    status: "upcoming",
    summary: "Reuse after proof",
  },
];

export function LifecycleRail({
  stages,
}: {
  stages?: readonly LifecycleRailStage[];
}) {
  const activeStages = stages?.length ? stages : fallbackStages;

  return (
    <ol className="lifecycle-rail" aria-label="Procurement lifecycle progress">
      {activeStages.map((stage, index) => (
        <li className={`lifecycle-step lifecycle-step--${stage.status}`} key={stage.href}>
          <span className="lifecycle-step__marker" aria-hidden="true">
            {index + 1}
          </span>
          <span>
            <strong>{stage.label}</strong>
            <small>{stage.summary}</small>
          </span>
        </li>
      ))}
    </ol>
  );
}
