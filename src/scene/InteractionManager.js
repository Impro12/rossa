import * as THREE from 'three';
import EventBus from '../core/EventBus.js';
import Store from '../core/Store.js';
import KitchenModel from './KitchenModel.js';

/**
 * InteractionManager — raycaster-based hover and click detection.
 * Dispatches 'interact:hover' and 'interact:click' events via EventBus.
 */

const _raycaster = new THREE.Raycaster();
const _pointer   = new THREE.Vector2(-10, -10);

let _camera = null;
let _enabled = true;
let _interactiveTargets = [];
let _lastHovered = null;

const InteractionManager = {
  /**
   * @param {THREE.PerspectiveCamera} camera
   * @param {HTMLElement} domElement
   */
  init(camera, domElement) {
    _camera = camera;

    domElement.addEventListener('pointermove', _onMove);
    domElement.addEventListener('click',       _onClick);
    domElement.addEventListener('pointerdown', () => { _pointerDown = true; });
    domElement.addEventListener('pointerup',   () => { _pointerDown = false; });

    // Update target list when model is ready
    _refreshTargets();
  },

  /** @param {boolean} enabled */
  setEnabled(enabled) {
    _enabled = enabled;
  },

  /** @param {THREE.Mesh[]} meshes */
  setInteractiveTargets(meshes) {
    _interactiveTargets = meshes;
  },

  /**
   * Call each frame from Ticker to update raycasting.
   */
  update() {
    if (!_camera || !_enabled || !_interactiveTargets.length) return;

    _raycaster.setFromCamera(_pointer, _camera);
    const hits = _raycaster.intersectObjects(_interactiveTargets, false);

    const hovered = hits.length > 0 ? hits[0].object.name : null;

    if (hovered !== _lastHovered) {
      _lastHovered = hovered;
      Store.state.hoveredPart = hovered;
      EventBus.emit('interact:hover', { meshName: hovered });

      document.body.style.cursor = hovered ? 'pointer' : 'default';
    }
  },
};

let _pointerDown = false;
let _pointerMoved = false;
let _pointerStartX = 0;
let _pointerStartY = 0;

function _onMove(e) {
  _pointer.x =  (e.clientX / innerWidth)  * 2 - 1;
  _pointer.y = -(e.clientY / innerHeight) * 2 + 1;

  const dx = e.clientX - _pointerStartX;
  const dy = e.clientY - _pointerStartY;
  if (Math.hypot(dx, dy) > 4) _pointerMoved = true;
}

function _onClick(e) {
  if (_pointerMoved) { _pointerMoved = false; return; } // ignore drags
  _pointerStartX = e.clientX;
  _pointerStartY = e.clientY;
  _pointerMoved = false;

  if (!_camera || !_enabled) return;
  _raycaster.setFromCamera(_pointer, _camera);
  const hits = _raycaster.intersectObjects(_interactiveTargets, false);
  if (hits.length > 0) {
    EventBus.emit('interact:click', { meshName: hits[0].object.name });
  }
}

function _refreshTargets() {
  // Called after model is ready
  setTimeout(() => {
    _interactiveTargets = KitchenModel.getInteractiveMeshes();
  }, 500);
}

export default InteractionManager;
