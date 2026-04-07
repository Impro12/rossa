import { gsap } from 'gsap';
import * as THREE from 'three';
import EventBus from '../core/EventBus.js';
import Store from '../core/Store.js';
import KitchenModel from './KitchenModel.js';

/**
 * AnimationController — manages open/close GSAP timelines for
 * drawers (translate Z) and cabinet doors (rotate Y around pivot).
 */

const _DRAWER_OPEN_Z  = 0.38;   // metres to slide out
const _DOOR_OPEN_DEG  = -95;   // degrees to swing open (left-hinged)
const _DURATION       = 0.55;
const _EASE           = 'power3.inOut';

/** @type {Set<string>} */
const _openParts = new Set();

/** @type {Map<string, gsap.core.Tween>} */
const _activeTweens = new Map();

const AnimationController = {
  init() {
    EventBus.on('interact:click', (e) => this.toggle(e.detail.meshName));
  },

  /** @param {string} partName */
  toggle(partName) {
    if (_openParts.has(partName)) {
      this.close(partName);
    } else {
      this.open(partName);
    }
  },

  /** @param {string} partName */
  open(partName) {
    const mesh = KitchenModel.getMesh(partName);
    if (!mesh || _openParts.has(partName)) return;

    // Kill any running tween on this part
    _activeTweens.get(partName)?.kill();

    const isDrawer = partName.startsWith('drawer_');
    const isDoor   = partName.startsWith('door_');

    if (isDrawer) {
      const tween = gsap.to(mesh.position, {
        z: mesh.position.z + _DRAWER_OPEN_Z,
        duration: _DURATION,
        ease: _EASE,
        onComplete: () => {
          _openParts.add(partName);
          _syncStore();
          EventBus.emit('part:opened', { meshName: partName });
        },
      });
      _activeTweens.set(partName, tween);
    } else if (isDoor) {
      // Doors rotate around their left edge (pivot stored in userData or estimated)
      const pivotOffset = mesh.userData.pivotOffset ?? new THREE.Vector3(-mesh.geometry.parameters.width / 2 ?? -0.45, 0, 0);
      // Translate pivot to world origin, rotate, translate back
      const rad = THREE.MathUtils.degToRad(_DOOR_OPEN_DEG);
      const tween = gsap.to(mesh.rotation, {
        y: rad,
        duration: _DURATION + 0.1,
        ease: _EASE,
        onComplete: () => {
          _openParts.add(partName);
          _syncStore();
          EventBus.emit('part:opened', { meshName: partName });
        },
      });
      _activeTweens.set(partName, tween);
    }
  },

  /** @param {string} partName */
  close(partName) {
    const mesh = KitchenModel.getMesh(partName);
    if (!mesh || !_openParts.has(partName)) return;
    _activeTweens.get(partName)?.kill();

    const isDrawer = partName.startsWith('drawer_');
    const isDoor   = partName.startsWith('door_');

    if (isDrawer) {
      const tween = gsap.to(mesh.position, {
        z: mesh.position.z - _DRAWER_OPEN_Z,
        duration: _DURATION,
        ease: _EASE,
        onComplete: () => {
          _openParts.delete(partName);
          _syncStore();
          EventBus.emit('part:closed', { meshName: partName });
        },
      });
      _activeTweens.set(partName, tween);
    } else if (isDoor) {
      const tween = gsap.to(mesh.rotation, {
        y: 0,
        duration: _DURATION,
        ease: _EASE,
        onComplete: () => {
          _openParts.delete(partName);
          _syncStore();
          EventBus.emit('part:closed', { meshName: partName });
        },
      });
      _activeTweens.set(partName, tween);
    }
  },

  closeAll() {
    for (const name of [..._openParts]) {
      this.close(name);
    }
  },

  /** @param {string} partName */
  isOpen(partName) {
    return _openParts.has(partName);
  },
};

function _syncStore() {
  Store.state.openParts = [..._openParts];
}

export default AnimationController;
