import * as THREE from 'three';

/**
 * ColorConfigurator
 * Centralized API for mutating materials across the kitchen meshes.
 * Emits 'config:updated' events with { type, id, value } so PriceDisplay
 * can look up the correct price modifier by id.
 */

class ColorConfigurator {
  constructor(registry) {
    this.registry = registry;
    this.sharedMaterials = {
      facade: null,
      countertop: null,
      handle: null
    };
  }

  /**
   * @param {string} hexColor  - CSS hex string e.g. '#dfd7c8'
   * @param {string} colorId   - pricing key e.g. 'f_arctic'
   */
  changeFacadeColor(hexColor, colorId = null) {
    if (!this.sharedMaterials.facade) {
      const base = this.registry.facades[0]?.material;
      this.sharedMaterials.facade = base
        ? base.clone()
        : new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0 });
    }

    this.sharedMaterials.facade.color.set(hexColor);

    // Apply to all facade meshes
    this.registry.facades.forEach(mesh => {
      mesh.material = this.sharedMaterials.facade;
    });

    // Also recolor drawer fronts (children named 'facade_*')
    this.registry.drawers.forEach(drawer => {
      drawer.traverse(child => {
        if (child.isMesh && (child.name.includes('facade') || child.name.includes('door'))) {
          child.material = this.sharedMaterials.facade;
        }
      });
    });

    this._dispatch('facade', colorId || hexColor);
  }

  changeCountertopMaterial(materialId) {
    if (!this.sharedMaterials.countertop) {
      const base = this.registry.countertops[0]?.material;
      this.sharedMaterials.countertop = base
        ? base.clone()
        : new THREE.MeshStandardMaterial();
    }

    const mat = this.sharedMaterials.countertop;
    const colors = {
      marble:   { color: 0xece9e6, roughness: 0.08, metalness: 0.02 },
      wood:     { color: 0x8b6343, roughness: 0.65, metalness: 0.0  },
      concrete: { color: 0x7a7870, roughness: 0.75, metalness: 0.0  },
      quartz:   { color: 0xf4f2ee, roughness: 0.12, metalness: 0.0  },
    };
    const cfg = colors[materialId] || colors.marble;
    mat.color.setHex(cfg.color);
    mat.roughness = cfg.roughness;
    mat.metalness = cfg.metalness;

    this.registry.countertops.forEach(mesh => { mesh.material = mat; });

    this._dispatch('countertop', materialId);
  }

  changeHandleFinish(finishId) {
    if (!this.sharedMaterials.handle) {
      const base = this.registry.handles[0]?.material;
      this.sharedMaterials.handle = base
        ? base.clone()
        : new THREE.MeshStandardMaterial();
    }

    const mat = this.sharedMaterials.handle;
    const finishes = {
      chrome:       { color: 0xe0e0e0, roughness: 0.08, metalness: 0.95 },
      brass:        { color: 0xc49b45, roughness: 0.20, metalness: 0.90 },
      'matte-black':{ color: 0x1a1a1a, roughness: 0.80, metalness: 0.15 },
    };
    const cfg = finishes[finishId] || finishes.chrome;
    mat.color.setHex(cfg.color);
    mat.roughness = cfg.roughness;
    mat.metalness = cfg.metalness;

    this.registry.handles.forEach(mesh => { mesh.material = mat; });

    this._dispatch('handle', finishId);
  }

  _dispatch(type, id) {
    window.dispatchEvent(new CustomEvent('config:updated', { detail: { type, id } }));
  }
}

export default ColorConfigurator;
