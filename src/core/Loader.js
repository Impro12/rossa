import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import EventBus from './EventBus.js';

/**
 * Loader — centralized asset loading with progress tracking.
 * All textures are cached by URL to avoid duplicate loads.
 */

/** @type {Map<string, THREE.Texture>} */
const _textureCache = new Map();

/** @type {Map<string, Promise<THREE.Texture>>} */
const _textureInflight = new Map();

let _renderer = null; // set via init()
let _totalBytes = 0;
let _loadedBytes = 0;

const _dracoLoader = new DRACOLoader();
_dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');

const _ktx2Loader = new KTX2Loader();
_ktx2Loader.setTranscoderPath('https://cdn.jsdelivr.net/npm/three@0.168.0/examples/jsm/libs/basis/');

const _gltfLoader = new GLTFLoader();
_gltfLoader.setDRACOLoader(_dracoLoader);

const _rgbeLoader = new RGBELoader();
const _texLoader = new THREE.TextureLoader();

const Loader = {
  /**
   * Must be called before loading KTX2 textures.
   * @param {THREE.WebGLRenderer} renderer
   */
  init(renderer) {
    _renderer = renderer;
    _ktx2Loader.detectSupport(renderer);
    _gltfLoader.setKTX2Loader(_ktx2Loader);
  },

  /**
   * Load a GLTF/GLB file.
   * @param {string} url
   * @param {(progress: number) => void} [onProgress]
   * @returns {Promise<import('three/addons/loaders/GLTFLoader.js').GLTF>}
   */
  loadGLTF(url, onProgress) {
    return new Promise((resolve, reject) => {
      _gltfLoader.load(
        url,
        resolve,
        (evt) => {
          if (evt.lengthComputable) {
            const ratio = evt.loaded / evt.total;
            onProgress?.(ratio);
            EventBus.emit('loading:progress', { progress: ratio * 0.6 }); // GLB = 60% of load budget
          }
        },
        reject,
      );
    });
  },

  /**
   * Load a KTX2 compressed texture (cached).
   * @param {string} url
   * @returns {Promise<THREE.CompressedTexture>}
   */
  loadKTX2(url) {
    if (_textureCache.has(url)) return Promise.resolve(_textureCache.get(url));
    if (_textureInflight.has(url)) return _textureInflight.get(url);

    const p = new Promise((resolve, reject) => {
      _ktx2Loader.load(url, (tex) => {
        _textureCache.set(url, tex);
        _textureInflight.delete(url);
        resolve(tex);
      }, undefined, reject);
    });
    _textureInflight.set(url, p);
    return p;
  },

  /**
   * Load a standard texture (PNG/WebP), cached.
   * @param {string} url
   * @param {boolean} [sRGB]
   * @returns {Promise<THREE.Texture>}
   */
  loadTexture(url, sRGB = true) {
    if (_textureCache.has(url)) return Promise.resolve(_textureCache.get(url));
    if (_textureInflight.has(url)) return _textureInflight.get(url);

    const p = new Promise((resolve, reject) => {
      _texLoader.load(url, (tex) => {
        if (sRGB) tex.colorSpace = THREE.SRGBColorSpace;
        _textureCache.set(url, tex);
        _textureInflight.delete(url);
        resolve(tex);
      }, undefined, reject);
    });
    _textureInflight.set(url, p);
    return p;
  },

  /**
   * Load an HDR environment map.
   * @param {string} url
   * @param {THREE.WebGLRenderer} renderer
   * @returns {Promise<THREE.DataTexture>}
   */
  loadHDR(url, renderer) {
    if (_textureCache.has(url)) return Promise.resolve(_textureCache.get(url));
    return new Promise((resolve, reject) => {
      _rgbeLoader.load(url, (tex) => {
        _textureCache.set(url, tex);
        resolve(tex);
      }, undefined, reject);
    });
  },

  /**
   * Dispose a cached texture by URL (reference-counting not yet implemented).
   * @param {string} url
   */
  disposeTexture(url) {
    const tex = _textureCache.get(url);
    if (tex) {
      tex.dispose();
      _textureCache.delete(url);
    }
  },

  get totalBytes() { return _totalBytes; },
};

export default Loader;
