import { SCOOTER_SKINS } from '../game/GarageData';
import type { GarageState } from '../types/game';

interface Props {
  garage: GarageState;
  wallet: number;
  onEquip: (skinId: string) => void;
  onBuy: (skinId: string) => void;
  onBack: () => void;
}

function toCss(hex: number): string { return `#${hex.toString(16).padStart(6, '0')}`; }

export function Garage({ garage, wallet, onEquip, onBuy, onBack }: Props) {
  return (
    <div className="screen screen--garage">
      <div className="screen-header">
        <div><span className="section-kicker">MACHINE LAB</span><h2>Garage</h2></div>
        <div className="wallet-pill"><span className="hud-symbol">◈</span>{wallet}</div>
      </div>

      <div className="garage-grid">
        {SCOOTER_SKINS.map((skin) => {
          const unlocked = garage.unlockedSkinIds.includes(skin.id);
          const equipped = garage.equippedSkinId === skin.id;
          const affordable = wallet >= skin.cost;
          return (
            <div key={skin.id} className={`garage-card${equipped ? ' garage-card--equipped' : ''}`}>
              <div className="garage-preview" style={{ ['--machine-color' as string]: toCss(skin.bodyColor), ['--machine-trail' as string]: toCss(skin.trailColor) }}>
                <span className="garage-machine__glow" />
                <span className="garage-machine__body" />
                <span className="garage-machine__glass" />
                <span className="garage-machine__wheel garage-machine__wheel--a" />
                <span className="garage-machine__wheel garage-machine__wheel--b" />
              </div>
              <div className="garage-card__meta"><span className="garage-card__code">{skin.id.toUpperCase()}</span><div className="garage-name">{skin.name}</div></div>
              {unlocked ? (
                <button className={`btn ${equipped ? 'btn--disabled' : 'btn--primary'}`} disabled={equipped} onClick={() => onEquip(skin.id)}>{equipped ? 'EQUIPPED' : 'EQUIP'}</button>
              ) : (
                <button className="btn" disabled={!affordable} onClick={() => onBuy(skin.id)}>UNLOCK · {skin.cost}</button>
              )}
            </div>
          );
        })}
      </div>

      <button className="btn back-btn" onClick={onBack}>Back</button>
    </div>
  );
}
