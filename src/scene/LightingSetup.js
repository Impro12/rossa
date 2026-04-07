import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
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

    // Required for RectAreaLight to look correct with PBR
    RectAreaLightUniformsLib.init();

    this._createLights();
    this._loadHDRI();
  }

  _createLights() {
    // 1. Hemisphere Light (Soft ambient GI fallback)
    // Sky: Warm white, Ground: Deep Charcoal
    this.hemiLight = new THREE.HemisphereLight(0xfffaec, 0x1A1A18, 0.4);
    this.scene.add(this.hemiLight);

    // 2. SpotLight (Focal accent, soft shadow caster)
    // Placed slightly off-center to cast dramatic angled shadows from the island
    this.spotLight = new THREE.SpotLight(0xfff5e6, 40); // Intensity drops with distance in physically correct mode
    this.spotLight.position.set(4, 5, 4);
    this.spotLight.angle = Math.PI / 4;
    this.spotLight.penumbra = 0.5;
    this.spotLight.decay = 1.5;
    this.spotLight.distance = 20;

    // Enable soft shadows
    this.spotLight.castShadow = true;
    this.spotLight.shadow.mapSize.width = 2048;
    this.spotLight.shadow.mapSize.height = 2048;
    this.spotLight.shadow.camera.near = 1;
    this.spotLight.shadow.camera.far = 15;
    this.spotLight.shadow.bias = -0.0001; // prevent shadow acne
    
    this.scene.add(this.spotLight);

    // 3. RectAreaLights (Warm 3000K, above countertop glow)
    const rectLightColor = 0xffeacc; // ~3000k warm
    const rectLightIntensity = 2.5;
    
    // Left countertop downlight
    this.rectLightLeft = new THREE.RectAreaLight(rectLightColor, rectLightIntensity, 2, 0.5);
    this.rectLightLeft.position.set(-2, 2.8, -1.8);
    this.rectLightLeft.lookAt(-2, 0, -1.8);
    this.scene.add(this.rectLightLeft);

    // Right countertop downlight
    this.rectLightRight = new THREE.RectAreaLight(rectLightColor, rectLightIntensity, 2, 0.5);
    this.rectLightRight.position.set(2, 2.8, -1.8);
    this.rectLightRight.lookAt(2, 0, -1.8);
    this.scene.add(this.rectLightRight);
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
