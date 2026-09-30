import type { AllTimeStats, GarageState, LeaderboardEntry, Settings } from '../types/game';

// Versioned keys so future format changes never crash on old saved data.
const KEYS = {
  stats: 'id_delivery_stats_v1',
  settings: 'id_delivery_settings_v1',
  garage: 'id_delivery_garage_v1',
  leaderboard: 'id_delivery_leaderboard_v1',
} as const;

function safeGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return fallback;
    return { ...fallback, ...parsed };
  } catch {
    // Corrupt data must never crash the game.
    return fallback;
  }
}

function safeSet(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or unavailable (private mode, etc.) - fail silently.
  }
}

export const DEFAULT_SETTINGS: Settings = {
  soundEffects: true,
  screenShake: true,
  particles: true,
  reducedMotion: false,
  graphicsQuality: 'balanced',
};

export const DEFAULT_STATS: AllTimeStats = {
  totalDeliveries: 0,
  totalFailedDeliveries: 0,
  totalDistanceMeters: 0,
  bestScore: 0,
  bestCombo: 0,
  totalMoney: 0,
  topSpeedKph: 0,
  carsAvoided: 0,
  nearMisses: 0,
  policeEscapes: 0,
  hazardsAvoided: 0,
  totalPlayTimeSeconds: 0,
  longestRunSeconds: 0,
  runsPlayed: 0,
  unlockedAchievements: [],
};

export const DEFAULT_GARAGE: GarageState = {
  unlockedSkinIds: ['classic'],
  equippedSkinId: 'classic',
};

export const storage = {
  loadSettings: (): Settings => safeGet(KEYS.settings, DEFAULT_SETTINGS),
  saveSettings: (s: Settings): void => safeSet(KEYS.settings, s),

  loadStats: (): AllTimeStats => safeGet(KEYS.stats, DEFAULT_STATS),
  saveStats: (s: AllTimeStats): void => safeSet(KEYS.stats, s),

  loadGarage: (): GarageState => safeGet(KEYS.garage, DEFAULT_GARAGE),
  saveGarage: (g: GarageState): void => safeSet(KEYS.garage, g),

  loadLeaderboard: (): LeaderboardEntry[] => {
    try {
      const raw = localStorage.getItem(KEYS.leaderboard);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },
  saveLeaderboard: (entries: LeaderboardEntry[]): void => {
    const sorted = [...entries].sort((a, b) => b.score - a.score).slice(0, 20);
    safeSet(KEYS.leaderboard, sorted);
  },
};
