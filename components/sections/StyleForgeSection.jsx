export default function StyleForgeSection() {
  return (
    <section className="view active">
      <div className="section-head">
        <div>
          <p className="kicker">Style Profile System</p>
          <h2>Style Forge</h2>
        </div>
      </div>

      <div className="card-grid">
        <article className="card style-card">
          <h3>Bold and Easy</h3>
          <p>Ultra-thick contour, low detail, no shading.</p>
          <span className="chip">Global Lock On</span>
        </article>
        <article className="card style-card">
          <h3>Dot Marker</h3>
          <p>Large circles, wide spacing, dauber-safe geometry.</p>
          <span className="chip">Kids 2-6</span>
        </article>
        <article className="card style-card">
          <h3>Kawaii Outline</h3>
          <p>Rounded forms, friendly faces, medium line weight.</p>
          <span className="chip">Per-Page Override</span>
        </article>
        <article className="card style-card">
          <h3>Mandala Dense</h3>
          <p>High pattern complexity with print-safe line thickness.</p>
          <span className="chip">Adult</span>
        </article>
      </div>
    </section>
  );
}