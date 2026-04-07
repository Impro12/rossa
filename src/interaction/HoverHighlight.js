import * as THREE from 'three';

/**
 * HoverHighlight
 * Uses a Raycaster on pointermove to detect interactable meshes (drawers/doors),
 * applies a subtle emissive highlight, changes cursor to pointer, and displays a tooltip.
 */

class HoverHighlight {
  constructor(camera, canvas, registry) {
    this.camera = camera;
    this.canvas = canvas;
    
    // We only want to highlight things the user can interact with (drawers/doors)
    this.interactables = [...registry.drawers, ...registry.facades];

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();

    this.hoveredMesh = null;
    this.originalEmissive = new THREE.Color(0x000000);

    // Create Tooltip DOM Element
    this.tooltip = document.createElement('div');
    this.tooltip.style.position = 'absolute';
    this.tooltip.style.background = 'rgba(26, 26, 24, 0.85)';
    this.tooltip.style.color = '#F7F4EF';
    this.tooltip.style.padding = '4px 10px';
    this.tooltip.style.borderRadius = '4px';
    this.tooltip.style.fontSize = '12px';
    this.tooltip.style.fontFamily = 'var(--font-sans)';
    this.tooltip.style.pointerEvents = 'none';
    this.tooltip.style.opacity = '0';
    this.tooltip.style.transition = 'opacity 0.2s ease';
    this.tooltip.style.zIndex = '1000';
    this.tooltip.style.transform = 'translate(-50%, -150%)'; // Center above cursor
    document.body.appendChild(this.tooltip);

    this._onPointerMove = this._onPointerMove.bind(this);
    this.canvas.addEventListener('pointermove', this._onPointerMove);

    // Listen for keyboard focus from DrawerController to highlight
    window.addEventListener('drawer:focused', (e) => {
      this._setHover(e.detail.mesh, true);
    });
  }

  _onPointerMove(event) {
    this.pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Update tooltip position slightly above cursor
    this.tooltip.style.left = `${event.clientX}px`;
    this.tooltip.style.top = `${event.clientY - 10}px`;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersects = this.raycaster.intersectObjects(this.interactables, true);

    if (intersects.length > 0) {
      let object = intersects[0].object;
      
      // Resolve up to root interaction group
      while (object && !this.interactables.includes(object)) {
        if (object.parent) object = object.parent;
        else break;
      }

      if (this.interactables.includes(object)) {
        if (this.hoveredMesh !== object) {
          this._setHover(object, false);
        }
        return;
      }
    }

    // Nothing intersected
    if (this.hoveredMesh) {
      this._clearHover();
    }
  }

  _setHover(mesh, isKeyboardFocus = false) {
    this._clearHover(); // Clean up previous
    
    this.hoveredMesh = mesh;
    this.canvas.style.cursor = 'pointer';

    // Find the actual mesh layer that holds the material
    let targetMesh = mesh;
    if (targetMesh.type === 'Group') {
      targetMesh.traverse(child => {
        if (child.isMesh && child.material) targetMesh = child;
      });
    }

    if (targetMesh.material) {
      // It might be a shared material, but emissive is instance level in three unless cloned.
      // To strictly adhere to standard without blowing memory, we clone on first hover 
      // or modify the shared one and affect all (we don't want all to glow).
      // So we clone the material specifically for the hovered mesh temporarily.
      
      this.originalMaterial = targetMesh.material;
      const highlightMat = targetMesh.material.clone();
      
      // Apply subtle emissive glow (0.08 intensity)
      highlightMat.emissive.setHex(0xffffff);
      highlightMat.emissiveIntensity = 0.08;
      
      targetMesh.material = highlightMat;
      this.modifiedMesh = targetMesh; // Track to revert
    }

    // Format highly technical names (door_base_01 -> Door Base 01)
    const label = mesh.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    this.tooltip.textContent = label || 'Interact';
    this.tooltip.style.opacity = '1';

    if (isKeyboardFocus) {
      // Center tooltip on screen roughly for keyboard focus
      this.tooltip.style.left = '50%';
      this.tooltip.style.top = '50%';
    }
  }

  _clearHover() {
    if (this.hoveredMesh) {
      this.canvas.style.cursor = 'auto';
      this.tooltip.style.opacity = '0';
      
      if (this.modifiedMesh && this.originalMaterial) {
        // Revert material modification
        this.modifiedMesh.material.dispose(); // clean up the temporary cloned material
        this.modifiedMesh.material = this.originalMaterial;
        this.modifiedMesh = null;
        this.originalMaterial = null;
      }
      
      this.hoveredMesh = null;
    }
  }

  destroy() {
    this.canvas.removeEventListener('pointermove', this._onPointerMove);
    this._clearHover();
    if (this.tooltip.parentNode) {
      this.tooltip.parentNode.removeChild(this.tooltip);
    }
  }
}

export default HoverHighlight;
