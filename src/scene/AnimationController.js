import { gsap } from 'gsap';
import EventBus from '../core/EventBus.js';
import Store from '../core/Store.js';
import KitchenModel from './KitchenModel.js';

/**
 * AnimationController — manages open/close GSAP timelines for
 * drawers (translate Z) and cabinet doors (rotate Y around hinge pivot group).
 */

const _DRAWER_OPEN_Z  = 0.38;   // metres to slide out
const _DOOR_OPEN_DEG  = -95;    // degrees to swing open (left-hinged)
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

    _activeTweens.get(partName)?.kill();

    const isDrawer = partName.startsWith('drawer_');
    const isDoor   = partName.startsWith('door_');

    if (isDrawer) {
      const dir = mesh.userData.openDir ?? 1;
      const tween = gsap.to(mesh.position, {
        z: mesh.position.z + _DRAWER_OPEN_Z * dir,
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
      // Rotate the hinge pivot group (parent) — falls back to mesh if unparented.
      const target = _hingeFor(mesh);
      const rad = (_DOOR_OPEN_DEG * Math.PI) / 180;
      const tween = gsap.to(target.rotation, {
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
      const dir = mesh.userData.openDir ?? 1;
      const tween = gsap.to(mesh.position, {
        z: mesh.position.z - _DRAWER_OPEN_Z * dir,
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
      const target = _hingeFor(mesh);
      const tween = gsap.to(target.rotation, {
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

/**
 * Resolve the object to rotate so the door swings around its hinge edge.
 * Prefers the mesh's parent if it's a named pivot group.
 */
function _hingeFor(mesh) {
  const parent = mesh.parent;
  if (parent && parent.isGroup && parent.name.startsWith('pivot_')) {
    return parent;
  }
  return mesh;
}

function _syncStore() {
  Store.state.openParts = [..._openParts];
}

export default AnimationController;
