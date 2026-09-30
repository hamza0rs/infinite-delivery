import Phaser from 'phaser';

export interface InputState {
  steer: number; // -1 (left) .. 1 (right)
  throttle: number; // -1 (brake/reverse) .. 1 (accelerate)
  boost: boolean;
  interact: boolean; // "deliver" action, edge-triggered
  pause: boolean; // edge-triggered
}

/**
 * Centralizes every input source (keyboard, on-screen touch buttons, virtual joystick)
 * into one InputState so the rest of the game never touches DOM/Phaser input events directly.
 */
export class InputManager {
  scene: Phaser.Scene;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys?: Record<'W' | 'A' | 'S' | 'D' | 'SPACE' | 'E' | 'ESC', Phaser.Input.Keyboard.Key>;

  private touchSteer = 0;
  private touchThrottle = 0;
  private touchBoost = false;
  private touchInteractPressed = false;
  private touchPausePressed = false;

  private interactWasDown = false;
  private pauseWasDown = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    if (scene.input.keyboard) {
      this.cursors = scene.input.keyboard.createCursorKeys();
      this.keys = {
        W: scene.input.keyboard.addKey('W'),
        A: scene.input.keyboard.addKey('A'),
        S: scene.input.keyboard.addKey('S'),
        D: scene.input.keyboard.addKey('D'),
        SPACE: scene.input.keyboard.addKey('SPACE'),
        E: scene.input.keyboard.addKey('E'),
        ESC: scene.input.keyboard.addKey('ESC'),
      };
    }
  }

  /** Called by the React touch-control overlay. */
  setTouchSteer(v: number) {
    this.touchSteer = Phaser.Math.Clamp(v, -1, 1);
  }
  setTouchThrottle(v: number) {
    this.touchThrottle = Phaser.Math.Clamp(v, -1, 1);
  }
  setTouchBoost(v: boolean) {
    this.touchBoost = v;
  }
  triggerTouchInteract() {
    this.touchInteractPressed = true;
  }
  triggerTouchPause() {
    this.touchPausePressed = true;
  }

  read(): InputState {
    let steer = this.touchSteer;
    let throttle = this.touchThrottle;
    let boost = this.touchBoost;

    if (this.cursors && this.keys) {
      if (this.cursors.left.isDown || this.keys.A.isDown) steer = -1;
      else if (this.cursors.right.isDown || this.keys.D.isDown) steer = 1;

      if (this.cursors.up.isDown || this.keys.W.isDown) throttle = 1;
      else if (this.cursors.down.isDown || this.keys.S.isDown) throttle = -1;

      if (this.keys.SPACE.isDown) boost = true;
    }

    const interactDown = (this.keys?.E.isDown ?? false) || this.touchInteractPressed;
    const interactEdge = interactDown && !this.interactWasDown;
    this.interactWasDown = interactDown;
    this.touchInteractPressed = false;

    const pauseDown = (this.keys?.ESC.isDown ?? false) || this.touchPausePressed;
    const pauseEdge = pauseDown && !this.pauseWasDown;
    this.pauseWasDown = pauseDown;
    this.touchPausePressed = false;

    return { steer, throttle, boost, interact: interactEdge, pause: pauseEdge };
  }

  destroy() {
    // Phaser tears down its own keyboard plugin with the scene; nothing extra to unbind here
    // since we never added raw DOM listeners ourselves.
  }
}
