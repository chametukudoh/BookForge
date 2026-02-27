"use client";

export default function DashboardError({ error, reset }) {
  return (
    <main className="app-shell">
      <section className="section-card">
        <h2>Something went wrong</h2>
        <p className="status-line error">
          {error?.message || "An unexpected error occurred in the workspace."}
        </p>
        <button type="button" className="btn primary" onClick={() => reset()}>
          Try again
        </button>
      </section>
    </main>
  );
}
