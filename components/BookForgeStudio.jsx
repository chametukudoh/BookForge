"use client";

import { useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import OverviewSection from "./sections/OverviewSection";
import StyleForgeSection from "./sections/StyleForgeSection";
import QCExportSection from "./sections/QCExportSection";
import WordSearchSection from "./sections/WordSearchSection";
import MazeSection from "./sections/MazeSection";
import DotMarkerSection from "./sections/DotMarkerSection";
import DotToDotSection from "./sections/DotToDotSection";
import AppTopbar from "./sections/AppTopbar";
import AppSidebar from "./sections/AppSidebar";
import { getDotToDotPathMetrics } from "../lib/dot-to-dot-core";
import { extractImageTraceFromImageData } from "../lib/dot-to-dot-image";
import {
  createLineArtAssetFromTrace,
  evaluateLineArtTrace,
  normalizeLineArtLibrary
} from "../lib/dot-to-dot-library";
import { runKdpPreflight } from "../lib/kdp-preflight";
import { downloadDataUrlFile } from "../lib/image-export-utils";
import {
  buildDotToDotSvgMarkup,
  drawDotToDotPageToPdf,
  buildDotSvgMarkup,
  drawDotPageToPdf
} from "../lib/export-renderers";
import {
  buildAiPrintablePageDataUrl,
  fetchImageAsDataUrl,
  loadImageDataFromFile,
  loadImageElementFromUrl
} from "../lib/ai-page-utils";
import {
  drawMotifGuideSvgMarkup,
  drawMotifGuideSvgNodes,
  drawRegionPdf
} from "../lib/dot-render-utils";
import { WorkspaceProvider, useWorkspace } from "../contexts/WorkspaceContext";
import { UIProvider, useUI } from "../contexts/UIContext";
import {
  DIRECTIONS,
  ORTHO_DIRECTIONS,
  OPPOSITE,
  ALPHABET,
  STARTER_WORDS,
  DOT_CANVAS_PPI,
  AI_EXPORT_PPI,
  KDP_TRIM_SIZES,
  DEFAULT_DOT_CONFIG,
  DEFAULT_DOT_TO_DOT_CONFIG,
  DOT_MOTIFS,
  DOT_THEME_PACKS,
  DOT_NICHE_OPTIONS,
  DOT_TO_DOT_DIFFICULTY,
  createSeededRandom,
  randomLetter,
  randomBetween,
  getTrimSize,
  safeSlug,
  escapeXml,
  downloadTextFile,
  normalizeDotToDotImageTrace,
  cellsForWord,
  createWordSearchState,
  fillWordSearchGaps,
  mapWordSearchApiStateToLocal,
  generateMazeState,
  solveMazePath,
  validateMazeState,
  drawMazeCanvas,
  summarizeQcItems,
  badgeFromTone,
  resolveThemeProfile,
  inferDotThemeFromTitle,
  getDotSuiteBaseName,
  applyAiReferencesToPages,
  generateDotPage,
  generateDotPages,
  getDotToDotDifficulty,
  getDotToDotBaseName,
  getDotToDotMetrics,
  generateDotToDotPage,
  generateDotToDotPages,
  evaluateDotToDotPage,
  evaluateDotPage
} from "../lib/generators";

const VIEW_TO_ROUTE = {
  overview: "/",
  wordsearch: "/word-search",
  maze: "/maze",
  dotmarker: "/dot-marker",
  dot2dot: "/dot-to-dot",
  style: "/style",
  qc: "/qc"
};

function BookForgeStudioContent() {
  const router = useRouter();
  const wsGridRef = useRef(null);
  const mazeCanvasRef = useRef(null);
  const { view, setView } = useUI();

  const {
    apiClientRef,
    apiMode,
    setApiMode,
    projects,
    activeProjectId,
    activeProject,
    projectStatus,
    createProject,
    selectProject,
    saveActiveProject,
    wsSize,
    setWsSize,
    wsStatus,
    setWsStatusMessage,
    wsForm,
    setWsForm,
    wsState,
    setWsState,
    mazeRows,
    setMazeRows,
    mazeCols,
    setMazeCols,
    mazeEdit,
    setMazeEdit,
    mazeTerminals,
    setMazeTerminals,
    mazeStatus,
    setMazeStatus,
    setMazeStatusMessage,
    mazeState,
    setMazeState,
    dotConfig,
    setDotConfig,
    dotPages,
    setDotPages,
    activeDotPage,
    setActiveDotPage,
    dotStatus,
    setDotStatusMessage,
    dotExporting,
    setDotExporting,
    dotUseAiReferences,
    setDotUseAiReferences,
    aiSceneBusy,
    setAiSceneBusy,
    aiSceneStatus,
    setAiSceneStatusMessage,
    aiSceneItems,
    setAiSceneItems,
    aiExporting,
    setAiExporting,
    aiSceneErrors,
    setAiSceneErrors,
    lastDotExportSec,
    setLastDotExportSec,
    dotToDotConfig,
    setDotToDotConfig,
    dotToDotPages,
    setDotToDotPages,
    dotToDotLibrary,
    setDotToDotLibrary,
    dotToDotImageTrace,
    setDotToDotImageTrace,
    dotToDotImageBusy,
    setDotToDotImageBusy,
    activeDotToDotPage,
    setActiveDotToDotPage,
    dotToDotPreviewMode,
    setDotToDotPreviewMode,
    dotToDotStatus,
    setDotToDotStatusMessage,
    dotToDotExporting,
    setDotToDotExporting,
    exportStatus,
    setExportStatusMessage,
    exportBusy,
    setExportBusy,
    preflightBleedEnabled,
    setPreflightBleedEnabled,
    readingDirection,
    setReadingDirection
  } = useWorkspace();

  const navigateToView = (nextView) => {
    const route = VIEW_TO_ROUTE[nextView] || "/";
    setView(nextView);
    router.push(route);
  };

  const highlightedCells = useMemo(() => {
    const target = wsState.words.find((word) => word.id === wsState.highlightedWordId);
    if (!target) return new Set();
    return new Set(cellsForWord(target).map((c) => `${c.row}:${c.col}`));
  }, [wsState.words, wsState.highlightedWordId]);

  const activeDot = dotPages[activeDotPage] || null;
  const dotQc = useMemo(() => evaluateDotPage(activeDot, dotConfig), [activeDot, dotConfig]);
  const selectedTrim = useMemo(() => getTrimSize(dotConfig.trimId), [dotConfig.trimId]);
  const dotInference = useMemo(
    () => inferDotThemeFromTitle(dotConfig.bookTitle, dotConfig.theme, dotConfig.nicheId),
    [dotConfig.bookTitle, dotConfig.theme, dotConfig.nicheId]
  );
  const activeDotToDot = dotToDotPages[activeDotToDotPage] || null;
  const dotToDotQc = useMemo(
    () => evaluateDotToDotPage(activeDotToDot, dotToDotConfig),
    [activeDotToDot, dotToDotConfig]
  );
  const selectedDotToDotTrim = useMemo(
    () => getTrimSize(dotToDotConfig.trimId),
    [dotToDotConfig.trimId]
  );
  const dotToDotInference = useMemo(
    () => inferDotThemeFromTitle(dotToDotConfig.bookTitle, dotToDotConfig.theme),
    [dotToDotConfig.bookTitle, dotToDotConfig.theme]
  );
  const dotToDotSuiteMetrics = useMemo(
    () =>
      dotToDotPages.map((page) => {
        const difficulty = getDotToDotDifficulty(page?.difficulty || dotToDotConfig.difficulty);
        const metrics = getDotToDotPathMetrics(page?.points || [], {
          targetMinGapPx: difficulty.minGapPx
        });
        return {
          dots: Array.isArray(page?.points) ? page.points.length : 0,
          minGapTarget: difficulty.minGapPx,
          ...metrics,
          status:
            metrics.qualityScore >= 75 &&
            metrics.crossingCount === 0 &&
            metrics.minStep >= difficulty.minGapPx
              ? "PASS"
              : "WARN"
        };
      }),
    [dotToDotPages, dotToDotConfig.difficulty]
  );
  const readyDotToDotLibrary = useMemo(
    () => normalizeLineArtLibrary(dotToDotLibrary).filter((asset) => asset.status === "ready"),
    [dotToDotLibrary]
  );
  const preflightReport = useMemo(() => {
    const firstPage = dotPages[0];
    const pageWidthIn = firstPage ? firstPage.width / DOT_CANVAS_PPI : selectedTrim.widthIn;
    const pageHeightIn = firstPage ? firstPage.height / DOT_CANVAS_PPI : selectedTrim.heightIn;
    const marginXIn = firstPage ? (firstPage.marginX ?? 40) / DOT_CANVAS_PPI : 0.4;
    const marginYIn = firstPage ? (firstPage.marginY ?? 45) / DOT_CANVAS_PPI : 0.45;

    return runKdpPreflight({
      trimWidthIn: selectedTrim.widthIn,
      trimHeightIn: selectedTrim.heightIn,
      pageWidthIn,
      pageHeightIn,
      pageCount: dotPages.length,
      bleedEnabled: preflightBleedEnabled,
      margins: {
        insideIn: marginXIn,
        outsideIn: marginXIn,
        topIn: marginYIn,
        bottomIn: marginYIn
      },
      lineWidthPt: 0.024 * 72,
      fontSizePt: 12,
      readingDirection,
      hasRasterImages: false
    });
  }, [dotPages, selectedTrim, preflightBleedEnabled, readingDirection]);
  const dotHasWarnings = dotQc.some((rule) => rule.status !== "PASS");
  const preflightTone =
    preflightReport.summary.errors > 0
      ? "error"
      : preflightReport.summary.warnings > 0
        ? "warn"
        : "ok";
  const preflightSummaryText =
    preflightReport.summary.errors > 0
      ? `Preflight has ${preflightReport.summary.errors} blocking errors and ${preflightReport.summary.warnings} warnings.`
      : preflightReport.summary.warnings > 0
        ? `Preflight passed with ${preflightReport.summary.warnings} warnings.`
        : "Preflight passed with no blocking issues.";
  const wsBadge = badgeFromTone(wsStatus.tone);
  const mazeBadge = badgeFromTone(mazeStatus.tone);
  const dotBadge = badgeFromTone(dotHasWarnings ? "warn" : "ok");
  const preflightBadge = badgeFromTone(preflightTone);

  useEffect(() => {
    drawMazeCanvas(mazeCanvasRef.current, mazeState);
  }, [mazeState]);

  useEffect(() => {
    const targetCount = Math.min(80, Math.max(1, Number(dotConfig.pageCount) || 1));
    setDotPages((prev) => {
      if (!Array.isArray(prev) || prev.length <= targetCount) return prev;
      return prev.slice(0, targetCount);
    });
    setAiSceneItems((prev) => {
      if (!Array.isArray(prev) || prev.length <= targetCount) return prev;
      return prev.slice(0, targetCount);
    });
    setActiveDotPage((prev) => Math.min(prev, targetCount - 1));
  }, [dotConfig.pageCount, setDotPages, setAiSceneItems, setActiveDotPage]);

  useEffect(() => {
    const targetCount = Math.min(120, Math.max(1, Number(dotToDotConfig.pageCount) || 1));
    setDotToDotPages((prev) => {
      if (!Array.isArray(prev) || prev.length <= targetCount) return prev;
      return prev.slice(0, targetCount);
    });
    setActiveDotToDotPage((prev) => Math.min(prev, targetCount - 1));
  }, [dotToDotConfig.pageCount, setDotToDotPages, setActiveDotToDotPage]);

  const patchWordCellApi = async (row, col, char, revision) => {
    const response = await apiClientRef.current.patchWordSearchCells({
      revision,
      cells: [{ row, col, char }]
    });
    if (response.ok) {
      setApiMode("api");
    } else {
      setApiMode("local");
    }
  };

  const handleWordCellKeyDown = (row, col, event) => {
    const key = event.key.toUpperCase();
    if (/^[A-Z]$/.test(key)) {
      setWsState((prev) => {
        const grid = prev.grid.map((r) => [...r]);
        grid[row][col] = key;
        const revision = (prev.revision || 1) + 1;
        void patchWordCellApi(row, col, key, revision);
        return { ...prev, grid, revision };
      });
    }
    if (event.key === "Backspace" || event.key === "Delete") {
      event.preventDefault();
      setWsState((prev) => {
        const grid = prev.grid.map((r) => [...r]);
        const nextChar = randomLetter();
        grid[row][col] = nextChar;
        const revision = (prev.revision || 1) + 1;
        void patchWordCellApi(row, col, nextChar, revision);
        return { ...prev, grid, revision };
      });
    }

    const moveMap = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1]
    };
    if (moveMap[event.key]) {
      event.preventDefault();
      const [dr, dc] = moveMap[event.key];
      const nr = Math.min(Math.max(0, row + dr), wsState.size - 1);
      const nc = Math.min(Math.max(0, col + dc), wsState.size - 1);
      const nextEl = wsGridRef.current?.querySelector(`[data-cell="${nr}:${nc}"]`);
      nextEl?.focus();
    }
  };

  const generateWordSearch = async () => {
    const localState = createWordSearchState(Number(wsSize));
    setWsState(localState);

    const response = await apiClientRef.current.generateWordSearch({
      revision: localState.revision,
      words: STARTER_WORDS,
      grid_size: localState.size,
      directions: Object.keys(DIRECTIONS),
      locale: "en-US"
    });

    if (response.ok) {
      setApiMode("api");
      setWsState((prev) => mapWordSearchApiStateToLocal(response.data, prev));
      setWsStatusMessage("ok", "Generated via API.");
    } else {
      setApiMode("local");
      setWsStatusMessage("warn", "API unavailable. Generated locally.");
    }
  };

  const placeWordFromForm = async () => {
    const rawWord = wsForm.word.trim().toUpperCase().replace(/[^A-Z]/g, "");
    const row = Number(wsForm.row);
    const col = Number(wsForm.col);
    const direction = wsForm.direction;

    if (rawWord.length < 2) {
      setWsStatusMessage("error", "Word must be at least 2 letters.");
      return;
    }
    if (!canPlaceWord(rawWord, row, col, direction, wsState.grid, wsState.size)) {
      setWsStatusMessage("warn", "Placement conflict: out-of-bounds or overlap mismatch.");
      return;
    }

    let nextRevision = wsState.revision || 1;
    setWsState((prev) => {
      const grid = prev.grid.map((r) => [...r]);
      placeWord(rawWord, row, col, direction, grid);
      nextRevision = (prev.revision || 1) + 1;
      return {
        ...prev,
        grid,
        words: [...prev.words, { id: String(prev.nextWordId), text: rawWord, row, col, direction }],
        nextWordId: prev.nextWordId + 1,
        revision: nextRevision
      };
    });
    const response = await apiClientRef.current.addWordSearchWord({
      revision: nextRevision,
      text: rawWord,
      start: { row, col },
      direction,
      locked: false,
      hidden: false
    });
    if (response.ok) {
      setApiMode("api");
      setWsStatusMessage("ok", `Placed ${rawWord} (synced).`);
    } else {
      setApiMode("local");
      setWsStatusMessage("warn", `Placed ${rawWord} locally. API sync failed.`);
    }
    setWsForm((prev) => ({ ...prev, word: "" }));
  };

  const normalizeWordSearchFill = async () => {
    const nextGrid = fillWordSearchGaps(wsState.grid);
    const changedCells = [];
    for (let r = 0; r < wsState.size; r += 1) {
      for (let c = 0; c < wsState.size; c += 1) {
        if (wsState.grid[r][c] !== nextGrid[r][c]) {
          changedCells.push({ row: r, col: c, char: nextGrid[r][c] });
        }
      }
    }

    const revision = (wsState.revision || 1) + 1;
    setWsState((prev) => ({ ...prev, grid: nextGrid, revision }));
    if (changedCells.length) {
      const response = await apiClientRef.current.patchWordSearchCells({
        revision,
        cells: changedCells
      });
      if (response.ok) {
        setApiMode("api");
        setWsStatusMessage("ok", "Normalize fill complete (synced).");
      } else {
        setApiMode("local");
        setWsStatusMessage("warn", "Normalized locally. API sync failed.");
      }
      return;
    }
    setWsStatusMessage("ok", "Normalize fill complete.");
  };

  const validateWordSearch = async () => {
    const response = await apiClientRef.current.validateWordSearch();
    if (response.ok) {
      setApiMode("api");
      const summary = summarizeQcItems(
        Array.isArray(response.data?.items) ? response.data.items : [],
        "QC-P2/P2A/P2B pass: all word placements valid."
      );
      setWsStatusMessage(summary.tone, summary.text);
      return;
    }

    let invalid = 0;
    wsState.words.forEach((word) => {
      const formed = cellsForWord(word)
        .map((cell) => wsState.grid[cell.row]?.[cell.col] ?? "")
        .join("");
      if (formed !== word.text) invalid += 1;
    });

    setApiMode("local");
    if (invalid === 0) setWsStatusMessage("ok", "Local QC pass: all placements valid.");
    else setWsStatusMessage("warn", `Local QC warning: ${invalid} placements no longer match grid content.`);
  };

  const applyMazeEdit = async () => {
    const row = Number(mazeEdit.row);
    const col = Number(mazeEdit.col);
    const direction = mazeEdit.direction;
    const action = mazeEdit.action;

    if (row < 0 || row >= mazeState.rows || col < 0 || col >= mazeState.cols) {
      setMazeStatusMessage("error", "Invalid cell coordinates.");
      return;
    }

    const [dr, dc] = ORTHO_DIRECTIONS[direction];
    const nr = row + dr;
    const nc = col + dc;
    if (nr < 0 || nr >= mazeState.rows || nc < 0 || nc >= mazeState.cols) {
      setMazeStatusMessage("warn", "Edit blocked: neighbor is outside maze bounds.");
      return;
    }

    const revision = (mazeState.revision || 1) + 1;
    setMazeState((prev) => {
      const cells = prev.cells.map((r) => r.map((c) => ({ walls: { ...c.walls } })));
      const isOpen = action === "remove";
      cells[row][col].walls[direction] = !isOpen;
      cells[nr][nc].walls[OPPOSITE[direction]] = !isOpen;
      return { ...prev, cells, solutionPath: [], revision };
    });
    const response = await apiClientRef.current.patchMazeWalls({
      revision,
      walls: [
        {
          from: { row, col },
          to: { row: nr, col: nc },
          op: action
        }
      ]
    });
    if (response.ok) {
      setApiMode("api");
      setMazeStatusMessage("ok", "Applied wall edit (synced).");
    } else {
      setApiMode("local");
      setMazeStatusMessage("warn", "Wall edit applied locally. API sync failed.");
    }
  };

  const applyMazeTerminals = async () => {
    const parse = (value, fallback) => {
      const [rRaw, cRaw] = value.split(",").map((v) => Number(v.trim()));
      if (
        Number.isInteger(rRaw) &&
        Number.isInteger(cRaw) &&
        rRaw >= 0 &&
        rRaw < mazeState.rows &&
        cRaw >= 0 &&
        cRaw < mazeState.cols
      ) {
        return { row: rRaw, col: cRaw };
      }
      return fallback;
    };

    const nextEntrance = parse(mazeTerminals.entrance, mazeState.entrance);
    const nextExit = parse(mazeTerminals.exit, mazeState.exit);
    const revision = (mazeState.revision || 1) + 1;
    setMazeState((prev) => ({
      ...prev,
      entrance: nextEntrance,
      exit: nextExit,
      solutionPath: [],
      revision
    }));
    const response = await apiClientRef.current.patchMazeTerminals({
      revision,
      entrance: nextEntrance,
      exit: nextExit
    });
    if (response.ok) {
      setApiMode("api");
      setMazeStatusMessage("ok", "Updated terminals (synced).");
    } else {
      setApiMode("local");
      setMazeStatusMessage("warn", "Updated terminals locally. API sync failed.");
    }
  };

  const solveMaze = async () => {
    const path = solveMazePath(mazeState);
    if (!path.length) {
      setMazeStatusMessage("error", "No solution path found.");
      setMazeState((prev) => ({ ...prev, solutionPath: [] }));
      return;
    }
    let resolvedPath = path;
    const response = await apiClientRef.current.solveMaze();
    if (response.ok && Array.isArray(response.data?.solution_path) && response.data.solution_path.length) {
      resolvedPath = response.data.solution_path;
      setApiMode("api");
      setMazeStatusMessage("ok", `Solved via API path length: ${resolvedPath.length}`);
    } else {
      setApiMode("local");
      setMazeStatusMessage("warn", `Solved locally path length: ${resolvedPath.length}`);
    }
    setMazeState((prev) => ({ ...prev, solutionPath: resolvedPath }));
  };

  const validateMaze = async () => {
    const response = await apiClientRef.current.validateMaze();
    if (response.ok) {
      setApiMode("api");
      const summary = summarizeQcItems(
        Array.isArray(response.data?.items) ? response.data.items : [],
        "QC-P3/P3A/P3B pass: maze validated."
      );
      setMazeStatus(summary);
      return;
    }
    setApiMode("local");
    setMazeStatus(validateMazeState(mazeState));
  };

  const regenerateMaze = async () => {
    const nextMaze = generateMazeState(mazeRows, mazeCols);
    setMazeState(nextMaze);
    setMazeTerminals({ entrance: "0,0", exit: `${nextMaze.rows - 1},${nextMaze.cols - 1}` });
    const response = await apiClientRef.current.generateMaze({
      revision: nextMaze.revision,
      rows: nextMaze.rows,
      cols: nextMaze.cols,
      difficulty: "medium",
      algorithm: "recursive_backtracker"
    });
    if (response.ok) {
      setApiMode("api");
      setMazeStatusMessage("ok", "Generated maze request sent to API.");
    } else {
      setApiMode("local");
      setMazeStatusMessage("warn", "Generated locally. API unavailable.");
    }
  };

  const regenerateDotSuite = async () => {
    if (!dotConfig.bookTitle.trim() && !dotConfig.theme.trim()) {
      setDotStatusMessage("warn", "Enter a Book Title or Niche/Theme before generating.");
      return;
    }
    const trim = getTrimSize(dotConfig.trimId);
    const inference = dotInference;
    if (dotConfig.nicheId === "auto" && inference.confidence === "low") {
      setDotStatusMessage(
        "warn",
        "Theme match confidence is low. Select a Niche preset to force exact themed pages."
      );
      return;
    }
    const normalized = {
      bookTitle: dotConfig.bookTitle.trim(),
      nicheId: dotConfig.nicheId || "auto",
      pageCount: Math.min(80, Math.max(1, Number(dotConfig.pageCount) || 1)),
      dotsPerPage: Math.min(40, Math.max(6, Number(dotConfig.dotsPerPage) || 6)),
      minRadius: Math.min(48, Math.max(10, Number(dotConfig.minRadius) || 10)),
      maxRadius: Math.min(60, Math.max(12, Number(dotConfig.maxRadius) || 12)),
      minGap: Math.min(36, Math.max(4, Number(dotConfig.minGap) || 4)),
      theme: inference.effectiveTheme,
      trimId: trim.id,
      motifPool: inference.motifPool
    };
    if (normalized.maxRadius < normalized.minRadius) {
      normalized.maxRadius = normalized.minRadius;
    }
    setDotConfig(normalized);
    const pages = generateDotPages(normalized);
    const uniqueSceneCount = new Set(
      pages.map((page) => page.scene?.signature || page.motifs.map((motif) => motif.motifId).join("+"))
    ).size;
    setDotPages(pages);
    setActiveDotPage(0);
    const response = await apiClientRef.current.planDotMarkerSuite({
      page_mix: [{ type: "coloring", count: normalized.pageCount }],
      generator_settings: {
        mode: "dot_marker",
        book_title: normalized.bookTitle || undefined,
        niche_id: normalized.nicheId,
        theme: normalized.theme,
        dots_per_page: normalized.dotsPerPage,
        min_radius: normalized.minRadius,
        max_radius: normalized.maxRadius,
        min_gap: normalized.minGap,
        trim_size: normalized.trimId,
        theme_profile: inference.profile.packId,
        motif_pool: inference.motifPool,
        page_width_in: trim.widthIn,
        page_height_in: trim.heightIn
      }
    });
    if (response.ok) {
      setApiMode("api");
      setDotStatusMessage(
        "ok",
        `Generated ${pages.length} pages (${uniqueSceneCount} unique scenes) for "${normalized.bookTitle || normalized.theme}" (${inference.profile.packLabel}).`
      );
    } else {
      setApiMode("local");
      setDotStatusMessage(
        "warn",
        `Generated ${pages.length} local pages (${uniqueSceneCount} unique scenes) for "${normalized.bookTitle || normalized.theme}" (${inference.profile.packLabel}).`
      );
    }
  };

  const shuffleActiveDotPage = () => {
    if (!dotPages.length) return;
    const liveInference = inferDotThemeFromTitle(dotConfig.bookTitle, dotConfig.theme, dotConfig.nicheId);
    const liveConfig = { ...dotConfig, motifPool: liveInference.motifPool };
    let nextSceneCaption = "";
    setDotPages((prev) =>
      prev.map((page, idx) => {
        if (idx !== activeDotPage) return page;
        const nextPage = generateDotPage(liveConfig, idx + 1);
        nextSceneCaption = nextPage.scene?.caption || "";
        return nextPage;
      })
    );
    setDotStatusMessage(
      "ok",
      `Shuffled page ${activeDotPage + 1} with ${liveInference.profile.packLabel} motifs${nextSceneCaption ? ` (${nextSceneCaption})` : ""}.`
    );
  };

  const runDotQc = async () => {
    const hasWarn = dotQc.some((rule) => rule.status !== "PASS");
    const runResponse = await apiClientRef.current.runProjectQc();
    const listResponse = runResponse.ok ? await apiClientRef.current.listProjectQc() : runResponse;
    if (listResponse.ok) {
      setApiMode("api");
      const items = Array.isArray(listResponse.data?.items) ? listResponse.data.items : [];
      const summary = summarizeQcItems(items, "Project QC pass.");
      if (hasWarn && summary.tone === "ok") {
        setDotStatusMessage("warn", "API QC pass, but local dot spacing check has warnings.");
      } else {
        setDotStatusMessage(summary.tone, summary.text);
      }
      return;
    }
    setApiMode("local");
    if (hasWarn) setDotStatusMessage("warn", "Local dot QC warnings. API QC unavailable.");
    else setDotStatusMessage("ok", "Local dot QC pass. API QC unavailable.");
  };

  const generateAiSceneReferences = async () => {
    if (!dotConfig.bookTitle.trim() && !dotConfig.theme.trim()) {
      setAiSceneStatusMessage("warn", "Enter a Book Title or Niche/Theme before generating AI scenes.");
      return { ok: false, reason: "missing_input" };
    }

    setAiSceneBusy(true);
    setAiSceneStatusMessage("ok", "Generating AI scene references...");
    try {
      const targetCount = Math.min(24, Math.max(1, Number(dotConfig.pageCount) || 1));
      const aspectRatio = selectedTrim.heightIn >= selectedTrim.widthIn ? "3:4" : "4:3";
      const response = await fetch("/api/ai/scene-pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookTitle: dotConfig.bookTitle,
          theme: dotConfig.theme,
          nicheId: dotConfig.nicheId,
          count: targetCount,
          aspectRatio,
          quality: "standard"
        })
      });
      const payload = await response.json();

      if (!response.ok || !payload?.ok) {
        const budget = payload?.budget;
        if (payload?.error === "daily_budget_exceeded" && budget) {
          setAiSceneStatusMessage(
            "warn",
            `AI budget reached (${budget.spentUsd}/${budget.capUsd} USD today).`
          );
          setAiSceneErrors([]);
        } else {
          const detailedReason =
            payload?.detail ||
            (Array.isArray(payload?.errors) && payload.errors.length
              ? payload.errors[0]?.message
              : "") ||
            "";
          setAiSceneStatusMessage(
            "error",
            detailedReason
              ? `${payload?.error || "Failed to generate AI scenes."}: ${detailedReason}`
              : payload?.error || "Failed to generate AI scenes."
          );
          setAiSceneErrors(
            Array.isArray(payload?.errors)
              ? payload.errors.map((item) => item?.message || "Unknown AI error")
              : []
          );
        }
        return { ok: false, reason: "api_error" };
      }

      if (payload.mode === "plan_only") {
        const plannedItems = (payload.prompts || []).map((item) => ({
          ...item,
          imageUrl: ""
        }));
        setAiSceneItems(plannedItems);
        setAiSceneErrors([]);
        setAiSceneStatusMessage(
          "warn",
          "API token missing on server. Generated prompts only (no images)."
        );
        return { ok: false, reason: "plan_only" };
      }

      const items = Array.isArray(payload.items) ? payload.items : [];
      const errors = Array.isArray(payload.errors) ? payload.errors : [];
      const errorCount = errors.length;
      const enhancedItems = [];
      for (let idx = 0; idx < items.length; idx += 1) {
        const item = items[idx];
        let lineArtPreviewUrl = "";
        if (item?.imageUrl) {
          try {
            lineArtPreviewUrl = await buildAiPrintablePageDataUrl(item.imageUrl, selectedTrim, {
              ppi: 120,
              quantile: 0.8,
              lineBoost: 2
            });
          } catch {
            lineArtPreviewUrl = "";
          }
        }
        enhancedItems.push({
          ...item,
          lineArtPreviewUrl
        });
      }
      setAiSceneItems(enhancedItems);
      setAiSceneErrors(errors.map((item) => item?.message || "Unknown generation failure"));
      if (enhancedItems.length > 0) {
        setDotPages((prev) => applyAiReferencesToPages(prev, enhancedItems));
        setDotUseAiReferences(true);
        setAiSceneStatusMessage(
          errorCount > 0 ? "warn" : "ok",
          `Generated ${enhancedItems.length} AI scenes${errorCount ? ` (${errorCount} failed)` : ""}. Cleaned line-art previews applied (${payload.modelName || "model"}).`
        );
        const exportSources = enhancedItems
          .filter((item) => typeof item?.imageUrl === "string" && item.imageUrl.length > 0)
          .map((item, idx) => ({
            page: null,
            index: Number(item.index) || idx + 1,
            imageUrl: item.imageUrl,
            lineArtPreviewUrl: item.lineArtPreviewUrl || "",
            title: `${dotConfig.bookTitle || dotConfig.theme || "AI Book"} Page ${idx + 1}`
          }));
        return { ok: true, sources: exportSources };
      } else {
        setAiSceneStatusMessage(
          "error",
          `Generated 0 AI scenes (${errorCount} failed). See errors below.`
        );
        return { ok: false, reason: "empty_output" };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown AI scene error.";
      setAiSceneStatusMessage("error", message);
      setAiSceneErrors([message]);
      return { ok: false, reason: "exception", message };
    } finally {
      setAiSceneBusy(false);
    }
  };

  const extractDotToDotTraceFromImageUrl = async (imageUrl, nameHint = "ai-trace") => {
    const img = await loadImageElementFromUrl(imageUrl);
    const maxSide = 760;
    const naturalWidth = img.naturalWidth || img.width;
    const naturalHeight = img.naturalHeight || img.height;
    const scale = Math.min(maxSide / naturalWidth, maxSide / naturalHeight, 1);
    const width = Math.max(96, Math.round(naturalWidth * scale));
    const height = Math.max(96, Math.round(naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Unable to initialize canvas for AI trace extraction.");
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    const imageData = ctx.getImageData(0, 0, width, height);

    const traceProfiles = [
      {
        edgeQuantile: 0.86,
        minComponentSize: 140,
        minPointGapPx: 2.2,
        minGuideGapPx: 5.2,
        maxContourPoints: 2200,
        maxGuidePoints: 560
      },
      {
        edgeQuantile: 0.8,
        minComponentSize: 100,
        minPointGapPx: 1.9,
        minGuideGapPx: 4.4,
        maxContourPoints: 2500,
        maxGuidePoints: 620
      },
      {
        edgeQuantile: 0.74,
        minComponentSize: 70,
        minPointGapPx: 1.6,
        minGuideGapPx: 3.8,
        maxContourPoints: 2800,
        maxGuidePoints: 700
      }
    ];

    const scoreTrace = (trace) => {
      const points = Array.isArray(trace?.points) ? trace.points : [];
      if (points.length < 8) return { score: -1, coverage: 0, pathLength: 0, openRatio: 1 };
      let minX = 1;
      let maxX = 0;
      let minY = 1;
      let maxY = 0;
      let pathLength = 0;
      for (let i = 0; i < points.length; i += 1) {
        const point = points[i];
        if (point.x < minX) minX = point.x;
        if (point.x > maxX) maxX = point.x;
        if (point.y < minY) minY = point.y;
        if (point.y > maxY) maxY = point.y;
        if (i > 0) {
          const prev = points[i - 1];
          pathLength += Math.sqrt((point.x - prev.x) ** 2 + (point.y - prev.y) ** 2);
        }
      }
      const coverage = Math.max(0, maxX - minX) * Math.max(0, maxY - minY);
      const first = points[0];
      const last = points[points.length - 1];
      const diagonal = Math.sqrt((maxX - minX) ** 2 + (maxY - minY) ** 2) || 1;
      const openRatio = Math.sqrt((first.x - last.x) ** 2 + (first.y - last.y) ** 2) / diagonal;
      const qa = evaluateLineArtTrace(trace, {
        minPoints: 100,
        minGuidePoints: 24,
        minCoverage: 0.12,
        maxJitterRatio: 0.56
      });
      let score = Number(qa.score || 0);
      score += Math.min(40, coverage * 180);
      score += Math.min(38, pathLength * 12);
      score -= Math.max(0, openRatio - 0.28) * 80;
      score += trace?.diagnostics?.traceMode === "radial_outer" ? 8 : 0;
      score += trace?.diagnostics?.source === "ink" ? 4 : 0;
      return { score, coverage, pathLength, openRatio, qa };
    };

    let bestTrace = null;
    let bestScore = -1;

    for (let i = 0; i < traceProfiles.length; i += 1) {
      const extracted = extractImageTraceFromImageData(imageData, traceProfiles[i]);
      const trace = normalizeDotToDotImageTrace({
        name: nameHint,
        points: extracted.pointsNormalized,
        guidePoints: extracted.guidePointsNormalized,
        sourceImageUrl: imageUrl,
        diagnostics: extracted.diagnostics
      });
      if (!trace) continue;
      const scored = scoreTrace(trace);
      const acceptable =
        scored.coverage >= 0.12 &&
        scored.pathLength >= 1.35 &&
        scored.openRatio <= 0.5 &&
        trace.points.length >= 100;
      if (acceptable && scored.score > bestScore) {
        bestScore = scored.score;
        bestTrace = trace;
      }
    }

    return bestTrace;
  };

  const readFileAsDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Unable to read selected file."));
      reader.readAsDataURL(file);
    });

  const getAiBookSources = () => {
    const fromPages = dotPages
      .map((page, idx) => ({
        page,
        index: idx + 1,
        imageUrl: page.aiReferenceUrl || "",
        lineArtPreviewUrl: page.aiReferenceLineArtUrl || "",
        title: page.title || `Page ${idx + 1}`
      }))
      .filter((item) => Boolean(item.imageUrl));

    if (fromPages.length) return fromPages;

    const fromScenes = aiSceneItems
      .filter((item) => typeof item?.imageUrl === "string" && item.imageUrl.length > 0)
      .map((item, idx) => ({
        page: null,
        index: idx + 1,
        imageUrl: item.imageUrl,
        lineArtPreviewUrl: item.lineArtPreviewUrl || "",
        title: `${dotConfig.bookTitle || dotConfig.theme || "AI Book"} Page ${idx + 1}`
      }));
    return fromScenes;
  };

  const exportActiveAiPng = async () => {
    const source = getAiBookSources().find((item) => item.index === activeDotPage + 1) || null;
    if (!source) {
      setAiSceneStatusMessage("warn", "No AI image available for the active page.");
      return;
    }

    setAiExporting(true);
    try {
      const trim = getTrimSize(dotConfig.trimId);
      const dataUrl = await buildAiPrintablePageDataUrl(source.imageUrl, trim, {
        ppi: AI_EXPORT_PPI,
        quantile: 0.78,
        lineBoost: 2
      });
      const filename = `${safeSlug(getDotSuiteBaseName(dotConfig))}-${trim.id}-ai-page-${source.index}.png`;
      downloadDataUrlFile(filename, dataUrl);
      setAiSceneStatusMessage("ok", `Exported AI PNG page ${source.index}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "AI PNG export failed.";
      setAiSceneStatusMessage("error", message);
    } finally {
      setAiExporting(false);
    }
  };

  const exportAiPngPages = async () => {
    const sources = getAiBookSources();
    if (!sources.length) {
      setAiSceneStatusMessage("warn", "Generate AI scenes first, then export PNG pages.");
      return;
    }
    setAiExporting(true);
    try {
      const trim = getTrimSize(dotConfig.trimId);
      for (let i = 0; i < sources.length; i += 1) {
        const dataUrl = await buildAiPrintablePageDataUrl(sources[i].imageUrl, trim, {
          ppi: AI_EXPORT_PPI,
          quantile: 0.78,
          lineBoost: 2
        });
        const filename = `${safeSlug(getDotSuiteBaseName(dotConfig))}-${trim.id}-ai-page-${sources[i].index}.png`;
        downloadDataUrlFile(filename, dataUrl);
      }
      setAiSceneStatusMessage("ok", `Exported ${sources.length} AI PNG pages.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "AI PNG export failed.";
      setAiSceneStatusMessage("error", message);
    } finally {
      setAiExporting(false);
    }
  };

  const exportAiBookPdf = async (providedSources = null) => {
    const sources = Array.isArray(providedSources) && providedSources.length
      ? providedSources
      : getAiBookSources();
    if (!sources.length) {
      setAiSceneStatusMessage("warn", "Generate AI scenes first, then export AI PDF.");
      return;
    }
    setAiExporting(true);
    try {
      const trim = getTrimSize(dotConfig.trimId);
      const orientation = trim.widthIn > trim.heightIn ? "landscape" : "portrait";
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({
        orientation,
        unit: "in",
        format: [trim.widthIn, trim.heightIn],
        compress: true
      });

      for (let i = 0; i < sources.length; i += 1) {
        if (i > 0) doc.addPage([trim.widthIn, trim.heightIn], orientation);
        const dataUrl = await buildAiPrintablePageDataUrl(sources[i].imageUrl, trim, {
          ppi: AI_EXPORT_PPI,
          quantile: 0.78,
          lineBoost: 2
        });
        doc.addImage(dataUrl, "PNG", 0, 0, trim.widthIn, trim.heightIn, undefined, "FAST");
      }
      const filename = `${safeSlug(getDotSuiteBaseName(dotConfig))}-${trim.id}-ai-${sources.length}p.pdf`;
      doc.save(filename);
      setAiSceneStatusMessage("ok", `Exported ${sources.length}-page AI PDF.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "AI PDF export failed.";
      setAiSceneStatusMessage("error", message);
    } finally {
      setAiExporting(false);
    }
  };

  const generateAndExportAiBookPdf = async () => {
    if (aiSceneBusy || aiExporting) return;
    const result = await generateAiSceneReferences();
    if (!result?.ok) return;
    await exportAiBookPdf(result.sources);
  };

  const exportActiveDotSvg = () => {
    if (!activeDot) {
      setDotStatusMessage("warn", "No active dot page to export.");
      return;
    }
    const trim = getTrimSize(dotConfig.trimId);
    const filename = `${safeSlug(getDotSuiteBaseName(dotConfig))}-${trim.id}-page-${activeDotPage + 1}.svg`;
    const markup = buildDotSvgMarkup(activeDot, trim, dotConfig.theme, {
      dotCanvasPpi: DOT_CANVAS_PPI,
      escapeXml,
      drawMotifGuideSvgMarkup
    });
    downloadTextFile(filename, markup, "image/svg+xml;charset=utf-8");
    setDotStatusMessage("ok", `Exported SVG for page ${activeDotPage + 1} at ${trim.label}.`);
  };

  const exportDotSuitePdf = async () => {
    if (!dotPages.length) {
      setDotStatusMessage("warn", "No pages to export.");
      return { ok: false, message: "No pages to export." };
    }

    const trim = getTrimSize(dotConfig.trimId);
    const orientation = trim.widthIn > trim.heightIn ? "landscape" : "portrait";
    const startMs = typeof performance !== "undefined" ? performance.now() : Date.now();
    setDotExporting(true);

    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({
        orientation,
        unit: "in",
        format: [trim.widthIn, trim.heightIn],
        compress: true
      });

      for (let index = 0; index < dotPages.length; index += 1) {
        const page = dotPages[index];
        if (index > 0) doc.addPage([trim.widthIn, trim.heightIn], orientation);

        let aiImageDataUrl = "";
        if (dotUseAiReferences && (page.aiReferenceLineArtUrl || page.aiReferenceUrl)) {
          try {
            if (page.aiReferenceLineArtUrl && String(page.aiReferenceLineArtUrl).startsWith("data:image/")) {
              aiImageDataUrl = page.aiReferenceLineArtUrl;
            } else {
              aiImageDataUrl = await fetchImageAsDataUrl(page.aiReferenceUrl);
            }
          } catch {
            aiImageDataUrl = "";
          }
        }
        drawDotPageToPdf(doc, page, {
          aiImageDataUrl,
          dotCanvasPpi: DOT_CANVAS_PPI,
          drawRegionPdf
        });
      }

      const filename = `${safeSlug(getDotSuiteBaseName(dotConfig))}-${trim.id}-${dotPages.length}p.pdf`;
      doc.save(filename);
      const endMs = typeof performance !== "undefined" ? performance.now() : Date.now();
      setLastDotExportSec(Math.max(0, (endMs - startMs) / 1000));
      setDotStatusMessage("ok", `Exported ${dotPages.length}-page PDF at ${trim.label}.`);
      return { ok: true, message: `Exported ${dotPages.length}-page PDF at ${trim.label}.` };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown export error.";
      setDotStatusMessage("error", `PDF export failed: ${message}`);
      return { ok: false, message: `PDF export failed: ${message}` };
    } finally {
      setDotExporting(false);
    }
  };

  const regenerateDotToDotSuite = async () => {
    const normalizedLibrary = normalizeLineArtLibrary(dotToDotLibrary);
    let readyLibrary = normalizedLibrary.filter((asset) => asset.status === "ready");
    const sourceMode = dotToDotConfig.sourceMode || "theme_ai";
    const hasSingleTraceInput = Boolean(dotToDotImageTrace);
    const hasLibraryInput = readyLibrary.length > 0;
    if (
      !dotToDotConfig.bookTitle.trim() &&
      !dotToDotConfig.theme.trim() &&
      !(sourceMode === "single_trace" && hasSingleTraceInput) &&
      !(sourceMode === "bulk_library" && hasLibraryInput)
    ) {
      setDotToDotStatusMessage("warn", "Enter a Book Title or Niche/Theme before generating.");
      return;
    }

    const trim = getTrimSize(dotToDotConfig.trimId);
    const inference = inferDotThemeFromTitle(dotToDotConfig.bookTitle, dotToDotConfig.theme);
    const normalized = {
      bookTitle: dotToDotConfig.bookTitle.trim(),
      theme: inference.effectiveTheme,
      pageCount: Math.min(120, Math.max(1, Number(dotToDotConfig.pageCount) || 1)),
      trimId: trim.id,
      difficulty: getDotToDotDifficulty(dotToDotConfig.difficulty).id,
      sourceMode: ["theme_ai", "single_trace", "bulk_library"].includes(sourceMode)
        ? sourceMode
        : "theme_ai",
      useImageTrace: sourceMode === "single_trace" && hasSingleTraceInput,
      useOnlyLibraryAssets: Boolean(dotToDotConfig.useOnlyLibraryAssets),
      allowAiFallback: Boolean(dotToDotConfig.allowAiFallback)
    };
    setDotToDotConfig(normalized);

    let generationConfig = normalized;
    let aiFallbackReason = "";
    let aiProviderNote = "";
    if (normalized.sourceMode === "theme_ai") {
      try {
        const aiRequestCount = Math.min(normalized.pageCount, 3);
        setDotToDotStatusMessage(
          "ok",
          `Generating ${aiRequestCount} AI line-art source image${aiRequestCount === 1 ? "" : "s"} for ${normalized.pageCount} page${normalized.pageCount === 1 ? "" : "s"}...`
        );
        const aspectRatio = trim.heightIn >= trim.widthIn ? "3:4" : "4:3";
        const controller = new AbortController();
        const timeoutMs = 120000;
        let timeoutId = null;
        let aiResponse = null;
        try {
          timeoutId = setTimeout(() => controller.abort(), timeoutMs);
          aiResponse = await fetch("/api/ai/scene-pack", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({
              bookTitle: normalized.bookTitle,
              theme: normalized.theme,
              nicheId: inference.profile.packId,
              count: aiRequestCount,
              aspectRatio,
              quality: "standard"
            })
          });
        } finally {
          if (timeoutId) clearTimeout(timeoutId);
        }
        const aiPayload = await aiResponse.json();
        aiProviderNote =
          aiPayload?.provider && aiPayload?.modelName
            ? ` Provider: ${aiPayload.provider}/${aiPayload.modelName}.`
            : aiPayload?.provider
              ? ` Provider: ${aiPayload.provider}.`
              : "";

        if (aiResponse.ok && aiPayload?.ok && aiPayload.mode !== "plan_only") {
          const aiItems = Array.isArray(aiPayload.items) ? aiPayload.items : [];
          const createdAssets = [];
          for (let i = 0; i < aiItems.length; i += 1) {
            const item = aiItems[i];
            if (!item?.imageUrl) continue;
            try {
              const trace = await extractDotToDotTraceFromImageUrl(
                item.imageUrl,
                `ai-${item.subject || i + 1}`
              );
              if (!trace) continue;
              createdAssets.push(
                createLineArtAssetFromTrace(item.subject || `AI ${i + 1}`, trace, {
                  tags: [inference.profile.packId, "ai-generated"],
                  sourceImageUrl: item.imageUrl
                })
              );
            } catch {
              // Ignore per-image failures and continue.
            }
          }

          if (createdAssets.length) {
            const mergedLibrary = normalizeLineArtLibrary([...dotToDotLibrary, ...createdAssets]);
            setDotToDotLibrary(mergedLibrary);
            readyLibrary = mergedLibrary.filter((asset) => asset.status === "ready");
            generationConfig = { ...normalized, sourceMode: "bulk_library" };
          } else if (!normalized.allowAiFallback) {
            const aiTraceReason =
              aiPayload?.detail ||
              (Array.isArray(aiPayload?.errors) && aiPayload.errors.length
                ? aiPayload.errors[0]?.message
                : "") ||
              "AI generated images, but no usable dot-to-dot traces were extracted.";
            setDotToDotStatusMessage(
              "error",
              aiTraceReason
            );
            return;
          } else {
            aiFallbackReason = "AI images were generated, but trace extraction produced 0 usable contours.";
          }
        } else if (!normalized.allowAiFallback) {
          const reason =
            aiPayload?.detail ||
            (Array.isArray(aiPayload?.errors) && aiPayload.errors.length
              ? aiPayload.errors[0]?.message
              : "") ||
            aiPayload?.error ||
            (aiPayload?.mode === "plan_only"
              ? "AI token unavailable on server."
              : "AI generation failed.");
          setDotToDotStatusMessage("error", reason);
          return;
        } else {
          aiFallbackReason =
            aiPayload?.error ||
            (aiPayload?.mode === "plan_only"
              ? "AI token unavailable on server."
              : "AI generation failed.");
        }
      } catch (error) {
        const isAbort = typeof DOMException !== "undefined" && error instanceof DOMException && error.name === "AbortError";
        const normalizedError = isAbort ? new Error("AI generation timed out after 120s.") : error;
        if (!normalized.allowAiFallback) {
          const message = normalizedError instanceof Error ? normalizedError.message : "AI generation failed.";
          setDotToDotStatusMessage("error", message);
          return;
        }
        aiFallbackReason =
          normalizedError instanceof Error ? normalizedError.message : "AI generation failed.";
      }
    }

    const pages = generateDotToDotPages(
      generationConfig,
      Math.random,
      generationConfig.sourceMode === "single_trace" ? dotToDotImageTrace : null,
      generationConfig.sourceMode === "bulk_library" ? readyLibrary : []
    );
    const sourceLabel =
      generationConfig.sourceMode === "single_trace" && dotToDotImageTrace
        ? `image trace "${dotToDotImageTrace.name}"`
        : generationConfig.sourceMode === "bulk_library" && normalized.sourceMode === "theme_ai"
          ? `AI-generated trace library (${readyLibrary.length} ready assets)`
          : generationConfig.sourceMode === "bulk_library"
            ? `line-art library (${readyLibrary.length} ready assets)`
            : `"${normalized.bookTitle || normalized.theme}" (${inference.profile.packLabel})`;
    setDotToDotPages(pages);
    setActiveDotToDotPage(0);

    const pinnedAssets = pages
      .filter((page) => page.sourceAssetId)
      .map((page, index) => ({
        page_number: index + 1,
        source_asset_id: page.sourceAssetId
      }));
    const response = await apiClientRef.current.generateDotToDotSuite({
      source_mode: normalized.sourceMode,
      page_count: normalized.pageCount,
      difficulty: normalized.difficulty,
      trim_id: normalized.trimId,
      book_title: normalized.bookTitle || undefined,
      theme: normalized.theme,
      collection_ids: [],
      use_only_library_assets: normalized.useOnlyLibraryAssets,
      allow_ai_fallback: normalized.allowAiFallback,
      pinned_assets: pinnedAssets
    });
    if (normalized.sourceMode === "bulk_library" && pinnedAssets.length) {
      await apiClientRef.current.assignDotToDotLibrary({
        strict: normalized.useOnlyLibraryAssets,
        assignments: pinnedAssets
      });
    }
    if (response.ok) {
      setApiMode("api");
      const fallbackNote =
        aiFallbackReason && normalized.allowAiFallback && normalized.sourceMode === "theme_ai"
          ? ` AI fallback used: ${aiFallbackReason}`
          : "";
      setDotToDotStatusMessage(
        "ok",
        `Generated ${pages.length} dot-to-dot pages from ${sourceLabel}. API generation queued.${aiProviderNote}${fallbackNote}`
      );
    } else {
      setApiMode("local");
      const apiReason = response.error ? ` (${response.error})` : "";
      const fallbackNote =
        aiFallbackReason && normalized.allowAiFallback && normalized.sourceMode === "theme_ai"
          ? ` AI fallback used: ${aiFallbackReason}`
          : "";
      setDotToDotStatusMessage(
        "warn",
        `Generated ${pages.length} dot-to-dot pages locally from ${sourceLabel}. API unavailable${apiReason}.${aiProviderNote}${fallbackNote}`
      );
    }
  };

  const importDotToDotImageTrace = async (event) => {
    const file = event.target?.files?.[0];
    if (!file) return;

    setDotToDotImageBusy(true);
    try {
      const previewDataUrl = await readFileAsDataUrl(file);
      const { imageData } = await loadImageDataFromFile(file, 720);
      const extractionProfiles = [
        {
          edgeQuantile: 0.86,
          minComponentSize: 140,
          minPointGapPx: 2.2,
          minGuideGapPx: 5.2,
          maxContourPoints: 1900,
          maxGuidePoints: 420
        },
        {
          edgeQuantile: 0.8,
          minComponentSize: 90,
          minPointGapPx: 1.8,
          minGuideGapPx: 4.2,
          maxContourPoints: 2200,
          maxGuidePoints: 520
        },
        {
          edgeQuantile: 0.74,
          minComponentSize: 60,
          minPointGapPx: 1.6,
          minGuideGapPx: 3.8,
          maxContourPoints: 2500,
          maxGuidePoints: 620
        }
      ];

      let trace = null;
      for (const profile of extractionProfiles) {
        const extracted = extractImageTraceFromImageData(imageData, profile);
        trace = normalizeDotToDotImageTrace({
          name: file.name,
          points: extracted.pointsNormalized,
          guidePoints: extracted.guidePointsNormalized,
          diagnostics: extracted.diagnostics
        });
        if (trace) break;
      }

      if (!trace) {
        setDotToDotStatusMessage(
          "warn",
          "Could not detect a strong contour in that image. Try a high-contrast silhouette."
        );
        return;
      }

      setDotToDotImageTrace({ ...trace, previewDataUrl });
      setDotToDotConfig((prev) => ({
        ...prev,
        useImageTrace: true,
        sourceMode: "single_trace",
        difficulty: prev.difficulty === "kids" ? "early" : prev.difficulty
      }));
      setDotToDotStatusMessage(
        "ok",
        `Imported image trace from ${trace.name} (${trace.points.length} contour points). Source mode set to Single Trace.`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Image trace import failed.";
      setDotToDotStatusMessage("error", message);
    } finally {
      setDotToDotImageBusy(false);
      if (event.target) event.target.value = "";
    }
  };

  const importDotToDotLibraryBatch = async (event) => {
    const files = Array.from(event.target?.files || []);
    if (!files.length) return;

    setDotToDotImageBusy(true);
    try {
      const imported = [];
      let skipped = 0;
      for (const file of files) {
        const previewDataUrl = await readFileAsDataUrl(file);
        const { imageData } = await loadImageDataFromFile(file, 760);
        const extractionProfiles = [
          {
            edgeQuantile: 0.86,
            minComponentSize: 140,
            minPointGapPx: 2.2,
            minGuideGapPx: 5.2,
            maxContourPoints: 2100,
            maxGuidePoints: 520
          },
          {
            edgeQuantile: 0.8,
            minComponentSize: 90,
            minPointGapPx: 1.8,
            minGuideGapPx: 4.2,
            maxContourPoints: 2400,
            maxGuidePoints: 620
          },
          {
            edgeQuantile: 0.74,
            minComponentSize: 60,
            minPointGapPx: 1.6,
            minGuideGapPx: 3.8,
            maxContourPoints: 2700,
            maxGuidePoints: 700
          }
        ];

        let trace = null;
        for (const profile of extractionProfiles) {
          const extracted = extractImageTraceFromImageData(imageData, profile);
          trace = normalizeDotToDotImageTrace({
            name: file.name,
            points: extracted.pointsNormalized,
            guidePoints: extracted.guidePointsNormalized,
            diagnostics: extracted.diagnostics
          });
          if (trace) break;
        }
        if (!trace) continue;
        const nextAsset = createLineArtAssetFromTrace(file.name, {
          points: trace.points,
          guidePoints: trace.guidePoints,
          diagnostics: trace.diagnostics
        }, {
          previewDataUrl
        });
        // Keep user-uploaded assets usable even when strict QA flags them.
        if (nextAsset.status !== "ready") {
          skipped += 1;
          nextAsset.status = "ready";
          nextAsset.qa = {
            ...nextAsset.qa,
            status: "ready",
            reasons: [...(nextAsset.qa?.reasons || []), "user_upload_override"]
          };
        }
        imported.push(
          {
            ...nextAsset,
            sourceFilename: file.name,
            mimeType: file.type || "image/png",
            sizeBytes: Number(file.size) || 1
          }
        );
      }

      if (!imported.length) {
        setDotToDotStatusMessage(
          "warn",
          "No valid line-art traces were found in the selected files."
        );
        return;
      }

      const mergedLibrary = normalizeLineArtLibrary([...dotToDotLibrary, ...imported]);
      const readyCount = mergedLibrary.filter((asset) => asset.status === "ready").length;
      setDotToDotLibrary(mergedLibrary);
      setDotToDotConfig((prev) => ({
        ...prev,
        sourceMode: readyCount > 0 ? "bulk_library" : prev.sourceMode,
        useOnlyLibraryAssets: readyCount > 0 ? Boolean(prev.useOnlyLibraryAssets) : false
      }));

      const uploadPayload = {
        files: imported.map((asset) => ({
          filename: asset.sourceFilename || asset.name,
          mime_type: asset.mimeType || "image/png",
          size_bytes: Number(asset.sizeBytes) || 1,
          tags: asset.tags
        })),
        process_immediately: true
      };
      const uploadResponse = await apiClientRef.current.bulkUploadLineArt(uploadPayload);
      setApiMode(uploadResponse.ok ? "api" : "local");

      setDotToDotStatusMessage(
        uploadResponse.ok ? "ok" : "warn",
        `Imported ${imported.length} line-art assets (${readyCount} ready${skipped ? `, ${skipped} QA overrides` : ""})${uploadResponse.ok ? "." : `; API sync unavailable (${uploadResponse.error || "request failed"}).`}`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Bulk line-art import failed.";
      setDotToDotStatusMessage("error", message);
    } finally {
      setDotToDotImageBusy(false);
      if (event.target) event.target.value = "";
    }
  };

  const clearDotToDotImageTrace = () => {
    setDotToDotImageTrace(null);
    setDotToDotConfig((prev) => ({
      ...prev,
      useImageTrace: false,
      sourceMode: prev.sourceMode === "single_trace" ? "theme_ai" : prev.sourceMode
    }));
    setDotToDotStatusMessage("ok", "Cleared image trace mode.");
  };

  const clearDotToDotLibrary = () => {
    setDotToDotLibrary([]);
    setDotToDotConfig((prev) => ({
      ...prev,
      sourceMode: prev.sourceMode === "bulk_library" ? "theme_ai" : prev.sourceMode
    }));
    setDotToDotStatusMessage("ok", "Cleared bulk line-art library.");
  };

  const shuffleActiveDotToDotPage = () => {
    if (!dotToDotPages.length) return;
    const readyLibrary = normalizeLineArtLibrary(dotToDotLibrary).filter((asset) => asset.status === "ready");
    setDotToDotPages((prev) =>
      prev.map((page, idx) =>
        idx === activeDotToDotPage
          ? generateDotToDotPage(
              dotToDotConfig,
              idx + 1,
              Math.random,
              dotToDotConfig.sourceMode === "single_trace" ? dotToDotImageTrace : null,
              dotToDotConfig.sourceMode === "bulk_library" ? readyLibrary[idx % Math.max(1, readyLibrary.length)] : null,
              readyLibrary.length
            )
          : page
      )
    );
    setDotToDotStatusMessage("ok", `Shuffled dot-to-dot page ${activeDotToDotPage + 1}.`);
  };

  const runDotToDotQc = async () => {
    const hasWarn =
      dotToDotQc.some((rule) => rule.status !== "PASS") ||
      dotToDotSuiteMetrics.some((item) => item.status !== "PASS");
    const runResponse = await apiClientRef.current.runProjectQc();
    const listResponse = runResponse.ok ? await apiClientRef.current.listProjectQc() : runResponse;
    if (listResponse.ok) {
      setApiMode("api");
      const items = Array.isArray(listResponse.data?.items) ? listResponse.data.items : [];
      const summary = summarizeQcItems(items, "Dot-to-dot QC pass.");
      if (hasWarn && summary.tone === "ok") {
        setDotToDotStatusMessage("warn", "API QC pass, but local dot-to-dot checks have warnings.");
      } else {
        setDotToDotStatusMessage(summary.tone, summary.text);
      }
      return;
    }
    setApiMode("local");
    if (hasWarn) setDotToDotStatusMessage("warn", "Local dot-to-dot QC warnings. API QC unavailable.");
    else setDotToDotStatusMessage("ok", "Local dot-to-dot QC pass. API QC unavailable.");
  };

  const hasDotToDotHardFailures = useMemo(
    () =>
      dotToDotSuiteMetrics.some(
        (item) =>
          item.crossingCount > 0 ||
          item.minStep < item.minGapTarget ||
          item.dots <= 0
      ),
    [dotToDotSuiteMetrics]
  );

  const exportActiveDotToDotSvg = (solution) => {
    if (!activeDotToDot) {
      setDotToDotStatusMessage("warn", "No active dot-to-dot page to export.");
      return;
    }
    const trim = getTrimSize(dotToDotConfig.trimId);
    const mode = solution ? "solution" : "puzzle";
    const filename = `${safeSlug(getDotToDotBaseName(dotToDotConfig))}-${trim.id}-page-${activeDotToDotPage + 1}-${mode}.svg`;
    const markup = buildDotToDotSvgMarkup(activeDotToDot, trim, {
      solution,
      escapeXml,
      drawMotifGuideSvgMarkup
    });
    downloadTextFile(filename, markup, "image/svg+xml;charset=utf-8");
    setDotToDotStatusMessage(
      "ok",
      `Exported ${solution ? "solution" : "puzzle"} SVG for page ${activeDotToDotPage + 1}.`
    );
  };

  const exportDotToDotRecipeJson = () => {
    if (!dotToDotPages.length) {
      setDotToDotStatusMessage("warn", "No dot-to-dot pages to export recipe.");
      return;
    }
    const trim = getTrimSize(dotToDotConfig.trimId);
    const payload = {
      exportedAt: new Date().toISOString(),
      config: dotToDotConfig,
      trim,
      pages: dotToDotPages.map((page, index) => ({
        pageNumber: index + 1,
        id: page.id,
        sourceMode: page.sourceMode || dotToDotConfig.sourceMode || "theme_ai",
        sourceAssetId: page.sourceAssetId || null,
        recipe: page.recipe || {},
        pointCount: Array.isArray(page.points) ? page.points.length : 0
      }))
    };
    const filename = `${safeSlug(getDotToDotBaseName(dotToDotConfig))}-${trim.id}-${dotToDotPages.length}p-recipe.json`;
    downloadTextFile(filename, `${JSON.stringify(payload, null, 2)}\n`, "application/json;charset=utf-8");
    setDotToDotStatusMessage("ok", "Exported dot-to-dot recipe JSON.");
  };

  const exportDotToDotSuitePdf = async (solution) => {
    if (!dotToDotPages.length) {
      setDotToDotStatusMessage("warn", "No dot-to-dot pages to export.");
      return;
    }
    if (hasDotToDotHardFailures) {
      setDotToDotStatusMessage(
        "error",
        "Export blocked: resolve hard dot-to-dot QC failures (crossings/spacing/count) first."
      );
      return;
    }
    const trim = getTrimSize(dotToDotConfig.trimId);
    const orientation = trim.widthIn > trim.heightIn ? "landscape" : "portrait";
    setDotToDotExporting(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({
        orientation,
        unit: "in",
        format: [trim.widthIn, trim.heightIn],
        compress: true
      });

      dotToDotPages.forEach((page, index) => {
        if (index > 0) doc.addPage([trim.widthIn, trim.heightIn], orientation);
        drawDotToDotPageToPdf(doc, page, {
          solution,
          dotCanvasPpi: DOT_CANVAS_PPI,
          drawRegionPdf
        });
      });
      const mode = solution ? "solution" : "puzzle";
      const filename = `${safeSlug(getDotToDotBaseName(dotToDotConfig))}-${trim.id}-${dotToDotPages.length}p-${mode}.pdf`;
      doc.save(filename);
      setDotToDotStatusMessage(
        "ok",
        `Exported ${dotToDotPages.length}-page ${solution ? "solution" : "puzzle"} PDF at ${trim.label}.`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown export error.";
      setDotToDotStatusMessage("error", `Dot-to-dot PDF export failed: ${message}`);
    } finally {
      setDotToDotExporting(false);
    }
  };

  const exportSolutionsText = () => {
    const solvedPath = mazeState.solutionPath.length ? mazeState.solutionPath : solveMazePath(mazeState);
    const lines = [
      `Project: ${activeProject?.title || "Untitled Project"}`,
      `Generated: ${new Date().toISOString()}`,
      "",
      "Word Search Placements:"
    ];

    wsState.words.forEach((word, index) => {
      lines.push(`${index + 1}. ${word.text} (${word.direction}) @ (${word.row}, ${word.col})`);
    });
    if (!wsState.words.length) {
      lines.push("No word placements available.");
    }

    lines.push("", "Maze Solution Path:");
    if (solvedPath.length) {
      lines.push(solvedPath.map((step) => `${step.row},${step.col}`).join(" -> "));
    } else {
      lines.push("No solution path available.");
    }

    const filename = `${safeSlug(activeProject?.title || "project")}-solutions.txt`;
    downloadTextFile(filename, `${lines.join("\n")}\n`, "text/plain;charset=utf-8");
    return { ok: true, message: `Exported solutions text: ${filename}.` };
  };

  const exportPromptPackText = () => {
    const promptLines = [
      `Project: ${activeProject?.title || "Untitled Project"}`,
      `Book Title: ${dotConfig.bookTitle || "Untitled Dot Marker Book"}`,
      `Theme: ${dotConfig.theme}`,
      `Trim: ${selectedTrim.label}`,
      "",
      "Prompt Blocks:",
      `- global_style_block: Bold black-and-white outlines, high contrast, print-safe spacing.`,
      `- negative_constraints_block: no grayscale, no tiny details, no blurry edges.`,
      `- layout_hint: ${dotConfig.dotsPerPage} dots per page, minimum gap ${dotConfig.minGap}px.`
    ];

    const filename = `${safeSlug(activeProject?.title || "project")}-prompt-pack.md`;
    downloadTextFile(filename, `${promptLines.join("\n")}\n`, "text/markdown;charset=utf-8");
    return { ok: true, message: `Exported prompt pack: ${filename}.` };
  };

  const queueApiExport = async (variant) => {
    const response = await apiClientRef.current.createExport({ variant });
    if (response.ok) {
      setApiMode("api");
      return { ok: true };
    }
    setApiMode("local");
    return { ok: false, message: response.error || "API export request failed." };
  };

  const handleInteriorExport = async () => {
    if (preflightReport.summary.errors > 0) {
      setExportStatusMessage("error", "KDP preflight has blocking errors. Fix them before interior export.");
      navigateToView("qc");
      return;
    }
    setExportBusy("INTERIOR");
    const localResult = await exportDotSuitePdf();
    const apiResult = await queueApiExport("INTERIOR");
    if (localResult.ok && apiResult.ok) {
      setExportStatusMessage("ok", "Interior exported locally and queued in API.");
    } else if (localResult.ok) {
      setExportStatusMessage("warn", "Interior exported locally. API queue unavailable.");
    } else if (apiResult.ok) {
      setExportStatusMessage("warn", "API interior export queued, but local PDF export failed.");
    } else {
      setExportStatusMessage("error", "Interior export failed locally and API queue was unavailable.");
    }
    setExportBusy("");
  };

  const handleSolutionsExport = async () => {
    setExportBusy("SOLUTIONS");
    const localResult = exportSolutionsText();
    const apiResult = await queueApiExport("SOLUTIONS");
    if (localResult.ok && apiResult.ok) {
      setExportStatusMessage("ok", "Solutions exported locally and queued in API.");
    } else if (localResult.ok) {
      setExportStatusMessage("warn", "Solutions exported locally. API queue unavailable.");
    } else {
      setExportStatusMessage("error", "Solutions export failed.");
    }
    setExportBusy("");
  };

  const handleCombinedExport = async () => {
    if (preflightReport.summary.errors > 0) {
      setExportStatusMessage("error", "KDP preflight has blocking errors. Fix them before combined export.");
      navigateToView("qc");
      return;
    }
    setExportBusy("COMBINED");
    const interiorResult = await exportDotSuitePdf();
    const solutionsResult = exportSolutionsText();
    const apiResult = await queueApiExport("COMBINED");
    if (interiorResult.ok && solutionsResult.ok && apiResult.ok) {
      setExportStatusMessage("ok", "Combined export prepared locally and queued in API.");
    } else if (interiorResult.ok && solutionsResult.ok) {
      setExportStatusMessage("warn", "Combined export prepared locally. API queue unavailable.");
    } else {
      setExportStatusMessage("error", "Combined local export failed. Check dot and solutions data.");
    }
    setExportBusy("");
  };

  const handlePromptPackExport = async () => {
    setExportBusy("PROMPT_PACK");
    const localResult = exportPromptPackText();
    const apiResult = await queueApiExport("PROMPT_PACK");
    if (localResult.ok && apiResult.ok) {
      setExportStatusMessage("ok", "Prompt pack exported locally and queued in API.");
    } else if (localResult.ok) {
      setExportStatusMessage("warn", "Prompt pack exported locally. API queue unavailable.");
    } else {
      setExportStatusMessage("error", "Prompt pack export failed.");
    }
    setExportBusy("");
  };

  return (
    <>
      <div className="bg-mesh" aria-hidden="true" />
      <div className="bg-grain" aria-hidden="true" />

      <AppTopbar
        apiMode={apiMode}
        activeProjectId={activeProjectId}
        projects={projects}
        selectProject={selectProject}
        saveActiveProject={saveActiveProject}
        createProject={createProject}
      />

      <div className="layout">
        <AppSidebar view={view} navigateToView={navigateToView} />

        <main className="content">
          {view === "overview" ? (
          <OverviewSection
            projects={projects}
            activeProject={activeProject}
            wsState={wsState}
            dotPages={dotPages}
            lastDotExportSec={lastDotExportSec}
            projectStatus={projectStatus}
          />
          ) : null}

          {view === "wordsearch" ? (
          <WordSearchSection
            wsSize={wsSize}
            setWsSize={setWsSize}
            generateWordSearch={generateWordSearch}
            normalizeWordSearchFill={normalizeWordSearchFill}
            validateWordSearch={validateWordSearch}
            wsGridRef={wsGridRef}
            wsState={wsState}
            highlightedCells={highlightedCells}
            handleWordCellKeyDown={handleWordCellKeyDown}
            setWsState={setWsState}
            wsForm={wsForm}
            setWsForm={setWsForm}
            directions={DIRECTIONS}
            placeWordFromForm={placeWordFromForm}
            wsStatus={wsStatus}
          />
          ) : null}

          {view === "maze" ? (
          <MazeSection
            mazeRows={mazeRows}
            setMazeRows={setMazeRows}
            mazeCols={mazeCols}
            setMazeCols={setMazeCols}
            regenerateMaze={regenerateMaze}
            solveMaze={solveMaze}
            validateMaze={validateMaze}
            mazeCanvasRef={mazeCanvasRef}
            mazeEdit={mazeEdit}
            setMazeEdit={setMazeEdit}
            orthoDirections={ORTHO_DIRECTIONS}
            applyMazeEdit={applyMazeEdit}
            mazeTerminals={mazeTerminals}
            setMazeTerminals={setMazeTerminals}
            applyMazeTerminals={applyMazeTerminals}
            mazeStatus={mazeStatus}
          />
          ) : null}

          {view === "dotmarker" ? (
          <DotMarkerSection
            dotConfig={dotConfig}
            setDotConfig={setDotConfig}
            dotNicheOptions={DOT_NICHE_OPTIONS}
            kdpTrimSizes={KDP_TRIM_SIZES}
            regenerateDotSuite={regenerateDotSuite}
            shuffleActiveDotPage={shuffleActiveDotPage}
            runDotQc={runDotQc}
            dotUseAiReferences={dotUseAiReferences}
            setDotUseAiReferences={setDotUseAiReferences}
            selectedTrim={selectedTrim}
            activeDot={activeDot}
            drawMotifGuideSvgNodes={drawMotifGuideSvgNodes}
            dotInference={dotInference}
            dotMotifs={DOT_MOTIFS}
            generateAiSceneReferences={generateAiSceneReferences}
            aiSceneBusy={aiSceneBusy}
            aiExporting={aiExporting}
            generateAndExportAiBookPdf={generateAndExportAiBookPdf}
            aiSceneStatus={aiSceneStatus}
            aiSceneErrors={aiSceneErrors}
            dotPages={dotPages}
            activeDotPage={activeDotPage}
            setActiveDotPage={setActiveDotPage}
            aiSceneItems={aiSceneItems}
            exportActiveAiPng={exportActiveAiPng}
            exportAiPngPages={exportAiPngPages}
            exportAiBookPdf={exportAiBookPdf}
            dotQc={dotQc}
            exportActiveDotSvg={exportActiveDotSvg}
            exportDotSuitePdf={exportDotSuitePdf}
            dotExporting={dotExporting}
            dotStatus={dotStatus}
          />
          ) : null}

          {view === "dot2dot" ? (
          <DotToDotSection
            dotToDotConfig={dotToDotConfig}
            setDotToDotConfig={setDotToDotConfig}
            dotToDotDifficulty={DOT_TO_DOT_DIFFICULTY}
            kdpTrimSizes={KDP_TRIM_SIZES}
            importDotToDotImageTrace={importDotToDotImageTrace}
            importDotToDotLibraryBatch={importDotToDotLibraryBatch}
            dotToDotImageBusy={dotToDotImageBusy}
            dotToDotImageTrace={dotToDotImageTrace}
            dotToDotLibrary={dotToDotLibrary}
            readyDotToDotLibrary={readyDotToDotLibrary}
            clearDotToDotImageTrace={clearDotToDotImageTrace}
            clearDotToDotLibrary={clearDotToDotLibrary}
            regenerateDotToDotSuite={regenerateDotToDotSuite}
            shuffleActiveDotToDotPage={shuffleActiveDotToDotPage}
            runDotToDotQc={runDotToDotQc}
            selectedDotToDotTrim={selectedDotToDotTrim}
            activeDotToDot={activeDotToDot}
            dotToDotPreviewMode={dotToDotPreviewMode}
            drawMotifGuideSvgNodes={drawMotifGuideSvgNodes}
            dotToDotInference={dotToDotInference}
            getDotToDotDifficulty={getDotToDotDifficulty}
            setDotToDotPreviewMode={setDotToDotPreviewMode}
            dotToDotPages={dotToDotPages}
            activeDotToDotPage={activeDotToDotPage}
            setActiveDotToDotPage={setActiveDotToDotPage}
            dotToDotQc={dotToDotQc}
            exportActiveDotToDotSvg={exportActiveDotToDotSvg}
            exportDotToDotRecipeJson={exportDotToDotRecipeJson}
            exportDotToDotSuitePdf={exportDotToDotSuitePdf}
            dotToDotExporting={dotToDotExporting}
            dotToDotStatus={dotToDotStatus}
          />
          ) : null}

          {view === "style" ? (
          <StyleForgeSection />
          ) : null}

          {view === "qc" ? (
          <QCExportSection
            wsBadge={wsBadge}
            wsStatus={wsStatus}
            mazeBadge={mazeBadge}
            mazeStatus={mazeStatus}
            dotBadge={dotBadge}
            dotHasWarnings={dotHasWarnings}
            preflightBadge={preflightBadge}
            preflightSummaryText={preflightSummaryText}
            exportBusy={exportBusy}
            preflightReport={preflightReport}
            exportStatus={exportStatus}
            handleInteriorExport={handleInteriorExport}
            handleSolutionsExport={handleSolutionsExport}
            handleCombinedExport={handleCombinedExport}
            handlePromptPackExport={handlePromptPackExport}
            preflightBleedEnabled={preflightBleedEnabled}
            setPreflightBleedEnabled={setPreflightBleedEnabled}
            readingDirection={readingDirection}
            setReadingDirection={setReadingDirection}
            preflightTone={preflightTone}
          />
          ) : null}
        </main>
      </div>
    </>
  );
}

export function BookForgeStudio({ initialView = "overview" }) {
  return (
    <WorkspaceProvider>
      <UIProvider initialView={initialView}>
        <BookForgeStudioContent />
      </UIProvider>
    </WorkspaceProvider>
  );
}

export default BookForgeStudio;




