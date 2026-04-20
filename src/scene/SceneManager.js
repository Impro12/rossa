import * as THREE from 'three';

/**
 * SceneManager
 * Centralised WebGLRenderer + Scene + PerspectiveCamera.
 *
 * Mobile resize fix:
 *   Uses canvas.clientWidth/clientHeight (actual CSS-rendered size) instead of
 *   window.innerWidth/innerHeight. On mobile, window.innerHeight changes when
 *   the browser address bar shows/hides, triggering false resize events that
 *   mismatch the canvas's real dimensions and distort the scene.
 *   A ResizeObserver on the canvas wrapper is used for accurate resize detection.
 */

class SceneManager {
  constructor(canvas) {
    this._canvas = canvas;

    // Read actual canvas dimensions from CSS layout, not window
    const w = canvas.clientWidth  || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;

    // 1. WebGLRenderer
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
      stencil: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    // false = don't let Three.js override canvas CSS size
    this.renderer.setSize(w, h, false);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    // 2. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xeae6e0);

    // 3. Camera — aspect from actual canvas size
    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    this.camera.position.set(0, 1.5, 5);

    // 4. RAF state
    this.clock = new THREE.Clock();
    this._updateCallbacks = new Set();
    this._rafId = null;
    this._renderFrames = 0;
    this._tickCount = 0;

    // 5. Resize — observe the canvas wrapper so we react only to real layout changes,
    //    not to mobile address-bar show/hide (which changes window.innerHeight but
    //    not the sticky canvas-wrapper size).
    this._onResize = this._onResize.bind(this);
    const target = canvas.parentElement ?? canvas;
    if (typeof ResizeObserver !== 'undefined') {
      this._ro = new ResizeObserver(this._onResize);
      this._ro.observe(target);
    }
    // Keep window resize as fallback for browsers without ResizeObserver
    window.addEventListener('resize', this._onResize);
  }

  onUpdate(fn) {
    this._updateCallbacks.add(fn);
    return () => this._updateCallbacks.delete(fn);
  }

  startRenderLoop() {
    if (this._rafId !== null) return;
    this.clock.start();
    this._tick();
  }

  stopRenderLoop() {
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  requestRender(frames = 2) {
    this._renderFrames = Math.max(this._renderFrames, frames);
  }

  _tick = () => {
    this._rafId = requestAnimationFrame(this._tick);
    this._tickCount++;

    const delta   = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    for (const cb of this._updateCallbacks) cb(delta, elapsed);

    const onDemand = this._renderFrames > 0;
    const fallback  = this._tickCount % 6 === 0;
    if (onDemand || fallback) {
      if (onDemand) this._renderFrames--;
      this.renderer.render(this.scene, this.camera);
    }
  };

  _onResize() {
    const canvas = this._canvas;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;

    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.requestRender(2);
  }

  destroy() {
    this.stopRenderLoop();
    this._ro?.disconnect();
    window.removeEventListener('resize', this._onResize);
    this.renderer.dispose();
  }
}

export default SceneManager;
