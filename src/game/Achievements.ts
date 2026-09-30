import type { AllTimeStats, RunStats } from '../types/game';

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  icon: string;
  /** Evaluated once per completed run against the run's stats and the freshly-updated all-time stats. */
  check: (run: RunStats, allTime: AllTimeStats) => boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first-delivery',
    title: 'First Delivery',
    description: 'Complete your first delivery.',
    icon: 'DROP',
    check: (_run, all) => all.totalDeliveries >= 1,
  },
  {
    id: 'ten-deliveries',
    title: '10 Deliveries',
    description: 'Complete 10 deliveries in total.',
    icon: 'LOAD',
    check: (_run, all) => all.totalDeliveries >= 10,
  },
  {
    id: 'hundred-deliveries',
    title: '100 Deliveries',
    description: 'Complete 100 deliveries in total.',
    icon: '100',
    check: (_run, all) => all.totalDeliveries >= 100,
  },
  {
    id: 'perfect-driver',
    title: 'Perfect Driver',
    description: 'Travel 2,000m in one run without taking damage.',
    icon: 'PURE',
    check: (run) => run.distanceMeters >= 2000 && !run.tookDamage,
  },
  {
    id: 'police-escape',
    title: 'Police Escape',
    description: 'Outrun a police pursuit.',
    icon: 'ESC',
    check: (run) => run.policeEscapes >= 1,
  },
  {
    id: 'rain-master',
    title: 'Rain Master',
    description: 'Complete a delivery during rain or a storm.',
    icon: 'RAIN',
    check: (run) => run.deliveredInRain,
  },
  {
    id: 'night-rider',
    title: 'Night Rider',
    description: 'Complete a delivery at night.',
    icon: 'NIGHT',
    check: (run) => run.deliveredAtNight,
  },
  {
    id: 'speed-demon',
    title: 'Speed Demon',
    description: 'Hit 150 km/h with the boost.',
    icon: 'FAST',
    check: (run) => run.topSpeedKph >= 150,
  },
];

/** Returns the achievements newly unlocked this run (not already in allTime.unlockedAchievements). */
export function evaluateNewAchievements(run: RunStats, allTime: AllTimeStats): AchievementDef[] {
  return ACHIEVEMENTS.filter(
    (a) => !allTime.unlockedAchievements.includes(a.id) && a.check(run, allTime),
  );
}
