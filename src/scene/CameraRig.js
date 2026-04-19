import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { gsap } from 'gsap';
import EventBus from '../core/EventBus.js';
import Store from '../core/Store.js';
import waypointsData from '../config/camera-waypoints.json';

/**
 * CameraRig — wraps PerspectiveCamera + OrbitControls.
 * Waypoints are loaded from camera-waypoints.json.
 * Listens to EventBus 'camera:goto' and emits 'camera:arrived'.
 */

const WAYPOINTS = {};
for (const wp of waypointsData.waypoints) {
  WAYPOINTS[wp.id] = {
    position: new THREE.Vector3(...wp.position),
    target:   new THREE.Vector3(...wp.target),
    fov:      wp.fov,
    duration: wp.duration,
    ease:     wp.ease,
  };
}

class CameraRig {
  /**
   * @param {THREE.PerspectiveCamera} camera
   * @param {HTMLCanvasElement} canvas
   */
  constructor(camera, canvas, sceneManager) {
    this.camera = camera;
    this._sceneManager = sceneManager;

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping  = true;
    this.controls.dampingFactor  = 0.05;
    this.controls.enableZoom     = false; // wheel scroll goes to page, not camera zoom
    this.controls.minDistance    = 2;
    this.controls.maxDistance    = 8;
    // Vertical: between 40° (slight top-down) and 78° (near-horizon)
    this.controls.minPolarAngle  = Math.PI * 0.22;   // ~40°
    this.controls.maxPolarAngle  = Math.PI * 0.43;   // ~78°
    // Horizontal: ±80° — enough to see both ends of the run + island, never behind the walls
    this.controls.minAzimuthAngle = -Math.PI * 0.44;
    this.controls.maxAzimuthAngle =  Math.PI * 0.44;

    // Re-render whenever the user drags the camera
    this.controls.addEventListener('change', () => sceneManager?.requestRender(3));

    this._currentTween = null;

    // Start at overview
    const start = WAYPOINTS.overview;
    this.camera.position.copy(start.position);
    this.camera.fov = start.fov;
    this.camera.updateProjectionMatrix();
    this.controls.target.copy(start.target);
    this.controls.update();

    // Listen for navigation requests from Toolbar / NavigationDots
    EventBus.on('camera:goto', (e) => this.flyTo(e.detail.waypoint));

    // Announce initial waypoint
    Store.state.activeWaypoint = 'overview';
  }

  update() {
    if (this.controls.enabled) this.controls.update();
  }

  enableOrbit()  { this.controls.enabled = true; }
  disableOrbit() { this.controls.enabled = false; }

  /**
   * Smoothly fly to a named waypoint.
   * @param {string} waypointName
   * @returns {Promise<void>}
   */
  flyTo(waypointName) {
    const waypoint = WAYPOINTS[waypointName];
    if (!waypoint) {
      console.warn(`[CameraRig] Unknown waypoint: '${waypointName}'`);
      return Promise.resolve();
    }

    this._currentTween?.kill();
    this.disableOrbit();

    return new Promise((resolve) => {
      this._currentTween = gsap.timeline({
        onComplete: () => {
          this.enableOrbit();
          Store.state.activeWaypoint = waypointName;
          EventBus.emit('camera:arrived', { waypoint: waypointName });
          resolve();
        },
      });

      this._currentTween.to(this.camera.position, {
        x: waypoint.position.x,
        y: waypoint.position.y,
        z: waypoint.position.z,
        duration: waypoint.duration,
        ease: waypoint.ease,
      }, 0);

      this._currentTween.to(this.controls.target, {
        x: waypoint.target.x,
        y: waypoint.target.y,
        z: waypoint.target.z,
        duration: waypoint.duration,
        ease: waypoint.ease,
        onUpdate: () => this.camera.lookAt(this.controls.target),
      }, 0);

      this._currentTween.to(this.camera, {
        fov: waypoint.fov,
        duration: waypoint.duration,
        ease: waypoint.ease,
        onUpdate: () => this.camera.updateProjectionMatrix(),
      }, 0);
    });
  }
}

export default CameraRig;
