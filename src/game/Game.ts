import Phaser from 'phaser';
import { GameScene } from './GameScene';
import type { Settings } from '../types/game';

export interface GameHandle {
  game: Phaser.Game;
  destroy: () => void;
}

/**
 * Creates the single Phaser.Game instance for the app. The scale mode is RESIZE:
 * the game's logical coordinate space always matches the container's CSS pixel
 * size, so GameScene's road/lane/hitbox math stays correct at any viewport size
 * (desktop, tablet, phone, ultrawide). WebGL antialiasing keeps the vector-drawn
 * city crisp without a separate low-res-then-stretch step.
 */
export function createGame(parent: HTMLDivElement, initData: { settings: Settings; skinId: string }): GameHandle {
  const width = Math.max(320, parent.clientWidth);
  const height = Math.max(400, parent.clientHeight);

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width,
    height,
    backgroundColor: '#3a3f47',
    banner: false,
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width,
      height,
    },
    render: {
      antialias: true,
      roundPixels: false,
      powerPreference: 'high-performance',
    },
    scene: [GameScene],
  });

  game.scene.start('GameScene', initData);

  const resizeObserver = new ResizeObserver(() => {
    const w = Math.max(320, parent.clientWidth);
    const h = Math.max(400, parent.clientHeight);
    game.scale.resize(w, h);
  });
  resizeObserver.observe(parent);

  return {
    game,
    destroy: () => {
      resizeObserver.disconnect();
      game.destroy(true);
    },
  };
}
