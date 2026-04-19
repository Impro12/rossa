import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

/**
 * KitchenLoader
 * Manages loading the GLTF scene, indexing meshes into a registry,
 * and generating a procedural fallback if the 3D model is unavailable.
 */

class KitchenLoader {
  constructor(scene, loadingManager = null) {
    this.scene = scene;
    this.loadingManager = loadingManager;
    this.root = new THREE.Group();
    this.root.name = 'kitchen_root';
    this.scene.add(this.root);

    this.registry = {
      facades: [],
      drawers: [],
      countertops: [],
      handles: []
    };

    // Prepare default materials
    this.defaultMaterials = {
      facade: new THREE.MeshStandardMaterial({ color: 0xdfd7c8, roughness: 0.4, metalness: 0.0 }),
      countertop: new THREE.MeshStandardMaterial({ color: 0xd0cec8, roughness: 0.1, metalness: 0.05 }),
      handle: new THREE.MeshStandardMaterial({ color: 0xb0a898, roughness: 0.15, metalness: 0.85 }),
      drawerBody: new THREE.MeshStandardMaterial({ color: 0xc8c0b4, roughness: 0.7, metalness: 0.0 })
    };
  }

  /**
   * Loads the model and catalogues the meshes.
   * @param {string} url - URL to the GLB file
   * @returns {Promise<Object>} The resolved registry
   */
  async loadModel(url) {
    const dracoLoader = new DRACOLoader();
    // Default online decoder path for DRACO
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');

    const gltfLoader = this.loadingManager
      ? new GLTFLoader(this.loadingManager)
      : new GLTFLoader();
    gltfLoader.setDRACOLoader(dracoLoader);

    try {
      const gltf = await new Promise((resolve, reject) => {
        gltfLoader.load(url, resolve, undefined, reject);
      });

      this.root.add(gltf.scene);
      this._indexMeshes(this.root);
      
    } catch (err) {
      console.warn('[KitchenLoader] Failed to load GLTF. Building procedural placeholder kitchen.', err);
      this._buildPlaceholderKitchen();
      this._indexMeshes(this.root);
    }

    this._logInventory();
    return this.registry;
  }

  /**
   * Traverses the scene graph and groups meshes based on naming conventions.
   * Format expected: "type_zone_index" (e.g. "facade_upper_01")
   * @param {THREE.Object3D} container 
   */
  _indexMeshes(container) {
    // Clear out existing
    this.registry.facades = [];
    this.registry.drawers = [];
    this.registry.countertops = [];
    this.registry.handles = [];

    container.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;

        const name = child.name.toLowerCase();

        // Categorise and assign base materials
        if (name.includes('facade') || name.includes('door')) {
          this.registry.facades.push(child);
          child.material = this.defaultMaterials.facade;
        } 
        else if (name.includes('drawer') && !name.includes('facade')) {
          // Only register the drawer BODY (not the facade front child named 'facade_drawer_*')
          this.registry.drawers.push(child);
          child.material = this.defaultMaterials.drawerBody;
        }
        else if (name.includes('countertop')) {
          this.registry.countertops.push(child);
          child.material = this.defaultMaterials.countertop;
        } 
        else if (name.includes('handle')) {
          this.registry.handles.push(child);
          child.material = this.defaultMaterials.handle;
        }
      }
    });
  }

  _logInventory() {
    console.info('[KitchenLoader] Mesh Inventory:');
    console.table({
      Facades: this.registry.facades.length,
      Drawers: this.registry.drawers.length,
      Countertops: this.registry.countertops.length,
      Handles: this.registry.handles.length
    });
  }

  /**
   * Builds a procedural fallback kitchen using basic geometry if the GLB is missing.
   * Guaranteed to match the naming hook conventions perfectly so interactions work.
   */
  _buildPlaceholderKitchen() {
    // 1. Lower Cabinets (6 units, some with drawers)
    const cabWidth = 0.6;
    const lowerHeight = 0.85;
    const lowerDepth = 0.6;
    for (let i = 0; i < 6; i++) {
      const xOffset = -2.5 + (i * cabWidth);
      
      // Carcass (mostly hidden)
      const baseCab = new THREE.Mesh(
        new THREE.BoxGeometry(cabWidth - 0.02, lowerHeight, lowerDepth),
        this.defaultMaterials.drawerBody
      );
      baseCab.position.set(xOffset, lowerHeight / 2, -3);
      baseCab.name = `carcass_base_0${i + 1}`;
      this.root.add(baseCab);

      // Either a door or a drawer
      if (i % 2 === 0) {
        // Door facade
        const door = new THREE.Mesh(
          new THREE.BoxGeometry(cabWidth - 0.04, lowerHeight - 0.04, 0.02),
          this.defaultMaterials.facade
        );
        door.position.set(xOffset, lowerHeight / 2, -2.7 + 0.01);
        door.name = `door_base_0${i + 1}`;
        this.root.add(door);

        // Handle
        const handle = new THREE.Mesh(
          new THREE.BoxGeometry(0.04, 0.2, 0.02),
          this.defaultMaterials.handle
        );
        handle.position.set(xOffset + 0.2, lowerHeight - 0.2, -2.7 + 0.03);
        handle.name = `handle_base_0${i + 1}`;
        this.root.add(handle);
      } else {
        // Drawer
        const drawerHeight = (lowerHeight - 0.04) / 2;
        const drawer = new THREE.Mesh(
          new THREE.BoxGeometry(cabWidth - 0.04, drawerHeight, lowerDepth),
          this.defaultMaterials.drawerBody
        );
        drawer.position.set(xOffset, lowerHeight - (drawerHeight / 2) - 0.02, -3);
        drawer.name = `drawer_base_0${i + 1}`;
        
        // Drawer Facade (attached as a child so it moves with the drawer)
        const drawerFront = new THREE.Mesh(
          new THREE.BoxGeometry(cabWidth - 0.04, drawerHeight, 0.02),
          this.defaultMaterials.facade
        );
        // Important: we name this drawer so our indexer catches it for materials AND interaction
        drawerFront.name = `facade_drawer_base_0${i + 1}`;
        drawerFront.position.set(0, 0, lowerDepth / 2 + 0.01);
        drawer.add(drawerFront);

        // Handle on drawer
        const handle = new THREE.Mesh(
          new THREE.BoxGeometry(0.2, 0.04, 0.02),
          this.defaultMaterials.handle
        );
        handle.position.set(0, 0, lowerDepth / 2 + 0.03);
        handle.name = `handle_drawer_0${i + 1}`;
        drawer.add(handle);

        this.root.add(drawer);
      }
    }

    // Main Countertop over the lower cabinets
    const ctopMain = new THREE.Mesh(
      new THREE.BoxGeometry((cabWidth * 6) + 0.04, 0.04, lowerDepth + 0.04),
      this.defaultMaterials.countertop
    );
    ctopMain.position.set(-2.5 + (cabWidth * 2.5), lowerHeight + 0.02, -3 + 0.02);
    ctopMain.name = 'countertop_main_01';
    this.root.add(ctopMain);

    // 2. Upper Cabinets (6 units)
    const upperY = 2.0;
    const upperHeight = 0.7;
    const upperDepth = 0.4;
    for (let i = 0; i < 6; i++) {
      const xOffset = -2.5 + (i * cabWidth);
      
      const upperCab = new THREE.Mesh(
        new THREE.BoxGeometry(cabWidth - 0.04, upperHeight, upperDepth),
        this.defaultMaterials.facade
      );
      upperCab.position.set(xOffset, upperY, -3.2 + (upperDepth / 2));
      upperCab.name = `facade_upper_0${i + 1}`;
      this.root.add(upperCab);
    }

    // 3. Central Island
    const islandX = -0.5;
    const islandZ = -0.5;
    
    // Island Base
    const islandBase = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, lowerHeight, 1.2),
      this.defaultMaterials.facade
    );
    islandBase.position.set(islandX, lowerHeight / 2, islandZ);
    islandBase.name = 'facade_island_01';
    this.root.add(islandBase);

    // Island Countertop
    const ctopIsland = new THREE.Mesh(
      new THREE.BoxGeometry(2.5, 0.04, 1.3),
      this.defaultMaterials.countertop
    );
    ctopIsland.position.set(islandX, lowerHeight + 0.02, islandZ);
    ctopIsland.name = 'countertop_island_01';
    this.root.add(ctopIsland);

    // Add back/floor/ceiling for environmental context
    const floorMat = new THREE.MeshStandardMaterial({ color: 0xb8a898, roughness: 0.85, metalness: 0.0 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 14), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    floor.position.set(0, 0, -1);
    this.root.add(floor);

    const wallMat = new THREE.MeshStandardMaterial({ color: 0x2e2b26, roughness: 1.0 });
    const wallBack = new THREE.Mesh(new THREE.PlaneGeometry(20, 7), wallMat);
    wallBack.position.set(0, 3.5, -3.8);
    wallBack.receiveShadow = true;
    this.root.add(wallBack);

    const wallLeft = new THREE.Mesh(new THREE.PlaneGeometry(14, 7), wallMat.clone());
    wallLeft.rotation.y = Math.PI / 2;
    wallLeft.position.set(-4, 3.5, -1);
    this.root.add(wallLeft);

    const ceilingMat = new THREE.MeshStandardMaterial({ color: 0x1a1815, roughness: 1.0 });
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(20, 14), ceilingMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, 4.0, -1);
    this.root.add(ceiling);
  }
}

export default KitchenLoader;
