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

/**
 * Procedural kitchen — simple, clean layout with an island.
 *
 * Room coords: floor at y=0, back wall at z=-3, left wall at x=-3.
 * Standard dimensions: base cabinets 0.85m tall, 0.6m deep, counter at y=0.9m.
 * Uppers hang at y=1.5m, 0.7m tall, 0.35m deep.
 * Island: 1.8m × 0.9m, 1.2m aisle clearance from the back run.
 */
function _buildProceduralScene(root) {
  const mat = (color, roughness = 0.4, metalness = 0) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness });

  // Zones
  const zoneIsland    = new THREE.Group(); zoneIsland.name    = 'zone_island';
  const zoneUpper     = new THREE.Group(); zoneUpper.name     = 'zone_upper';
  const zoneBase      = new THREE.Group(); zoneBase.name      = 'zone_base';
  const zoneAppliance = new THREE.Group(); zoneAppliance.name = 'zone_appliances';
  const zoneEnv       = new THREE.Group(); zoneEnv.name       = 'zone_env';
  root.add(zoneIsland, zoneUpper, zoneBase, zoneAppliance, zoneEnv);

  const facadeMat      = mat(0xF5F0EB, 0.35);
  const facadeUpperMat = mat(0xE8E0D3, 0.4);
  const counterMat     = mat(0xd0cdc8, 0.15, 0.0);
  const backsplashMat  = mat(0xC9BFB1, 0.2, 0.05);
  const applianceMat   = mat(0xaaaaaa, 0.25, 0.85);
  // Interior cabinet surfaces — birch-ply tone, double-sided so they show from inside
  const interiorMat    = new THREE.MeshStandardMaterial({
    color: 0xDDD0B8, roughness: 0.7, metalness: 0, side: THREE.DoubleSide,
  });

  // ── Floor & walls ──────────────────────────────────────
  const floor = _box(0xc8c2b8, [8, 0.04, 7], [0, -0.02, 0], 'floor_main');
  zoneEnv.add(floor);
  zoneEnv.add(_box(0xeae6e0, [8, 3.2, 0.08], [0, 1.6, -3.5], 'wall_back'));

  // ── Back-wall base run ─────────────────────────────────
  // Layout: 6 bays of 0.6m = 3.6m total, centered at x=0.
  //   [drawer][drawer][door-L][door-R][oven][door]
  // Plus a tall fridge unit standing to the right of bay 6.
  const BAY_W = 0.6, BAY_H = 0.85, BAY_D = 0.6;
  const baseCenter = 0, baseZ = -3.5 + BAY_D / 2; // front face near z=-3.2
  const bayX = [-1.5, -0.9, -0.3, 0.3, 0.9, 1.5].map(x => x + baseCenter);
  // Bay kinds: d=drawer stack, D=door, o=oven bay (no facade)
  const bayKinds = ['d', 'd', 'D', 'D', 'o', 'D'];

  bayKinds.forEach((kind, i) => {
    const x = bayX[i];
    const idx = String(i + 1).padStart(2, '0');
    if (kind === 'o') return; // oven bay — appliance fills this slot

    // Hollow cabinet shell (no solid body — interior visible when door/drawer opens)
    _cabinetShell(facadeMat, interiorMat, [BAY_W, BAY_H, BAY_D],
      [x, BAY_H / 2, baseZ], `facade_base_${idx}`, zoneBase);

    if (kind === 'd') {
      const gap = 0.012;
      const dh  = (BAY_H - 0.06 - gap * 2) / 3;
      const DRAWER_DEPTH = BAY_D - 0.06; // box reaches almost to cabinet back
      for (let k = 0; k < 3; k++) {
        const y  = 0.03 + dh / 2 + k * (dh + gap);
        const di = String(k + 1);
        const fW = BAY_W - 0.02 - _PANEL * 2; // face fits inside the shell
        const drawer = _box(facadeMat, [fW, dh - _PANEL, 0.02],
          [x, y, baseZ + BAY_D / 2 + 0.011], `drawer_base_${idx}_${di}`);
        drawer.userData.openDir = 1;
        // Handle
        drawer.add(_box(0xd0d0d0, [0.16, 0.015, 0.015],
          [0, dh / 2 - 0.04, 0.014], `handle_base_${idx}_${di}`));
        // Drawer box extends into cabinet
        _drawerBox(interiorMat, drawer, fW, dh - _PANEL, DRAWER_DEPTH);
        zoneBase.add(drawer);
      }
    } else {
      // Door — hinged at left edge; handle is a pivot child so it swings along
      const doorW = BAY_W - 0.02 - _PANEL * 2;
      const pivot = new THREE.Group();
      pivot.name = `pivot_door_base_${idx}`;
      pivot.position.set(x - doorW / 2, BAY_H / 2, baseZ + BAY_D / 2 + 0.011);
      pivot.add(_box(facadeMat, [doorW, BAY_H - 0.06, 0.02],
        [doorW / 2, 0, 0], `door_base_${idx}`));
      pivot.add(_box(0xd0d0d0, [0.015, 0.18, 0.015],
        [doorW - 0.04, 0, 0.014], `handle_base_${idx}`));
      zoneBase.add(pivot);
    }
  });

  // Continuous countertop over the back run — spans all 6 bays (3.6m), stops before the fridge.
  zoneBase.add(_box(counterMat, [6 * BAY_W + 0.04, 0.04, BAY_D + 0.04],
    [(bayX[0] + bayX[5]) / 2, BAY_H + 0.02, baseZ], 'countertop_back'));

  // Backsplash — fills the wall between countertop and upper cabinets along the run,
  // and continues full-height behind the oven bay so the wall doesn't read as empty.
  const counterTop = BAY_H + 0.04;
  const upperBottom = 1.9 - 0.7 / 2; // UY - UH/2 = 1.55
  const bsHeight = upperBottom - counterTop; // ≈ 0.61
  const bsZ = -3.5 + 0.04 + 0.005; // just in front of wall_back
  // Strip behind the cabinet run on the left (bays 1-4)
  zoneEnv.add(_box(backsplashMat, [4 * BAY_W, bsHeight, 0.02],
    [(bayX[0] + bayX[3]) / 2, counterTop + bsHeight / 2, bsZ], 'backsplash_run'));
  // Strip behind the cabinet on the right (bay 6)
  zoneEnv.add(_box(backsplashMat, [BAY_W, bsHeight, 0.02],
    [bayX[5], counterTop + bsHeight / 2, bsZ], 'backsplash_run_2'));
  // Tall panel behind the oven (counter top up to under the hood)
  const ovenBayX = bayX[4];
  const hoodBottom = 2.05 - 0.25 / 2; // 1.925
  zoneEnv.add(_box(backsplashMat, [BAY_W, hoodBottom - counterTop, 0.02],
    [ovenBayX, (counterTop + hoodBottom) / 2, bsZ], 'backsplash_oven'));

  // ── Upper cabinets (skip over the oven only — hood takes that slot) ──
  bayKinds.forEach((kind, i) => {
    if (kind === 'o') return;
    const x = bayX[i];
    const idx = String(i + 1).padStart(2, '0');
    const UH = 0.7, UD = 0.35, UY = 1.9;
    _cabinetShell(facadeUpperMat, interiorMat, [BAY_W, UH, UD],
      [x, UY, -3.5 + UD / 2], `facade_upper_${idx}`, zoneUpper);
    const doorW = BAY_W - 0.02 - _PANEL * 2;
    const pivot = new THREE.Group();
    pivot.name = `pivot_door_upper_${idx}`;
    pivot.position.set(x - doorW / 2, UY, -3.5 + UD + 0.011);
    pivot.add(_box(facadeUpperMat, [doorW, UH - 0.04, 0.02],
      [doorW / 2, 0, 0], `door_upper_${idx}`));
    pivot.add(_box(0xd0d0d0, [0.015, 0.15, 0.015],
      [doorW - 0.04, -UH / 2 + 0.1, 0.014], `handle_upper_${idx}`));
    zoneUpper.add(pivot);
  });

  // ── Appliances ─────────────────────────────────────────
  const ovenX = bayX[4]; // oven bay
  zoneAppliance.add(_box(applianceMat, [BAY_W, BAY_H, BAY_D],
    [ovenX, BAY_H / 2, baseZ], 'appliance_oven'));
  zoneAppliance.add(_box(0x202428, [BAY_W - 0.08, BAY_H - 0.18, 0.01],
    [ovenX, BAY_H / 2, baseZ + BAY_D / 2 + 0.012], 'appliance_oven_glass'));
  zoneAppliance.add(_box(0xd0d0d0, [BAY_W - 0.1, 0.02, 0.025],
    [ovenX, BAY_H - 0.08, baseZ + BAY_D / 2 + 0.025], 'handle_oven'));
  // Hood above the oven
  zoneAppliance.add(_box(applianceMat, [0.7, 0.25, 0.35],
    [ovenX, 2.05, -3.5 + 0.175], 'appliance_hood'));
  // Fridge tall unit — sits flush against the right end of the cabinet run
  const fridgeX = bayX[bayX.length - 1] + BAY_W / 2 + 0.4; // 0.4 = fridge half-width
  zoneAppliance.add(_box(applianceMat, [0.8, 2.0, 0.7],
    [fridgeX, 1.0, -3.5 + 0.35], 'appliance_fridge'));
  zoneAppliance.add(_box(0xd0d0d0, [0.02, 0.22, 0.025],
    [fridgeX + 0.32, 1.4, -3.5 + 0.7 + 0.015], 'handle_fridge'));

  // ── Sink (set into the countertop on the left) ─────────
  const sinkX = bayX[0];
  zoneAppliance.add(_box(0x909090, [0.5, 0.02, 0.36],
    [sinkX, BAY_H + 0.035, baseZ], 'sink_basin'));
  zoneAppliance.add(_box(0xd0d0d0, [0.03, 0.25, 0.03],
    [sinkX - 0.16, BAY_H + 0.16, baseZ - 0.15], 'faucet'));

  // ── Island (1.8 × 0.9, 1.2m in front of back run) ──────
  const ISL_W = 1.8, ISL_H = 0.85, ISL_D = 0.9;
  const islX = 0, islZ = -0.6; // 1.2m aisle from front of back counters
  // Body
  zoneIsland.add(_box(facadeMat, [ISL_W, ISL_H, ISL_D],
    [islX, ISL_H / 2, islZ], 'facade_island_01'));
  // Countertop with 0.3m seating overhang on the +Z side
  zoneIsland.add(_box(counterMat, [ISL_W + 0.1, 0.04, ISL_D + 0.35],
    [islX, ISL_H + 0.02, islZ + 0.125], 'countertop_island'));
  // Drawers on the -Z face (kitchen-working side, opposite the seating overhang).
  // They open toward -Z so they slide outward, away from the island body.
  const drawerFaceZ = islZ - ISL_D / 2 - 0.011;
  const ISL_DRAWER_DEPTH = ISL_D - 0.06;
  [-0.6, 0, 0.6].forEach((off, i) => {
    const idx = String(i + 1).padStart(2, '0');
    const dx = islX + off;
    const fW = 0.55, fH = 0.18;
    const drawer = _box(facadeMat, [fW, fH, 0.02],
      [dx, 0.62, drawerFaceZ], `drawer_island_${idx}`);
    drawer.userData.openDir = -1; // slides -Z (outward from the island body)
    const handle = _box(0xd0d0d0, [0.18, 0.015, 0.015],
      [0, 0.05, -0.014], `handle_island_${idx}`);
    drawer.add(handle);
    // Box extends in +Z (into the island body) — zDir = +1
    _drawerBox(interiorMat, drawer, fW, fH, ISL_DRAWER_DEPTH, 1);
    zoneIsland.add(drawer);
  });
  // Two bar stools hint at the seating side
  for (const sx of [-0.5, 0.5]) {
    const seat = _box(0x2a2a28, [0.32, 0.04, 0.32],
      [islX + sx, 0.6, islZ + ISL_D / 2 + 0.4], `stool_${sx < 0 ? 'l' : 'r'}_seat`);
    zoneEnv.add(seat);
    const leg = _box(0x555555, [0.04, 0.6, 0.04],
      [islX + sx, 0.3, islZ + ISL_D / 2 + 0.4], `stool_${sx < 0 ? 'l' : 'r'}_leg`);
    zoneEnv.add(leg);
  }

  // Pendant lights over the island
  for (const px of [-0.5, 0.5]) {
    const cord = _box(0x333333, [0.01, 0.9, 0.01],
      [islX + px, 2.35, islZ], `pendant_${px < 0 ? 'l' : 'r'}_cord`);
    zoneEnv.add(cord);
    const shade = new THREE.Mesh(
      new THREE.ConeGeometry(0.14, 0.22, 24, 1, true),
      mat(0x2a2a28, 0.6, 0.1),
    );
    shade.position.set(islX + px, 1.8, islZ);
    shade.rotation.x = Math.PI;
    shade.name = `pendant_${px < 0 ? 'l' : 'r'}_shade`;
    shade.castShadow = true;
    zoneEnv.add(shade);
  }
}

const _PANEL = 0.018; // standard 18 mm cabinet panel

/**
 * Hollow cabinet shell — 5 exterior panels (no front face) + interior back + bottom shelf.
 * Exterior panels use extMat; interior surfaces use intMat (DoubleSide so they're visible).
 */
function _cabinetShell(extMat, intMat, [w, h, d], [cx, cy, cz], nameBase, zone) {
  const add = (m, sz, pos, nm) => zone.add(_box(m, sz, pos, nm));
  const T = _PANEL;
  add(extMat, [w, T,    d      ], [cx,          cy + h/2 - T/2,    cz          ], `${nameBase}_top`);
  add(extMat, [w, T,    d      ], [cx,          cy - h/2 + T/2,    cz          ], `${nameBase}_bot`);
  add(extMat, [T, h,    d      ], [cx - w/2 + T/2, cy,             cz          ], `${nameBase}_l`);
  add(extMat, [T, h,    d      ], [cx + w/2 - T/2, cy,             cz          ], `${nameBase}_r`);
  add(extMat, [w, h,    T      ], [cx,          cy,                cz - d/2 + T/2], `${nameBase}_back`);
  // Interior back panel (visible when door swings open)
  add(intMat, [w - T*2, h - T*2, T], [cx,       cy,                cz - d/2 + T*2], `int_${nameBase}_iback`);
  // Interior bottom shelf
  add(intMat, [w - T*2, T, d - T*3], [cx,        cy - h/2 + T*2,   cz + T/2     ], `int_${nameBase}_shelf`);
}

/**
 * Attach a drawer box (bottom + two sides + back) as children of the face mesh.
 * zDir = -1 for standard drawers (box extends into cabinet, −Z local).
 * zDir = +1 for island drawers on the −Z face (box extends into island, +Z local).
 */
function _drawerBox(intMat, faceMesh, fW, fH, depth, zDir = -1) {
  const T = _PANEL;
  const d = depth;
  const zOff  = zDir * (d / 2 + 0.01);
  const zBack = zDir * (d + 0.01) - zDir * (T / 2);
  const panels = [
    { sz: [fW - T*2, T,       d    ], lp: [0,             -fH/2 + T/2, zOff ] }, // bottom
    { sz: [T,        fH - T,  d    ], lp: [-(fW/2 - T/2),  0,          zOff ] }, // left
    { sz: [T,        fH - T,  d    ], lp: [ fW/2 - T/2,    0,          zOff ] }, // right
    { sz: [fW - T*2, fH - T,  T    ], lp: [0,               0,          zBack] }, // back
  ];
  panels.forEach(({ sz, lp }, i) => {
    const m = _box(intMat, sz, lp, `int_${faceMesh.name}_p${i}`);
    faceMesh.add(m);
  });
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
