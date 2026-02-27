export default function WordSearchSection({
  wsSize,
  setWsSize,
  generateWordSearch,
  normalizeWordSearchFill,
  validateWordSearch,
  wsGridRef,
  wsState,
  highlightedCells,
  handleWordCellKeyDown,
  setWsState,
  wsForm,
  setWsForm,
  directions,
  placeWordFromForm,
  wsStatus
}) {
  return (
    <section className="view active">
      <div className="section-head">
        <div>
          <p className="kicker">Full Editing Suite</p>
          <h2>Word Search Lab</h2>
        </div>
        <div className="inline-controls">
          <label>
            Grid
            <input type="number" min="10" max="18" value={wsSize} onChange={(e) => setWsSize(Number(e.target.value))} />
          </label>
          <button type="button" onClick={generateWordSearch}>
            Generate
          </button>
          <button type="button" className="ghost-btn" onClick={normalizeWordSearchFill}>
            Normalize Fill
          </button>
          <button type="button" className="ghost-btn" onClick={validateWordSearch}>
            Run QC
          </button>
        </div>
      </div>

      <div className="workspace-grid">
        <div className="panel">
          <h3>Interactive Grid</h3>
          <p className="subtle">Click a cell, then type to edit. Arrow keys move focus.</p>
          <div className="word-grid" ref={wsGridRef} style={{ gridTemplateColumns: `repeat(${wsState.size}, 1fr)` }}>
            {wsState.grid.map((row, r) =>
              row.map((cell, c) => (
                <button
                  type="button"
                  key={`${r}-${c}`}
                  data-cell={`${r}:${c}`}
                  className={`grid-cell ${highlightedCells.has(`${r}:${c}`) ? "highlight" : ""}`}
                  onKeyDown={(event) => handleWordCellKeyDown(r, c, event)}
                >
                  {cell}
                </button>
              ))
            )}
          </div>
        </div>

        <div className="panel side-panel">
          <h3>Words + Placement</h3>
          <p className="subtle">Select a word to highlight its current path.</p>
          <div className="word-list">
            {wsState.words.map((word) => (
              <button
                type="button"
                key={word.id}
                className={`word-chip ${wsState.highlightedWordId === word.id ? "active" : ""}`}
                onClick={() =>
                  setWsState((prev) => ({
                    ...prev,
                    highlightedWordId: prev.highlightedWordId === word.id ? null : word.id
                  }))
                }
              >
                {word.text} ({word.direction})
              </button>
            ))}
          </div>
          <div className="divider" />
          <h4>Add/Move Word</h4>
          <div className="form-grid">
            <label>
              Word
              <input value={wsForm.word} onChange={(e) => setWsForm((prev) => ({ ...prev, word: e.target.value }))} />
            </label>
            <label>
              Row
              <input
                type="number"
                min="0"
                value={wsForm.row}
                onChange={(e) => setWsForm((prev) => ({ ...prev, row: Number(e.target.value) }))}
              />
            </label>
            <label>
              Col
              <input
                type="number"
                min="0"
                value={wsForm.col}
                onChange={(e) => setWsForm((prev) => ({ ...prev, col: Number(e.target.value) }))}
              />
            </label>
            <label>
              Direction
              <select
                value={wsForm.direction}
                onChange={(e) => setWsForm((prev) => ({ ...prev, direction: e.target.value }))}
              >
                {Object.keys(directions).map((dir) => (
                  <option key={dir} value={dir}>
                    {dir}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="inline-controls">
            <button type="button" onClick={placeWordFromForm}>
              Place Word
            </button>
            <button
              type="button"
              className="ghost-btn"
              onClick={() => setWsState((prev) => ({ ...prev, highlightedWordId: null }))}
            >
              Clear Highlight
            </button>
          </div>
          <p className={`status ${wsStatus.tone}`}>{wsStatus.text}</p>
        </div>
      </div>
    </section>
  );
}