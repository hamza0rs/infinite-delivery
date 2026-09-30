import type { Settings } from '../types/game';

interface Props {
  settings: Settings;
  onChange: (partial: Partial<Settings>) => void;
  onBack: () => void;
}

export function SettingsScreen({ settings, onChange, onBack }: Props) {
  return (
    <div className="screen">
      <div className="screen-header"><div><span className="section-kicker">SYSTEM CONFIG</span><h2>Settings</h2></div></div>

      <div className="settings-list">
        <label className="settings-row">
          <span>Sound Effects</span>
          <input
            type="checkbox"
            checked={settings.soundEffects}
            onChange={(e) => onChange({ soundEffects: e.target.checked })}
          />
        </label>
        <label className="settings-row">
          <span>Screen Shake</span>
          <input
            type="checkbox"
            checked={settings.screenShake}
            onChange={(e) => onChange({ screenShake: e.target.checked })}
          />
        </label>
        <label className="settings-row">
          <span>Particles</span>
          <input
            type="checkbox"
            checked={settings.particles}
            onChange={(e) => onChange({ particles: e.target.checked })}
          />
        </label>
        <label className="settings-row">
          <span>Reduced Motion</span>
          <input
            type="checkbox"
            checked={settings.reducedMotion}
            onChange={(e) => onChange({ reducedMotion: e.target.checked })}
          />
        </label>
        <label className="settings-row">
          <span>Graphics Quality</span>
          <select
            value={settings.graphicsQuality}
            onChange={(e) => onChange({ graphicsQuality: e.target.value as Settings['graphicsQuality'] })}
          >
            <option value="performance">Performance</option>
            <option value="balanced">Balanced</option>
            <option value="high">High Quality</option>
          </select>
        </label>
      </div>

      <p className="muted settings-note">
        There is no music in Infinite Delivery — only short functional sound effects (engine, brakes, sirens,
        chimes), which the Sound Effects toggle controls.
      </p>

      <button className="btn back-btn" onClick={onBack}>
        Back
      </button>
    </div>
  );
}
