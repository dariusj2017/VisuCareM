import "./App.css";

function App() {
  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-logo">IoT</div>
          <div className="brand-text">
            <div>POSITION OF WEAR</div>
            <div>MEASUREMENTS</div>
          </div>
        </div>

        <div className="title">FRONT PHOTO</div>

        <div className="topbar-actions">
          <button className="icon-btn" aria-label="Home">
            ⌂
          </button>
          <button className="icon-btn" aria-label="Menu">
            ☰
          </button>
        </div>
      </header>

      <main className="viewer">
        <img
          className="face-image"
          src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=1200&q=80"
          alt="Face with glasses"
        />

        <div className="overlay">
          <div className="glasses-guide">
            <div className="top-line"></div>
            <div className="left-marker marker">
              <div className="marker-inner"></div>
            </div>
            <div className="center-marker marker black"></div>
            <div className="right-marker marker">
              <div className="marker-inner"></div>
            </div>

            <div className="left-leg"></div>
            <div className="right-leg"></div>
          </div>

          <div className="nose-target">
            <div className="cross horizontal"></div>
            <div className="cross vertical"></div>
            <div className="cross-dot"></div>
          </div>

          <button className="capture-btn" aria-label="Take photo"></button>
        </div>

        <div className="bottom-panel">
          <div className="mini-target">
            <div className="mini-h"></div>
            <div className="mini-v"></div>
            <div className="mini-dot"></div>
          </div>

          <div className="instruction">
            <div className="instruction-title">Centered!</div>
            <div className="instruction-text">
              Now you can take the photo by clicking the button on the right.
            </div>
          </div>

          <div className="mini-brand">IoT</div>
        </div>
      </main>
    </div>
  );
}

export default App;