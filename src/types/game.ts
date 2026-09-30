// Core shared types for Infinite Delivery.
// NOTE: no "Pedestrian"/"Dog"/"Human" types exist anywhere in this codebase by design.

export type GameState =
  | 'menu'
  | 'howToPlay'
  | 'garage'
  | 'stats'
  | 'settings'
  | 'playing'
  | 'paused'
  | 'gameOver';

export type VehicleKind = 'car' | 'taxi' | 'truck' | 'van' | 'police';

export type HazardKind = 'construction' | 'hole' | 'barrier';

export type WeatherState = 'clear' | 'rain' | 'storm';

export interface Settings {
  soundEffects: boolean;
  screenShake: boolean;
  particles: boolean;
  reducedMotion: boolean;
  graphicsQuality: 'performance' | 'balanced' | 'high';
}

export interface ScooterSkin {
  id: string;
  name: string;
  bodyColor: number;
  trailColor: number;
  cost: number;
}

export interface GarageState {
  unlockedSkinIds: string[];
  equippedSkinId: string;
}

export interface RunStats {
  score: number;
  money: number;
  deliveries: number;
  failedDeliveries: number;
  distanceMeters: number;
  bestCombo: number;
  currentCombo: number;
  nearMisses: number;
  policeEscapes: number;
  hazardsAvoided: number;
  topSpeedKph: number;
  startedAt: number;
  tookDamage: boolean;
  deliveredInRain: boolean;
  deliveredAtNight: boolean;
}

export interface AllTimeStats {
  totalDeliveries: number;
  totalFailedDeliveries: number;
  totalDistanceMeters: number;
  bestScore: number;
  bestCombo: number;
  totalMoney: number;
  topSpeedKph: number;
  carsAvoided: number;
  nearMisses: number;
  policeEscapes: number;
  hazardsAvoided: number;
  totalPlayTimeSeconds: number;
  longestRunSeconds: number;
  runsPlayed: number;
  unlockedAchievements: string[];
}

export interface LeaderboardEntry {
  name: string;
  score: number;
  deliveries: number;
  date: string;
}

export interface DeliveryOrder {
  id: number;
  targetLane: number;
  targetDistance: number; // world distance (meters) at which the destination sits
  deadlineSeconds: number;
  timeRemaining: number;
  reward: number;
  icon: string;
}

export interface GameEventBanner {
  id: string;
  message: string;
  icon: string;
  durationMs: number;
}
