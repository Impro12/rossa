import * as THREE from 'three';

/**
 * SceneManager
 * Centralized setup for WebGLRenderer, Scene, and PerspectiveCamera.
 * Includes resize handling and core RAF render loop.
 */

class SceneManager {
  constructor(canvas) {
    // 1. Initialise WebGLRenderer
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });

    // Device Pixel Ratio capped at 2 for performance scaling
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 2. Initialise Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1e1c19); // Dark room (replaced by env HDRI)

    // 3. Initialise Camera
    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    // Move slightly out of origin so it's not looking from 0,0,0 initially
    this.camera.position.set(0, 1.5, 5);

    // 4. Time tracking for RAF
    this.clock = new THREE.Clock();
    this._updateCallbacks = new Set();
    this._rafId = null;

    // Bind resize handler
    this._onResize = this._onResize.bind(this);
    window.addEventListener('resize', this._onResize);
  }

  /**
   * Register a function to run every frame
   * @param {function(number, number): void} fn - Callback receiving (delta, elapsedTime)
   * @returns {function} Unsubscribe function
   */
  onUpdate(fn) {
    this._updateCallbacks.add(fn);
    return () => this._updateCallbacks.delete(fn);
  }

  /**
   * Start the core render loop
   */
  startRenderLoop() {
    if (this._rafId !== null) return;
    this.clock.start();
    this._tick();
  }

  /**
   * Stop the core render loop
   */
  stopRenderLoop() {
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  _tick = () => {
    this._rafId = requestAnimationFrame(this._tick);
    
    // Calculate delta and elapsed time
    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    // Fire all update callbacks
    for (const callback of this._updateCallbacks) {
      callback(delta, elapsed);
    }

    // Render the frame
    this.renderer.render(this.scene, this.camera);
  };

  _onResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.renderer.setSize(width, height);
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  destroy() {
    this.stopRenderLoop();
    window.removeEventListener('resize', this._onResize);
    this.renderer.dispose();
  }
}

export default SceneManager;
