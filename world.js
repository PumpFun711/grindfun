const World = {
  blockMeshes: new Map(),
  crackMeshes: new Map(),
  scene: null,
  worldData: null,
  textureCache: new Map(),
  respawnQueue: new Map(),
  RESPAWN_TIME: 30000,

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
    12: 0x003322,
    11: 0x001122,
    10: 0x001100,
    7:  0x110800,
  },

  // Generate a canvas texture for each block type to look like Minecraft
  makeTexture(blockType) {
    const key = blockType;
    if (this.textureCache.has(key)) return this.textureCache.get(key);

    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');

    const baseColor = this.BLOCK_COLORS[blockType] || 0x888888;
    const r = (baseColor >> 16) & 0xff;
    const g = (baseColor >> 8) & 0xff;
    const b = baseColor & 0xff;
    const base = `rgb(${r},${g},${b})`;
    const dark = `rgb(${Math.floor(r*0.7)},${Math.floor(g*0.7)},${Math.floor(b*0.7)})`;
    const light = `rgb(${Math.min(255,Math.floor(r*1.2))},${Math.min(255,Math.floor(g*1.2))},${Math.min(255,Math.floor(b*1.2))})`;
    const mid = `rgb(${Math.floor(r*0.85)},${Math.floor(g*0.85)},${Math.floor(b*0.85)})`;

    ctx.fillStyle = base;
    ctx.fillRect(0, 0, size, size);

    switch(blockType) {
      case 0: // Dirt
        ctx.fillStyle = dark;
        for(let i=0;i<20;i++){
          ctx.fillRect(Math.random()*size,Math.random()*size,Math.random()*6+2,Math.random()*3+1);
        }
        ctx.fillStyle = light;
        for(let i=0;i<8;i++){
          ctx.fillRect(Math.random()*size,Math.random()*size,Math.random()*4+1,Math.random()*2+1);
        }
        break;

      case 1: // Grass top
        ctx.fillStyle = '#5a8c3e';
        ctx.fillRect(0,0,size,size);
        ctx.fillStyle = '#3d6128';
        for(let i=0;i<12;i++){
          ctx.fillRect(Math.random()*size,Math.random()*size,Math.random()*5+2,Math.random()*3+1);
        }
        ctx.fillStyle = '#7ac455';
        for(let i=0;i<8;i++){
          ctx.fillRect(Math.random()*size,Math.random()*size,Math.random()*3+1,Math.random()*2+1);
        }
        // Grass blades
        ctx.fillStyle = '#4a7a2e';
        for(let x=2;x<size;x+=6){
          ctx.fillRect(x, 0, 2, Math.random()*8+4);
        }
        break;

      case 2: // Sand
        ctx.fillStyle = '#d9c47a';
        ctx.fillRect(0,0,size,size);
        ctx.fillStyle = '#c8b060';
        for(let i=0;i<25;i++){
          ctx.fillRect(Math.random()*size,Math.random()*size,Math.random()*4+1,Math.random()*2+1);
        }
        ctx.fillStyle = '#e8d48a';
        for(let i=0;i<10;i++){
          ctx.fillRect(Math.random()*size,Math.random()*size,Math.random()*3+1,1);
        }
        break;

      case 3: // Wood
        // Vertical grain
        for(let x=0;x<size;x+=4){
          ctx.fillStyle = x%8===0 ? dark : mid;
          ctx.fillRect(x,0,4,size);
        }
        // Horizontal rings
        ctx.fillStyle = dark;
        [10,20,30,40,50,60].forEach(y=>{
          ctx.fillRect(0,y,size,1);
        });
        ctx.fillStyle = light;
        [5,15,25,35,45,55].forEach(y=>{
          ctx.fillRect(0,y,size,1);
        });
        break;

      case 4: // Stone
        ctx.fillStyle = '#888888';
        ctx.fillRect(0,0,size,size);
        ctx.fillStyle = '#666666';
        // Stone cracks
        ctx.beginPath();
        ctx.moveTo(10,5); ctx.lineTo(20,25); ctx.lineTo(8,40);
        ctx.moveTo(35,10); ctx.lineTo(28,30); ctx.lineTo(40,50);
        ctx.moveTo(50,20); ctx.lineTo(55,40); ctx.lineTo(45,55);
        ctx.lineWidth=1.5; ctx.stroke();
        ctx.fillStyle = '#aaaaaa';
        for(let i=0;i<6;i++){
          ctx.fillRect(Math.random()*size,Math.random()*size,Math.random()*8+3,Math.random()*3+1);
        }
        break;

      case 5: // Coal
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(0,0,size,size);
        ctx.fillStyle = '#111111';
        [[8,8,14,10],[28,18,10,12],[10,32,14,10],[34,34,12,8]].forEach(([x,y,w,h])=>{
          ctx.fillRect(x,y,w,h);
        });
        ctx.fillStyle = '#3a3a3a';
        for(let i=0;i<8;i++){
          ctx.fillRect(Math.random()*size,Math.random()*size,Math.random()*5+1,Math.random()*2+1);
        }
        ctx.fillStyle = '#444444';
        [[10,10,4,4],[30,20,4,4]].forEach(([x,y,w,h])=>{
          ctx.fillRect(x,y,w,h);
        });
        break;

      case 6: // Iron Ore
        ctx.fillStyle = '#777777'; ctx.fillRect(0,0,size,size);
        ctx.fillStyle = '#666666';
        ctx.beginPath(); ctx.moveTo(5,5); ctx.lineTo(15,20); ctx.moveTo(30,8); ctx.lineTo(25,28); ctx.lineWidth=1; ctx.stroke();
        // Ore spots
        [[6,6,10,8],[26,12,10,8],[8,28,10,8],[30,30,10,8],[18,18,8,6]].forEach(([x,y,w,h])=>{
          ctx.fillStyle = '#c0896e';
          ctx.fillRect(x,y,w,h);
          ctx.fillStyle = '#e0a98e';
          ctx.fillRect(x,y,w,2); ctx.fillRect(x,y,2,h);
        });
        break;

      case 7: // Gold Ore
        ctx.fillStyle = '#777777'; ctx.fillRect(0,0,size,size);
        ctx.fillStyle = '#555555';
        ctx.beginPath(); ctx.moveTo(8,4); ctx.lineTo(20,22); ctx.moveTo(35,10); ctx.lineTo(28,30); ctx.lineWidth=1; ctx.stroke();
        [[6,6,10,8],[26,12,10,8],[8,28,10,8],[30,30,10,8],[18,18,8,6]].forEach(([x,y,w,h])=>{
          ctx.fillStyle = '#d4af37';
          ctx.fillRect(x,y,w,h);
          ctx.fillStyle = '#f0d060';
          ctx.fillRect(x,y,w,2); ctx.fillRect(x,y,2,h);
        });
        break;

      case 8: // Redstone
        ctx.fillStyle = '#666666'; ctx.fillRect(0,0,size,size);
        [[6,6,10,8],[26,12,10,8],[8,28,10,8],[30,30,10,8],[18,18,8,6]].forEach(([x,y,w,h])=>{
          ctx.fillStyle = '#cc2200';
          ctx.fillRect(x,y,w,h);
          ctx.fillStyle = '#ff4422';
          ctx.fillRect(x,y,w,2); ctx.fillRect(x,y,2,h);
        });
        break;

      case 9: // Lapis
        ctx.fillStyle = '#666677'; ctx.fillRect(0,0,size,size);
        [[6,6,12,10],[26,12,12,10],[8,28,12,10],[28,30,12,10],[16,16,10,8]].forEach(([x,y,w,h])=>{
          ctx.fillStyle = '#1a3db5';
          ctx.fillRect(x,y,w,h);
          ctx.fillStyle = '#4466ff';
          ctx.fillRect(x,y,w,2); ctx.fillRect(x,y,2,h);
        });
        break;

      case 10: // Emerald
        ctx.fillStyle = '#555555'; ctx.fillRect(0,0,size,size);
        [[8,6,10,10],[28,10,10,10],[6,28,10,10],[28,28,10,10],[18,18,10,10]].forEach(([x,y,w,h])=>{
          ctx.fillStyle = '#00b865';
          ctx.fillRect(x,y,w,h);
          ctx.fillStyle = '#00ff88';
          ctx.fillRect(x,y,w,2); ctx.fillRect(x,y,2,h);
          ctx.fillStyle = 'rgba(0,255,136,0.4)';
          ctx.fillRect(x+2,y+2,4,4);
        });
        break;

      case 11: // Diamond
        ctx.fillStyle = '#444455'; ctx.fillRect(0,0,size,size);
        [[6,6,12,10],[26,10,12,10],[6,28,12,10],[26,28,12,10],[16,16,12,10]].forEach(([x,y,w,h])=>{
          ctx.fillStyle = '#2aafd4';
          ctx.fillRect(x,y,w,h);
          ctx.fillStyle = '#88eeff';
          ctx.fillRect(x,y,w,2); ctx.fillRect(x,y,2,h);
          ctx.fillStyle = 'rgba(136,238,255,0.5)';
          ctx.fillRect(x+2,y+2,4,4);
        });
        break;

      case 12: // GrindFun Ore
        ctx.fillStyle = '#222233'; ctx.fillRect(0,0,size,size);
        // Glowing green ore
        [[4,4,14,12],[26,8,14,12],[4,28,14,12],[26,28,14,12],[14,14,14,12]].forEach(([x,y,w,h])=>{
          ctx.fillStyle = '#00aa55';
          ctx.fillRect(x,y,w,h);
          ctx.fillStyle = '#00ff88';
          ctx.fillRect(x,y,w,3); ctx.fillRect(x,y,3,h);
          ctx.fillStyle = 'rgba(0,255,136,0.6)';
          ctx.fillRect(x+3,y+3,5,5);
          // Extra glow dots
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x+4,y+4,2,2);
        });
        break;
    }

    // Add subtle grid lines like Minecraft blocks
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(0,0,size,size);

    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    this.textureCache.set(key, tex);
    return tex;
  },

  makeSideTexture(blockType) {
    // Grass side = dirt with green strip on top
    if (blockType === 1) {
      const size = 64;
      const canvas = document.createElement('canvas');
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext('2d');

      // Dirt body
      ctx.fillStyle = '#8B6914';
      ctx.fillRect(0,0,size,size);
      ctx.fillStyle = '#6b4f0a';
      for(let i=0;i<14;i++){
        ctx.fillRect(Math.random()*size,Math.random()*size+8,Math.random()*6+2,Math.random()*3+1);
      }
      // Green top strip
      ctx.fillStyle = '#5a8c3e';
      ctx.fillRect(0,0,size,6);
      ctx.fillStyle = '#4a7a2e';
      ctx.fillRect(0,4,size,2);

      const tex = new THREE.CanvasTexture(canvas);
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestFilter;
      return tex;
    }
    return this.makeTexture(blockType);
  },

  init(scene, worldData) {
    this.scene = scene;
    this.worldData = worldData;
    this.buildWorld();
    this.startRespawnLoop();
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
    this.blockMeshes.forEach(mesh => this.scene.remove(mesh));
    this.blockMeshes.clear();

    const geo = new THREE.BoxGeometry(1, 1, 1);

    for (let y = 0; y < h; y++) {
      for (let z = 0; z < d; z++) {
        for (let x = 0; x < w; x++) {
          const blockType = this.getBlock(x, y, z);
          if (blockType < 0) continue;

          const exposed = (
            !this.isOpaque(x+1,y,z) || !this.isOpaque(x-1,y,z) ||
            !this.isOpaque(x,y+1,z) || !this.isOpaque(x,y-1,z) ||
            !this.isOpaque(x,y,z+1) || !this.isOpaque(x,y,z-1)
          );
          if (!exposed) continue;

          this.addBlockMesh(x, y, z, blockType, geo);
        }
      }
    }
    console.log(`[World] Built ${this.blockMeshes.size} block meshes`);
  },

  addBlockMesh(x, y, z, blockType, geo) {
    geo = geo || new THREE.BoxGeometry(1, 1, 1);
    let mesh;

    const topTex  = this.makeTexture(blockType);
    const sideTex = this.makeSideTexture(blockType);
    const botTex  = blockType === 1 ? this.makeTexture(0) : topTex;

    const emissive = this.BLOCK_EMISSIVE[blockType] || 0x000000;

    const matTop    = new THREE.MeshLambertMaterial({ map: topTex,  emissive });
    const matSide   = new THREE.MeshLambertMaterial({ map: sideTex, emissive });
    const matBottom = new THREE.MeshLambertMaterial({ map: botTex,  emissive });

    // [right, left, top, bottom, front, back]
    mesh = new THREE.Mesh(geo, [matSide, matSide, matTop, matBottom, matSide, matSide]);
    mesh.position.set(x + 0.5, y + 0.5, z + 0.5);
    mesh.userData = { blockType, bx: x, by: y, bz: z };
    this.scene.add(mesh);
    this.blockMeshes.set(`${x},${y},${z}`, mesh);
    return mesh;
  },

  removeBlock(x, y, z, blockType) {
    const key = `${x},${y},${z}`;
    const mesh = this.blockMeshes.get(key);
    if (mesh) { this.scene.remove(mesh); this.blockMeshes.delete(key); }
    const { w, d } = this.worldData;
    this.worldData.data[y * w * d + z * w + x] = -1;

    if (blockType >= 4) {
      this.respawnQueue.set(key, {
        x, y, z, blockType,
        respawnAt: Date.now() + this.RESPAWN_TIME
      });
    }
  },

  startRespawnLoop() {
    setInterval(() => {
      const now = Date.now();
      this.respawnQueue.forEach((item, key) => {
        if (now >= item.respawnAt) {
          if (this.getBlock(item.x, item.y, item.z) < 0) {
            const { w, d } = this.worldData;
            this.worldData.data[item.y * w * d + item.z * w + item.x] = item.blockType;
            this.addBlockMesh(item.x, item.y, item.z, item.blockType);
          }
          this.respawnQueue.delete(key);
        }
      });
    }, 1000);
  },

  raycast(camera, maxDist) {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera({ x: 0, y: 0 }, camera);
    raycaster.far = maxDist;
    const meshArray = Array.from(this.blockMeshes.values());
    const hits = raycaster.intersectObjects(meshArray);
    if (hits.length > 0) {
      const hit = hits[0];
      const { bx, by, bz, blockType } = hit.object.userData;
      return { x: bx, y: by, z: bz, blockType, distance: hit.distance };
    }
    return null;
  },

  highlightBlock(x, y, z) {
    const old = this.scene.getObjectByName('blockHighlight');
    if (old) this.scene.remove(old);
    if (x === null) return;
    const geo = new THREE.BoxGeometry(1.02, 1.02, 1.02);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.2, side: THREE.BackSide
    });
    const highlight = new THREE.Mesh(geo, mat);
    highlight.name = 'blockHighlight';
    highlight.position.set(x + 0.5, y + 0.5, z + 0.5);
    this.scene.add(highlight);
  },

  showCrack(x, y, z, progress) {
    this.clearCrack(x, y, z);
    if (progress <= 0) return;

    const key = `${x},${y},${z}`;
    const stage = Math.ceil(progress * 5);

    // Dark overlay that gets more opaque as block breaks
    const geo = new THREE.BoxGeometry(1.005, 1.005, 1.005);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.12 + progress * 0.45,
      side: THREE.FrontSide,
      depthWrite: false,
    });
    const overlay = new THREE.Mesh(geo, mat);
    overlay.position.set(x + 0.5, y + 0.5, z + 0.5);
    overlay.name = `crack_${key}`;
    this.scene.add(overlay);
    this.crackMeshes.set(key, overlay);

    // Draw canvas crack texture
    const crackCanvas = document.createElement('canvas');
    crackCanvas.width = 64; crackCanvas.height = 64;
    const ctx = crackCanvas.getContext('2d');

    ctx.clearRect(0,0,64,64);
    ctx.strokeStyle = 'rgba(0,0,0,0.8)';
    ctx.lineWidth = 1.5;

    // More cracks per stage
    const crackPatterns = [
      [[20,10,30,25]],
      [[20,10,30,25],[10,30,25,50]],
      [[20,10,30,25],[10,30,25,50],[40,15,50,40]],
      [[20,10,30,25],[10,30,25,50],[40,15,50,40],[15,15,45,45]],
      [[20,10,30,25],[10,30,25,50],[40,15,50,40],[15,15,45,45],[5,5,60,60]],
    ];

    const pattern = crackPatterns[stage - 1] || crackPatterns[0];
    pattern.forEach(([x1,y1,x2,y2]) => {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      // Small branch cracks
      const mx = (x1+x2)/2, my = (y1+y2)/2;
      ctx.beginPath();
      ctx.moveTo(mx, my);
      ctx.lineTo(mx + (Math.random()-0.5)*16, my + (Math.random()-0.5)*16);
      ctx.lineWidth = 0.8;
      ctx.stroke();
    });

    const crackTex = new THREE.CanvasTexture(crackCanvas);
    crackTex.magFilter = THREE.NearestFilter;

    // Apply crack texture on all 6 faces
    const crackGeo = new THREE.BoxGeometry(1.01, 1.01, 1.01);
    const crackMats = Array(6).fill(null).map(() => new THREE.MeshBasicMaterial({
      map: crackTex,
      transparent: true,
      opacity: 0.7 + progress * 0.3,
      depthWrite: false,
      side: THREE.FrontSide,
    }));
    const crackMesh = new THREE.Mesh(crackGeo, crackMats);
    crackMesh.position.set(x + 0.5, y + 0.5, z + 0.5);
    crackMesh.name = `cracktex_${key}`;
    this.scene.add(crackMesh);

    // Shake the block
    const blockMesh = this.blockMeshes.get(key);
    if (blockMesh) {
      const shake = progress * 0.03;
      blockMesh.position.set(
        x + 0.5 + (Math.random()-0.5)*shake,
        y + 0.5 + (Math.random()-0.5)*shake,
        z + 0.5 + (Math.random()-0.5)*shake
      );
    }
  },

  clearCrack(x, y, z) {
    const key = `${x},${y},${z}`;

    const overlay = this.crackMeshes.get(key);
    if (overlay) { this.scene.remove(overlay); this.crackMeshes.delete(key); }

    const crackTex = this.scene.getObjectByName(`cracktex_${key}`);
    if (crackTex) this.scene.remove(crackTex);

    const blockMesh = this.blockMeshes.get(key);
    if (blockMesh) blockMesh.position.set(x + 0.5, y + 0.5, z + 0.5);
  }
};
