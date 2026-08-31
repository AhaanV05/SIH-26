export default function Loading() {
  return (
    <div className="loading-state" role="status" aria-live="polite">
      <span className="loading-state__mark" aria-hidden="true" />
      Loading the evidence thread…
    </div>
  );
}
