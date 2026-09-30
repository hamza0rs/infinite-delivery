import type { ScooterSkin } from '../types/game';

// All customization targets the machine only (body/trail color) - no rider, no clothing.
export const SCOOTER_SKINS: ScooterSkin[] = [
  { id: 'classic', name: 'Classic Scooter', bodyColor: 0xe8442f, trailColor: 0xffb199, cost: 0 },
  { id: 'delivery-pro', name: 'Delivery Pro', bodyColor: 0x2f6fe8, trailColor: 0x9ec4ff, cost: 500 },
  { id: 'neon', name: 'Neon Scooter', bodyColor: 0x39ff88, trailColor: 0xaaffd0, cost: 1200 },
  { id: 'cyber', name: 'Cyber Scooter', bodyColor: 0x8a2fe8, trailColor: 0xd6b3ff, cost: 2000 },
  { id: 'pizza', name: 'Pizza Scooter', bodyColor: 0xf2c14e, trailColor: 0xffe6a3, cost: 1500 },
  { id: 'golden', name: 'Golden Scooter', bodyColor: 0xffd700, trailColor: 0xfff2b3, cost: 5000 },
  { id: 'retro', name: 'Retro Scooter', bodyColor: 0xff7f50, trailColor: 0xffd0bd, cost: 900 },
  { id: 'storm', name: 'Storm Scooter', bodyColor: 0x4a5568, trailColor: 0xb8c2cf, cost: 2500 },
];

export function getSkin(id: string): ScooterSkin {
  return SCOOTER_SKINS.find((s) => s.id === id) ?? SCOOTER_SKINS[0];
}
