/**
 * NavigationDots
 * Controls camera waypoints (overview, island, storage, detail).
 */

class NavigationDots {
  constructor(cameraRig) {
    this.cameraRig = cameraRig;
    this.container = document.getElementById('nav-dots');
    
    // The waypoints match CameraRig constants
    this.waypoints = ['overview', 'island', 'storage', 'detail'];
    this._buildUI();
  }

  _buildUI() {
    this.container.innerHTML = this.waypoints.map((wp, i) => `
      <button class="nav-dot ${i === 0 ? 'active' : ''}" data-waypoint="${wp}" aria-label="Go to ${wp} view">
        <span class="dot"></span>
        <span class="label">${wp}</span>
      </button>
    `).join('');

    this.container.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      
      const waypoint = btn.dataset.waypoint;
      
      // Update active state
      this.container.querySelectorAll('.nav-dot').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Coordinate with GSAP timeline in CameraRig
      this.cameraRig.flyTo(waypoint);
    });
  }
}

export default NavigationDots;
