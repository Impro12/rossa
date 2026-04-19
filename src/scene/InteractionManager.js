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

let _pointerDown    = false;
let _pointerMoved   = false;
let _pointerStartX  = 0;
let _pointerStartY  = 0;
let _pointerDirty   = false; // true when pointer moved since last raycast
const _DRAG_THRESHOLD = 5;

const InteractionManager = {
  /**
   * @param {THREE.PerspectiveCamera} camera
   * @param {HTMLElement} domElement
   */
  init(camera, domElement) {
    _camera = camera;

    domElement.addEventListener('pointermove', _onMove);
    domElement.addEventListener('pointerdown', _onPointerDown);
    domElement.addEventListener('pointerup',   _onPointerUp);
    domElement.addEventListener('click',       _onClick);

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
    if (!_camera || !_enabled || !_interactiveTargets.length || !_pointerDirty) return;
    _pointerDirty = false;

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

function _onMove(e) {
  _pointer.x =  (e.clientX / innerWidth)  * 2 - 1;
  _pointer.y = -(e.clientY / innerHeight) * 2 + 1;
  _pointerDirty = true;

  if (_pointerDown) {
    const dx = e.clientX - _pointerStartX;
    const dy = e.clientY - _pointerStartY;
    if (Math.hypot(dx, dy) > _DRAG_THRESHOLD) _pointerMoved = true;
  }
}

function _onPointerDown(e) {
  _pointerDown   = true;
  _pointerMoved  = false;
  _pointerStartX = e.clientX;
  _pointerStartY = e.clientY;
}

function _onPointerUp() {
  _pointerDown = false;
}

function _onClick() {
  if (_pointerMoved) return; // treat as drag, not a click
  if (!_camera || !_enabled) return;

  _raycaster.setFromCamera(_pointer, _camera);
  const hits = _raycaster.intersectObjects(_interactiveTargets, false);
  if (hits.length > 0) {
    EventBus.emit('interact:click', { meshName: hits[0].object.name });
  }
}

function _refreshTargets() {
  setTimeout(() => {
    _interactiveTargets = KitchenModel.getInteractiveMeshes();
  }, 500);
}

export default InteractionManager;
