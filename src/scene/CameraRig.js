import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { gsap } from 'gsap';

/**
 * CameraRig
 * Wraps PerspectiveCamera and OrbitControls. Provides smooth GSAP-driven
 * transitions between predefined waypoints.
 */

// Define standard waypoints for the kitchen layout
const WAYPOINTS = {
  overview: {
    position: new THREE.Vector3(0, 1.8, 6.5),
    target: new THREE.Vector3(0, 1.0, 0),
  },
  island: {
    position: new THREE.Vector3(-1.8, 1.4, 2.5),
    target: new THREE.Vector3(0.5, 0.9, 0),
  },
  storage: {
    position: new THREE.Vector3(-3.5, 1.6, 2.5),
    target: new THREE.Vector3(-1.8, 1.2, -1.0),
  },
  detail: {
    position: new THREE.Vector3(2.5, 1.4, 2.0),
    target: new THREE.Vector3(1.2, 0.9, -1.5),
  }
};

class CameraRig {
  /**
   * @param {THREE.PerspectiveCamera} camera 
   * @param {HTMLCanvasElement} canvas 
   */
  constructor(camera, canvas) {
    this.camera = camera;
    
    // Initialise OrbitControls
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    
    // Constraints to prevent clipping below floor or behind walls
    this.controls.minDistance = 1.5;
    this.controls.maxDistance = 10;
    
    // Limit polar (vertical) angles: don't go under floor or perfectly top-down
    this.controls.maxPolarAngle = Math.PI / 2 - 0.05; // 0.05 rad above horizon
    this.controls.minPolarAngle = Math.PI / 6;        // 30deg from top
    
    // Optional: limit azimuth (horizontal) to keep user mostly in front of the kitchen
    this.controls.minAzimuthAngle = -Math.PI / 1.5;
    this.controls.maxAzimuthAngle = Math.PI / 1.5;

    // Track active tween to allow cancellation
    this._currentTween = null;
    
    // Automatically fly to overview on startup
    this.camera.position.copy(WAYPOINTS.overview.position);
    this.controls.target.copy(WAYPOINTS.overview.target);
    this.controls.update();
  }

  /**
   * Must be called inside the main render loop to calculate damping
   */
  update() {
    if (this.controls.enabled) {
      this.controls.update();
    }
  }

  /**
   * Disable manual orbiting (useful during dragging UI or animations)
   */
  enableOrbit() {
    this.controls.enabled = true;
  }

  /**
   * Disable manual orbiting
   */
  disableOrbit() {
    this.controls.enabled = false;
  }

  /**
   * Smoothly transitions the camera position and the OrbitControls target
   * using a GSAP timeline.
   * 
   * @param {string} waypointName - 'overview' | 'island' | 'storage' | 'detail'
   * @returns {Promise<void>} Resolves when animation completes
   */
  flyTo(waypointName) {
    const waypoint = WAYPOINTS[waypointName];
    if (!waypoint) {
      console.warn(`[CameraRig] Waypoint '${waypointName}' not found.`);
      return Promise.resolve();
    }

    if (this._currentTween) {
      this._currentTween.kill();
    }

    return new Promise((resolve) => {
      // We animate both the camera position and the orbit target simultaneously.
      // We disable controls during animation to prevent user interruption clashes.
      this.disableOrbit();

      this._currentTween = gsap.timeline({
        onComplete: () => {
          this.enableOrbit();
          resolve();
        }
      });

      // Animate Camera Position
      this._currentTween.to(this.camera.position, {
        x: waypoint.position.x,
        y: waypoint.position.y,
        z: waypoint.position.z,
        duration: 1.5,
        ease: "power3.inOut"
      }, 0);

      // Animate Orbit Controls Target
      this._currentTween.to(this.controls.target, {
        x: waypoint.target.x,
        y: waypoint.target.y,
        z: waypoint.target.z,
        duration: 1.5,
        ease: "power3.inOut",
        onUpdate: () => {
          // Keep the camera looking at the target while it's moving
          this.camera.lookAt(this.controls.target);
        }
      }, 0);
    });
  }
}

export default CameraRig;
