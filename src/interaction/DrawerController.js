import * as THREE from 'three';
import { gsap } from 'gsap';

/**
 * DrawerController
 * Handles opening and closing of drawer meshes via pointer clicks and keyboard inputs.
 * Ensures animations do not stack.
 */

class DrawerController {
  constructor(camera, canvas, registry) {
    this.camera = camera;
    this.canvas = canvas;
    this.drawers = registry.drawers;

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();

    // Track state of each drawer
    this.drawerStates = new Map(); // mesh -> { isOpen: false, isAnimating: false }
    
    // Keyboard accessibility state
    this.focusIndex = -1; // index in this.drawers

    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);
    this._onKeyDown = this._onKeyDown.bind(this);

    this.pointerDownTime = 0;

    // Attach listeners
    this.canvas.addEventListener('pointerdown', this._onPointerDown);
    this.canvas.addEventListener('pointerup', this._onPointerUp);
    window.addEventListener('keydown', this._onKeyDown);
  }

  _onPointerDown() {
    this.pointerDownTime = performance.now();
  }

  _onPointerUp(event) {
    // Discriminate between click and drag (OrbitControls)
    if (performance.now() - this.pointerDownTime > 250) return;

    this.pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);

    const intersects = this.raycaster.intersectObjects(this.drawers, true);
    
    if (intersects.length > 0) {
      // Find the root drawer group/mesh that is stored in the registry
      let intersectedGroup = intersects[0].object;
      
      // Traverse up to find the object that's actually in our drawers array
      while (intersectedGroup && !this.drawers.includes(intersectedGroup)) {
        if (intersectedGroup.parent) {
          intersectedGroup = intersectedGroup.parent;
        } else {
          break;
        }
      }

      if (this.drawers.includes(intersectedGroup)) {
        this.toggleDrawer(intersectedGroup);
      }
    }
  }

  _onKeyDown(event) {
    if (this.drawers.length === 0) return;

    if (event.key === 'Tab') {
      event.preventDefault();
      // Cycle focus
      if (event.shiftKey) {
        this.focusIndex = this.focusIndex <= 0 ? this.drawers.length - 1 : this.focusIndex - 1;
      } else {
        this.focusIndex = this.focusIndex >= this.drawers.length - 1 ? 0 : this.focusIndex + 1;
      }
      
      // We could add a visual focus state here, but for now we just track it.
      // E.g., emitting an event that HoverHighlight listens to.
      const focusedDrawer = this.drawers[this.focusIndex];
      const customEvent = new CustomEvent('drawer:focused', { detail: { mesh: focusedDrawer }});
      window.dispatchEvent(customEvent);

    } else if (event.key === ' ' || event.key === 'Enter') {
      if (this.focusIndex >= 0 && this.focusIndex < this.drawers.length) {
        event.preventDefault();
        this.toggleDrawer(this.drawers[this.focusIndex]);
      }
    }
  }

  toggleDrawer(drawerMesh) {
    if (!this.drawerStates.has(drawerMesh)) {
       // Start strictly closed
      this.drawerStates.set(drawerMesh, { isOpen: false, isAnimating: false });
    }

    const state = this.drawerStates.get(drawerMesh);
    
    // Prevent animation stacking
    if (state.isAnimating) return;

    state.isAnimating = true;
    const targetZ = state.isOpen ? 0 : 0.35; // Slide out 35cm
    
    gsap.to(drawerMesh.position, {
      z: drawerMesh.userData.originalZ !== undefined ? drawerMesh.userData.originalZ + targetZ : drawerMesh.position.z + (state.isOpen ? -0.35 : 0.35),
      duration: 0.55,
      ease: "power2.out",
      onComplete: () => {
        state.isOpen = !state.isOpen;
        state.isAnimating = false;
        
        if (drawerMesh.userData.originalZ === undefined && targetZ > 0) {
           drawerMesh.userData.originalZ = drawerMesh.position.z - 0.35;
        }
      }
    });

    // If it's the first time animating and originalZ isn't cached
    if (drawerMesh.userData.originalZ === undefined) {
      drawerMesh.userData.originalZ = drawerMesh.position.z;
    }
  }

  destroy() {
    this.canvas.removeEventListener('pointerdown', this._onPointerDown);
    this.canvas.removeEventListener('pointerup', this._onPointerUp);
    window.removeEventListener('keydown', this._onKeyDown);
  }
}

export default DrawerController;
