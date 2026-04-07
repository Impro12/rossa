import * as THREE from 'three';

/**
 * ColorConfigurator
 * Centralized API for mutating materials across the kitchen meshes.
 * Emits global sync events when options change.
 */

class ColorConfigurator {
  constructor(registry) {
    this.registry = registry;
    this.textureLoader = new THREE.TextureLoader();

    // Store shared material instances to save memory. We clone the default once per type locally if needed.
    this.sharedMaterials = {
      facade: null,
      countertop: null,
      handle: null
    };
  }

  changeFacadeColor(hexColor) {
    console.log(`[Configurator] Changing facade color to ${hexColor}`);
    
    if (!this.sharedMaterials.facade) {
       // We assume the first facade mesh has the default material we want to clone
      if (this.registry.facades.length > 0) {
        this.sharedMaterials.facade = this.registry.facades[0].material.clone();
      } else {
        this.sharedMaterials.facade = new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0 });
      }
    }
    
    this.sharedMaterials.facade.color.set(hexColor);
    
    // Apply shared material to all facade and drawer meshes
    this.registry.facades.forEach(mesh => { mesh.material = this.sharedMaterials.facade; });
    
    // Some drawers might be separate meshes but acting as facades. 
    // In our placeholder logic we gave the front plates the facade material.
    // If the drawer root has a child named facade, handle it:
    this.registry.drawers.forEach(drawer => {
      drawer.traverse(child => {
        if (child.name.includes('facade') || child.name.includes('door')) {
          child.material = this.sharedMaterials.facade;
        }
      });
    });

    this._dispatch('facade', hexColor);
  }

  changeCountertopMaterial(materialId, diffuseUrl = null, normalUrl = null, roughnessUrl = null) {
    console.log(`[Configurator] Changing countertop to ${materialId}`);

    if (!this.sharedMaterials.countertop) {
      if (this.registry.countertops.length > 0) {
        this.sharedMaterials.countertop = this.registry.countertops[0].material.clone();
      } else {
        this.sharedMaterials.countertop = new THREE.MeshStandardMaterial();
      }
    }

    // In a production app, we would load textures here.
    // If no textures are provided, we just simulate the change with color for the stub.
    if (!diffuseUrl) {
      const stubColors = {
        'marble': 0xece9e6,
        'wood': 0x8b5a2b,
        'concrete': 0x808080,
        'quartz': 0xf8f8f8
      };
      this.sharedMaterials.countertop.color.setHex(stubColors[materialId] || 0xffffff);
      if (materialId === 'wood') this.sharedMaterials.countertop.roughness = 0.6;
      if (materialId === 'marble') this.sharedMaterials.countertop.roughness = 0.1;
    } else {
      // Async loading logic would go here
    }

    this.registry.countertops.forEach(mesh => { mesh.material = this.sharedMaterials.countertop; });

    this._dispatch('countertop', materialId);
  }

  changeHandleFinish(finishId) {
    console.log(`[Configurator] Changing handle finish to ${finishId}`);

    if (!this.sharedMaterials.handle) {
      if (this.registry.handles.length > 0) {
        this.sharedMaterials.handle = this.registry.handles[0].material.clone();
      } else {
        this.sharedMaterials.handle = new THREE.MeshStandardMaterial();
      }
    }

    const mat = this.sharedMaterials.handle;
    
    switch (finishId) {
      case 'chrome':
        mat.color.setHex(0xe8e8e8);
        mat.roughness = 0.1;
        mat.metalness = 0.9;
        break;
      case 'brass':
        mat.color.setHex(0xcca352);
        mat.roughness = 0.25;
        mat.metalness = 0.85;
        break;
      case 'matte-black':
        mat.color.setHex(0x1a1a1a);
        mat.roughness = 0.8;
        mat.metalness = 0.2;
        break;
    }

    this.registry.handles.forEach(mesh => { mesh.material = this.sharedMaterials.handle; });

    this._dispatch('handle', finishId);
  }

  _dispatch(type, value) {
    const event = new CustomEvent('config:updated', { 
      detail: { type, value }
    });
    window.dispatchEvent(event);
  }
}

export default ColorConfigurator;
