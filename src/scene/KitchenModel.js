import * as THREE from 'three';
import Loader from '../core/Loader.js';
import EventBus from '../core/EventBus.js';

/**
 * KitchenModel — loads the kitchen GLB and indexes all meshes.
 * Also builds a procedural placeholder scene for development.
 *
 * Naming convention: {category}_{zone}_{index}
 * Categories: facade, drawer, door, countertop, handle, appliance, sink, faucet, wall, floor, backsplash, deco
 */

/** @type {THREE.Group} */
let _root;
/** @type {Map<string, THREE.Mesh>} */
const _meshMap = new Map();
/** @type {Map<string, THREE.Group>} */
const _zoneMap = new Map();

const KitchenModel = {
  /** @type {THREE.Group} */
  get root() { return _root; },

  /**
   * Load and index the kitchen model.
   * Falls back to procedural geometry if GLB is not found.
   * @param {THREE.Scene} scene
   * @returns {Promise<void>}
   */
  async init(scene) {
    _root = new THREE.Group();
    _root.name = 'kitchen_root';
    scene.add(_root);

    try {
      const gltf = await Loader.loadGLTF('/models/kitchen-draco.glb', (p) => {
        EventBus.emit('loading:progress', { progress: p * 0.6 });
      });
      _root.add(gltf.scene);
      _indexMeshes(_root);
    } catch {
      console.warn('[KitchenModel] GLB not found — building procedural scene');
      _buildProceduralScene(_root);
      _indexMeshes(_root);
    }

    EventBus.emit('loading:progress', { progress: 0.65 });
  },

  /**
   * Get a single mesh by exact name.
   * @param {string} name
   * @returns {THREE.Mesh|undefined}
   */
  getMesh(name) {
    return _meshMap.get(name);
  },

  /**
   * Get all meshes whose names start with a prefix.
   * @param {string} prefix — e.g. 'facade_', 'drawer_island'
   * @returns {THREE.Mesh[]}
   */
  getMeshesByPrefix(prefix) {
    const result = [];
    for (const [name, mesh] of _meshMap) {
      if (name.startsWith(prefix)) result.push(mesh);
    }
    return result;
  },

  /**
   * @param {string} zone — 'island' | 'upper' | 'base' | 'appliances'
   * @returns {THREE.Group|undefined}
   */
  getZoneGroup(zone) {
    return _zoneMap.get(`zone_${zone}`);
  },

  /**
   * All meshes that should respond to raycasting (drawers, doors).
   * @returns {THREE.Mesh[]}
   */
  getInteractiveMeshes() {
    const result = [];
    for (const [name, mesh] of _meshMap) {
      if (name.startsWith('drawer_') || name.startsWith('door_')) {
        result.push(mesh);
      }
    }
    return result;
  },

  /** @returns {string[]} */
  getInteractivePartNames() {
    return this.getInteractiveMeshes().map(m => m.name);
  },

  /** @returns {Map<string, THREE.Mesh>} */
  getAllMeshes() {
    return _meshMap;
  },
};

/** @param {THREE.Object3D} root */
function _indexMeshes(root) {
  root.traverse((obj) => {
    if (obj.isMesh) {
      _meshMap.set(obj.name, obj);
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
    if (obj.isGroup && obj.name.startsWith('zone_')) {
      _zoneMap.set(obj.name, obj);
    }
  });
  console.info(`[KitchenModel] Indexed ${_meshMap.size} meshes, ${_zoneMap.size} zones`);
}

/** Procedural kitchen for dev/demo when no GLB is present */
function _buildProceduralScene(root) {
  const mat = (color, roughness = 0.4, metalness = 0) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness });

  // Zones
  const zoneIsland    = new THREE.Group(); zoneIsland.name = 'zone_island';
  const zoneUpper     = new THREE.Group(); zoneUpper.name  = 'zone_upper';
  const zoneBase      = new THREE.Group(); zoneBase.name   = 'zone_base';
  const zoneAppliance = new THREE.Group(); zoneAppliance.name = 'zone_appliances';
  const zoneEnv       = new THREE.Group(); zoneEnv.name    = 'zone_env';
  root.add(zoneIsland, zoneUpper, zoneBase, zoneAppliance, zoneEnv);

  const facadeMat      = mat(0xF5F0EB, 0.35);
  const counterMat     = mat(0xd0cdc8, 0.15, 0.0);
  const applianceMat   = mat(0xaaaaaa, 0.2, 0.8);

  // ── Floor & Walls ──────────────────────────────────────
  const floor = _box(0xc8c2b8, [10, 0.05, 8], [0, -0.025, 0], 'floor_main');
  floor.receiveShadow = true; zoneEnv.add(floor);
  const wallBack = _box(0xeae6e0, [10, 5, 0.1], [0, 2.5, -4], 'wall_back');
  zoneEnv.add(wallBack);
  const wallLeft = _box(0xe8e4de, [0.1, 5, 8], [-5, 2.5, 0], 'wall_left');
  zoneEnv.add(wallLeft);

  // ── Base cabinets (left run) ───────────────────────────
  [[-3.5, 0], [-2.5, 0], [-1.5, 0], [-0.5, 0]].forEach(([x], i) => {
    const cab = _box(facadeMat, [0.9, 0.85, 0.58], [x + (i === 0 ? 0 : 0), 0.425, -3.4], `facade_base_0${i+1}`);
    zoneBase.add(cab);
    // drawers on first two, doors on last two
    if (i < 2) {
      const drawer = _box(facadeMat, [0.85, 0.18, 0.02], [x, 0.62, -3.11], `drawer_base_0${i+1}`);
      drawer.userData.pivotOffset = new THREE.Vector3(0, -0.09, 0);
      zoneBase.add(drawer);
    } else {
      const door = _box(facadeMat, [0.85, 0.8, 0.02], [x, 0.4, -3.11], `door_base_0${i-1}`);
      door.userData.pivotOffset = new THREE.Vector3(-0.425, 0, 0);
      zoneBase.add(door);
    }
    // handles
    const handle = _box(0xd0d0d0, [0.25, 0.018, 0.018], [x, 0.72, -3.1], `handle_base_0${i+1}`);
    zoneBase.add(handle);
  });
  // Countertop main
  const counter = _box(counterMat, [4.2, 0.04, 0.65], [-2, 0.87, -3.4], 'countertop_main');
  zoneBase.add(counter);

  // ── Upper cabinets ─────────────────────────────────────
  [[-3.5, 0], [-2.5, 0], [-1.5, 0], [-0.5, 0]].forEach(([x], i) => {
    const ucab = _box(facadeMat, [0.9, 0.7, 0.35], [x, 2.05, -3.58], `facade_upper_0${i+1}`);
    zoneUpper.add(ucab);
    if (i % 2 === 0) {
      const door = _box(facadeMat, [0.85, 0.65, 0.02], [x, 2.05, -3.4], `door_upper_0${Math.floor(i/2)+1}`);
      door.userData.pivotOffset = new THREE.Vector3(-0.425, 0, 0);
      zoneUpper.add(door);
    }
    const uhandle = _box(0xd0d0d0, [0.25, 0.018, 0.018], [x, 1.74, -3.39], `handle_upper_0${i+1}`);
    zoneUpper.add(uhandle);
  });

  // ── Island ─────────────────────────────────────────────
  const islandBase = _box(facadeMat, [2.4, 0.9, 1.2], [0.8, 0.45, 0], 'facade_island_01');
  zoneIsland.add(islandBase);
  const islandCounter = _box(counterMat, [2.6, 0.04, 1.4], [0.8, 0.92, 0], 'countertop_island');
  zoneIsland.add(islandCounter);
  [[0, 0], [1.0, 0], [-0.5, 0]].forEach(([x], i) => {
    const d = _box(facadeMat, [0.65, 0.18, 0.02], [0.8 + x, 0.62, -0.595], `drawer_island_0${i+1}`);
    d.userData.pivotOffset = new THREE.Vector3(0, -0.09, 0);
    zoneIsland.add(d);
    const h = _box(0xd0d0d0, [0.22, 0.015, 0.015], [0.8 + x, 0.72, -0.58], `handle_island_0${i+1}`);
    zoneIsland.add(h);
  });

  // ── Appliances ─────────────────────────────────────────
  const oven = _box(applianceMat, [0.6, 0.6, 0.58], [3.5, 0.7, -3.4], 'appliance_oven');
  zoneAppliance.add(oven);
  const hood = _box(applianceMat, [0.9, 0.25, 0.38], [3.5, 2.2, -3.6], 'appliance_hood');
  zoneAppliance.add(hood);
  const fridge = _box(applianceMat, [0.75, 1.9, 0.7], [4.1, 0.95, -3.6], 'appliance_fridge');
  zoneAppliance.add(fridge);

  // ── Sink ───────────────────────────────────────────────
  const sink = _box(0x909090, [0.8, 0.2, 0.48], [-4.2, 0.87, -3.4], 'sink_basin');
  zoneAppliance.add(sink);
}

function _box(matOrColor, size, pos, name) {
  const geo = new THREE.BoxGeometry(...size);
  const mat = matOrColor instanceof THREE.Material
    ? matOrColor
    : new THREE.MeshStandardMaterial({ color: matOrColor, roughness: 0.35 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = name;
  mesh.position.set(...pos);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export default KitchenModel;
