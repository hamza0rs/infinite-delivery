import { useCallback, useEffect, useRef, useState } from 'react';
import { createGame, type GameHandle } from '../game/Game';
import { eventBus, EVENTS } from '../game/EventBus';
import { soundEffects } from '../game/SoundEffects';
import { getSkin } from '../game/GarageData';
import { evaluateNewAchievements, type AchievementDef } from '../game/Achievements';
import { storage, DEFAULT_SETTINGS, DEFAULT_STATS, DEFAULT_GARAGE } from '../services/storage';
import type { AllTimeStats, GameState, GarageState, LeaderboardEntry, RunStats, Settings } from '../types/game';

export interface HudSnapshot {
  money: number;
  score: number;
  combo: number;
  health: number;
  distance: number;
  speedKph: number;
  weather: 'clear' | 'rain' | 'storm';
}

export interface DeliverySnapshot {
  icon: string;
  distance: number;
  timeRemaining: number;
}

export interface BannerItem {
  id: string;
  message: string;
  icon: string;
  durationMs: number;
}

function secondsSince(ts: number): number {
  return Math.max(0, Math.round((Date.now() - ts) / 1000));
}

export function useGame() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameHandleRef = useRef<GameHandle | null>(null);

  const [uiState, setUiState] = useState<GameState>('menu');
  const [sessionActive, setSessionActive] = useState(false);

  const [settings, setSettings] = useState<Settings>(() => storage.loadSettings() ?? DEFAULT_SETTINGS);
  const [allTime, setAllTime] = useState<AllTimeStats>(() => storage.loadStats() ?? DEFAULT_STATS);
  const [garage, setGarage] = useState<GarageState>(() => storage.loadGarage() ?? DEFAULT_GARAGE);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(() => storage.loadLeaderboard());

  const [hud, setHud] = useState<HudSnapshot | null>(null);
  const [delivery, setDelivery] = useState<DeliverySnapshot | null>(null);
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [achievementToast, setAchievementToast] = useState<AchievementDef | null>(null);
  const [lastRun, setLastRun] = useState<RunStats | null>(null);
  const [isNewHighScore, setIsNewHighScore] = useState(false);
  const allTimeRef = useRef(allTime);
  useEffect(() => {
    allTimeRef.current = allTime;
  }, [allTime]);

  const wallet = allTime.totalMoney - garage.unlockedSkinIds.reduce((sum, id) => sum + getSkin(id).cost, 0);

  // ---- event bus wiring (once) ----------------------------------------
  useEffect(() => {
    const offHud = eventBus.on(EVENTS.HUD_UPDATE, (p) => setHud(p as HudSnapshot));
    const offDelivery = eventBus.on(EVENTS.DELIVERY_UPDATE, (p) => setDelivery(p as DeliverySnapshot));
    const offBanner = eventBus.on(EVENTS.BANNER, (p) => {
      const b = p as BannerItem;
      setBanners((prev) => [...prev.slice(-3), b]);
      window.setTimeout(() => setBanners((prev) => prev.filter((x) => x.id !== b.id)), b.durationMs);
    });
    const offAchievement = eventBus.on(EVENTS.ACHIEVEMENT, (p) => {
      const a = p as AchievementDef;
      setAchievementToast(a);
      window.setTimeout(() => setAchievementToast((cur) => (cur?.id === a.id ? null : cur)), 3400);
    });
    // GameScene emits REQUEST_PAUSE itself when Escape is pressed in-scene; keep the
    // overlay in sync however the pause was triggered (on-screen button or keyboard).
    const offPauseReq = eventBus.on(EVENTS.REQUEST_PAUSE, () => setUiState('paused'));
    const offResumeReq = eventBus.on(EVENTS.REQUEST_RESUME, () => setUiState('playing'));
    const offGameOver = eventBus.on(EVENTS.GAME_OVER, (p) => {
      const run = p as RunStats;
      setLastRun(run);
      setIsNewHighScore(Math.round(run.score) > allTimeRef.current.bestScore && run.score > 0);

      setAllTime((prevAll) => {
        const merged: AllTimeStats = {
          totalDeliveries: prevAll.totalDeliveries + run.deliveries,
          totalFailedDeliveries: prevAll.totalFailedDeliveries + run.failedDeliveries,
          totalDistanceMeters: prevAll.totalDistanceMeters + run.distanceMeters,
          bestScore: Math.max(prevAll.bestScore, Math.round(run.score)),
          bestCombo: Math.max(prevAll.bestCombo, run.bestCombo),
          totalMoney: prevAll.totalMoney + run.money,
          topSpeedKph: Math.max(prevAll.topSpeedKph, Math.round(run.topSpeedKph)),
          carsAvoided: prevAll.carsAvoided + Math.round(run.distanceMeters / 40),
          nearMisses: prevAll.nearMisses + run.nearMisses,
          policeEscapes: prevAll.policeEscapes + run.policeEscapes,
          hazardsAvoided: prevAll.hazardsAvoided + run.hazardsAvoided,
          totalPlayTimeSeconds: prevAll.totalPlayTimeSeconds + secondsSince(run.startedAt),
          longestRunSeconds: Math.max(prevAll.longestRunSeconds, secondsSince(run.startedAt)),
          runsPlayed: prevAll.runsPlayed + 1,
          unlockedAchievements: prevAll.unlockedAchievements,
        };
        const newly = evaluateNewAchievements(run, merged);
        if (newly.length) {
          merged.unlockedAchievements = [...merged.unlockedAchievements, ...newly.map((a) => a.id)];
          newly.forEach((a, i) => {
            window.setTimeout(() => {
              eventBus.emit(EVENTS.ACHIEVEMENT, a);
              soundEffects.achievement();
            }, i * 1700);
          });
        }
        storage.saveStats(merged);
        return merged;
      });

      setUiState('gameOver');
    });

    return () => {
      offHud();
      offDelivery();
      offBanner();
      offAchievement();
      offPauseReq();
      offResumeReq();
      offGameOver();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Phaser lifecycle --------------------------------------------------
  useEffect(() => {
    if (sessionActive && containerRef.current && !gameHandleRef.current) {
      gameHandleRef.current = createGame(containerRef.current, {
        settings,
        skinId: garage.equippedSkinId,
      });
    }
    if (!sessionActive && gameHandleRef.current) {
      gameHandleRef.current.destroy();
      gameHandleRef.current = null;
    }
    // settings/garage intentionally excluded: a running game keeps its own settings copy,
    // updated live via EVENTS.SETTINGS_CHANGED instead of remounting the whole game.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionActive]);

  useEffect(
    () => () => {
      gameHandleRef.current?.destroy();
      gameHandleRef.current = null;
    },
    [],
  );

  // ---- actions ------------------------------------------------------------
  const playFromMenu = useCallback(() => {
    soundEffects.uiClick();
    setHud(null);
    setDelivery(null);
    setBanners([]);
    setSessionActive(true);
    setUiState('playing');
  }, []);

  const restartRun = useCallback(() => {
    soundEffects.uiClick();
    setHud(null);
    setDelivery(null);
    setBanners([]);
    gameHandleRef.current?.game.scene.start('GameScene', { settings, skinId: garage.equippedSkinId });
    setUiState('playing');
  }, [settings, garage.equippedSkinId]);

  const pauseGame = useCallback(() => {
    soundEffects.uiClick();
    eventBus.emit(EVENTS.REQUEST_PAUSE);
  }, []);

  const resumeGame = useCallback(() => {
    soundEffects.uiClick();
    eventBus.emit(EVENTS.REQUEST_RESUME);
  }, []);

  // Escape toggles pause/resume at the React layer too, so it also works to *resume*
  // (GameScene's own update loop - and therefore its own Escape handling - is halted
  // while paused, so only this outer listener can bring the game back).
  useEffect(() => {
    if (!sessionActive) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (uiState === 'playing') pauseGame();
      else if (uiState === 'paused') resumeGame();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sessionActive, uiState, pauseGame, resumeGame]);

  const returnToMenu = useCallback(() => {
    soundEffects.uiClick();
    setSessionActive(false);
    setUiState('menu');
  }, []);

  const openScreen = useCallback((screen: GameState) => {
    soundEffects.uiClick();
    setUiState(screen);
  }, []);

  const updateSettings = useCallback((partial: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      storage.saveSettings(next);
      eventBus.emit(EVENTS.SETTINGS_CHANGED, next);
      soundEffects.setEnabled(next.soundEffects);
      return next;
    });
  }, []);

  const equipSkin = useCallback((skinId: string) => {
    setGarage((prev) => {
      if (!prev.unlockedSkinIds.includes(skinId)) return prev;
      const next = { ...prev, equippedSkinId: skinId };
      storage.saveGarage(next);
      return next;
    });
  }, []);

  const buySkin = useCallback(
    (skinId: string) => {
      const skin = getSkin(skinId);
      if (wallet < skin.cost) return false;
      setGarage((prev) => {
        if (prev.unlockedSkinIds.includes(skinId)) return prev;
        const next = { ...prev, unlockedSkinIds: [...prev.unlockedSkinIds, skinId], equippedSkinId: skinId };
        storage.saveGarage(next);
        return next;
      });
      soundEffects.coin();
      return true;
    },
    [wallet],
  );

  const submitScore = useCallback((name: string) => {
    if (!lastRun) return;
    setLeaderboard((prev) => {
      const entry: LeaderboardEntry = {
        name: name.trim().slice(0, 16) || 'RIDER',
        score: Math.round(lastRun.score),
        deliveries: lastRun.deliveries,
        date: new Date().toISOString().slice(0, 10),
      };
      const next = [...prev, entry].sort((a, b) => b.score - a.score).slice(0, 20);
      storage.saveLeaderboard(next);
      return next;
    });
  }, [lastRun]);

  return {
    containerRef,
    uiState,
    hud,
    delivery,
    banners,
    achievementToast,
    settings,
    allTime,
    garage,
    leaderboard,
    lastRun,
    isNewHighScore,
    wallet,
    actions: {
      playFromMenu,
      restartRun,
      pauseGame,
      resumeGame,
      returnToMenu,
      openScreen,
      updateSettings,
      equipSkin,
      buySkin,
      submitScore,
    },
  };
}
