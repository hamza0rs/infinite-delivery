interface Props {
  onResume: () => void;
  onRestart: () => void;
  onMainMenu: () => void;
}

export function PauseMenu({ onResume, onRestart, onMainMenu }: Props) {
  return (
    <div className="overlay">
      <div className="panel panel--center">
        <h2 className="panel-title">Paused</h2>
        <div className="panel-buttons">
          <button className="btn btn--primary" onClick={onResume}>
            Resume
          </button>
          <button className="btn" onClick={onRestart}>
            Restart
          </button>
          <button className="btn" onClick={onMainMenu}>
            Main Menu
          </button>
        </div>
      </div>
    </div>
  );
}
