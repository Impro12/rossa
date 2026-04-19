import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/**
 * LightingSetup
 * Manages complex lighting rig for the kitchen including HemisphereLight,
 * SpotLights for accents, RectAreaLights for under-cabinet glows,
 * and HDRI Environment mapping for realistic PBR reflections.
 */

class LightingSetup {
  /**
   * @param {THREE.Scene} scene 
   * @param {THREE.WebGLRenderer} renderer 
   */
  constructor(scene, renderer) {
    this.scene = scene;
    this.renderer = renderer;

    this._createLights();
    this._loadHDRI();
  }

  _createLights() {
    // Hemisphere — warm sky, cool ground
    this.scene.add(new THREE.HemisphereLight(0xfffaec, 0x2a2a28, 0.6));

    // Key directional light with shadow (1024 map is plenty for geometry this simple)
    const key = new THREE.DirectionalLight(0xfff5e6, 1.8);
    key.position.set(4, 8, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left   = -6;
    key.shadow.camera.right  =  6;
    key.shadow.camera.top    =  6;
    key.shadow.camera.bottom = -6;
    key.shadow.camera.near   = 1;
    key.shadow.camera.far    = 20;
    key.shadow.bias = -0.001;
    this.scene.add(key);

    // Cheap fill from opposite side — replaces the two RectAreaLights
    const fill = new THREE.DirectionalLight(0xffeacc, 0.5);
    fill.position.set(-3, 4, -2);
    this.scene.add(fill);
  }

  async _loadHDRI() {
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    pmremGenerator.compileEquirectangularShader();

    try {
      const loader = new RGBELoader();
      // We will attempt to load an HDRI from the public folder. 
      // User must provide it, but we catch exceptions gracefully.
      const texture = await new Promise((resolve, reject) => {
        loader.load('/textures/env/studio.hdr', resolve, undefined, reject);
      });

      const envMap = pmremGenerator.fromEquirectangular(texture).texture;
      this.scene.environment = envMap;
      
      // Optionally use the envmap as the background instead of a solid color
      // this.scene.background = envMap;
      
      texture.dispose();
      pmremGenerator.dispose();
      console.log('[LightingSetup] HDRI loaded successfully.');
    } catch (err) {
      console.warn('[LightingSetup] Custom HDRI not found. Falling back to RoomEnvironment.', err);
      // Fallback procedural room environment for reflections
      const roomEnv = new RoomEnvironment();
      const envMap = pmremGenerator.fromScene(roomEnv).texture;
      this.scene.environment = envMap;
      
      roomEnv.dispose();
      pmremGenerator.dispose();
    }
  }
}

export default LightingSetup;
