import { useCallback, useRef } from 'react';
import { eventBus, EVENTS } from '../game/EventBus';

const JOY_RADIUS = 54;

export function TouchControls() {
  const baseRef = useRef<HTMLDivElement | null>(null);
  const knobRef = useRef<HTMLDivElement | null>(null);
  const activePointer = useRef<number | null>(null);

  const setSteer = useCallback((v: number) => eventBus.emit(EVENTS.TOUCH_STEER, v), []);
  const onJoyDown = useCallback((e: React.PointerEvent) => {
    activePointer.current = e.pointerId;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, []);
  const onJoyMove = useCallback((e: React.PointerEvent) => {
    if (activePointer.current !== e.pointerId || !baseRef.current) return;
    const rect = baseRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const dx = e.clientX - cx;
    const clamped = Math.max(-JOY_RADIUS, Math.min(JOY_RADIUS, dx));
    if (knobRef.current) knobRef.current.style.transform = `translateX(${clamped}px)`;
    setSteer(clamped / JOY_RADIUS);
  }, [setSteer]);
  const onJoyUp = useCallback((e: React.PointerEvent) => {
    if (activePointer.current !== e.pointerId) return;
    activePointer.current = null;
    if (knobRef.current) knobRef.current.style.transform = 'translateX(0px)';
    setSteer(0);
  }, [setSteer]);

  const throttle = useCallback((v: number) => eventBus.emit(EVENTS.TOUCH_THROTTLE, v), []);
  const boost = useCallback((v: boolean) => eventBus.emit(EVENTS.TOUCH_BOOST, v), []);
  const interact = useCallback(() => eventBus.emit(EVENTS.TOUCH_INTERACT), []);

  return (
    <div className="touch-controls" aria-label="Touch controls">
      <div className="touch-joystick-wrap">
        <div className="touch-joy-caption">STEER</div>
        <div ref={baseRef} className="touch-joy-base" onPointerDown={onJoyDown} onPointerMove={onJoyMove} onPointerUp={onJoyUp} onPointerCancel={onJoyUp}>
          <div className="touch-joy-ring" />
          <div ref={knobRef} className="touch-joy-knob"><span /></div>
        </div>
      </div>

      <div className="touch-buttons">
        <button className="touch-btn touch-btn--deliver" onPointerDown={interact} aria-label="Deliver"><span className="touch-btn__glyph">◆</span><span>DROP</span></button>
        <button className="touch-btn touch-btn--boost" onPointerDown={() => boost(true)} onPointerUp={() => boost(false)} onPointerCancel={() => boost(false)} aria-label="Boost"><span className="touch-btn__glyph">↯</span><span>BOOST</span></button>
        <div className="touch-pedals">
          <button className="touch-btn touch-btn--accel" onPointerDown={() => throttle(1)} onPointerUp={() => throttle(0)} onPointerCancel={() => throttle(0)} aria-label="Accelerate"><span className="touch-btn__glyph">▲</span><span>GO</span></button>
          <button className="touch-btn touch-btn--brake" onPointerDown={() => throttle(-1)} onPointerUp={() => throttle(0)} onPointerCancel={() => throttle(0)} aria-label="Brake"><span className="touch-btn__glyph">▼</span><span>BRAKE</span></button>
        </div>
      </div>
    </div>
  );
}
