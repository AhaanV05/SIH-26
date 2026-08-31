const stages = [
  { name: "Pulse", detail: "Problem nominated", state: "complete" },
  { name: "Forge", detail: "Challenge frozen", state: "complete" },
  { name: "Match", detail: "4 eligible startups", state: "active" },
  { name: "Lab", detail: "Pilot ready", state: "upcoming" },
  { name: "Proof", detail: "Evidence pending", state: "upcoming" },
  { name: "PayFlow", detail: "Packet gated", state: "upcoming" },
  { name: "ScaleGraph", detail: "Reuse after proof", state: "upcoming" },
] as const;

export function LifecycleRail() {
  return (
    <ol className="lifecycle-rail" aria-label="Procurement lifecycle progress">
      {stages.map((stage, index) => (
        <li className={`lifecycle-step lifecycle-step--${stage.state}`} key={stage.name}>
          <span className="lifecycle-step__marker" aria-hidden="true">
            {index + 1}
          </span>
          <span>
            <strong>{stage.name}</strong>
            <small>{stage.detail}</small>
          </span>
        </li>
      ))}
    </ol>
  );
}
