"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createBookforgeApi } from "../lib/bookforge-api";
import {
  createWordSearchState,
  generateMazeState,
  generateDotPages,
  generateDotToDotPages,
  normalizeWorkspaceSnapshot,
  createDefaultWorkspace
} from "../lib/generators";
import {
  LOCAL_WORKSPACE_STORAGE_KEY,
  cloneData,
  generateLocalId
} from "../lib/constants";

const WorkspaceContext = createContext(null);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
}

export function WorkspaceProvider({ children }) {
  const initialWorkspaceRef = useRef(createDefaultWorkspace());
  const apiClientRef = useRef(createBookforgeApi());
  const autosaveTimeoutRef = useRef(null);
  const persistTimeoutRef = useRef(null);

  // ── Core UI state ──────────────────────────────────────────
  const [apiMode, setApiMode] = useState("local");
  const [projects, setProjects] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState("");
  const [storageReady, setStorageReady] = useState(false);

  // ── Status messages ────────────────────────────────────────
  const [projectStatus, setProjectStatus] = useState({ tone: "", text: "Loading local projects..." });

  // ── Word Search state ──────────────────────────────────────
  const [wsSize, setWsSize] = useState(initialWorkspaceRef.current.wsSize);
  const [wsStatus, setWsStatus] = useState({ tone: "", text: "Ready." });
  const [wsForm, setWsForm] = useState(() => cloneData(initialWorkspaceRef.current.wsForm));
  const [wsState, setWsState] = useState(() => cloneData(initialWorkspaceRef.current.wsState));

  // ── Maze state ─────────────────────────────────────────────
  const [mazeRows, setMazeRows] = useState(initialWorkspaceRef.current.mazeRows);
  const [mazeCols, setMazeCols] = useState(initialWorkspaceRef.current.mazeCols);
  const [mazeEdit, setMazeEdit] = useState(() => cloneData(initialWorkspaceRef.current.mazeEdit));
  const [mazeTerminals, setMazeTerminals] = useState(() => cloneData(initialWorkspaceRef.current.mazeTerminals));
  const [mazeStatus, setMazeStatus] = useState({ tone: "", text: "Ready." });
  const [mazeState, setMazeState] = useState(() => cloneData(initialWorkspaceRef.current.mazeState));

  // ── Dot Marker state ───────────────────────────────────────
  const [dotConfig, setDotConfig] = useState(() => cloneData(initialWorkspaceRef.current.dotConfig));
  const [dotPages, setDotPages] = useState(() => cloneData(initialWorkspaceRef.current.dotPages));
  const [activeDotPage, setActiveDotPage] = useState(initialWorkspaceRef.current.activeDotPage);
  const [dotStatus, setDotStatus] = useState({ tone: "", text: "Generated initial dot marker suite." });
  const [dotExporting, setDotExporting] = useState(false);
  const [dotUseAiReferences, setDotUseAiReferences] = useState(true);
  const [aiSceneBusy, setAiSceneBusy] = useState(false);
  const [aiSceneStatus, setAiSceneStatus] = useState({ tone: "", text: "AI scenes not generated yet." });
  const [aiSceneItems, setAiSceneItems] = useState([]);
  const [aiExporting, setAiExporting] = useState(false);
  const [aiSceneErrors, setAiSceneErrors] = useState([]);
  const [lastDotExportSec, setLastDotExportSec] = useState(null);

  // ── Dot-to-Dot state ───────────────────────────────────────
  const [dotToDotConfig, setDotToDotConfig] = useState(() => cloneData(initialWorkspaceRef.current.dotToDotConfig));
  const [dotToDotPages, setDotToDotPages] = useState(() => cloneData(initialWorkspaceRef.current.dotToDotPages));
  const [dotToDotLibrary, setDotToDotLibrary] = useState(() =>
    cloneData(initialWorkspaceRef.current.dotToDotLibrary || [])
  );
  const [dotToDotImageTrace, setDotToDotImageTrace] = useState(() =>
    cloneData(initialWorkspaceRef.current.dotToDotImageTrace || null)
  );
  const [dotToDotImageBusy, setDotToDotImageBusy] = useState(false);
  const [activeDotToDotPage, setActiveDotToDotPage] = useState(initialWorkspaceRef.current.activeDotToDotPage);
  const [dotToDotPreviewMode, setDotToDotPreviewMode] = useState(initialWorkspaceRef.current.dotToDotPreviewMode);
  const [dotToDotStatus, setDotToDotStatus] = useState({ tone: "", text: "Generated initial dot-to-dot suite." });
  const [dotToDotExporting, setDotToDotExporting] = useState(false);

  // ── Export state ───────────────────────────────────────────
  const [exportStatus, setExportStatus] = useState({ tone: "", text: "Ready." });
  const [exportBusy, setExportBusy] = useState("");
  const [preflightBleedEnabled, setPreflightBleedEnabled] = useState(false);
  const [readingDirection, setReadingDirection] = useState("LTR");

  // ── Toasts ─────────────────────────────────────────────────
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((tone, text) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev.slice(-4), { id, tone, text }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ── Status setters ─────────────────────────────────────────
  const setWsStatusMessage = useCallback((tone, text) => setWsStatus({ tone, text }), []);
  const setMazeStatusMessage = useCallback((tone, text) => setMazeStatus({ tone, text }), []);
  const setDotStatusMessage = useCallback((tone, text) => setDotStatus({ tone, text }), []);
  const setAiSceneStatusMessage = useCallback((tone, text) => setAiSceneStatus({ tone, text }), []);
  const setDotToDotStatusMessage = useCallback((tone, text) => setDotToDotStatus({ tone, text }), []);
  const setProjectStatusMessage = useCallback((tone, text) => setProjectStatus({ tone, text }), []);
  const setExportStatusMessage = useCallback((tone, text) => setExportStatus({ tone, text }), []);

  // ── Workspace snapshot ─────────────────────────────────────
  const buildWorkspaceSnapshot = useCallback(
    () => ({
      wsSize, wsForm, wsState,
      mazeRows, mazeCols, mazeEdit, mazeTerminals, mazeState,
      dotConfig, dotPages, activeDotPage,
      dotToDotConfig, dotToDotImageTrace, dotToDotLibrary, dotToDotPages,
      activeDotToDotPage, dotToDotPreviewMode
    }),
    [wsSize, wsForm, wsState, mazeRows, mazeCols, mazeEdit, mazeTerminals, mazeState,
     dotConfig, dotPages, activeDotPage, dotToDotConfig, dotToDotImageTrace, dotToDotLibrary,
     dotToDotPages, activeDotToDotPage, dotToDotPreviewMode]
  );

  const applyWorkspaceSnapshot = useCallback(
    (snapshot) => {
      const normalized = normalizeWorkspaceSnapshot(snapshot, initialWorkspaceRef.current);
      setWsSize(normalized.wsSize);
      setWsForm(cloneData(normalized.wsForm));
      setWsState(cloneData(normalized.wsState));
      setMazeRows(normalized.mazeRows);
      setMazeCols(normalized.mazeCols);
      setMazeEdit(cloneData(normalized.mazeEdit));
      setMazeTerminals(cloneData(normalized.mazeTerminals));
      setMazeState(cloneData(normalized.mazeState));
      setDotConfig(cloneData(normalized.dotConfig));
      setDotPages(cloneData(normalized.dotPages));
      setActiveDotPage(normalized.activeDotPage);
      setDotToDotConfig(cloneData(normalized.dotToDotConfig));
      setDotToDotImageTrace(cloneData(normalized.dotToDotImageTrace));
      setDotToDotLibrary(cloneData(normalized.dotToDotLibrary || []));
      setDotToDotPages(cloneData(normalized.dotToDotPages));
      setActiveDotToDotPage(normalized.activeDotToDotPage);
      setDotToDotPreviewMode(normalized.dotToDotPreviewMode);
    },
    []
  );

  // ── Active project ─────────────────────────────────────────
  const activeProject = useMemo(
    () => projects.find((p) => p.id === activeProjectId) || null,
    [projects, activeProjectId]
  );

  useEffect(() => {
    if (!UUID_PATTERN.test(String(activeProjectId || ""))) return;
    apiClientRef.current = createBookforgeApi({ projectId: activeProjectId });
  }, [activeProjectId]);

  // ── Load from localStorage on mount ────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(LOCAL_WORKSPACE_STORAGE_KEY);
      if (!raw) {
        const initial = {
          id: generateLocalId(),
          title: "Project 1",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          snapshot: cloneData(initialWorkspaceRef.current)
        };
        setProjects([initial]);
        setActiveProjectId(initial.id);
        applyWorkspaceSnapshot(initial.snapshot);
        setProjectStatusMessage("ok", "Created initial local project.");
        return;
      }
      const parsed = JSON.parse(raw);
      const loaded = Array.isArray(parsed?.projects) ? parsed.projects : [];
      if (!loaded.length) throw new Error("No projects found in local workspace.");
      const requestedId = typeof parsed.activeProjectId === "string" ? parsed.activeProjectId : "";
      const chosen = loaded.find((p) => p.id === requestedId) || loaded[0];
      setProjects(loaded);
      setActiveProjectId(chosen.id);
      applyWorkspaceSnapshot(chosen.snapshot);
      setProjectStatusMessage("ok", `Loaded ${chosen.title} from local storage.`);
    } catch (error) {
      const fallback = {
        id: generateLocalId(),
        title: "Project 1",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        snapshot: cloneData(initialWorkspaceRef.current)
      };
      setProjects([fallback]);
      setActiveProjectId(fallback.id);
      applyWorkspaceSnapshot(fallback.snapshot);
      const msg = error instanceof Error ? error.message : "Failed to load local workspace.";
      setProjectStatusMessage("warn", `${msg} Started a clean local project.`);
    } finally {
      setStorageReady(true);
    }
  }, [applyWorkspaceSnapshot, setProjectStatusMessage]);

  // ── Auto-save snapshot to active project on state change ───
  useEffect(() => {
    if (!storageReady || !activeProjectId) return;
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }
    autosaveTimeoutRef.current = setTimeout(() => {
      const snapshot = cloneData(buildWorkspaceSnapshot());
      setProjects((prev) =>
        prev.map((p) =>
          p.id === activeProjectId
            ? { ...p, updatedAt: new Date().toISOString(), snapshot }
            : p
        )
      );
      autosaveTimeoutRef.current = null;
    }, 350);
    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
        autosaveTimeoutRef.current = null;
      }
    };
  }, [storageReady, activeProjectId, buildWorkspaceSnapshot]);

  // ── Persist projects to localStorage ───────────────────────
  useEffect(() => {
    if (!storageReady || typeof window === "undefined") return;
    if (persistTimeoutRef.current) {
      clearTimeout(persistTimeoutRef.current);
    }
    persistTimeoutRef.current = setTimeout(() => {
      const payload = JSON.stringify({ activeProjectId, projects });
      window.localStorage.setItem(LOCAL_WORKSPACE_STORAGE_KEY, payload);
      persistTimeoutRef.current = null;
    }, 300);
    return () => {
      if (persistTimeoutRef.current) {
        clearTimeout(persistTimeoutRef.current);
        persistTimeoutRef.current = null;
      }
    };
  }, [storageReady, activeProjectId, projects]);

  // ── Project management ─────────────────────────────────────
  const createProject = useCallback(() => {
    const fallbackTitle = `Project ${projects.length + 1}`;
    const inputTitle = typeof window === "undefined" ? fallbackTitle : window.prompt("Project name", fallbackTitle);
    if (inputTitle === null) return;
    const title = inputTitle.trim() || fallbackTitle;
    const newProject = {
      id: generateLocalId(),
      title,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      snapshot: cloneData(initialWorkspaceRef.current)
    };
    setProjects((prev) => [newProject, ...prev]);
    setActiveProjectId(newProject.id);
    applyWorkspaceSnapshot(newProject.snapshot);
    setProjectStatusMessage("ok", `Created local project: ${title}.`);
    addToast("ok", `Created project "${title}"`);
  }, [projects.length, applyWorkspaceSnapshot, setProjectStatusMessage, addToast]);

  const selectProject = useCallback(
    (projectId) => {
      const target = projects.find((p) => p.id === projectId);
      if (!target) return;
      setActiveProjectId(target.id);
      applyWorkspaceSnapshot(target.snapshot);
      setProjectStatusMessage("ok", `Loaded local project: ${target.title}.`);
    },
    [projects, applyWorkspaceSnapshot, setProjectStatusMessage]
  );

  const saveActiveProject = useCallback(() => {
    if (!activeProjectId) return;
    const snapshot = cloneData(buildWorkspaceSnapshot());
    setProjects((prev) =>
      prev.map((p) =>
        p.id === activeProjectId
          ? { ...p, updatedAt: new Date().toISOString(), snapshot }
          : p
      )
    );
    setProjectStatusMessage("ok", "Saved current project locally.");
    addToast("ok", "Project saved");
  }, [activeProjectId, buildWorkspaceSnapshot, setProjectStatusMessage, addToast]);

  const value = useMemo(
    () => ({
      // API
      apiClientRef, apiMode, setApiMode,
      // Projects
      projects, activeProjectId, activeProject, projectStatus,
      createProject, selectProject, saveActiveProject,
      setProjectStatusMessage,
      // Word Search
      wsSize, setWsSize, wsStatus, setWsStatus, wsForm, setWsForm, wsState, setWsState,
      setWsStatusMessage,
      // Maze
      mazeRows, setMazeRows, mazeCols, setMazeCols,
      mazeEdit, setMazeEdit, mazeTerminals, setMazeTerminals,
      mazeStatus, setMazeStatus, mazeState, setMazeState,
      setMazeStatusMessage,
      // Dot Marker
      dotConfig, setDotConfig, dotPages, setDotPages,
      activeDotPage, setActiveDotPage, dotStatus, setDotStatus,
      dotExporting, setDotExporting, dotUseAiReferences, setDotUseAiReferences,
      aiSceneBusy, setAiSceneBusy, aiSceneStatus, setAiSceneStatus,
      aiSceneItems, setAiSceneItems, aiExporting, setAiExporting,
      aiSceneErrors, setAiSceneErrors, lastDotExportSec, setLastDotExportSec,
      setDotStatusMessage, setAiSceneStatusMessage,
      // Dot-to-Dot
      dotToDotConfig, setDotToDotConfig, dotToDotPages, setDotToDotPages,
      dotToDotLibrary, setDotToDotLibrary,
      dotToDotImageTrace, setDotToDotImageTrace,
      dotToDotImageBusy, setDotToDotImageBusy,
      activeDotToDotPage, setActiveDotToDotPage,
      dotToDotPreviewMode, setDotToDotPreviewMode,
      dotToDotStatus, setDotToDotStatus, dotToDotExporting, setDotToDotExporting,
      setDotToDotStatusMessage,
      // Export
      exportStatus, setExportStatus, exportBusy, setExportBusy,
      preflightBleedEnabled, setPreflightBleedEnabled,
      readingDirection, setReadingDirection,
      setExportStatusMessage,
      // Toasts
      toasts, addToast, dismissToast,
      initialWorkspaceRef
    }),
    [
      apiMode, projects, activeProjectId, activeProject, projectStatus,
      createProject, selectProject, saveActiveProject, setProjectStatusMessage,
      wsSize, wsStatus, wsForm, wsState, setWsStatusMessage,
      mazeRows, mazeCols, mazeEdit, mazeTerminals, mazeStatus, mazeState, setMazeStatusMessage,
      dotConfig, dotPages, activeDotPage, dotStatus, dotExporting, dotUseAiReferences,
      aiSceneBusy, aiSceneStatus, aiSceneItems, aiExporting, aiSceneErrors, lastDotExportSec,
      setDotStatusMessage, setAiSceneStatusMessage,
      dotToDotConfig, dotToDotPages, dotToDotLibrary, dotToDotImageTrace, dotToDotImageBusy,
      activeDotToDotPage, dotToDotPreviewMode, dotToDotStatus, dotToDotExporting,
      setDotToDotStatusMessage,
      exportStatus, exportBusy, preflightBleedEnabled, readingDirection,
      setExportStatusMessage,
      toasts, addToast, dismissToast
    ]
  );

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}
