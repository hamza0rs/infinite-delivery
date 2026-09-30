// Minimal typed event bus used to pass data between the Phaser scene (game/)
// and the React UI (components/) without either side reaching into the other's internals.
type Listener = (payload: unknown) => void;

class EventBus {
  private listeners = new Map<string, Set<Listener>>();

  on(event: string, cb: Listener): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(cb);
    return () => this.off(event, cb);
  }

  off(event: string, cb: Listener): void {
    this.listeners.get(event)?.delete(cb);
  }

  emit(event: string, payload?: unknown): void {
    this.listeners.get(event)?.forEach((cb) => cb(payload));
  }
}

export const eventBus = new EventBus();

// Event name constants shared by both sides.
export const EVENTS = {
  HUD_UPDATE: 'hud:update',
  DELIVERY_UPDATE: 'delivery:update',
  BANNER: 'banner:show',
  GAME_OVER: 'game:over',
  ACHIEVEMENT: 'achievement:unlocked',
  HEALTH_UPDATE: 'health:update',
  DIFFICULTY_UPDATE: 'difficulty:update',
  REQUEST_START: 'request:start',
  REQUEST_PAUSE: 'request:pause',
  REQUEST_RESUME: 'request:resume',
  REQUEST_RESTART: 'request:restart',
  SETTINGS_CHANGED: 'settings:changed',
  GARAGE_CHANGED: 'garage:changed',
  TOUCH_STEER: 'touch:steer',
  TOUCH_THROTTLE: 'touch:throttle',
  TOUCH_BOOST: 'touch:boost',
  TOUCH_INTERACT: 'touch:interact',
} as const;
