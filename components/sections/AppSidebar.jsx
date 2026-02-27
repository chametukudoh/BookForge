const NAV_ITEMS = [
  { id: "overview", label: "Overview" },
  { id: "wordsearch", label: "Word Search Lab" },
  { id: "maze", label: "Maze Lab" },
  { id: "dotmarker", label: "Dot Marker Lab" },
  { id: "dot2dot", label: "Dot-to-Dot Lab" },
  { id: "style", label: "Style Forge" },
  { id: "qc", label: "QC + Export" }
];

export default function AppSidebar({ view, navigateToView }) {
  return (
    <aside className="sidebar">
      {NAV_ITEMS.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`nav-btn ${view === item.id ? "active" : ""}`}
          onClick={() => navigateToView(item.id)}
        >
          {item.label}
        </button>
      ))}
    </aside>
  );
}