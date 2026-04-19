import * as THREE from 'three';

/**
 * HoverHighlight
 * Raycasts on pointermove to highlight interactive meshes and show tooltips.
 * Uses getBoundingClientRect for accurate NDC coords regardless of canvas position.
 */

class HoverHighlight {
  constructor(camera, canvas, registry) {
    this.camera = camera;
    this.canvas = canvas;
    this.interactables = [...registry.drawers, ...registry.facades];

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.hoveredMesh = null;
    this.modifiedMesh = null;
    this.originalMaterial = null;

    // Tooltip
    this.tooltip = document.createElement('div');
    Object.assign(this.tooltip.style, {
      position: 'fixed',
      background: 'rgba(26,26,24,0.9)',
      color: '#F7F4EF',
      padding: '5px 12px',
      borderRadius: '4px',
      fontSize: '11px',
      fontFamily: 'var(--font-sans)',
      letterSpacing: '0.05em',
      textTransform: 'uppercase',
      pointerEvents: 'none',
      opacity: '0',
      transition: 'opacity 0.15s ease',
      zIndex: '1000',
      transform: 'translate(-50%, calc(-100% - 10px))',
      whiteSpace: 'nowrap',
    });
    document.body.appendChild(this.tooltip);

    this._onPointerMove = this._onPointerMove.bind(this);
    this.canvas.addEventListener('pointermove', this._onPointerMove);

    window.addEventListener('drawer:focused', (e) => {
      this._setHover(e.detail.mesh);
    });
  }

  _onPointerMove(event) {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Move tooltip to cursor position (fixed to viewport)
    this.tooltip.style.left = `${event.clientX}px`;
    this.tooltip.style.top = `${event.clientY}px`;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersects = this.raycaster.intersectObjects(this.interactables, true);

    if (intersects.length > 0) {
      let object = intersects[0].object;
      while (object && !this.interactables.includes(object)) {
        object = object.parent;
      }

      if (object && this.interactables.includes(object)) {
        if (this.hoveredMesh !== object) {
          this._setHover(object);
        }
        return;
      }
    }

    if (this.hoveredMesh) {
      this._clearHover();
    }
  }

  _setHover(mesh) {
    this._clearHover();
    this.hoveredMesh = mesh;
    this.canvas.style.cursor = 'pointer';

    // Apply emissive highlight — clone only if this mesh has its own or shared material
    if (mesh.isMesh && mesh.material) {
      this.originalMaterial = mesh.material;
      const mat = mesh.material.clone();
      mat.emissive = new THREE.Color(0xffffff);
      mat.emissiveIntensity = 0.08;
      mesh.material = mat;
      this.modifiedMesh = mesh;
    } else if (mesh.isGroup || mesh.type !== 'Mesh') {
      // For groups, find first child mesh
      mesh.traverse(child => {
        if (!this.modifiedMesh && child.isMesh && child.material) {
          this.originalMaterial = child.material;
          const mat = child.material.clone();
          mat.emissive = new THREE.Color(0xffffff);
          mat.emissiveIntensity = 0.08;
          child.material = mat;
          this.modifiedMesh = child;
        }
      });
    }

    // Format name for tooltip
    const label = mesh.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    this.tooltip.textContent = label || 'Interact';
    this.tooltip.style.opacity = '1';
  }

  _clearHover() {
    if (!this.hoveredMesh) return;
    this.canvas.style.cursor = '';
    this.tooltip.style.opacity = '0';

    if (this.modifiedMesh && this.originalMaterial) {
      this.modifiedMesh.material.dispose();
      this.modifiedMesh.material = this.originalMaterial;
      this.modifiedMesh = null;
      this.originalMaterial = null;
    }

    this.hoveredMesh = null;
  }

  destroy() {
    this.canvas.removeEventListener('pointermove', this._onPointerMove);
    this._clearHover();
    this.tooltip.remove();
  }
}

export default HoverHighlight;
