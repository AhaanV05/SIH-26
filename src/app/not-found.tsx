import Link from "next/link";

export default function NotFound() {
  return (
    <section className="empty-state">
      <span className="eyebrow">404 · Route not found</span>
      <h1>This workspace has not been built yet.</h1>
      <p>The requested module is outside the current implemented demo slice.</p>
      <Link className="primary-button" href="/">
        Return to overview
      </Link>
    </section>
  );
}
