"use client";

import { WorkspaceProvider } from "../../contexts/WorkspaceContext";
import Topbar from "./Topbar";
import Sidebar from "./Sidebar";
import ToastContainer from "./ToastContainer";

// Import generators from the old page.js (they're still module-level functions there)
// After full extraction, these will move to lib/generators.js
import {
  createWordSearchState,
  generateMazeState,
  generateDotPages,
  generateDotToDotPages,
  normalizeWorkspaceSnapshot,
  createDefaultWorkspace
} from "../../lib/generators";

const generators = {
  createWordSearchState,
  generateMazeState,
  generateDotPages,
  generateDotToDotPages,
  normalizeWorkspaceSnapshot,
  createDefaultWorkspace
};

export default function DashboardShell({ children }) {
  return (
    <WorkspaceProvider generators={generators}>
      <Topbar />
      <div className="layout">
        <Sidebar />
        <main className="content">
          {children}
        </main>
      </div>
      <ToastContainer />
      <div className="bg-mesh" aria-hidden="true" />
      <div className="bg-grain" aria-hidden="true" />
    </WorkspaceProvider>
  );
}
