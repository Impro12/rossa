/**
 * Ticker — requestAnimationFrame loop manager.
 * Subscribers receive { delta, elapsed } each frame.
 *
 * @example
 *   const off = Ticker.add(({ delta }) => mesh.rotation.y += delta);
 *   Ticker.start();
 *   // later:
 *   off();
 */

const _subscribers = new Set();
let _rafId = null;
let _lastTime = 0;
let _elapsed = 0;
let _running = false;

/** @type {{ needsRender: boolean }} */
export const RenderFlags = { needsRender: true };

function _tick(now) {
  if (!_running) return;
  _rafId = requestAnimationFrame(_tick);

  const delta = Math.min((now - _lastTime) / 1000, 0.1); // cap at 100ms
  _lastTime = now;
  _elapsed += delta;

  for (const fn of _subscribers) {
    fn({ delta, elapsed: _elapsed });
  }
}

const Ticker = {
  start() {
    if (_running) return;
    _running = true;
    _lastTime = performance.now();
    _rafId = requestAnimationFrame(_tick);
  },

  stop() {
    _running = false;
    if (_rafId) {
      cancelAnimationFrame(_rafId);
      _rafId = null;
    }
  },

  /** @param {(frame: { delta: number, elapsed: number }) => void} fn */
  add(fn) {
    _subscribers.add(fn);
    return () => _subscribers.delete(fn);
  },

  get elapsed() {
    return _elapsed;
  },
};

export default Ticker;
