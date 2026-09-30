import { ACHIEVEMENTS } from '../game/Achievements';
import type { AllTimeStats, LeaderboardEntry } from '../types/game';

interface Props { stats: AllTimeStats; leaderboard: LeaderboardEntry[]; onBack: () => void; }
function Row({ label, value }: { label: string; value: string | number }) {
  return <div className="stat-row"><span>{label}</span><strong>{value}</strong></div>;
}

export function StatsScreen({ stats, leaderboard, onBack }: Props) {
  return (
    <div className="screen">
      <div className="screen-header"><div><span className="section-kicker">TELEMETRY</span><h2>Run Stats</h2></div></div>
      <div className="stats-columns">
        <div className="stats-block">
          <Row label="Total deliveries" value={stats.totalDeliveries} /><Row label="Failed deliveries" value={stats.totalFailedDeliveries} />
          <Row label="Total distance" value={`${Math.round(stats.totalDistanceMeters)} m`} /><Row label="Best score" value={stats.bestScore.toLocaleString()} />
          <Row label="Best combo" value={`x${stats.bestCombo}`} /><Row label="Total money earned" value={`$${stats.totalMoney}`} />
          <Row label="Highest speed" value={`${stats.topSpeedKph} km/h`} /><Row label="Near misses" value={stats.nearMisses} />
          <Row label="Police escapes" value={stats.policeEscapes} /><Row label="Hazards avoided" value={stats.hazardsAvoided} />
          <Row label="Total play time" value={`${Math.round(stats.totalPlayTimeSeconds / 60)} min`} /><Row label="Longest run" value={`${stats.longestRunSeconds} s`} /><Row label="Runs played" value={stats.runsPlayed} />
        </div>
        <div className="stats-block">
          <h3>Achievements</h3>
          <ul className="achievement-list">
            {ACHIEVEMENTS.map((a) => {
              const unlocked = stats.unlockedAchievements.includes(a.id);
              return <li key={a.id} className={unlocked ? 'achievement-item' : 'achievement-item achievement-item--locked'}>
                <span className="achievement-item-icon">{unlocked ? a.icon : 'LOCK'}</span>
                <span><div className="achievement-item-title">{a.title}</div><div className="achievement-item-desc">{a.description}</div></span>
              </li>;
            })}
          </ul>
        </div>
        <div className="stats-block">
          <h3>Local Leaderboard</h3>
          {leaderboard.length === 0 ? <p className="muted">No runs saved yet. Set a high score to appear here.</p> : (
            <table className="leaderboard-table"><thead><tr><th>#</th><th>Name</th><th>Score</th><th>Drop</th><th>Date</th></tr></thead>
              <tbody>{leaderboard.map((entry, i) => <tr key={`${entry.name}-${entry.date}-${i}`}><td>{i + 1}</td><td>{entry.name}</td><td>{entry.score.toLocaleString()}</td><td>{entry.deliveries}</td><td>{entry.date}</td></tr>)}</tbody>
            </table>
          )}
        </div>
      </div>
      <button className="btn back-btn" onClick={onBack}>Back</button>
    </div>
  );
}
