"use client";

import { useWorkspace } from "../../contexts/WorkspaceContext";

export default function Topbar() {
  const {
    apiMode,
    projects, activeProjectId,
    selectProject, saveActiveProject, createProject
  } = useWorkspace();

  return (
    <header className="topbar">
      <div className="brand">
        <p className="kicker">KDP Production Suite</p>
        <h1>BookForge Studio</h1>
      </div>
      <div className="topbar-actions">
        <span className="chip chip-live">System: Ready</span>
        <span className={`chip ${apiMode === "api" ? "chip-live" : ""}`}>
          API: {apiMode === "api" ? "Connected" : "Local"}
        </span>
        <label>
          Project
          <select
            value={activeProjectId}
            onChange={(e) => selectProject(e.target.value)}
            aria-label="Select local project"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        </label>
        <button className="ghost-btn" type="button" onClick={saveActiveProject}>
          Save
        </button>
        <button className="ghost-btn" type="button" onClick={createProject}>
          New Project
        </button>
      </div>
    </header>
  );
}
