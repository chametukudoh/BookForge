export default function MazeSection({
  mazeRows,
  setMazeRows,
  mazeCols,
  setMazeCols,
  regenerateMaze,
  solveMaze,
  validateMaze,
  mazeCanvasRef,
  mazeEdit,
  setMazeEdit,
  orthoDirections,
  applyMazeEdit,
  mazeTerminals,
  setMazeTerminals,
  applyMazeTerminals,
  mazeStatus
}) {
  return (
    <section className="view active">
      <div className="section-head">
        <div>
          <p className="kicker">Generator + Editor</p>
          <h2>Maze Lab</h2>
        </div>
        <div className="inline-controls">
          <label>
            Rows
            <input type="number" min="8" max="40" value={mazeRows} onChange={(e) => setMazeRows(Number(e.target.value))} />
          </label>
          <label>
            Cols
            <input type="number" min="8" max="40" value={mazeCols} onChange={(e) => setMazeCols(Number(e.target.value))} />
          </label>
          <button type="button" onClick={regenerateMaze}>
            Generate
          </button>
          <button type="button" className="ghost-btn" onClick={solveMaze}>
            Solve
          </button>
          <button type="button" className="ghost-btn" onClick={validateMaze}>
            Run QC
          </button>
        </div>
      </div>

      <div className="workspace-grid">
        <div className="panel">
          <h3>Maze Canvas</h3>
          <canvas className="maze-canvas" ref={mazeCanvasRef} width={620} height={620} />
        </div>

        <div className="panel side-panel">
          <h3>Wall Edit Console</h3>
          <div className="form-grid">
            <label>
              Row
              <input
                type="number"
                min="0"
                value={mazeEdit.row}
                onChange={(e) => setMazeEdit((prev) => ({ ...prev, row: Number(e.target.value) }))}
              />
            </label>
            <label>
              Col
              <input
                type="number"
                min="0"
                value={mazeEdit.col}
                onChange={(e) => setMazeEdit((prev) => ({ ...prev, col: Number(e.target.value) }))}
              />
            </label>
            <label>
              Direction
              <select
                value={mazeEdit.direction}
                onChange={(e) => setMazeEdit((prev) => ({ ...prev, direction: e.target.value }))}
              >
                {Object.keys(orthoDirections).map((dir) => (
                  <option key={dir} value={dir}>
                    {dir}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Action
              <select
                value={mazeEdit.action}
                onChange={(e) => setMazeEdit((prev) => ({ ...prev, action: e.target.value }))}
              >
                <option value="remove">Open Wall</option>
                <option value="add">Close Wall</option>
              </select>
            </label>
          </div>
          <div className="inline-controls">
            <button type="button" onClick={applyMazeEdit}>
              Apply Wall Edit
            </button>
          </div>
          <div className="divider" />
          <h4>Terminals</h4>
          <div className="form-grid">
            <label>
              Entrance (r,c)
              <input
                value={mazeTerminals.entrance}
                onChange={(e) => setMazeTerminals((prev) => ({ ...prev, entrance: e.target.value }))}
              />
            </label>
            <label>
              Exit (r,c)
              <input
                value={mazeTerminals.exit}
                onChange={(e) => setMazeTerminals((prev) => ({ ...prev, exit: e.target.value }))}
              />
            </label>
          </div>
          <button type="button" onClick={applyMazeTerminals}>
            Update Terminals
          </button>
          <p className={`status ${mazeStatus.tone}`}>{mazeStatus.text}</p>
        </div>
      </div>
    </section>
  );
}