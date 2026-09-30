export interface DifficultyTier {
  label: 'EASY' | 'NORMAL' | 'FAST' | 'HARD' | 'CHAOS' | 'LEGENDARY';
  minDistance: number;
  spawnIntervalMs: number; // vehicle spawn interval
  vehicleSpeedMin: number; // m/s
  vehicleSpeedMax: number;
  hazardChancePerSpawn: number; // 0..1
  policeChance: number; // per event-director roll
  weatherChance: number; // per weather roll
  eventIntervalMs: [number, number]; // [min,max] cooldown between director events
}

// Matches the spec's distance bands (interpreted in meters traveled).
const TIERS: DifficultyTier[] = [
  { label: 'EASY', minDistance: 0, spawnIntervalMs: 2200, vehicleSpeedMin: 8, vehicleSpeedMax: 14, hazardChancePerSpawn: 0.08, policeChance: 0.05, weatherChance: 0.05, eventIntervalMs: [14000, 22000] },
  { label: 'NORMAL', minDistance: 1000, spawnIntervalMs: 1800, vehicleSpeedMin: 10, vehicleSpeedMax: 18, hazardChancePerSpawn: 0.12, policeChance: 0.09, weatherChance: 0.09, eventIntervalMs: [12000, 19000] },
  { label: 'FAST', minDistance: 3000, spawnIntervalMs: 1450, vehicleSpeedMin: 13, vehicleSpeedMax: 22, hazardChancePerSpawn: 0.16, policeChance: 0.13, weatherChance: 0.12, eventIntervalMs: [10000, 16000] },
  { label: 'HARD', minDistance: 6000, spawnIntervalMs: 1150, vehicleSpeedMin: 16, vehicleSpeedMax: 26, hazardChancePerSpawn: 0.2, policeChance: 0.17, weatherChance: 0.15, eventIntervalMs: [8000, 13000] },
  { label: 'CHAOS', minDistance: 10000, spawnIntervalMs: 900, vehicleSpeedMin: 19, vehicleSpeedMax: 30, hazardChancePerSpawn: 0.25, policeChance: 0.22, weatherChance: 0.18, eventIntervalMs: [6500, 11000] },
  { label: 'LEGENDARY', minDistance: 20000, spawnIntervalMs: 700, vehicleSpeedMin: 22, vehicleSpeedMax: 34, hazardChancePerSpawn: 0.3, policeChance: 0.28, weatherChance: 0.22, eventIntervalMs: [5000, 9000] },
];

export function getDifficulty(distanceMeters: number): DifficultyTier {
  let current = TIERS[0];
  for (const tier of TIERS) {
    if (distanceMeters >= tier.minDistance) current = tier;
  }
  return current;
}
