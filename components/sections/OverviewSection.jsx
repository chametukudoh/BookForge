export default function OverviewSection({
  projects,
  activeProject,
  wsState,
  dotPages,
  lastDotExportSec,
  projectStatus
}) {
  return (
    <section className="view active">
      <div className="hero">
        <div>
          <p className="kicker">Production Control Deck</p>
          <h2>Generate, edit, validate, and export interiors in one flow.</h2>
        </div>
        <div className="hero-stat">
          <span>Current Sprint</span>
          <strong>Milestone 3</strong>
          <p>Word Search, Maze, and Dot Marker suite</p>
        </div>
      </div>

      <div className="card-grid">
        <article className="card">
          <h3>Active Projects</h3>
          <p className="value">{projects.length}</p>
          <p>{activeProject ? `Current: ${activeProject.title}` : "No active project loaded."}</p>
        </article>
        <article className="card">
          <h3>Puzzle Validity</h3>
          <p className="value">{wsState.words.length}</p>
          <p>
            Tracked words in current {wsState.size}x{wsState.size} puzzle.
          </p>
        </article>
        <article className="card">
          <h3>Dot Marker Coverage</h3>
          <p className="value">{dotPages.length}</p>
          <p>Dauber-safe pages generated in active suite.</p>
        </article>
        <article className="card">
          <h3>Avg Export Runtime</h3>
          <p className="value">{lastDotExportSec == null ? "--" : `${lastDotExportSec.toFixed(1)}s`}</p>
          <p>Last local dot-suite PDF export runtime.</p>
        </article>
      </div>

      <div className="panel">
        <h3>Pipeline Snapshot</h3>
        <ol className="pipeline">
          <li>
            <span>1</span>
            Template + style profile selected
          </li>
          <li>
            <span>2</span>
            Page plan generated and edited
          </li>
          <li>
            <span>3</span>
            Puzzle integrity + print checks
          </li>
          <li>
            <span>4</span>
            Prompt pack and interior export
          </li>
        </ol>
        <p className={`status ${projectStatus.tone}`}>{projectStatus.text}</p>
      </div>
    </section>
  );
}