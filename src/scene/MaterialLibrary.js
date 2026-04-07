import * as THREE from 'three';
import Loader from '../core/Loader.js';
import Store from '../core/Store.js';
import EventBus from '../core/EventBus.js';
import KitchenModel from './KitchenModel.js';

/**
 * MaterialLibrary — creates, caches, and swaps all PBR materials.
 */

/** @type {Map<string, THREE.MeshStandardMaterial>} */
const _facadeMats = new Map();
/** @type {Map<string, THREE.MeshPhysicalMaterial>} */
const _countertopMats = new Map();
/** @type {Map<string, THREE.MeshStandardMaterial>} */
const _handleMats = new Map();

/** loaded from config JSON */
let _colorsConfig = [];
let _materialsConfig = { countertops: [], handles: [] };

const MaterialLibrary = {
  /**
   * @param {Object} colorsConfig
   * @param {Object} materialsConfig
   */
  init(colorsConfig, materialsConfig) {
    _colorsConfig = colorsConfig.colors;
    _materialsConfig = materialsConfig;

    // Listen to config events
    EventBus.on('config:facadeColor',  (e) => this.setFacadeColor(e.detail.colorId));
    EventBus.on('config:countertop',   (e) => this.setCountertopMaterial(e.detail.materialId));
    EventBus.on('config:handleFinish', (e) => this.setHandleFinish(e.detail.finishId));
  },

  // ── Facade ────────────────────────────────────────────

  /** @param {string} colorId */
  setFacadeColor(colorId) {
    const def = _colorsConfig.find(c => c.id === colorId);
    if (!def) return;

    if (!_facadeMats.has(colorId)) {
      const mat = new THREE.MeshStandardMaterial({
        color:     new THREE.Color(def.hex),
        roughness: def.roughness,
        metalness: def.metalness,
        name:      `facade_${colorId}`,
      });
      _facadeMats.set(colorId, mat);
    }

    const mat = _facadeMats.get(colorId);
    KitchenModel.getMeshesByPrefix('facade_').forEach(m => { m.material = mat; });
    KitchenModel.getMeshesByPrefix('drawer_').forEach(m => { m.material = mat; });
    KitchenModel.getMeshesByPrefix('door_').forEach(m => { m.material = mat; });

    Store.state.facadeColorId = colorId;
    _updatePrice();
  },

  // ── Countertop ────────────────────────────────────────

  /** @param {string} materialId */
  async setCountertopMaterial(materialId) {
    const def = _materialsConfig.countertops.find(c => c.id === materialId);
    if (!def) return;

    if (!_countertopMats.has(materialId)) {
      const mat = new THREE.MeshPhysicalMaterial({
        roughness: def.roughness,
        metalness: def.metalness,
        clearcoat: def.clearcoat ?? 0,
        clearcoatRoughness: 0.1,
        name: `countertop_${materialId}`,
      });

      // Load textures (KTX2 or fallback PNG)
      try {
        const base = def.texturePath;
        const [diff, nor, rough] = await Promise.all([
          Loader.loadTexture(`${base}/${def.textureFiles.diff}`, true).catch(() =>
            Loader.loadTexture(`${base}/${def.textureFiles.diff.replace('.ktx2', '_diff.webp')}`, true).catch(() => null)
          ),
          Loader.loadTexture(`${base}/${def.textureFiles.nor}`, false).catch(() => null),
          Loader.loadTexture(`${base}/${def.textureFiles.rough}`, false).catch(() => null),
        ]);
        if (diff)  { mat.map = diff; }
        if (nor)   { mat.normalMap = nor; mat.normalScale.set(1, 1); }
        if (rough) { mat.roughnessMap = rough; }
        mat.needsUpdate = true;
      } catch {
        // Use color-only fallback
        const colorMap = { marble: 0xdbd7d2, wood: 0x8b6914, concrete: 0x909090, quartz: 0xe8e4df };
        mat.color.set(colorMap[materialId] ?? 0xcccccc);
      }

      _countertopMats.set(materialId, mat);
    }

    const mat = _countertopMats.get(materialId);
    KitchenModel.getMeshesByPrefix('countertop_').forEach(m => { m.material = mat; });

    Store.state.countertopMaterialId = materialId;
    _updatePrice();
  },

  // ── Handle Finish ─────────────────────────────────────

  /** @param {string} finishId */
  setHandleFinish(finishId) {
    const def = _materialsConfig.handles.find(h => h.id === finishId);
    if (!def) return;

    if (!_handleMats.has(finishId)) {
      const mat = new THREE.MeshStandardMaterial({
        color:     new THREE.Color(def.color),
        roughness: def.roughness,
        metalness: def.metalness,
        name:      `handle_${finishId}`,
      });
      _handleMats.set(finishId, mat);
    }

    const mat = _handleMats.get(finishId);
    KitchenModel.getMeshesByPrefix('handle_').forEach(m => { m.material = mat; });
    KitchenModel.getMeshesByPrefix('faucet_').forEach(m => { m.material = mat; });

    Store.state.handleFinishId = finishId;
    _updatePrice();
  },

  dispose() {
    for (const m of _facadeMats.values()) m.dispose();
    for (const m of _countertopMats.values()) m.dispose();
    for (const m of _handleMats.values()) m.dispose();
    _facadeMats.clear();
    _countertopMats.clear();
    _handleMats.clear();
  },
};

function _updatePrice() {
  const snap = Store.getSnapshot();
  const colorDef  = _colorsConfig.find(c => c.id === snap.facadeColorId) ?? { priceDelta: 0 };
  const ctDef     = _materialsConfig.countertops.find(c => c.id === snap.countertopMaterialId) ?? { priceDelta: 0 };
  const handleDef = _materialsConfig.handles.find(h => h.id === snap.handleFinishId) ?? { priceDelta: 0 };
  Store.state.totalPrice = snap.basePrice + colorDef.priceDelta + ctDef.priceDelta + handleDef.priceDelta;
}

export default MaterialLibrary;
