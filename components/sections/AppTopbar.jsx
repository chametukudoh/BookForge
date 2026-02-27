export default function AppTopbar({
  apiMode,
  activeProjectId,
  projects,
  selectProject,
  saveActiveProject,
  createProject
}) {
  return (
    <header className="topbar">
      <div className="brand">
        <p className="kicker">KDP Production Suite</p>
        <h1>BookForge Studio</h1>
      </div>
      <div className="topbar-actions">
        <span className="chip chip-live">System: Ready</span>
        <span className={`chip ${apiMode === "api" ? "chip-live" : ""}`}>
          API: {apiMode === "api" ? "Connected" : "Local Fallback"}
        </span>
        <label>
          Project
          <select
            value={activeProjectId}
            onChange={(event) => selectProject(event.target.value)}
            aria-label="Select local project"
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.title}
              </option>
            ))}
          </select>
        </label>
        <button className="ghost-btn" type="button" onClick={saveActiveProject}>
          Save Project
        </button>
        <button className="ghost-btn" type="button" onClick={createProject}>
          Create Project
        </button>
      </div>
    </header>
  );
}