import { useEffect, useState } from 'react';
import { useGame } from './hooks/useGame';
import { MainMenu } from './components/MainMenu';
import { GameHUD } from './components/GameHUD';
import { PauseMenu } from './components/PauseMenu';
import { GameOverScreen } from './components/GameOverScreen';
import { Garage } from './components/Garage';
import { StatsScreen } from './components/StatsScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { HowToPlay } from './components/HowToPlay';

function useIsTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)');
    const update = () => setIsTouch(mq.matches || window.innerWidth < 820);
    update();
    mq.addEventListener('change', update);
    window.addEventListener('resize', update);
    return () => {
      mq.removeEventListener('change', update);
      window.removeEventListener('resize', update);
    };
  }, []);
  return isTouch;
}

export default function App() {
  const {
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
    actions,
  } = useGame();
  const isTouch = useIsTouchDevice();

  const showCanvas = uiState === 'playing' || uiState === 'paused' || uiState === 'gameOver';

  return (
    <div className="app-root">
      <div className={`game-canvas-container${showCanvas ? '' : ' game-canvas-container--hidden'}`} ref={containerRef} />

      {uiState === 'menu' && (
        <MainMenu
          bestScore={allTime.bestScore}
          onPlay={actions.playFromMenu}
          onHowToPlay={() => actions.openScreen('howToPlay')}
          onGarage={() => actions.openScreen('garage')}
          onStats={() => actions.openScreen('stats')}
          onSettings={() => actions.openScreen('settings')}
        />
      )}

      {uiState === 'howToPlay' && <HowToPlay onBack={() => actions.openScreen('menu')} />}

      {uiState === 'garage' && (
        <Garage garage={garage} wallet={wallet} onEquip={actions.equipSkin} onBuy={actions.buySkin} onBack={() => actions.openScreen('menu')} />
      )}

      {uiState === 'stats' && (
        <StatsScreen stats={allTime} leaderboard={leaderboard} onBack={() => actions.openScreen('menu')} />
      )}

      {uiState === 'settings' && (
        <SettingsScreen settings={settings} onChange={actions.updateSettings} onBack={() => actions.openScreen('menu')} />
      )}

      {(uiState === 'playing' || uiState === 'paused') && (
        <GameHUD
          hud={hud}
          delivery={delivery}
          banners={banners}
          achievementToast={achievementToast}
          isTouch={isTouch && uiState === 'playing'}
          onPause={actions.pauseGame}
        />
      )}

      {uiState === 'paused' && (
        <PauseMenu onResume={actions.resumeGame} onRestart={actions.restartRun} onMainMenu={actions.returnToMenu} />
      )}

      {uiState === 'gameOver' && (
        <GameOverScreen
          run={lastRun}
          bestScore={allTime.bestScore}
          isNewHighScore={isNewHighScore}
          onPlayAgain={actions.restartRun}
          onGarage={() => actions.openScreen('garage')}
          onMainMenu={actions.returnToMenu}
          onSubmitScore={actions.submitScore}
        />
      )}
    </div>
  );
}
