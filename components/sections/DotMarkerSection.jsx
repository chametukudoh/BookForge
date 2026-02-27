export default function DotMarkerSection({
  dotConfig,
  setDotConfig,
  dotNicheOptions,
  kdpTrimSizes,
  regenerateDotSuite,
  shuffleActiveDotPage,
  runDotQc,
  dotUseAiReferences,
  setDotUseAiReferences,
  selectedTrim,
  activeDot,
  drawMotifGuideSvgNodes,
  dotInference,
  dotMotifs,
  generateAiSceneReferences,
  aiSceneBusy,
  aiExporting,
  generateAndExportAiBookPdf,
  aiSceneStatus,
  aiSceneErrors,
  dotPages,
  activeDotPage,
  setActiveDotPage,
  aiSceneItems,
  exportActiveAiPng,
  exportAiPngPages,
  exportAiBookPdf,
  dotQc,
  exportActiveDotSvg,
  exportDotSuitePdf,
  dotExporting,
  dotStatus
}) {
  const goPrevPage = () =>
    setActiveDotPage((prev) => (prev > 0 ? prev - 1 : Math.max(0, dotPages.length - 1)));
  const goNextPage = () =>
    setActiveDotPage((prev) => (prev + 1) % Math.max(1, dotPages.length));
  const dotQcWarnCount = dotQc.filter((rule) => rule.status !== "PASS").length;
  const dotQcPassCount = dotQc.length - dotQcWarnCount;

  return (
    <section className="view active">
      <div className="section-head">
        <div>
          <p className="kicker">Dauber-Friendly Production</p>
          <h2>Dot Marker Lab</h2>
        </div>
        <div className="inline-controls">
          <label className="dot-wide-input">
            Book Title
            <input
              value={dotConfig.bookTitle}
              placeholder="e.g. Dino Dot Marker Coloring Book for Kids"
              onChange={(e) =>
                setDotConfig((prev) => ({ ...prev, bookTitle: e.target.value, motifPool: [] }))
              }
            />
          </label>
          <label className="dot-wide-input">
            Niche / Theme
            <input
              value={dotConfig.theme}
              placeholder="e.g. dinosaurs, ocean animals, space adventures"
              onChange={(e) =>
                setDotConfig((prev) => ({ ...prev, theme: e.target.value, motifPool: [] }))
              }
            />
          </label>
          <label>
            Niche Preset
            <select
              value={dotConfig.nicheId}
              onChange={(e) =>
                setDotConfig((prev) => ({ ...prev, nicheId: e.target.value, motifPool: [] }))
              }
            >
              {dotNicheOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Pages
            <input
              type="number"
              min="1"
              max="80"
              value={dotConfig.pageCount}
              onChange={(e) => setDotConfig((prev) => ({ ...prev, pageCount: Number(e.target.value) }))}
            />
          </label>
          <label>
            Dots/Page
            <input
              type="number"
              min="6"
              max="40"
              value={dotConfig.dotsPerPage}
              onChange={(e) => setDotConfig((prev) => ({ ...prev, dotsPerPage: Number(e.target.value) }))}
            />
          </label>
          <label>
            Min Radius
            <input
              type="number"
              min="10"
              max="48"
              value={dotConfig.minRadius}
              onChange={(e) => setDotConfig((prev) => ({ ...prev, minRadius: Number(e.target.value) }))}
            />
          </label>
          <label>
            Min Gap
            <input
              type="number"
              min="4"
              max="36"
              value={dotConfig.minGap}
              onChange={(e) => setDotConfig((prev) => ({ ...prev, minGap: Number(e.target.value) }))}
            />
          </label>
          <label>
            KDP Trim Size
            <select
              value={dotConfig.trimId}
              onChange={(e) => setDotConfig((prev) => ({ ...prev, trimId: e.target.value }))}
            >
              {kdpTrimSizes.map((trim) => (
                <option key={trim.id} value={trim.id}>
                  {trim.label}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={regenerateDotSuite}>
            Generate From Title/Niche
          </button>
          <button type="button" className="ghost-btn" onClick={shuffleActiveDotPage}>
            Shuffle Page
          </button>
          <button type="button" className="ghost-btn" onClick={runDotQc}>
            Run Dot QC
          </button>
        </div>
      </div>

      <div className="dot-workspace">
        <div className="panel">
          <h3>Page Preview</h3>
          <p className="subtle">Dot marker pages keep large circles and spacing for dauber readability.</p>
          <div className="inline-controls">
            <button type="button" className="ghost-btn" onClick={() => setDotUseAiReferences((prev) => !prev)}>
              {dotUseAiReferences ? "Hide AI Scene Layer" : "Show AI Scene Layer"}
            </button>
          </div>
          <p className="subtle dot-meta">
            Trim: {selectedTrim.label} ({selectedTrim.widthIn}&quot; x {selectedTrim.heightIn}&quot;)
          </p>
          {!activeDot?.motifs?.length ? (
            <p className="subtle dot-warning">
              This page has no motif artwork yet. Click <strong>Generate From Title/Niche</strong> to rebuild with themed line art.
            </p>
          ) : null}
          <div
            className="dot-canvas-wrap"
            style={{
              aspectRatio: activeDot ? `${activeDot.width} / ${activeDot.height}` : `${selectedTrim.widthIn} / ${selectedTrim.heightIn}`
            }}
          >
            {activeDot ? (
              <svg className="dot-svg" viewBox={`0 0 ${activeDot.width} ${activeDot.height}`} role="img" aria-label={activeDot.title}>
                <text className="dot-page-title" x={activeDot.width / 2} y={Math.max(24, (activeDot.marginY ?? 45) * 0.55)}>
                  {activeDot.title}
                </text>
                <text className="dot-page-subtitle" x={activeDot.width / 2} y={Math.max(40, (activeDot.marginY ?? 45) * 0.9)}>
                  Color each numbered circle with a dot marker.
                </text>
                {activeDot.scene?.caption ? (
                  <text className="dot-page-scene" x={activeDot.width / 2} y={Math.max(54, (activeDot.marginY ?? 45) * 1.18)}>
                    {activeDot.scene.caption}
                  </text>
                ) : null}
                <rect
                  x={activeDot.marginX ?? 40}
                  y={activeDot.marginY ?? 45}
                  width={activeDot.width - (activeDot.marginX ?? 40) * 2}
                  height={activeDot.height - (activeDot.marginY ?? 45) * 2}
                  fill="#ffffff"
                  stroke="#e4e0d5"
                  strokeWidth="2"
                />
                {dotUseAiReferences && (activeDot.aiReferenceLineArtUrl || activeDot.aiReferenceUrl) ? (
                  <image
                    href={activeDot.aiReferenceLineArtUrl || activeDot.aiReferenceUrl}
                    x={activeDot.marginX ?? 40}
                    y={activeDot.marginY ?? 45}
                    width={activeDot.width - (activeDot.marginX ?? 40) * 2}
                    height={activeDot.height - (activeDot.marginY ?? 45) * 2}
                    preserveAspectRatio="xMidYMid slice"
                    opacity="0.68"
                  />
                ) : null}
                {(activeDot.motifs || []).map((motif) => drawMotifGuideSvgNodes(motif, `${motif.id}-main`))}
                {activeDot.points.map((point) => (
                  <g key={point.id}>
                    <circle className="dot-point" cx={point.x} cy={point.y} r={point.radius} />
                    <text className="dot-label" x={point.x} y={point.y}>
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
              disabled={dotPages.length <= 1}
              aria-label="Previous page"
            >
              &#8249;
            </button>
            <button
              type="button"
              className="preview-nav-arrow right"
              onClick={goNextPage}
              disabled={dotPages.length <= 1}
              aria-label="Next page"
            >
              &#8250;
            </button>
          </div>
        </div>

        <div className="panel side-panel">
          <h3>Dot Marker Workflow</h3>
          <p className="subtle">Theme profile: {activeDot?.themePackLabel || dotInference.profile.packLabel}</p>
          <p className="subtle">
            AI inference source:{" "}
            {dotConfig.bookTitle?.trim() || dotConfig.theme?.trim()
              ? `"${dotConfig.bookTitle?.trim() || dotConfig.theme?.trim()}"`
              : "Add title or niche"}
          </p>
          <p className="subtle">
            Niche mode: {dotConfig.nicheId === "auto" ? "Auto inference" : dotNicheOptions.find((option) => option.id === dotConfig.nicheId)?.label || dotConfig.nicheId}
          </p>
          <p className="subtle">Match confidence: {dotInference.confidence.toUpperCase()}</p>
          <p className="subtle">
            Motif set:{" "}
            {dotInference.motifPool.length
              ? dotInference.motifPool.map((motifId) => dotMotifs[motifId]?.label || motifId).join(", ")
              : "No motif match yet"}
          </p>
          <div className="dot-export-actions">
            <button
              type="button"
              className="ghost-btn"
              onClick={generateAiSceneReferences}
              disabled={aiSceneBusy || aiExporting}
            >
              {aiSceneBusy ? "Generating AI Scenes..." : "Generate AI Scene References"}
            </button>
            <button type="button" onClick={generateAndExportAiBookPdf} disabled={aiSceneBusy || aiExporting}>
              {aiSceneBusy
                ? "Generating AI Scenes..."
                : aiExporting
                  ? "Exporting AI PDF..."
                  : "Generate + Export AI PDF"}
            </button>
          </div>
          <p className={`status ${aiSceneStatus.tone}`}>{aiSceneStatus.text}</p>
          {aiSceneErrors.length ? (
            <div className="ai-scene-errors">
              {aiSceneErrors.slice(0, 3).map((err, idx) => (
                <p key={`ai-err-${idx}`}>{err}</p>
              ))}
            </div>
          ) : null}
          <div className="divider" />
          <div className="inline-controls page-nav-controls">
            <button
              type="button"
              className="ghost-btn"
              disabled={!dotPages.length}
              onClick={goPrevPage}
            >
              Previous Page
            </button>
            <span className="subtle">
              Page {dotPages.length ? activeDotPage + 1 : 0} / {dotPages.length}
            </span>
            <button
              type="button"
              className="ghost-btn"
              disabled={!dotPages.length}
              onClick={goNextPage}
            >
              Next Page
            </button>
          </div>
          <div className="divider" />
          <h4>AI Scene References</h4>
          <div className="ai-scene-grid">
            {aiSceneItems.length ? (
              aiSceneItems.map((item) => (
                <article key={`ai-scene-${item.index}`} className="ai-scene-card">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.lineArtPreviewUrl || item.imageUrl} alt={`AI scene ${item.index}`} loading="lazy" />
                  ) : (
                    <div className="ai-scene-placeholder">Prompt only</div>
                  )}
                  <p>
                    #{item.index} {item.subject || "Scene"}
                  </p>
                </article>
              ))
            ) : (
              <p className="subtle">No AI scene references yet.</p>
            )}
          </div>
          <div className="dot-export-actions">
            <button type="button" onClick={exportActiveAiPng} disabled={aiExporting || aiSceneBusy}>
              {aiExporting ? "Exporting..." : "Export Active AI PNG"}
            </button>
            <button type="button" className="ghost-btn" onClick={exportAiPngPages} disabled={aiExporting || aiSceneBusy}>
              {aiExporting ? "Exporting..." : "Export AI PNG Pages"}
            </button>
            <button type="button" className="ghost-btn" onClick={exportAiBookPdf} disabled={aiExporting || aiSceneBusy}>
              {aiExporting ? "Exporting..." : "Export AI Book PDF"}
            </button>
          </div>

          <details className="dot-qc-collapsible">
            <summary>
              QC checks: {dotQcPassCount} PASS, {dotQcWarnCount} WARN
            </summary>
            <div className="dot-qc">
              {dotQc.map((rule) => (
                <div className="dot-qc-item" key={rule.label}>
                  <span>{rule.label}</span>
                  <strong>{rule.status}</strong>
                </div>
              ))}
            </div>
          </details>
          <div className="dot-export-actions">
            <button type="button" onClick={exportActiveDotSvg}>
              Export Active SVG
            </button>
            <button type="button" className="ghost-btn" onClick={exportDotSuitePdf} disabled={dotExporting}>
              {dotExporting ? "Exporting PDF..." : "Export Suite PDF"}
            </button>
          </div>
          <p className={`status ${dotStatus.tone}`}>{dotStatus.text}</p>
        </div>
      </div>
    </section>
  );
}
