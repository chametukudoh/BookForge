export default function DotToDotSection({
  dotToDotConfig,
  setDotToDotConfig,
  dotToDotDifficulty,
  kdpTrimSizes,
  importDotToDotImageTrace,
  importDotToDotLibraryBatch,
  dotToDotImageBusy,
  dotToDotImageTrace,
  dotToDotLibrary,
  readyDotToDotLibrary,
  clearDotToDotImageTrace,
  clearDotToDotLibrary,
  regenerateDotToDotSuite,
  shuffleActiveDotToDotPage,
  runDotToDotQc,
  selectedDotToDotTrim,
  activeDotToDot,
  dotToDotPreviewMode,
  drawMotifGuideSvgNodes,
  dotToDotInference,
  getDotToDotDifficulty,
  setDotToDotPreviewMode,
  dotToDotPages,
  activeDotToDotPage,
  setActiveDotToDotPage,
  dotToDotQc,
  exportActiveDotToDotSvg,
  exportDotToDotRecipeJson,
  exportDotToDotSuitePdf,
  dotToDotExporting,
  dotToDotStatus
}) {
  const goPrevPage = () =>
    setActiveDotToDotPage((prev) =>
      prev > 0 ? prev - 1 : Math.max(0, dotToDotPages.length - 1)
    );
  const goNextPage = () =>
    setActiveDotToDotPage((prev) => (prev + 1) % Math.max(1, dotToDotPages.length));
  const qcWarnCount = dotToDotQc.filter((rule) => rule.status !== "PASS").length;
  const qcPassCount = dotToDotQc.length - qcWarnCount;

  return (
    <section className="view active">
      <div className="section-head">
        <div>
          <p className="kicker">Themed Connect-the-Dots</p>
          <h2>Dot-to-Dot Lab</h2>
        </div>
        <div className="inline-controls">
          <label className="dot-wide-input">
            Book Title
            <input
              value={dotToDotConfig.bookTitle}
              placeholder="e.g. Space Dot-to-Dot Coloring Book for Kids"
              onChange={(e) =>
                setDotToDotConfig((prev) => ({ ...prev, bookTitle: e.target.value }))
              }
            />
          </label>
          <label className="dot-wide-input">
            Niche / Theme
            <input
              value={dotToDotConfig.theme}
              placeholder="e.g. dinosaurs, ocean animals, space adventures"
              onChange={(e) =>
                setDotToDotConfig((prev) => ({ ...prev, theme: e.target.value }))
              }
            />
          </label>
          <label>
            Source Mode
            <select
              value={dotToDotConfig.sourceMode || "theme_ai"}
              onChange={(e) =>
                setDotToDotConfig((prev) => ({ ...prev, sourceMode: e.target.value }))
              }
            >
              <option value="theme_ai">Theme AI</option>
              <option value="single_trace">Single Trace</option>
              <option value="bulk_library">Bulk Library</option>
            </select>
          </label>
          <label>
            Difficulty
            <select
              value={dotToDotConfig.difficulty}
              onChange={(e) =>
                setDotToDotConfig((prev) => ({ ...prev, difficulty: e.target.value }))
              }
            >
              {Object.entries(dotToDotDifficulty).map(([id, rule]) => (
                <option key={id} value={id}>
                  {rule.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Pages
            <input
              type="number"
              min="1"
              max="120"
              value={dotToDotConfig.pageCount}
              onChange={(e) =>
                setDotToDotConfig((prev) => ({ ...prev, pageCount: Number(e.target.value) }))
              }
            />
          </label>
          <label>
            KDP Trim Size
            <select
              value={dotToDotConfig.trimId}
              onChange={(e) =>
                setDotToDotConfig((prev) => ({ ...prev, trimId: e.target.value }))
              }
            >
              {kdpTrimSizes.map((trim) => (
                <option key={trim.id} value={trim.id}>
                  {trim.label}
                </option>
              ))}
            </select>
          </label>
          <label className="dot-wide-input">
            Single Trace Image
            <input
              type="file"
              accept="image/*"
              onChange={importDotToDotImageTrace}
              disabled={dotToDotImageBusy}
            />
          </label>
          <label className="dot-check-input">
            <input
              type="checkbox"
              checked={(dotToDotConfig.sourceMode || "theme_ai") === "single_trace" && Boolean(dotToDotImageTrace)}
              disabled={!dotToDotImageTrace}
              onChange={(e) =>
                setDotToDotConfig((prev) => ({
                  ...prev,
                  useImageTrace: e.target.checked && Boolean(dotToDotImageTrace),
                  sourceMode: e.target.checked && Boolean(dotToDotImageTrace) ? "single_trace" : "theme_ai"
                }))
              }
            />
            Use Image Trace
          </label>
          <label className="dot-wide-input">
            Bulk Library Upload
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={importDotToDotLibraryBatch}
              disabled={dotToDotImageBusy}
            />
          </label>
          <label className="dot-check-input">
            <input
              type="checkbox"
              checked={Boolean(dotToDotConfig.useOnlyLibraryAssets)}
              onChange={(e) =>
                setDotToDotConfig((prev) => ({ ...prev, useOnlyLibraryAssets: e.target.checked }))
              }
            />
            Use Only Library
          </label>
          <label className="dot-check-input">
            <input
              type="checkbox"
              checked={Boolean(dotToDotConfig.allowAiFallback)}
              onChange={(e) =>
                setDotToDotConfig((prev) => ({ ...prev, allowAiFallback: e.target.checked }))
              }
            />
            Allow Local Fallback
          </label>
          <button
            type="button"
            className="ghost-btn"
            disabled={!dotToDotImageTrace}
            onClick={clearDotToDotImageTrace}
          >
            Clear Trace
          </button>
          <button
            type="button"
            className="ghost-btn"
            disabled={!dotToDotLibrary.length}
            onClick={clearDotToDotLibrary}
          >
            Clear Library
          </button>
          <button type="button" onClick={regenerateDotToDotSuite}>
            Generate Dot-to-Dot
          </button>
          <button type="button" className="ghost-btn" onClick={shuffleActiveDotToDotPage}>
            Shuffle Page
          </button>
          <button type="button" className="ghost-btn" onClick={runDotToDotQc}>
            Run D2D QC
          </button>
        </div>
      </div>

      <div className="dot-workspace">
        <div className="panel">
          <h3>Page Preview</h3>
          <p className="subtle">Connect numbers in order to reveal the themed drawing, then color it.</p>
          <p className="subtle dot-meta">
            Trim: {selectedDotToDotTrim.label} ({selectedDotToDotTrim.widthIn}&quot; x{" "}
            {selectedDotToDotTrim.heightIn}&quot;)
          </p>
          <div
            className="dot-canvas-wrap"
            style={{
              aspectRatio: activeDotToDot
                ? `${activeDotToDot.width} / ${activeDotToDot.height}`
                : `${selectedDotToDotTrim.widthIn} / ${selectedDotToDotTrim.heightIn}`
            }}
          >
            {activeDotToDot ? (
              <svg
                className="dot-svg"
                viewBox={`0 0 ${activeDotToDot.width} ${activeDotToDot.height}`}
                role="img"
                aria-label={activeDotToDot.title}
              >
                <text
                  className="dot-page-title"
                  x={activeDotToDot.width / 2}
                  y={Math.max(24, (activeDotToDot.marginY ?? 45) * 0.55)}
                >
                  {activeDotToDot.title}
                </text>
                <text
                  className="dot-page-subtitle"
                  x={activeDotToDot.width / 2}
                  y={Math.max(40, (activeDotToDot.marginY ?? 45) * 0.9)}
                >
                  {dotToDotPreviewMode === "solution" ? "Solution view" : "Connect numbers in order"}
                </text>
                <rect
                  x={activeDotToDot.marginX}
                  y={activeDotToDot.marginY}
                  width={activeDotToDot.width - activeDotToDot.marginX * 2}
                  height={activeDotToDot.height - activeDotToDot.marginY * 2}
                  fill="#ffffff"
                  stroke="#e4e0d5"
                  strokeWidth="2"
                />
                {dotToDotPreviewMode === "puzzle" && activeDotToDot.tracePreviewUrl ? (
                  <image
                    href={activeDotToDot.tracePreviewUrl}
                    x={activeDotToDot.marginX}
                    y={activeDotToDot.marginY}
                    width={activeDotToDot.width - activeDotToDot.marginX * 2}
                    height={activeDotToDot.height - activeDotToDot.marginY * 2}
                    preserveAspectRatio="xMidYMid meet"
                    opacity="0.45"
                  />
                ) : null}
                {activeDotToDot.motif && !(dotToDotPreviewMode === "puzzle" && activeDotToDot.tracePreviewUrl)
                  ? drawMotifGuideSvgNodes(activeDotToDot.motif, `${activeDotToDot.motif.id}-d2d`)
                  : null}
                {dotToDotPreviewMode === "solution" && activeDotToDot.points.length > 1 ? (
                  <path
                    className="d2d-solution-line"
                    d={activeDotToDot.points
                      .map((point, idx) => `${idx === 0 ? "M" : "L"} ${point.x} ${point.y}`)
                      .join(" ")}
                  />
                ) : null}
                {activeDotToDot.points.map((point) => (
                  <g key={point.id}>
                    <circle className="d2d-point" cx={point.x} cy={point.y} r={7} />
                    <text className="d2d-label" x={point.x} y={point.y}>
                      {point.label}
                    </text>
                  </g>
                ))}
              </svg>
            ) : null}
            <button
              type="button"
              className="preview-nav-arrow left"
              onClick={goPrevPage}
              disabled={dotToDotPages.length <= 1}
              aria-label="Previous page"
            >
              &#8249;
            </button>
            <button
              type="button"
              className="preview-nav-arrow right"
              onClick={goNextPage}
              disabled={dotToDotPages.length <= 1}
              aria-label="Next page"
            >
              &#8250;
            </button>
          </div>
        </div>

        <div className="panel side-panel">
          <h3>Dot-to-Dot Workflow</h3>
          <p className="subtle">Theme profile: {activeDotToDot?.themePackLabel || dotToDotInference.profile.packLabel}</p>
          <p className="subtle">
            Source: {(dotToDotConfig.sourceMode || "theme_ai") === "single_trace" && dotToDotImageTrace
              ? `Single Trace (${dotToDotImageTrace.name})`
              : (dotToDotConfig.sourceMode || "theme_ai") === "bulk_library"
                ? `Bulk Library (${readyDotToDotLibrary.length} ready / ${dotToDotLibrary.length} total)`
                : "Theme AI"}
          </p>
          {dotToDotLibrary.length ? (
            <p className="subtle">
              Library assets: {readyDotToDotLibrary.length} ready,{" "}
              {Math.max(0, dotToDotLibrary.length - readyDotToDotLibrary.length)} need fixes.
            </p>
          ) : null}
          {dotToDotImageTrace?.diagnostics?.componentSize ? (
            <p className="subtle">
              Trace diagnostics: component {dotToDotImageTrace.diagnostics.componentSize}, contour{" "}
              {dotToDotImageTrace.points.length}, guide {dotToDotImageTrace.guidePoints.length}.
            </p>
          ) : null}
          <p className="subtle">Difficulty target: {getDotToDotDifficulty(dotToDotConfig.difficulty).label}</p>
          <div className="inline-controls">
            <button
              type="button"
              className={dotToDotPreviewMode === "puzzle" ? "" : "ghost-btn"}
              onClick={() => setDotToDotPreviewMode("puzzle")}
            >
              Puzzle View
            </button>
            <button
              type="button"
              className={dotToDotPreviewMode === "solution" ? "" : "ghost-btn"}
              onClick={() => setDotToDotPreviewMode("solution")}
            >
              Solution View
            </button>
          </div>
          <div className="divider" />
          <div className="inline-controls page-nav-controls">
            <button
              type="button"
              className="ghost-btn"
              disabled={!dotToDotPages.length}
              onClick={goPrevPage}
            >
              Previous Page
            </button>
            <span className="subtle">
              Page {dotToDotPages.length ? activeDotToDotPage + 1 : 0} / {dotToDotPages.length}
            </span>
            <button
              type="button"
              className="ghost-btn"
              disabled={!dotToDotPages.length}
              onClick={goNextPage}
            >
              Next Page
            </button>
          </div>
          <details className="dot-qc-collapsible">
            <summary>
              QC checks: {qcPassCount} PASS, {qcWarnCount} WARN
            </summary>
            <div className="dot-qc">
              {dotToDotQc.map((rule) => (
                <div className="dot-qc-item" key={rule.label}>
                  <span>{rule.label}</span>
                  <strong>{rule.status}</strong>
                </div>
              ))}
            </div>
          </details>
          <div className="dot-export-actions">
            <button type="button" onClick={() => exportActiveDotToDotSvg(false)}>
              Export Puzzle SVG
            </button>
            <button type="button" className="ghost-btn" onClick={() => exportActiveDotToDotSvg(true)}>
              Export Solution SVG
            </button>
            <button type="button" className="ghost-btn" onClick={exportDotToDotRecipeJson}>
              Export Recipe JSON
            </button>
            <button
              type="button"
              className="ghost-btn"
              onClick={() => exportDotToDotSuitePdf(false)}
              disabled={dotToDotExporting}
            >
              {dotToDotExporting ? "Exporting..." : "Export Puzzle PDF"}
            </button>
            <button
              type="button"
              className="ghost-btn"
              onClick={() => exportDotToDotSuitePdf(true)}
              disabled={dotToDotExporting}
            >
              {dotToDotExporting ? "Exporting..." : "Export Solution PDF"}
            </button>
          </div>
          <p className={`status ${dotToDotStatus.tone}`}>{dotToDotStatus.text}</p>
        </div>
      </div>
    </section>
  );
}
