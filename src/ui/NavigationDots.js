import EventBus from '../core/EventBus.js';
import Store from '../core/Store.js';

/**
 * NavigationDots — side dot navigation for camera waypoints.
 * Communicates via EventBus; no direct CameraRig dependency.
 */

const WAYPOINTS = ['overview', 'island', 'storage', 'appliances'];

class NavigationDots {
  constructor() {
    this.container = document.getElementById('nav-dots');
    this._buildUI();

    // Keep dots in sync with camera position changes
    Store.subscribe('activeWaypoint', (wp) => this._setActive(wp));
  }

  _buildUI() {
    this.container.innerHTML = WAYPOINTS.map((wp, i) => `
      <button class="nav-dot ${i === 0 ? 'active' : ''}" data-waypoint="${wp}" aria-label="Go to ${wp} view">
        <span class="dot"></span>
        <span class="label">${wp}</span>
      </button>
    `).join('');

    this.container.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      EventBus.emit('camera:goto', { waypoint: btn.dataset.waypoint });
    });
  }

  _setActive(waypoint) {
    this.container.querySelectorAll('.nav-dot').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.waypoint === waypoint);
    });
  }
}

export default NavigationDots;
