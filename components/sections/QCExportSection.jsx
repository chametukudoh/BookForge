export default function QCExportSection({
  wsBadge,
  wsStatus,
  mazeBadge,
  mazeStatus,
  dotBadge,
  dotHasWarnings,
  preflightBadge,
  preflightSummaryText,
  exportBusy,
  preflightReport,
  exportStatus,
  handleInteriorExport,
  handleSolutionsExport,
  handleCombinedExport,
  handlePromptPackExport,
  preflightBleedEnabled,
  setPreflightBleedEnabled,
  readingDirection,
  setReadingDirection,
  preflightTone
}) {
  const latestItems = [wsBadge, mazeBadge, dotBadge, preflightBadge];
  const latestWarnCount = latestItems.filter((item) => item.className !== "ok").length;
  const latestPassCount = latestItems.length - latestWarnCount;
  const preflightPassCount = preflightReport.items.filter((item) => item.status === "PASS").length;
  const preflightWarnCount = preflightReport.items.length - preflightPassCount;

  return (
    <section className="view active">
      <div className="section-head">
        <div>
          <p className="kicker">Release Gate</p>
          <h2>QC + Export</h2>
        </div>
      </div>
      <div className="workspace-grid">
        <div className="panel">
          <h3>Latest Validation</h3>
          <details className="qc-collapsible">
            <summary>
              QC checks: {latestPassCount} PASS, {latestWarnCount} WARN
            </summary>
            <ul className="qc-list">
              <li>
                <span className={`badge ${wsBadge.className}`}>{wsBadge.label}</span>
                Word Search: {wsStatus.text}
              </li>
              <li>
                <span className={`badge ${mazeBadge.className}`}>{mazeBadge.label}</span>
                Maze: {mazeStatus.text}
              </li>
              <li>
                <span className={`badge ${dotBadge.className}`}>{dotBadge.label}</span>
                Dot QC: {dotHasWarnings ? "Local spacing/diameter warnings detected." : "Local dot checks passed."}
              </li>
              <li>
                <span className={`badge ${preflightBadge.className}`}>{preflightBadge.label}</span>
                KDP Preflight: {preflightSummaryText}
              </li>
            </ul>
          </details>
        </div>
        <div className="panel side-panel">
          <h3>Export Targets</h3>
          <div className="inline-controls stacked">
            <button
              type="button"
              onClick={handleInteriorExport}
              disabled={exportBusy !== "" || preflightReport.summary.errors > 0}
            >
              {exportBusy === "INTERIOR" ? "Exporting Interior..." : "Export Interior PDF"}
            </button>
            <button
              type="button"
              className="ghost-btn"
              onClick={handleSolutionsExport}
              disabled={exportBusy !== ""}
            >
              {exportBusy === "SOLUTIONS" ? "Exporting Solutions..." : "Export Solutions PDF"}
            </button>
            <button
              type="button"
              className="ghost-btn"
              onClick={handleCombinedExport}
              disabled={exportBusy !== "" || preflightReport.summary.errors > 0}
            >
              {exportBusy === "COMBINED" ? "Exporting Combined..." : "Export Combined"}
            </button>
            <button
              type="button"
              className="ghost-btn"
              onClick={handlePromptPackExport}
              disabled={exportBusy !== ""}
            >
              {exportBusy === "PROMPT_PACK" ? "Exporting Prompt Pack..." : "Export Prompt Pack"}
            </button>
          </div>
          {preflightReport.summary.errors > 0 ? (
            <p className="status error">Interior and combined export are blocked until preflight errors are resolved.</p>
          ) : null}
          <p className={`status ${exportStatus.tone}`}>{exportStatus.text}</p>
        </div>
      </div>
      <div className="panel">
        <div className="section-head">
          <div>
            <p className="kicker">Print Safety</p>
            <h2>KDP Preflight Rules</h2>
          </div>
          <div className="inline-controls">
            <label>
              Bleed
              <select
                value={preflightBleedEnabled ? "bleed" : "no-bleed"}
                onChange={(event) => setPreflightBleedEnabled(event.target.value === "bleed")}
              >
                <option value="no-bleed">No Bleed</option>
                <option value="bleed">Bleed</option>
              </select>
            </label>
            <label>
              Reading Direction
              <select value={readingDirection} onChange={(event) => setReadingDirection(event.target.value)}>
                <option value="LTR">Left to Right</option>
                <option value="RTL">Right to Left</option>
              </select>
            </label>
          </div>
        </div>
        <p className={`status ${preflightTone}`}>{preflightSummaryText}</p>
        <details className="qc-collapsible">
          <summary>
            Preflight checks: {preflightPassCount} PASS, {preflightWarnCount} WARN
          </summary>
          <ul className="qc-list preflight-list">
            {preflightReport.items.map((item) => (
              <li key={item.ruleId}>
                <span className={`badge ${item.status === "PASS" ? "ok" : item.severity === "error" ? "error" : "warn"}`}>
                  {item.status}
                </span>
                <div className="preflight-rule">
                  <strong>{item.ruleId}</strong>
                  <span>{item.detail}</span>
                  <span className="preflight-reco">{item.recommendation}</span>
                </div>
              </li>
            ))}
          </ul>
        </details>
      </div>
    </section>
  );
}
