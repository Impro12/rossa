import * as THREE from 'three';
import { gsap } from 'gsap';

/**
 * DrawerController
 * Handles opening and closing of drawer meshes via pointer clicks and keyboard inputs.
 * Uses getBoundingClientRect for accurate raycasting regardless of canvas size/position.
 */

class DrawerController {
  constructor(camera, canvas, registry) {
    this.camera = camera;
    this.canvas = canvas;
    this.drawers = registry.drawers;

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();

    this.drawerStates = new Map(); // mesh -> { isOpen, isAnimating }
    this.focusIndex = -1;

    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);
    this._onKeyDown = this._onKeyDown.bind(this);

    this.pointerDownPos = { x: 0, y: 0 };

    this.canvas.addEventListener('pointerdown', this._onPointerDown);
    this.canvas.addEventListener('pointerup', this._onPointerUp);
    window.addEventListener('keydown', this._onKeyDown);
  }

  _onPointerDown(event) {
    this.pointerDownPos = { x: event.clientX, y: event.clientY };
  }

  _onPointerUp(event) {
    // Ignore if pointer moved > 5px (drag, not click)
    const dx = event.clientX - this.pointerDownPos.x;
    const dy = event.clientY - this.pointerDownPos.y;
    if (Math.sqrt(dx * dx + dy * dy) > 5) return;

    // Use getBoundingClientRect for accurate NDC coords
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersects = this.raycaster.intersectObjects(this.drawers, true);

    if (intersects.length > 0) {
      // Walk up until we find the registered drawer root
      let target = intersects[0].object;
      while (target && !this.drawers.includes(target)) {
        target = target.parent;
      }
      if (target && this.drawers.includes(target)) {
        this.toggleDrawer(target);
      }
    }
  }

  _onKeyDown(event) {
    if (this.drawers.length === 0) return;

    if (event.key === 'Tab') {
      event.preventDefault();
      if (event.shiftKey) {
        this.focusIndex = this.focusIndex <= 0 ? this.drawers.length - 1 : this.focusIndex - 1;
      } else {
        this.focusIndex = this.focusIndex >= this.drawers.length - 1 ? 0 : this.focusIndex + 1;
      }
      const focused = this.drawers[this.focusIndex];
      window.dispatchEvent(new CustomEvent('drawer:focused', { detail: { mesh: focused } }));
    } else if (event.key === ' ' || event.key === 'Enter') {
      if (this.focusIndex >= 0 && this.focusIndex < this.drawers.length) {
        event.preventDefault();
        this.toggleDrawer(this.drawers[this.focusIndex]);
      }
    }
  }

  toggleDrawer(drawerMesh) {
    if (!this.drawerStates.has(drawerMesh)) {
      this.drawerStates.set(drawerMesh, { isOpen: false, isAnimating: false });
    }

    const state = this.drawerStates.get(drawerMesh);
    if (state.isAnimating) return;

    // Store original Z once
    if (drawerMesh.userData.originalZ === undefined) {
      drawerMesh.userData.originalZ = drawerMesh.position.z;
    }

    state.isAnimating = true;
    const targetZ = state.isOpen
      ? drawerMesh.userData.originalZ
      : drawerMesh.userData.originalZ + 0.35;

    gsap.to(drawerMesh.position, {
      z: targetZ,
      duration: 0.55,
      ease: 'power2.out',
      onComplete: () => {
        state.isOpen = !state.isOpen;
        state.isAnimating = false;
      }
    });
  }

  destroy() {
    this.canvas.removeEventListener('pointerdown', this._onPointerDown);
    this.canvas.removeEventListener('pointerup', this._onPointerUp);
    window.removeEventListener('keydown', this._onKeyDown);
  }
}

export default DrawerController;
