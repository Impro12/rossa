/**
 * EventBus — typed pub/sub using native CustomEvent on a private EventTarget.
 * Usage:
 *   EventBus.on('camera:goto', e => console.log(e.detail));
 *   EventBus.emit('camera:goto', { waypoint: 'island' });
 */

const _target = new EventTarget();

const EventBus = {
  /**
   * Emit an event with an optional payload.
   * @param {string} name
   * @param {Object} [detail]
   */
  emit(name, detail = {}) {
    _target.dispatchEvent(new CustomEvent(name, { detail }));
  },

  /**
   * Subscribe to an event. Returns an unsubscribe function.
   * @param {string} name
   * @param {(e: CustomEvent) => void} handler
   * @returns {() => void} unsubscribe
   */
  on(name, handler) {
    _target.addEventListener(name, handler);
    return () => _target.removeEventListener(name, handler);
  },

  /**
   * Subscribe once — auto-removes after first fire.
   * @param {string} name
   * @param {(e: CustomEvent) => void} handler
   */
  once(name, handler) {
    _target.addEventListener(name, handler, { once: true });
  },
};

export default EventBus;
