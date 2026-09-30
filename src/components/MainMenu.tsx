import { useEffect } from 'react';

interface Props {
  bestScore: number;
  onPlay: () => void;
  onHowToPlay: () => void;
  onGarage: () => void;
  onStats: () => void;
  onSettings: () => void;
}

export function MainMenu({ bestScore, onPlay, onHowToPlay, onGarage, onStats, onSettings }: Props) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Enter') onPlay(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onPlay]);

  return (
    <div className="screen menu-screen">
      <div className="menu-backdrop" aria-hidden="true">
        <div className="menu-grid" />
        <div className="menu-horizon" />
        <div className="menu-road menu-road--left" />
        <div className="menu-road menu-road--right" />
        <div className="menu-vehicle">
          <span className="menu-vehicle__light" />
          <span className="menu-vehicle__body" />
          <span className="menu-vehicle__wheel menu-vehicle__wheel--l" />
          <span className="menu-vehicle__wheel menu-vehicle__wheel--r" />
        </div>
      </div>

      <div className="menu-content">
        <div className="menu-kicker"><span className="status-dot" /> PHASESHIFT DELIVERY NETWORK</div>
        <div className="menu-brand-mark">ID</div>
        <h1 className="menu-title">INFINITE<br />DELIVERY</h1>
        <p className="menu-tagline">ENDLESS ROAD · PERFECT TIMING · ZERO MARGIN</p>

        <div className="menu-meta">
          <div className="menu-meta__item">
            <span className="menu-meta__label">BEST RUN</span>
            <strong>{bestScore > 0 ? bestScore.toLocaleString() : '—'}</strong>
          </div>
          <div className="menu-meta__item">
            <span className="menu-meta__label">MODE</span>
            <strong>ENDLESS</strong>
          </div>
          <div className="menu-meta__item">
            <span className="menu-meta__label">AUDIO</span>
            <strong>SFX ONLY</strong>
          </div>
        </div>

        <nav className="menu-buttons">
          <button className="btn btn--primary btn--hero" onClick={onPlay}>
            <span>START RUN</span><span className="btn-hint">ENTER</span>
          </button>
          <div className="menu-button-grid">
            <button className="btn btn--compact" onClick={onHowToPlay}>HOW TO PLAY</button>
            <button className="btn btn--compact" onClick={onGarage}>GARAGE</button>
            <button className="btn btn--compact" onClick={onStats}>RUN STATS</button>
            <button className="btn btn--compact" onClick={onSettings}>SETTINGS</button>
          </div>
        </nav>
      </div>
    </div>
  );
}
