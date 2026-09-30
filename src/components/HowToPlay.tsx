interface Props { onBack: () => void; }

export function HowToPlay({ onBack }: Props) {
  return (
    <div className="screen">
      <div className="screen-header"><div><span className="section-kicker">FIELD MANUAL</span><h2>How to Play</h2></div></div>
      <div className="howto-grid">
        <div className="howto-block"><span className="howto-index">01</span><h3>Objective</h3><p>Drive an autonomous delivery machine through an endless city, reach each drop gate before the timer expires, chain successful deliveries, and survive the road.</p></div>
        <div className="howto-block"><span className="howto-index">02</span><h3>Desktop</h3><ul><li><kbd>W</kbd> / <kbd>↑</kbd> Accelerate</li><li><kbd>S</kbd> / <kbd>↓</kbd> Brake</li><li><kbd>A</kbd> / <kbd>←</kbd> Steer left</li><li><kbd>D</kbd> / <kbd>→</kbd> Steer right</li><li><kbd>Space</kbd> Boost</li><li><kbd>E</kbd> Deliver at a gate</li><li><kbd>Esc</kbd> Pause / resume</li></ul></div>
        <div className="howto-block"><span className="howto-index">03</span><h3>Touch</h3><p>Use the large steering control on the left. On the right, the delivery, boost, accelerator, and brake controls are intentionally separated for faster one-thumb access.</p></div>
        <div className="howto-block"><span className="howto-index">04</span><h3>Road Systems</h3><ul><li><strong>Traffic</strong> — vehicles have independent speed and lane behavior.</li><li><strong>Law</strong> — pursuit units can switch lanes and chase.</li><li><strong>Work zones</strong> — barriers, cones, and potholes create lane pressure.</li><li><strong>Weather</strong> — rain and storms reduce grip.</li><li><strong>Events</strong> — wind, outages, speed zones, and delivery instability change the run temporarily.</li></ul></div>
      </div>
      <button className="btn back-btn" onClick={onBack}>Back</button>
    </div>
  );
}
