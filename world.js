// 3D Voxel World — builds Three.js geometry from world data
const World = {
  mesh: null,
  blockMeshes: new Map(), // "x,y,z" -> mesh
  scene: null,
  worldData: null,

  BLOCK_COLORS: [
    0x8B6914, // 0 Dirt
    0x5a8c3e, // 1 Grass
    0xd9c47a, // 2 Sand
    0xa0714a, // 3 Wood
    0x888888, // 4 Stone
    0x222222, // 5 Coal
    0xc0896e, // 6 Iron Ore
    0xd4af37, // 7 Gold Ore
    0xcc2200, // 8 Redstone
    0x1a3db5, // 9 Lapis
    0x00b865, // 10 Emerald
    0x4fc3f7, // 11 Diamond
    0x00ff88, // 12 GrindFun Ore
  ],

  BLOCK_EMISSIVE: {
    12: 0x003322, // GrindFun ore glows
    11: 0x001122, // Diamond subtle glow
    10: 0x001100, // Emerald subtle
  },

  init(scene, worldData) {
    this.scene = scene;
    this.worldData = worldData;
    this.buildWorld();
  },

  getBlock(x, y, z) {
    const { w, h, d, data } = this.worldData;
    if (x < 0 || x >= w || y < 0 || y >= h || z < 0 || z >= d) return -1;
    return data[y * w * d + z * w + x];
  },

  isOpaque(x, y, z) {
    return this.getBlock(x, y, z) >= 0;
  },

  buildWorld() {
    const { w, h, d } = this.worldData;

    // Remove existing meshes
    this.blockMeshes.forEach(mesh => this.scene.remove(mesh));
    this.blockMeshes.clear();

    // We use instanced rendering grouped by block type for performance
    const geo = new THREE.BoxGeometry(1, 1, 1);

    for (let y = 0; y < h; y++) {
      for (let z = 0; z < d; z++) {
        for (let x = 0; x < w; x++) {
          const blockType = this.getBlock(x, y, z);
          if (blockType < 0) continue;

          // Face culling — only render exposed faces
          const exposed = (
            !this.isOpaque(x+1,y,z) || !this.isOpaque(x-1,y,z) ||
            !this.isOpaque(x,y+1,z) || !this.isOpaque(x,y-1,z) ||
            !this.isOpaque(x,y,z+1) || !this.isOpaque(x,y,z-1)
          );
          if (!exposed) continue;

          const color = this.BLOCK_COLORS[blockType] || 0x888888;
          const mat = new THREE.MeshLambertMaterial({
            color,
            emissive: this.BLOCK_EMISSIVE[blockType] || 0x000000,
          });

          // Add subtle texture variation
          if (blockType === 1) {
            // Grass — top is green, sides are dirt brown
            const matTop = new THREE.MeshLambertMaterial({ color: 0x5a8c3e });
            const matSide = new THREE.MeshLambertMaterial({ color: 0x7a5a1a });
            const matBottom = new THREE.MeshLambertMaterial({ color: 0x8B6914 });
            const mats = [matSide,matSide,matTop,matBottom,matSide,matSide];
            const mesh = new THREE.Mesh(geo, mats);
            mesh.position.set(x + 0.5, y + 0.5, z + 0.5);
            mesh.userData = { blockType, bx: x, by: y, bz: z };
            this.scene.add(mesh);
            this.blockMeshes.set(`${x},${y},${z}`, mesh);
          } else {
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(x + 0.5, y + 0.5, z + 0.5);
            mesh.userData = { blockType, bx: x, by: y, bz: z };
            this.scene.add(mesh);
            this.blockMeshes.set(`${x},${y},${z}`, mesh);
          }
        }
      }
    }

    console.log(`[World] Built ${this.blockMeshes.size} block meshes`);
  },

  removeBlock(x, y, z) {
    const key = `${x},${y},${z}`;
    const mesh = this.blockMeshes.get(key);
    if (mesh) {
      this.scene.remove(mesh);
      this.blockMeshes.delete(key);
    }
    // Update world data
    const { w, d } = this.worldData;
    this.worldData.data[y * w * d + z * w + x] = -1;
  },

  // Raycast to find which block the player is looking at
  raycast(camera, maxDist) {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera({ x: 0, y: 0 }, camera);
    raycaster.far = maxDist;

    const meshArray = Array.from(this.blockMeshes.values());
    const hits = raycaster.intersectObjects(meshArray);

    if (hits.length > 0) {
      const hit = hits[0];
      const { bx, by, bz, blockType } = hit.object.userData;
      return { x: bx, y: by, z: bz, blockType, distance: hit.distance, face: hit.face };
    }
    return null;
  },

  // Highlight the targeted block
  highlightBlock(x, y, z) {
    // Remove old highlight
    const old = this.scene.getObjectByName('blockHighlight');
    if (old) this.scene.remove(old);

    if (x === null) return;

    const geo = new THREE.BoxGeometry(1.01, 1.01, 1.01);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.25,
      side: THREE.BackSide
    });
    const highlight = new THREE.Mesh(geo, mat);
    highlight.name = 'blockHighlight';
    highlight.position.set(x + 0.5, y + 0.5, z + 0.5);
    this.scene.add(highlight);
  },

  // Add crack overlay to a block
  showCrack(x, y, z, progress) {
    const key = `crack_${x},${y},${z}`;
    let crack = this.scene.getObjectByName(key);

    if (!crack) {
      const geo = new THREE.BoxGeometry(1.02, 1.02, 1.02);
      const mat = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0,
        side: THREE.BackSide
      });
      crack = new THREE.Mesh(geo, mat);
      crack.name = key;
      crack.position.set(x + 0.5, y + 0.5, z + 0.5);
      this.scene.add(crack);
    }

    crack.material.opacity = progress * 0.6;
  },

  clearCrack(x, y, z) {
    const key = `crack_${x},${y},${z}`;
    const crack = this.scene.getObjectByName(key);
    if (crack) this.scene.remove(crack);
  }
};
