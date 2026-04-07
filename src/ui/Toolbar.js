import EventBus from '../core/EventBus.js';
import Store from '../core/Store.js';

/**
 * Toolbar — bottom zone navigation bar + panel toggle buttons.
 */

const Toolbar = {
  init() {
    // Zone navigation buttons
    document.querySelectorAll('.toolbar-btn[data-waypoint]').forEach(btn => {
      btn.addEventListener('click', () => {
        const wp = btn.dataset.waypoint;
        EventBus.emit('camera:goto', { waypoint: wp });
      });
    });

    // Sync active state from store
    Store.subscribe('activeWaypoint', (wp) => {
      document.querySelectorAll('.toolbar-btn[data-waypoint]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.waypoint === wp);
      });
    });

    // Listen for camera arriving to update the store
    EventBus.on('camera:arrived', (e) => {
      Store.state.activeWaypoint = e.detail.waypoint;
    });
  },
};

export default Toolbar;
