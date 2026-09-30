import type { HudSnapshot, DeliverySnapshot, BannerItem } from '../hooks/useGame';
import type { AchievementDef } from '../game/Achievements';
import { TouchControls } from './TouchControls';

interface Props {
  hud: HudSnapshot | null;
  delivery: DeliverySnapshot | null;
  banners: BannerItem[];
  achievementToast: AchievementDef | null;
  isTouch: boolean;
  onPause: () => void;
}

const WEATHER_LABEL: Record<HudSnapshot['weather'], string> = {
  clear: 'CLEAR',
  rain: 'RAIN',
  storm: 'STORM',
};

export function GameHUD({ hud, delivery, banners, achievementToast, isTouch, onPause }: Props) {
  const health = hud?.health ?? 3;
  const deliveryPct = delivery ? Math.max(0, Math.min(100, (delivery.timeRemaining / 30) * 100)) : 0;

  return (
    <div className="hud">
      <div className="hud-top">
        <div className="hud-brand-mini"><span className="hud-brand-mini__mark">ID</span><span>LIVE RUN</span></div>
        <div className="hud-stat"><span className="hud-symbol">◈</span><span>{hud?.money ?? 0}</span></div>
        <div className="hud-stat"><span className="hud-symbol">◆</span><span>{hud?.score ?? 0}</span></div>
        {hud && hud.combo > 0 && <div className="hud-stat hud-combo"><span className="hud-symbol">×</span><span>{hud.combo} COMBO</span></div>}
        <div className="hud-spacer" />
        <div className="hud-stat hud-speed"><span className="hud-speed__label">SPD</span><span>{hud?.speedKph ?? 0}</span><small>KM/H</small></div>
        <div className="hud-stat hud-weather"><span className="weather-dot" />{hud ? WEATHER_LABEL[hud.weather] : 'CLEAR'}</div>
        <div className="hud-health" aria-label="Health">
          <span className="hud-health__label">CORE</span>
          <span className="hud-health__bar">{Array.from({ length: 3 }).map((_, i) => <i key={i} className={i < health ? 'is-full' : ''} />)}</span>
        </div>
        <button className="hud-pause" onClick={onPause} aria-label="Pause"><span /><span /></button>
      </div>

      <div className="hud-distance"><span className="hud-distance__line" />DIST {hud?.distance ?? 0} M</div>

      {delivery && (
        <div className="delivery-card">
          <div className="delivery-card__top">
            <div>
              <div className="delivery-card__eyebrow">ACTIVE DELIVERY</div>
              <div className="delivery-card__title">DROP GATE <span>{delivery.icon}</span></div>
            </div>
            <strong>{delivery.distance} M</strong>
          </div>
          <div className="delivery-card__bar"><span style={{ width: `${deliveryPct}%` }} /></div>
          <div className="delivery-card__footer"><span>INTERACT AT GATE</span><kbd>E</kbd></div>
        </div>
      )}

      <div className="banner-stack">
        {banners.map((b) => (
          <div key={b.id} className="banner-toast">
            <span className="banner-icon">{b.icon.slice(0, 1)}</span>
            <span>{b.message}</span>
          </div>
        ))}
      </div>

      {achievementToast && (
        <div className="achievement-toast">
          <div className="achievement-icon">{achievementToast.icon}</div>
          <div><div className="achievement-title">SYSTEM MILESTONE</div><div className="achievement-name">{achievementToast.title}</div></div>
        </div>
      )}

      {isTouch && <TouchControls />}
    </div>
  );
}
