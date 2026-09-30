import { useMemo, useState } from 'react';
import type { RunStats } from '../types/game';

const FUNNY_LINES = [
  'At least the pizza survived emotionally.',
  'The delivery box has seen things.',
  'Somewhere, a customer is still waiting.',
  'That pothole had your name on it.',
  'The scooter needs a moment alone.',
  'Legendary crash. Mediocre pizza.',
];

interface Props {
  run: RunStats | null;
  bestScore: number;
  isNewHighScore: boolean;
  onPlayAgain: () => void;
  onGarage: () => void;
  onMainMenu: () => void;
  onSubmitScore: (name: string) => void;
}

export function GameOverScreen({ run, bestScore, isNewHighScore, onPlayAgain, onGarage, onMainMenu, onSubmitScore }: Props) {
  const [name, setName] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const funnyLine = useMemo(() => FUNNY_LINES[Math.floor(Math.random() * FUNNY_LINES.length)], []);

  if (!run) return null;
  const score = Math.round(run.score);

  return (
    <div className="overlay">
      <div className="panel panel--center panel--wide">
        <h2 className="panel-title">Game Over</h2>
        <p className="game-over-quip">{funnyLine}</p>

        <div className="stat-grid">
          <div className="stat-box">
            <div className="stat-label">Score</div>
            <div className="stat-value">{score.toLocaleString()}</div>
          </div>
          <div className="stat-box">
            <div className="stat-label">Deliveries</div>
            <div className="stat-value">{run.deliveries}</div>
          </div>
          <div className="stat-box">
            <div className="stat-label">Money</div>
            <div className="stat-value">${run.money}</div>
          </div>
          <div className="stat-box">
            <div className="stat-label">Best</div>
            <div className="stat-value">{bestScore.toLocaleString()}</div>
          </div>
        </div>

        {isNewHighScore && !submitted && (
          <div className="leaderboard-entry">
            <p>New local high score! Add it to the leaderboard:</p>
            <div className="leaderboard-entry-row">
              <input
                maxLength={16}
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <button
                className="btn btn--primary"
                onClick={() => {
                  onSubmitScore(name || 'RIDER');
                  setSubmitted(true);
                }}
              >
                Save
              </button>
            </div>
          </div>
        )}

        <div className="panel-buttons">
          <button className="btn btn--primary" onClick={onPlayAgain}>
            Play Again
          </button>
          <button className="btn" onClick={onGarage}>
            Garage
          </button>
          <button className="btn" onClick={onMainMenu}>
            Main Menu
          </button>
        </div>
      </div>
    </div>
  );
}
