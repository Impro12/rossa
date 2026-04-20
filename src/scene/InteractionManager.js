import * as THREE from 'three';
import EventBus from '../core/EventBus.js';
import Store from '../core/Store.js';
import KitchenModel from './KitchenModel.js';

/**
 * InteractionManager — raycaster-based hover and click detection.
 *
 * Mobile notes:
 *  - Uses getBoundingClientRect for accurate NDC (canvas may not fill viewport).
 *  - Updates _pointer on pointerdown so taps with no pointermove still raycast.
 *  - Handles pointercancel: when touch-action:pan-y causes the browser to claim
 *    a scroll gesture, pointercancel fires instead of pointerup+click. We treat
 *    that as a tap if movement stayed within threshold.
 *  - Fires interaction on pointerup (not click) so it works before the 300ms
 *    click-delay on some mobile browsers. A _fired flag prevents double-dispatch
 *    when the click event also arrives.
 */

const _raycaster = new THREE.Raycaster();
const _pointer   = new THREE.Vector2(-10, -10);

let _camera     = null;
let _domElement = null;
let _enabled    = true;
let _interactiveTargets = [];
let _lastHovered = null;

let _pointerDown   = false;
let _pointerMoved  = false;
let _pointerStartX = 0;
let _pointerStartY = 0;
let _pointerDirty  = false;
let _firedOnUp     = false; // prevents double-fire when click also arrives

const _DRAG_THRESHOLD = 8;

const InteractionManager = {
  init(camera, domElement) {
    _camera     = camera;
    _domElement = domElement;

    domElement.addEventListener('pointermove',  _onMove);
    domElement.addEventListener('pointerdown',  _onPointerDown);
    domElement.addEventListener('pointerup',    _onPointerUp);
    domElement.addEventListener('pointercancel',_onPointerCancel);
    domElement.addEventListener('click',        _onClick);

    _refreshTargets();
  },

  setEnabled(enabled) { _enabled = enabled; },
  setInteractiveTargets(meshes) { _interactiveTargets = meshes; },

  update() {
    if (!_camera || !_enabled || !_interactiveTargets.length || !_pointerDirty) return;
    _pointerDirty = false;

    _raycaster.setFromCamera(_pointer, _camera);
    const hits    = _raycaster.intersectObjects(_interactiveTargets, false);
    const hovered = hits.length > 0 ? hits[0].object.name : null;

    if (hovered !== _lastHovered) {
      _lastHovered = hovered;
      Store.state.hoveredPart = hovered;
      EventBus.emit('interact:hover', { meshName: hovered });
      document.body.style.cursor = hovered ? 'pointer' : 'default';
    }
  },
};

function _toNDC(clientX, clientY) {
  const rect = _domElement.getBoundingClientRect();
  return new THREE.Vector2(
     ((clientX - rect.left) / rect.width)  * 2 - 1,
    -((clientY - rect.top)  / rect.height) * 2 + 1,
  );
}

function _tryFire(clientX, clientY) {
  if (!_camera || !_enabled) return false;
  const ndc = _toNDC(clientX, clientY);
  _pointer.copy(ndc);
  _raycaster.setFromCamera(_pointer, _camera);
  const hits = _raycaster.intersectObjects(_interactiveTargets, false);
  if (hits.length > 0) {
    EventBus.emit('interact:click', { meshName: hits[0].object.name });
    return true;
  }
  return false;
}

function _onPointerDown(e) {
  _pointerDown   = true;
  _pointerMoved  = false;
  _firedOnUp     = false;
  _pointerStartX = e.clientX;
  _pointerStartY = e.clientY;

  // Update immediately so a no-move tap raycasts correctly on the next frame.
  const ndc = _toNDC(e.clientX, e.clientY);
  _pointer.copy(ndc);
  _pointerDirty = true;
}

function _onPointerUp(e) {
  _pointerDown = false;
  if (_pointerMoved) return;
  _firedOnUp = _tryFire(e.clientX, e.clientY);
}

function _onPointerCancel(e) {
  // Browser claimed the touch for scroll (touch-action:pan-y).
  // If movement was tiny it was still a tap — fire it.
  if (_pointerDown && !_pointerMoved) {
    _tryFire(_pointerStartX, _pointerStartY);
  }
  _pointerDown  = false;
  _pointerMoved = false;
  _firedOnUp    = false;
}

function _onMove(e) {
  const ndc = _toNDC(e.clientX, e.clientY);
  _pointer.copy(ndc);
  _pointerDirty = true;

  if (_pointerDown) {
    const dx = e.clientX - _pointerStartX;
    const dy = e.clientY - _pointerStartY;
    if (Math.hypot(dx, dy) > _DRAG_THRESHOLD) _pointerMoved = true;
  }
}

function _onClick(e) {
  // pointerup already handled it — skip to avoid double-dispatch.
  if (_firedOnUp) { _firedOnUp = false; return; }
  if (_pointerMoved) return;
  _tryFire(e.clientX, e.clientY);
}

function _refreshTargets() {
  setTimeout(() => {
    _interactiveTargets = KitchenModel.getInteractiveMeshes();
  }, 500);
}

export default InteractionManager;
