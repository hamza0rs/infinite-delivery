import Phaser from 'phaser';
import { InputManager } from './InputManager';
import { soundEffects } from './SoundEffects';
import { getDifficulty } from './Difficulty';
import { getSkin } from './GarageData';
import { eventBus, EVENTS } from './EventBus';
import type { DeliveryOrder, RunStats, Settings, VehicleKind, HazardKind, WeatherState } from '../types/game';

const PPM = 6; // pixels per meter (world-speed to screen-speed scale)
const LANE_COUNT = 4;
const PLAYER_SCREEN_Y_RATIO = 0.74;
const INVULN_MS = 1100;
const NEAR_MISS_LANE_GAP = 0.75; // lane-widths
const NEAR_MISS_Y_GAP = 46; // px
const DELIVERY_TRIGGER_METERS = 14;

interface Vehicle {
  sprite: Phaser.GameObjects.Image;
  kind: VehicleKind;
  lane: number;
  targetLane: number;
  x: number;
  forwardSpeed: number; // m/s, own independent speed
  state: 'cruise' | 'braking' | 'changeLane' | 'chase';
  laneChangeCooldown: number;
  nearMissCounted: boolean;
  active: boolean;
  chaseTimer: number;
}

interface Hazard {
  sprite: Phaser.GameObjects.Image;
  kind: HazardKind;
  lane: number;
  x: number;
  active: boolean;
}

interface Building {
  sprite: Phaser.GameObjects.Rectangle;
  windows: Phaser.GameObjects.Rectangle[];
}

type NonLivingEvent =
  | 'trafficJam'
  | 'policePursuit'
  | 'construction'
  | 'roadCollapse'
  | 'powerOutage'
  | 'emergencyVehicle'
  | 'highSpeedZone'
  | 'windStorm'
  | 'pizzaUnstable'
  | 'rainStorm';

export class GameScene extends Phaser.Scene {
  private inputManager!: InputManager;
  private settings: Settings;

  // Player state
  private playerX = 0;
  private playerLateralVel = 0;
  private playerSpeed = 0; // m/s
  private maxSpeed = 34;
  private boosting = false;
  private scooterSprite!: Phaser.GameObjects.Image;
  private scooterShadow!: Phaser.GameObjects.Ellipse;
  private playerGlow!: Phaser.GameObjects.Ellipse;
  private trailEmitter?: Phaser.GameObjects.Particles.ParticleEmitter;
  private exhaustEmitter?: Phaser.GameObjects.Particles.ParticleEmitter;
  private invulnUntil = 0;
  private health = 3;
  private windOffset = 0;

  // World
  private roadLeft = 0;
  private roadWidth = 0;
  private laneWidth = 0;
  private worldDistance = 0; // meters traveled, monotonic
  private roadLines: Phaser.GameObjects.Rectangle[] = [];
  private buildings: Building[] = [];
  private nightFactor = 0; // 0 = day, 1 = night, cyclic
  private skyOverlay!: Phaser.GameObjects.Rectangle;
  private fogOverlay!: Phaser.GameObjects.Rectangle;

  // Entities
  private vehiclePool: Vehicle[] = [];
  private activeVehicles: Vehicle[] = [];
  private hazardPool: Hazard[] = [];
  private activeHazards: Hazard[] = [];
  private nextVehicleSpawnAt = 0;
  private policeActive = false;

  // Weather
  private weather: WeatherState = 'clear';
  private weatherUntil = 0;
  private rainEmitter?: Phaser.GameObjects.Particles.ParticleEmitter;
  private windActive = false;
  private windUntil = 0;

  // Delivery
  private currentOrder: DeliveryOrder | null = null;
  private deliveryIdCounter = 0;
  private pizzaUnstableUntil = 0;
  private highSpeedZoneUntil = 0;

  // Events
  private nextEventAt = 0;
  private activeEventLabel = '';

  // Stats/run
  private stats: RunStats = this.freshRunStats();
  private isPaused = false;
  private gameOver = false;

  // Debug
  private debugOn = false;
  private debugText?: Phaser.GameObjects.Text;
  private minimapGfx?: Phaser.GameObjects.Graphics;

  constructor() {
    super('GameScene');
    this.settings = {
      soundEffects: true,
      screenShake: true,
      particles: true,
      reducedMotion: false,
      graphicsQuality: 'balanced',
    };
  }

  private freshRunStats(): RunStats {
    return {
      score: 0,
      money: 0,
      deliveries: 0,
      failedDeliveries: 0,
      distanceMeters: 0,
      bestCombo: 0,
      currentCombo: 0,
      nearMisses: 0,
      policeEscapes: 0,
      hazardsAvoided: 0,
      topSpeedKph: 0,
      startedAt: Date.now(),
      tookDamage: false,
      deliveredInRain: false,
      deliveredAtNight: false,
    };
  }

  init(data: { settings?: Settings; skinId?: string }) {
    if (data.settings) this.settings = data.settings;
    this.gameOver = false;
    this.isPaused = false;
    this.health = 3;
    this.worldDistance = 0;
    this.playerSpeed = 0;
    this.playerX = 0;
    this.stats = this.freshRunStats();
    this.currentOrder = null;
    this.weather = 'clear';
    this.activeEventLabel = '';
    soundEffects.setEnabled(this.settings.soundEffects);
  }

  create(data: { skinId?: string }) {
    this.cameras.main.setBackgroundColor('#07111d');
    this.generateTextures();
    this.computeRoadGeometry();

    this.inputManager = new InputManager(this);

    this.skyOverlay = this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, 0x0a1030, 0)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(5);
    this.fogOverlay = this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 0)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(50);

    this.buildRoadVisuals();
    this.buildPlayer(data.skinId ?? 'classic');

    if (this.settings.particles) {
      this.exhaustEmitter = this.add.particles(0, 0, 'exhaust', {
        speed: { min: 20, max: 50 },
        angle: { min: 80, max: 100 },
        scale: { start: 0.6, end: 0 },
        alpha: { start: 0.5, end: 0 },
        lifespan: 300,
        frequency: 60,
        emitting: false,
      });
      this.exhaustEmitter.setDepth(8);
      this.trailEmitter = this.add.particles(0, 0, 'trail', {
        speed: 0,
        scale: { start: 0.5, end: 0 },
        alpha: { start: 0.35, end: 0 },
        lifespan: 220,
        frequency: 30,
        emitting: false,
      });
      this.trailEmitter.setDepth(7);
    }

    this.debugText = this.add
      .text(8, 8, '', { fontFamily: 'monospace', fontSize: '12px', color: '#00ff88' })
      .setScrollFactor(0)
      .setDepth(200)
      .setVisible(false);
    this.minimapGfx = this.add.graphics().setScrollFactor(0).setDepth(150);

    this.input.keyboard?.on('keydown-F1', () => {
      this.debugOn = !this.debugOn;
      this.debugText?.setVisible(this.debugOn);
    });

    this.scale.on('resize', () => this.computeRoadGeometry());

    this.spawnOrder();
    this.nextEventAt = this.time.now + Phaser.Math.Between(9000, 15000);
    this.nextVehicleSpawnAt = this.time.now + 800;
    this.spawnVehicle(undefined, 0, 14);
    this.spawnVehicle(undefined, 2, 18);
    this.spawnVehicle(undefined, 3, 12);
    this.activeVehicles[0]?.sprite.setY(this.scale.height * 0.42);
    this.activeVehicles[1]?.sprite.setY(this.scale.height * 0.24);
    this.activeVehicles[2]?.sprite.setY(this.scale.height * 0.08);

    soundEffects.startEngineLoop();

    const disposers: Array<() => void> = [
      eventBus.on(EVENTS.REQUEST_PAUSE, this.pauseGame),
      eventBus.on(EVENTS.REQUEST_RESUME, this.resumeGame),
      eventBus.on(EVENTS.SETTINGS_CHANGED, (s) => {
        this.settings = s as Settings;
        soundEffects.setEnabled(this.settings.soundEffects);
      }),
      eventBus.on(EVENTS.TOUCH_STEER, (v) => this.inputManager.setTouchSteer(v as number)),
      eventBus.on(EVENTS.TOUCH_THROTTLE, (v) => this.inputManager.setTouchThrottle(v as number)),
      eventBus.on(EVENTS.TOUCH_BOOST, (v) => this.inputManager.setTouchBoost(v as boolean)),
      eventBus.on(EVENTS.TOUCH_INTERACT, () => this.inputManager.triggerTouchInteract()),
    ];

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      soundEffects.stopEngine();
      disposers.forEach((off) => off());
      this.inputManager.destroy();
    });
  }

  private pauseGame = () => {
    this.isPaused = true;
    soundEffects.stopEngine();
  };
  private resumeGame = () => {
    this.isPaused = false;
    soundEffects.startEngineLoop();
  };

  // ---------------------------------------------------------------------
  // Procedural vector textures (no external image/audio assets needed)
  // ---------------------------------------------------------------------
  private generateTextures() {
    const g = this.add.graphics();

    const drawVehicle = (key: string, w: number, h: number, body: number, glass: number, accent: number) => {
      g.clear();
      g.fillStyle(0x03060a, 0.5);
      g.fillEllipse(w * 0.5, h - 2, w * 0.88, Math.max(7, h * 0.16));
      g.fillStyle(body, 1);
      g.fillRoundedRect(w * 0.12, h * 0.07, w * 0.76, h * 0.79, Math.min(9, w * 0.2));
      g.fillStyle(glass, 1);
      g.fillRoundedRect(w * 0.23, h * 0.16, w * 0.54, h * 0.27, 5);
      g.fillStyle(0xffffff, 0.18);
      g.fillRoundedRect(w * 0.29, h * 0.19, w * 0.17, h * 0.18, 3);
      g.fillStyle(0x080a10, 1);
      g.fillCircle(w * 0.21, h * 0.78, Math.max(3, w * 0.08));
      g.fillCircle(w * 0.79, h * 0.78, Math.max(3, w * 0.08));
      g.fillStyle(accent, 1);
      g.fillRoundedRect(w * 0.17, h * 0.71, w * 0.16, Math.max(3, h * 0.07), 2);
      g.fillRoundedRect(w * 0.67, h * 0.71, w * 0.16, Math.max(3, h * 0.07), 2);
      g.lineStyle(1, 0xffffff, 0.18);
      g.strokeRoundedRect(w * 0.12, h * 0.07, w * 0.76, h * 0.79, Math.min(9, w * 0.2));
      g.generateTexture(key, w, h);
    };
    drawVehicle('car-1', 42, 72, 0x356cff, 0x15244f, 0x8fd7ff);
    drawVehicle('car-2', 42, 72, 0xff5b4a, 0x54191a, 0xffb0a5);
    drawVehicle('car-3', 42, 72, 0x8d95a5, 0x303542, 0xdde7ff);
    drawVehicle('taxi', 44, 74, 0xf0bf4e, 0x5a4618, 0xfff1a3);
    drawVehicle('van', 48, 84, 0xd8dde6, 0x485164, 0xffffff);
    drawVehicle('truck', 52, 104, 0x5f6777, 0x252b35, 0xd9e2ef);

    g.clear();
    g.fillStyle(0x061020, 0.35);
    g.fillEllipse(21, 81, 34, 11);
    g.fillStyle(0xff3d4f, 1);
    g.fillRoundedRect(9, 15, 24, 62, 9);
    g.fillStyle(0x101722, 1);
    g.fillRoundedRect(13, 21, 16, 21, 5);
    g.fillStyle(0x8be7ff, 0.9);
    g.fillRect(13, 8, 16, 6);
    g.fillStyle(0xffffff, 0.9);
    g.fillRect(12, 52, 18, 5);
    g.fillStyle(0xff5365, 1);
    g.fillCircle(21, 69, 3);
    g.generateTexture('police', 42, 86);

    for (const skinId of ['classic', 'delivery-pro', 'neon', 'cyber', 'pizza', 'golden', 'retro', 'storm']) {
      const s = getSkin(skinId);
      g.clear();
      g.fillStyle(0x05070b, 0.44);
      g.fillEllipse(24, 70, 30, 10);
      g.fillStyle(s.bodyColor, 1);
      g.fillRoundedRect(11, 19, 26, 46, 10);
      g.fillStyle(0x101722, 1);
      g.fillRoundedRect(16, 23, 16, 20, 6);
      g.fillStyle(0xffffff, 0.9);
      g.fillRoundedRect(18, 10, 12, 13, 5);
      g.fillStyle(0xffffff, 0.9);
      g.fillRect(15, 49, 18, 7);
      g.fillStyle(s.trailColor, 1);
      g.fillRoundedRect(16, 55, 16, 5, 2);
      g.fillStyle(0x0a0d12, 1);
      g.fillCircle(24, 68, 5);
      g.lineStyle(1, 0xffffff, 0.18);
      g.strokeRoundedRect(11, 19, 26, 46, 10);
      g.generateTexture(`scooter-${skinId}`, 48, 78);
    }

    g.clear();
    g.fillStyle(0x2a2a2a, 1);
    g.fillEllipse(14, 8, 26, 14);
    g.fillStyle(0x101010, 1);
    g.fillEllipse(14, 8, 16, 8);
    g.generateTexture('hole', 28, 16);

    g.clear();
    g.fillStyle(0xff8c1a, 1);
    g.fillTriangle(10, 0, 20, 30, 0, 30);
    g.fillStyle(0xffffff, 1);
    g.fillRect(3, 14, 14, 4);
    g.generateTexture('cone', 20, 30);

    g.clear();
    g.fillStyle(0xf2d13a, 1);
    g.fillRect(0, 0, 46, 12);
    g.fillStyle(0x1a1a1a, 1);
    for (let i = 0; i < 5; i++) g.fillRect(i * 10, 0, 5, 12);
    g.generateTexture('barrier', 46, 12);

    g.clear();
    g.fillStyle(0xffffff, 0.8);
    g.fillRect(0, 0, 2, 12);
    g.generateTexture('raindrop', 2, 12);

    g.clear();
    g.fillStyle(0xffe08a, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture('exhaust', 8, 8);

    g.clear();
    g.fillStyle(0xffffff, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture('trail', 8, 8);

    g.destroy();
  }

  // ---------------------------------------------------------------------
  // Road / buildings
  // ---------------------------------------------------------------------
  private computeRoadGeometry() {
    const w = this.scale.width;
    const h = this.scale.height;
    this.roadWidth = Math.min(w * 0.86, 620);
    this.laneWidth = this.roadWidth / LANE_COUNT;
    this.roadLeft = (w - this.roadWidth) / 2;

    this.skyOverlay?.setSize(w, h);
    this.fogOverlay?.setSize(w, h);
    if (this.roadWidth > 0) {
      this.playerX = Phaser.Math.Clamp(this.playerX || this.laneCenterX((LANE_COUNT - 1) / 2), this.roadLeft + 20, this.roadLeft + this.roadWidth - 20);
    }
  }

  private laneCenterX(lane: number): number {
    return this.roadLeft + this.laneWidth * (lane + 0.5);
  }

  private buildRoadVisuals() {
    this.add.rectangle(this.roadLeft, 0, this.roadWidth, 4000, 0x33363d).setOrigin(0, 0).setDepth(0);

    for (let lane = 1; lane < LANE_COUNT; lane++) {
      const x = this.roadLeft + this.laneWidth * lane;
      for (let i = 0; i < 24; i++) {
        const dash = this.add.rectangle(x, i * 60, 4, 30, 0xe8e8e8, 0.6).setDepth(1);
        this.roadLines.push(dash);
      }
    }

    // Simple scrolling buildings on both flanks (a deliberately simplified
    // stand-in for a full 3D city grid - see README for the full scope note).
    // Building count and window detail scale down under Performance quality.
    const buildingsPerSide = this.settings.graphicsQuality === 'performance' ? 6 : this.settings.graphicsQuality === 'high' ? 14 : 10;
    const drawWindows = this.settings.graphicsQuality !== 'performance';
    const palette = [0x54607a, 0x4a5568, 0x60544a, 0x445544, 0x5a4a60];
    (['left', 'right'] as const).forEach((side) => {
      for (let i = 0; i < buildingsPerSide; i++) {
        const color = Phaser.Utils.Array.GetRandom(palette);
        const bw = Phaser.Math.Between(60, 140);
        const bh = Phaser.Math.Between(120, 260);
        const spacing = 3000 / buildingsPerSide;
        const x =
          side === 'left'
            ? Phaser.Math.Between(10, Math.max(10, this.roadLeft - bw - 10))
            : this.roadLeft + this.roadWidth + Phaser.Math.Between(10, 200);
        const rect = this.add.rectangle(x, i * spacing, bw, bh, color).setOrigin(0, 0).setDepth(0);
        const windows: Phaser.GameObjects.Rectangle[] = [];
        if (drawWindows) {
          const cols = Math.max(1, Math.floor(bw / 20));
          const rows = Math.max(1, Math.floor(bh / 24));
          for (let cx = 0; cx < cols; cx++) {
            for (let cy = 0; cy < rows; cy++) {
              const lit = Math.random() < 0.3;
              const win = this.add
                .rectangle(x + 6 + cx * 20, i * spacing + 8 + cy * 24, 10, 14, lit ? 0xffe58a : 0x2b2f38)
                .setOrigin(0, 0)
                .setDepth(0);
              windows.push(win);
            }
          }
        }
        this.buildings.push({ sprite: rect, windows });
      }
    });
  }

  private buildPlayer(skinId: string) {
    this.playerX = this.laneCenterX((LANE_COUNT - 1) / 2);
    const screenY = this.scale.height * PLAYER_SCREEN_Y_RATIO;
    this.playerGlow = this.add.ellipse(this.playerX, screenY + 8, 58, 18, 0x62dcff, 0.08).setDepth(6);
    this.scooterShadow = this.add.ellipse(this.playerX, screenY + 17, 38, 11, 0x020308, 0.55).setDepth(9);
    this.scooterSprite = this.add.image(this.playerX, screenY, `scooter-${skinId}`).setOrigin(0.5, 0.84).setDepth(10).setScale(1.06);
  }

  // ---------------------------------------------------------------------
  // Pooling helpers
  // ---------------------------------------------------------------------
  private textureForVehicle(kind: VehicleKind): string {
    if (kind === 'police') return 'police';
    if (kind === 'taxi') return 'taxi';
    if (kind === 'van') return 'van';
    if (kind === 'truck') return 'truck';
    return Phaser.Utils.Array.GetRandom(['car-1', 'car-2', 'car-3']);
  }

  private acquireVehicle(kind: VehicleKind): Vehicle {
    let v = this.vehiclePool.pop();
    const texture = this.textureForVehicle(kind);
    if (!v) {
      const sprite = this.add.image(0, 0, texture).setDepth(6);
      v = {
        sprite,
        kind,
        lane: 0,
        targetLane: 0,
        x: 0,
        forwardSpeed: 10,
        state: 'cruise',
        laneChangeCooldown: 0,
        nearMissCounted: false,
        active: false,
        chaseTimer: 0,
      };
    } else {
      v.sprite.setTexture(texture);
      v.sprite.setActive(true).setVisible(true);
      v.kind = kind;
    }
    this.activeVehicles.push(v);
    v.active = true;
    return v;
  }

  private releaseVehicle(v: Vehicle) {
    v.active = false;
    v.sprite.setVisible(false).setActive(false);
    this.activeVehicles = this.activeVehicles.filter((a) => a !== v);
    this.vehiclePool.push(v);
  }

  private acquireHazard(kind: HazardKind): Hazard {
    let h = this.hazardPool.pop();
    const texture = kind === 'hole' ? 'hole' : kind === 'construction' ? 'cone' : 'barrier';
    if (!h) {
      const sprite = this.add.image(0, 0, texture).setDepth(4);
      h = { sprite, kind, lane: 0, x: 0, active: false };
    } else {
      h.sprite.setTexture(texture);
      h.sprite.setActive(true).setVisible(true);
      h.kind = kind;
    }
    this.activeHazards.push(h);
    h.active = true;
    return h;
  }

  private releaseHazard(h: Hazard) {
    h.active = false;
    h.sprite.setVisible(false).setActive(false);
    this.activeHazards = this.activeHazards.filter((a) => a !== h);
    this.hazardPool.push(h);
  }

  // ---------------------------------------------------------------------
  // Spawning
  // ---------------------------------------------------------------------
  private spawnVehicle(kindOverride?: VehicleKind, laneOverride?: number, speedOverride?: number) {
    const diff = getDifficulty(this.worldDistance);
    const kind = kindOverride ?? (Phaser.Utils.Array.GetRandom(['car', 'car', 'car', 'taxi', 'van', 'truck']) as VehicleKind);
    const lane = laneOverride ?? Phaser.Math.Between(0, LANE_COUNT - 1);

    const tooClose = this.activeVehicles.some((v) => v.lane === lane && v.sprite.y < 220);
    if (tooClose && kindOverride === undefined) return;

    const v = this.acquireVehicle(kind);
    v.lane = lane;
    v.targetLane = lane;
    v.x = this.laneCenterX(lane);
    v.forwardSpeed = speedOverride ?? Phaser.Math.FloatBetween(diff.vehicleSpeedMin, diff.vehicleSpeedMax);
    v.state = 'cruise';
    v.laneChangeCooldown = Phaser.Math.Between(3000, 7000);
    v.nearMissCounted = false;
    v.chaseTimer = 0;
    v.sprite.setPosition(v.x, -80);
    v.sprite.setTint(0xffffff);
  }

  private spawnHazard(kind: HazardKind, laneOverride?: number) {
    const lane = laneOverride ?? Phaser.Math.Between(0, LANE_COUNT - 1);
    const h = this.acquireHazard(kind);
    h.lane = lane;
    h.x = this.laneCenterX(lane);
    h.sprite.setPosition(h.x, -60);
  }

  private spawnOrder() {
    const diff = getDifficulty(this.worldDistance);
    const distanceAhead = Phaser.Math.Between(180, 320);
    const targetDistance = this.worldDistance + distanceAhead;
    const travelSeconds = distanceAhead / Math.max(this.playerSpeed, 12);
    const deadline = Math.max(18, travelSeconds * 1.8);
    this.currentOrder = {
      id: this.deliveryIdCounter++,
      targetLane: Phaser.Math.Between(0, LANE_COUNT - 1),
      targetDistance,
      deadlineSeconds: deadline,
      timeRemaining: deadline,
      reward: Phaser.Math.Between(60, 140) + Math.floor(diff.minDistance / 200),
      icon: Phaser.Utils.Array.GetRandom(['A', 'B', 'C', 'D', 'E', 'F']),
    };
    soundEffects.pizzaPickup();
  }

  // ---------------------------------------------------------------------
  // Non-living event director
  // ---------------------------------------------------------------------
  private triggerRandomEvent() {
    const diff = getDifficulty(this.worldDistance);
    const pool: NonLivingEvent[] = ['trafficJam', 'construction', 'roadCollapse', 'highSpeedZone', 'windStorm', 'pizzaUnstable'];
    if (!this.policeActive && Math.random() < diff.policeChance) pool.push('policePursuit', 'policePursuit');
    if (this.weather === 'clear' && Math.random() < diff.weatherChance) pool.push('rainStorm', 'rainStorm');
    pool.push('emergencyVehicle', 'powerOutage');

    const choice = Phaser.Utils.Array.GetRandom(pool);
    this.applyEvent(choice);
  }

  private banner(message: string, icon: string, durationMs = 2600) {
    eventBus.emit(EVENTS.BANNER, { id: `${Date.now()}-${Math.random()}`, message, icon, durationMs });
  }

  private applyEvent(evt: NonLivingEvent) {
    this.activeEventLabel = evt;
    switch (evt) {
      case 'trafficJam': {
        this.banner('TRAFFIC JAM AHEAD!', 'TRAFFIC');
        const blockedLanes = Phaser.Utils.Array.Shuffle([...Array(LANE_COUNT).keys()]).slice(0, LANE_COUNT - 1);
        blockedLanes.forEach((lane, i) => this.time.delayedCall(i * 180, () => this.spawnVehicle(undefined, lane, 6)));
        break;
      }
      case 'policePursuit': {
        this.banner('POLICE CAR DETECTED!', 'LAW');
        this.policeActive = true;
        soundEffects.policeSiren();
        const lane = Phaser.Math.Clamp(Math.round((this.playerX - this.roadLeft) / this.laneWidth), 0, LANE_COUNT - 1);
        this.spawnVehicle('police', lane, this.playerSpeed * 0.7);
        const police = this.activeVehicles[this.activeVehicles.length - 1];
        police.state = 'chase';
        police.sprite.setPosition(police.x, -40);
        break;
      }
      case 'construction': {
        this.banner('CONSTRUCTION ZONE!', 'WORK');
        const lane = Phaser.Math.Between(0, LANE_COUNT - 1);
        this.spawnHazard('construction', lane);
        this.spawnHazard('barrier', lane);
        break;
      }
      case 'roadCollapse': {
        this.banner('ROAD COLLAPSE!', 'ROAD');
        const lanes = Phaser.Utils.Array.Shuffle([...Array(LANE_COUNT).keys()]).slice(0, 2);
        lanes.forEach((lane, i) => this.time.delayedCall(i * 250, () => this.spawnHazard('hole', lane)));
        break;
      }
      case 'powerOutage': {
        this.banner('POWER OUTAGE!', 'POWER');
        this.tweens.add({ targets: this.fogOverlay, alpha: 0.55, duration: 800 });
        this.time.delayedCall(7000, () => this.tweens.add({ targets: this.fogOverlay, alpha: 0, duration: 1200 }));
        break;
      }
      case 'emergencyVehicle': {
        this.banner('EMERGENCY VEHICLE APPROACHING!', 'ALERT');
        soundEffects.policeSiren();
        this.spawnVehicle('police', Phaser.Math.Between(0, LANE_COUNT - 1), this.maxSpeed + 12);
        break;
      }
      case 'highSpeedZone': {
        this.banner('HIGH-SPEED ZONE!', 'SPEED');
        this.highSpeedZoneUntil = this.time.now + 9000;
        break;
      }
      case 'windStorm': {
        this.banner('WIND STORM!', 'WIND');
        this.windActive = true;
        this.windUntil = this.time.now + 8000;
        break;
      }
      case 'pizzaUnstable': {
        this.banner('DELIVERY BOX UNSTABLE!', 'LOAD');
        this.pizzaUnstableUntil = this.time.now + 7000;
        break;
      }
      case 'rainStorm': {
        const heavy = Math.random() < 0.4;
        this.setWeather(heavy ? 'storm' : 'rain', Phaser.Math.Between(14000, 24000));
        this.banner(heavy ? 'STORM WARNING!' : 'WEATHER ALERT: RAIN!', heavy ? 'STORM' : 'RAIN');
        break;
      }
    }
  }

  private setWeather(state: WeatherState, durationMs: number) {
    this.weather = state;
    this.weatherUntil = this.time.now + durationMs;
    if (this.settings.particles && !this.rainEmitter) {
      const qualityFactor = this.settings.graphicsQuality === 'performance' ? 0.5 : this.settings.graphicsQuality === 'high' ? 1.3 : 1;
      this.rainEmitter = this.add.particles(0, 0, 'raindrop', {
        x: { min: 0, max: this.scale.width },
        y: -10,
        speedY: { min: 500, max: 700 },
        speedX: { min: -30, max: -10 },
        lifespan: 900,
        quantity: Math.max(1, Math.round((state === 'storm' ? 6 : 3) * qualityFactor)),
        frequency: 20,
      });
      this.rainEmitter.setScrollFactor(0).setDepth(45);
    }
    this.rainEmitter?.start();
    soundEffects.rainAmbience();
  }

  private clearWeather() {
    this.weather = 'clear';
    this.rainEmitter?.stop();
  }

  // ---------------------------------------------------------------------
  // Main loop
  // ---------------------------------------------------------------------
  update(time: number, deltaMs: number) {
    if (this.gameOver) return;
    if (this.isPaused) return;
    const dt = Math.min(deltaMs, 50) / 1000; // clamp huge frame gaps (tab-switch) to keep physics stable
    // Read input exactly once per frame so edge-triggered actions like E are
    // not consumed by one subsystem before another subsystem can see them.
    const input = this.inputManager.read();

    this.updatePlayer(dt, time, input);
    this.updateWorldScroll(dt);
    this.updateVehicles(dt);
    this.updateHazards(dt);
    this.updateWeatherAndEvents(time);
    this.updateDelivery(dt, input);
    this.checkCollisions(time);
    this.updateVisualAtmosphere(time);
    this.updateHud();
    this.updateMinimap();
    if (this.debugOn) this.updateDebug();

    this.stats.distanceMeters = this.worldDistance;
    this.stats.topSpeedKph = Math.max(this.stats.topSpeedKph, this.playerSpeed * 3.6);
  }

  private updatePlayer(dt: number, time: number, input: ReturnType<InputManager['read']>) {

    if (input.pause) {
      eventBus.emit(EVENTS.REQUEST_PAUSE);
      return;
    }

    const raining = this.weather !== 'clear';
    const accel = 14;
    const brakeDecel = 26;
    const friction = 6;
    const boostTarget = this.highSpeedZoneUntil > time ? this.maxSpeed + 14 : this.maxSpeed;
    const effectiveMax = input.boost ? boostTarget + 14 : boostTarget;

    this.boosting = input.boost;
    if (input.throttle > 0) {
      this.playerSpeed += accel * (input.boost ? 1.6 : 1) * dt;
      if (this.settings.soundEffects && Math.random() < 0.02) soundEffects.accelerate();
    } else if (input.throttle < 0) {
      this.playerSpeed -= brakeDecel * dt;
      if (this.settings.soundEffects && Math.random() < 0.03) soundEffects.brake();
    } else {
      this.playerSpeed -= friction * dt;
    }
    this.playerSpeed = Phaser.Math.Clamp(this.playerSpeed, 0, effectiveMax);
    soundEffects.updateEngine(this.playerSpeed / effectiveMax);

    const lateralAccel = raining ? 620 : 900;
    const lateralMax = (raining ? 190 : 260) * (this.pizzaUnstableUntil > time ? 0.7 : 1);
    const lateralFriction = raining ? 4 : 6.5;

    if (input.steer !== 0) {
      this.playerLateralVel += input.steer * lateralAccel * dt;
    }
    this.playerLateralVel = Phaser.Math.Clamp(this.playerLateralVel, -lateralMax, lateralMax);
    this.playerLateralVel *= Math.max(0, 1 - lateralFriction * dt);

    if (this.windActive) {
      if (time > this.windUntil) this.windActive = false;
      else this.windOffset = Math.sin(time / 220) * 55;
    } else {
      this.windOffset *= 0.9;
    }

    this.playerX += this.playerLateralVel * dt;
    const minX = this.roadLeft + 16;
    const maxX = this.roadLeft + this.roadWidth - 16;
    if (this.playerX < minX) {
      this.playerX = minX;
      this.playerLateralVel = 0;
    }
    if (this.playerX > maxX) {
      this.playerX = maxX;
      this.playerLateralVel = 0;
    }

    const drawX = this.playerX + this.windOffset;
    const py = this.scale.height * PLAYER_SCREEN_Y_RATIO;
    this.scooterSprite.setPosition(drawX, py);
    this.playerGlow.setPosition(drawX, py + 8);
    this.scooterShadow.setPosition(drawX, py + 17);
    this.scooterSprite.setRotation(Phaser.Math.Clamp(this.playerLateralVel / 900, -0.35, 0.35));
    const speedRatio = Math.min(this.playerSpeed / Math.max(effectiveMax, 1), 1);
    this.scooterSprite.setScale(1.04 + speedRatio * 0.10);
    this.playerGlow.setScale(0.95 + speedRatio * 0.35);

    if (this.exhaustEmitter) {
      this.exhaustEmitter.setPosition(drawX, py + 20);
      this.exhaustEmitter.emitting = this.playerSpeed > 2;
    }
    if (this.trailEmitter) {
      this.trailEmitter.setPosition(drawX, py + 10);
      this.trailEmitter.emitting = this.boosting && this.playerSpeed > effectiveMax * 0.7;
    }

    this.worldDistance += this.playerSpeed * dt;
  }

  private perspectiveDepth(y: number): number {
    const horizon = this.scale.height * 0.16;
    return Phaser.Math.Clamp((y - horizon) / Math.max(1, this.scale.height - horizon), 0, 1);
  }

  private updateWorldScroll(dt: number) {
    const scrollPx = this.playerSpeed * PPM * dt;
    for (const dash of this.roadLines) {
      dash.y += scrollPx;
      if (dash.y > this.scale.height + 40) dash.y -= 24 * 60;
    }
    for (const b of this.buildings) {
      b.sprite.y += scrollPx * 0.9;
      if (b.sprite.y > this.scale.height + 300) b.sprite.y -= 3000;
      const d = this.perspectiveDepth(b.sprite.y);
      const s = 0.48 + d * 0.72;
      b.sprite.setScale(s, s);
      for (const w of b.windows) {
        w.y += scrollPx * 0.9;
        if (w.y > this.scale.height + 300) w.y -= 3000;
        w.setScale(s, s);
      }
    }
  }

  private updateVehicles(dt: number) {
    const diff = getDifficulty(this.worldDistance);

    if (this.time.now > this.nextVehicleSpawnAt) {
      this.spawnVehicle();
      this.nextVehicleSpawnAt = this.time.now + diff.spawnIntervalMs * Phaser.Math.FloatBetween(0.6, 1.3);
    }

    const py = this.scale.height * PLAYER_SCREEN_Y_RATIO;

    for (const v of [...this.activeVehicles]) {
      v.laneChangeCooldown -= dt * 1000;

      if (v.kind === 'police' && v.state === 'chase') {
        const playerLane = Phaser.Math.Clamp(Math.round((this.playerX - this.roadLeft) / this.laneWidth), 0, LANE_COUNT - 1);
        v.targetLane = playerLane;
        v.forwardSpeed = Phaser.Math.Linear(v.forwardSpeed, this.playerSpeed + 2.5, dt * 1.5);
      } else if (v.laneChangeCooldown <= 0 && v.state !== 'changeLane') {
        if (Math.random() < 0.4) {
          const options = [v.lane - 1, v.lane + 1].filter((l) => l >= 0 && l < LANE_COUNT);
          const candidate = options.length ? Phaser.Utils.Array.GetRandom(options) : v.lane;
          const blocked = this.activeVehicles.some(
            (o) => o !== v && o.lane === candidate && Math.abs(o.sprite.y - v.sprite.y) < 90,
          );
          if (!blocked) v.targetLane = candidate;
        }
        v.laneChangeCooldown = Phaser.Math.Between(3500, 8000);
      }

      const ahead = this.activeVehicles.find(
        (o) => o !== v && o.lane === v.lane && o.sprite.y < v.sprite.y && v.sprite.y - o.sprite.y < 70,
      );
      if (ahead && ahead.forwardSpeed < v.forwardSpeed) {
        v.state = 'braking';
        v.forwardSpeed = Phaser.Math.Linear(v.forwardSpeed, ahead.forwardSpeed * 0.9, dt * 2);
      } else if (v.state === 'braking') {
        v.state = 'cruise';
      }

      if (v.lane !== v.targetLane) {
        v.state = 'changeLane';
        const targetX = this.laneCenterX(v.targetLane);
        v.x = Phaser.Math.Linear(v.x, targetX, dt * 3);
        if (Math.abs(v.x - targetX) < 2) {
          v.lane = v.targetLane;
          v.x = targetX;
          v.state = 'cruise';
        }
      }

      const relativeSpeed = this.playerSpeed - v.forwardSpeed;
      v.sprite.y += relativeSpeed * PPM * dt;
      v.sprite.x = v.x;

      const laneDist = Math.abs(v.x - this.playerX) / this.laneWidth;
      const yDist = Math.abs(v.sprite.y - py);
      if (!v.nearMissCounted && laneDist < NEAR_MISS_LANE_GAP && yDist < NEAR_MISS_Y_GAP + 30 && yDist > 20) {
        v.nearMissCounted = true;
        this.stats.nearMisses++;
        this.stats.score += 25;
        soundEffects.nearMiss();
        this.banner('NEAR MISS! +25', 'NEAR', 1200);
      }

      if (v.kind === 'police' && v.state === 'chase') {
        if (yDist > 260) {
          v.chaseTimer += dt;
          if (v.chaseTimer > 3) {
            this.policeActive = false;
            this.stats.policeEscapes++;
            this.banner('POLICE ESCAPE!', 'ESC', 1800);
            this.releaseVehicle(v);
            continue;
          }
        } else {
          v.chaseTimer = 0;
        }
      }

      if (v.sprite.y > this.scale.height + 100 || v.sprite.y < -400) {
        if (v.kind !== 'police' || v.state !== 'chase') {
          if (v.sprite.y > this.scale.height + 60) this.stats.score += 2;
          this.releaseVehicle(v);
        }
      }
    }
  }

  private updateHazards(dt: number) {
    const scrollPx = this.playerSpeed * PPM * dt;
    for (const h of [...this.activeHazards]) {
      h.sprite.y += scrollPx;
      if (h.sprite.y > this.scale.height + 60) {
        this.stats.hazardsAvoided++;
        this.releaseHazard(h);
      }
    }
  }

  private updateWeatherAndEvents(time: number) {
    if (this.weather !== 'clear' && time > this.weatherUntil) this.clearWeather();

    if (time > this.nextEventAt) {
      this.triggerRandomEvent();
      const diff = getDifficulty(this.worldDistance);
      this.nextEventAt = time + Phaser.Math.Between(diff.eventIntervalMs[0], diff.eventIntervalMs[1]);
    }
  }

  private updateDelivery(dt: number, input: ReturnType<InputManager['read']>) {
    if (!this.currentOrder) {
      this.spawnOrder();
      return;
    }
    const order = this.currentOrder;
    order.timeRemaining -= dt;

    const distanceToTarget = order.targetDistance - this.worldDistance;
    if (order.timeRemaining <= 0) {
      this.stats.failedDeliveries++;
      this.stats.currentCombo = 0;
      soundEffects.deliveryFailed();
      this.banner('DELIVERY FAILED', '⏰');
      this.currentOrder = null;
      return;
    }

    if (Math.abs(distanceToTarget) < DELIVERY_TRIGGER_METERS && input.interact) {
      const speedBonus = order.timeRemaining > order.deadlineSeconds * 0.5 ? 1.4 : 1;
      if (this.weather !== 'clear') this.stats.deliveredInRain = true;
      if (this.nightFactor > 0.6) this.stats.deliveredAtNight = true;
      this.stats.currentCombo++;
      this.stats.bestCombo = Math.max(this.stats.bestCombo, this.stats.currentCombo);
      const comboMult = 1 + Math.min(this.stats.currentCombo * 0.1, 2);
      const reward = Math.round(order.reward * speedBonus * comboMult);
      this.stats.money += reward;
      this.stats.deliveries++;
      this.stats.score += reward * 2;
      soundEffects.deliverySuccess();
      soundEffects.coin();
      this.banner(speedBonus > 1 ? `FAST DELIVERY! +${reward}` : `DELIVERED! +${reward}`, 'DROP');
      this.currentOrder = null;
    }
  }

  private checkCollisions(time: number) {
    if (time < this.invulnUntil) {
      this.scooterSprite.setAlpha(Math.sin(time / 60) > 0 ? 1 : 0.3);
      return;
    }
    this.scooterSprite.setAlpha(1);

    const py = this.scale.height * PLAYER_SCREEN_Y_RATIO;
    const hitRadiusY = 24;
    const hitRadiusX = this.laneWidth * 0.42;

    for (const v of this.activeVehicles) {
      if (Math.abs(v.sprite.y - py) < hitRadiusY && Math.abs(v.x - this.playerX) < hitRadiusX) {
        this.takeDamage(1, time);
        this.playerSpeed *= 0.5;
        if (v.kind !== 'police' || v.state !== 'chase') this.releaseVehicle(v);
        break;
      }
    }
    for (const h of this.activeHazards) {
      if (Math.abs(h.sprite.y - py) < hitRadiusY - 4 && Math.abs(h.x - this.playerX) < hitRadiusX) {
        if (h.kind === 'hole') {
          this.playerSpeed *= 0.45;
          this.playerLateralVel += Phaser.Math.Between(-80, 80);
          soundEffects.collision();
          this.banner('POTHOLE! PIZZA WOBBLED', 'ROAD', 1400);
          this.pizzaUnstableUntil = time + 3000;
        } else {
          this.takeDamage(1, time);
          this.playerSpeed *= 0.6;
        }
        this.releaseHazard(h);
        break;
      }
    }
  }

  private takeDamage(amount: number, time: number) {
    this.health -= amount;
    this.invulnUntil = time + INVULN_MS;
    this.stats.tookDamage = true;
    soundEffects.collision();
    if (this.settings.screenShake) this.cameras.main.shake(180, 0.01);
    this.stats.currentCombo = 0;
    eventBus.emit(EVENTS.HEALTH_UPDATE, this.health);
    if (this.health <= 0) this.triggerGameOver();
  }

  private triggerGameOver() {
    this.gameOver = true;
    soundEffects.stopEngine();
    eventBus.emit(EVENTS.GAME_OVER, { ...this.stats });
  }

  private updateVisualAtmosphere(time: number) {
    const cycle = (this.worldDistance % 4000) / 4000;
    this.nightFactor = 0.5 - 0.5 * Math.cos(cycle * Math.PI * 2);
    const nightAlpha = Phaser.Math.Clamp(this.nightFactor - 0.35, 0, 0.55);
    this.skyOverlay.setAlpha(nightAlpha);
    if (this.weather === 'storm' && Math.random() < 0.004) {
      this.cameras.main.flash(120, 255, 255, 255);
    }
    void time;
  }

  private updateHud() {
    const order = this.currentOrder;
    eventBus.emit(EVENTS.HUD_UPDATE, {
      money: this.stats.money,
      score: Math.round(this.stats.score),
      combo: this.stats.currentCombo,
      health: this.health,
      distance: Math.round(this.worldDistance),
      speedKph: Math.round(this.playerSpeed * 3.6),
      weather: this.weather,
    });
    if (order) {
      eventBus.emit(EVENTS.DELIVERY_UPDATE, {
        icon: order.icon,
        distance: Math.max(0, Math.round(order.targetDistance - this.worldDistance)),
        timeRemaining: Math.max(0, Math.round(order.timeRemaining)),
      });
    }
  }

  private updateMinimap() {
    if (!this.minimapGfx) return;
    const g = this.minimapGfx;
    g.clear();
    const mx = this.scale.width - 76;
    const my = 16;
    const mw = 60;
    const mh = 150;
    g.fillStyle(0x000000, 0.4);
    g.fillRoundedRect(mx, my, mw, mh, 8);
    g.lineStyle(1, 0x66ffcc, 0.6);
    for (let i = 1; i < LANE_COUNT; i++) {
      const lx = mx + (mw / LANE_COUNT) * i;
      g.lineBetween(lx, my + 6, lx, my + mh - 6);
    }
    const playerFrac = (this.playerX - this.roadLeft) / this.roadWidth;
    g.fillStyle(0x39ff88, 1);
    g.fillCircle(mx + playerFrac * mw, my + mh - 12, 4);

    const windowMeters = 260;
    for (const v of this.activeVehicles) {
      const dScreen = v.sprite.y - this.scale.height * PLAYER_SCREEN_Y_RATIO;
      const dMeters = -dScreen / PPM;
      if (dMeters < -20 || dMeters > windowMeters) continue;
      const frac = 1 - Phaser.Math.Clamp(dMeters / windowMeters, 0, 1);
      const laneFrac = (v.x - this.roadLeft) / this.roadWidth;
      g.fillStyle(v.kind === 'police' ? 0xff4444 : 0xffcc55, 0.9);
      g.fillCircle(mx + laneFrac * mw, my + mh - 12 - frac * (mh - 20), 3);
    }
    if (this.currentOrder) {
      const dMeters = this.currentOrder.targetDistance - this.worldDistance;
      if (dMeters >= -20 && dMeters <= windowMeters) {
        const frac = 1 - Phaser.Math.Clamp(dMeters / windowMeters, 0, 1);
        const laneFrac = (this.currentOrder.targetLane + 0.5) / LANE_COUNT;
        g.fillStyle(0x4dd6ff, 1);
        g.fillRect(mx + laneFrac * mw - 3, my + mh - 12 - frac * (mh - 20) - 3, 6, 6);
      }
    }
  }

  private updateDebug() {
    if (!this.debugText) return;
    this.debugText.setPosition(8, this.scale.height - 118);
    const diff = getDifficulty(this.worldDistance);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.debugText.setText(
      [
        `FPS: ${Math.round(this.game.loop.actualFps)}`,
        `Player x:${Math.round(this.playerX)} speed:${this.playerSpeed.toFixed(1)}m/s`,
        `Distance: ${Math.round(this.worldDistance)}m  Difficulty: ${diff.label}`,
        `Vehicles: ${this.activeVehicles.length}  Hazards: ${this.activeHazards.length}`,
        `Weather: ${this.weather}  Event: ${this.activeEventLabel}`,
        `Delivery timer: ${this.currentOrder ? this.currentOrder.timeRemaining.toFixed(1) : '-'}`,
        `DPR: ${dpr}  Canvas: ${this.scale.width}x${this.scale.height}`,
      ].join('\n'),
    );
  }
}
