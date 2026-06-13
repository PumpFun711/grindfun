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
    0x2d7a2d, // 13 Leaves
  ],

  BLOCK_EMISSIVE: {
    12: 0x003322,
    11: 0x001122,
    10: 0x001100,
    7:  0x110800,
  },

  makeTexture(blockType) {
    const key = 'top_' + blockType;
    if (this.textureCache.has(key)) return this.textureCache.get(key);

    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');

    const base = this.BLOCK_COLORS[blockType] || 0x888888;
    const r = (base >> 16) & 0xff;
    const g = (base >> 8) & 0xff;
    const b = base & 0xff;
    const baseC = `rgb(${r},${g},${b})`;
    const darkC = `rgb(${Math.floor(r*.65)},${Math.floor(g*.65)},${Math.floor(b*.65)})`;
    const lightC = `rgb(${Math.min(255,Math.floor(r*1.25))},${Math.min(255,Math.floor(g*1.25))},${Math.min(255,Math.floor(b*1.25))})`;
    const midC = `rgb(${Math.floor(r*.82)},${Math.floor(g*.82)},${Math.floor(b*.82)})`;

    ctx.fillStyle = baseC;
    ctx.fillRect(0, 0, size, size);

    switch(blockType) {
      case 0: // Dirt
        for(let i=0;i<22;i++){
          ctx.fillStyle = i%3===0 ? darkC : i%3===1 ? lightC : midC;
          ctx.fillRect(Math.random()*size,Math.random()*size,Math.random()*7+2,Math.random()*4+1);
        }
        break;

      case 1: // Grass top
        ctx.fillStyle = '#4a8c2e';
        ctx.fillRect(0,0,size,size);
        for(let i=0;i<14;i++){
          ctx.fillStyle = i%2===0 ? '#3a7020' : '#6ab840';
          ctx.fillRect(Math.random()*size,Math.random()*size,Math.random()*6+2,Math.random()*4+1);
        }
        for(let x=2;x<size;x+=7){
          ctx.fillStyle = '#2d5a18';
          ctx.fillRect(x, 0, 2, Math.random()*10+4);
          ctx.fillStyle = '#80d040';
          ctx.fillRect(x+1, 0, 1, Math.random()*6+2);
        }
        break;

      case 2: // Sand
        for(let i=0;i<28;i++){
          ctx.fillStyle = i%2===0 ? '#c8b060' : '#e8d48a';
          ctx.fillRect(Math.random()*size,Math.random()*size,Math.random()*5+1,Math.random()*3+1);
        }
        break;

      case 3: // Wood — log rings
        ctx.fillStyle = '#7a5030';
        ctx.fillRect(0,0,size,size);
        // Ring pattern
        ctx.fillStyle = '#5a3818';
        ctx.beginPath();
        ctx.arc(size/2,size/2,24,0,Math.PI*2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(size/2,size/2,16,0,Math.PI*2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(size/2,size/2,8,0,Math.PI*2);
        ctx.stroke();
        // Grain lines
        ctx.fillStyle = '#906040';
        for(let i=0;i<6;i++){
          ctx.fillRect(Math.random()*size,Math.random()*size,2,Math.random()*30+10);
        }
        break;

      case 4: // Stone
        ctx.fillStyle = '#7a7a7a';
        ctx.fillRect(0,0,size,size);
        ctx.strokeStyle = '#555555';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(8,4); ctx.lineTo(22,28); ctx.lineTo(6,42);
        ctx.moveTo(36,8); ctx.lineTo(26,32); ctx.lineTo(44,52);
        ctx.moveTo(52,18); ctx.lineTo(48,42);
        ctx.stroke();
        for(let i=0;i<5;i++){
          ctx.fillStyle = '#aaaaaa';
          ctx.fillRect(Math.random()*size,Math.random()*size,Math.random()*10+4,Math.random()*4+1);
        }
        break;

      case 5: // Coal
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(0,0,size,size);
        [[8,8,14,10],[28,18,10,12],[10,32,14,10],[34,34,12,8]].forEach(([x,y,w,h])=>{
          ctx.fillStyle='#111'; ctx.fillRect(x,y,w,h);
          ctx.fillStyle='#444'; ctx.fillRect(x,y,w,2); ctx.fillRect(x,y,2,h);
        });
        for(let i=0;i<6;i++){
          ctx.fillStyle='#3a3a3a';
          ctx.fillRect(Math.random()*size,Math.random()*size,Math.random()*5+1,2);
        }
        break;

      case 6: // Iron Ore
        ctx.fillStyle='#6a6a6a'; ctx.fillRect(0,0,size,size);
        ctx.strokeStyle='#444'; ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(4,4); ctx.lineTo(16,22); ctx.moveTo(32,6); ctx.lineTo(24,30); ctx.stroke();
        [[6,6,10,8],[26,12,10,8],[8,28,10,8],[30,30,10,8],[18,18,8,6]].forEach(([x,y,w,h])=>{
          ctx.fillStyle='#c0896e'; ctx.fillRect(x,y,w,h);
          ctx.fillStyle='#e0a98e'; ctx.fillRect(x,y,w,2); ctx.fillRect(x,y,2,h);
        });
        break;

      case 7: // Gold Ore
        ctx.fillStyle='#6a6a6a'; ctx.fillRect(0,0,size,size);
        ctx.strokeStyle='#444'; ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(6,2); ctx.lineTo(20,24); ctx.moveTo(36,8); ctx.lineTo(28,32); ctx.stroke();
        [[6,6,10,8],[26,12,10,8],[8,28,10,8],[30,30,10,8],[18,18,8,6]].forEach(([x,y,w,h])=>{
          ctx.fillStyle='#d4af37'; ctx.fillRect(x,y,w,h);
          ctx.fillStyle='#f0d060'; ctx.fillRect(x,y,w,2); ctx.fillRect(x,y,2,h);
        });
        break;

      case 8: // Redstone
        ctx.fillStyle='#5a5a5a'; ctx.fillRect(0,0,size,size);
        [[6,6,10,8],[26,12,10,8],[8,28,10,8],[30,30,10,8],[18,18,8,6]].forEach(([x,y,w,h])=>{
          ctx.fillStyle='#cc2200'; ctx.fillRect(x,y,w,h);
          ctx.fillStyle='#ff4422'; ctx.fillRect(x,y,w,2); ctx.fillRect(x,y,2,h);
        });
        break;

      case 9: // Lapis
        ctx.fillStyle='#5a5a6a'; ctx.fillRect(0,0,size,size);
        [[6,6,12,10],[26,12,12,10],[8,28,12,10],[28,30,12,10],[16,16,10,8]].forEach(([x,y,w,h])=>{
          ctx.fillStyle='#1a3db5'; ctx.fillRect(x,y,w,h);
          ctx.fillStyle='#4466ff'; ctx.fillRect(x,y,w,2); ctx.fillRect(x,y,2,h);
        });
        break;

      case 10: // Emerald
        ctx.fillStyle='#444444'; ctx.fillRect(0,0,size,size);
        [[8,6,10,10],[28,10,10,10],[6,28,10,10],[28,28,10,10],[18,18,10,10]].forEach(([x,y,w,h])=>{
          ctx.fillStyle='#00b865'; ctx.fillRect(x,y,w,h);
          ctx.fillStyle='#00ff88'; ctx.fillRect(x,y,w,2); ctx.fillRect(x,y,2,h);
          ctx.fillStyle='rgba(0,255,136,0.4)'; ctx.fillRect(x+2,y+2,4,4);
        });
        break;

      case 11: // Diamond
        ctx.fillStyle='#333344'; ctx.fillRect(0,0,size,size);
        [[6,6,12,10],[26,10,12,10],[6,28,12,10],[26,28,12,10],[16,16,12,10]].forEach(([x,y,w,h])=>{
          ctx.fillStyle='#2aafd4'; ctx.fillRect(x,y,w,h);
          ctx.fillStyle='#88eeff'; ctx.fillRect(x,y,w,2); ctx.fillRect(x,y,2,h);
          ctx.fillStyle='rgba(136,238,255,0.5)'; ctx.fillRect(x+2,y+2,4,4);
        });
        break;

      case 12: // GrindFun Ore
        ctx.fillStyle='#111122'; ctx.fillRect(0,0,size,size);
        [[4,4,14,12],[28,6,14,12],[4,28,14,12],[26,28,14,12],[14,14,14,12]].forEach(([x,y,w,h])=>{
          ctx.fillStyle='#00aa55'; ctx.fillRect(x,y,w,h);
          ctx.fillStyle='#00ff88'; ctx.fillRect(x,y,w,3); ctx.fillRect(x,y,3,h);
          ctx.fillStyle='rgba(0,255,136,0.6)'; ctx.fillRect(x+3,y+3,5,5);
          ctx.fillStyle='#ffffff'; ctx.fillRect(x+4,y+4,2,2);
        });
        break;

      case 13: // Leaves
        ctx.fillStyle='#2d7a2d'; ctx.fillRect(0,0,size,size);
        for(let i=0;i<20;i++){
          ctx.fillStyle = i%3===0 ? '#1a5a1a' : i%3===1 ? '#3a9a3a' : '#4ab040';
          ctx.fillRect(Math.random()*size,Math.random()*size,Math.random()*8+2,Math.random()*6+2);
        }
        // Leaf detail dots
        for(let i=0;i<12;i++){
          ctx.fillStyle='#5ad050';
          ctx.fillRect(Math.random()*size,Math.random()*size,2,2);
        }
        ctx.fillStyle='rgba(0,0,0,0.1)';
        for(let i=0;i<6;i++){
          ctx.fillRect(Math.random()*size,Math.random()*size,Math.random()*10+3,1);
        }
        break;
    }

    // Subtle pixel border
    ctx.strokeStyle='rgba(0,0,0,0.2)';
    ctx.lineWidth=0.5;
    ctx.strokeRect(0,0,size,size);

    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    this.textureCache.set(key, tex);
    return tex;
  },

  makeGrassSideTexture() {
    const key = 'grassside';
    if (this.textureCache.has(key)) return this.textureCache.get(key);

    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Dirt body
    ctx.fillStyle = '#8B6914';
    ctx.fillRect(0, 8, size, size - 8);
    for(let i=0;i<14;i++){
      ctx.fillStyle = i%2===0 ? '#6b4f0a' : '#a07820';
      ctx.fillRect(Math.random()*size, 8+Math.random()*(size-8), Math.random()*7+2, Math.random()*4+1);
    }

    // Green top strip
    ctx.fillStyle = '#4a8c2e';
    ctx.fillRect(0, 0, size, 8);
    ctx.fillStyle = '#3a7020';
    ctx.fillRect(0, 6, size, 2);
    ctx.fillStyle = '#6ab840';
    for(let x=0;x<size;x+=8){
      ctx.fillRect(x, 0, 4, 3);
    }

    ctx.strokeStyle='rgba(0,0,0,0.2)';
    ctx.lineWidth=0.5;
    ctx.strokeRect(0,0,size,size);

    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    this.textureCache.set(key, tex);
    return tex;
  },

  makeWoodSideTexture() {
    const key = 'woodside';
    if (this.textureCache.has(key)) return this.textureCache.get(key);

    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Vertical bark stripes
    for(let x=0;x<size;x+=4){
      ctx.fillStyle = x%8===0 ? '#5a3818' : x%8===4 ? '#7a5030' : '#6a4020';
      ctx.fillRect(x,0,4,size);
    }
    // Horizontal bark lines
    ctx.fillStyle='rgba(0,0,0,0.2)';
    for(let y=0;y<size;y+=8){
      ctx.fillRect(0,y,size,1);
    }
    ctx.fillStyle='rgba(255,255,255,0.05)';
    for(let y=2;y<size;y+=8){
      ctx.fillRect(0,y,size,1);
    }

    ctx.strokeStyle='rgba(0,0,0,0.2)';
    ctx.lineWidth=0.5;
    ctx.strokeRect(0,0,size,size);

    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    this.textureCache.set(key, tex);
    return tex;
  },

  getSideTex(blockType) {
    if (blockType === 1) return this.makeGrassSideTexture();
    if (blockType === 3) return this.makeWoodSideTexture();
    return this.makeTexture(blockType);
  },

  getBottomTex(blockType) {
    if (blockType === 1) return this.makeTexture(0); // Grass bottom = dirt
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

    const topTex  = this.makeTexture(blockType);
    const sideTex = this.getSideTex(blockType);
    const botTex  = this.getBottomTex(blockType);
    const emissive = this.BLOCK_EMISSIVE[blockType] || 0x000000;

    // Leaves are semi-transparent
    const isLeaf = blockType === 13;

    const matTop    = new THREE.MeshLambertMaterial({ map: topTex,  emissive, transparent: isLeaf, opacity: isLeaf ? 0.85 : 1 });
    const matSide   = new THREE.MeshLambertMaterial({ map: sideTex, emissive, transparent: isLeaf, opacity: isLeaf ? 0.85 : 1 });
    const matBottom = new THREE.MeshLambertMaterial({ map: botTex,  emissive, transparent: isLeaf, opacity: isLeaf ? 0.85 : 1 });

    const mesh = new THREE.Mesh(geo, [matSide, matSide, matTop, matBottom, matSide, matSide]);
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

    if (blockType >= 4 && blockType !== 13) {
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
    const geo = new THREE.BoxGeometry(1.03, 1.03, 1.03);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.18, side: THREE.BackSide
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

    // Dark overlay
    const overlayGeo = new THREE.BoxGeometry(1.006, 1.006, 1.006);
    const overlayMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.1 + progress * 0.4,
      side: THREE.FrontSide,
      depthWrite: false,
    });
    const overlay = new THREE.Mesh(overlayGeo, overlayMat);
    overlay.position.set(x + 0.5, y + 0.5, z + 0.5);
    overlay.name = `crack_${key}`;
    this.scene.add(overlay);
    this.crackMeshes.set(key, overlay);

    // Crack texture
    const crackCanvas = document.createElement('canvas');
    crackCanvas.width = 64; crackCanvas.height = 64;
    const ctx = crackCanvas.getContext('2d');
    ctx.clearRect(0,0,64,64);

    const patterns = [
      [[20,10,35,28]],
      [[20,10,35,28],[8,30,28,52]],
      [[20,10,35,28],[8,30,28,52],[40,12,52,42]],
      [[20,10,35,28],[8,30,28,52],[40,12,52,42],[4,4,58,58]],
      [[20,10,35,28],[8,30,28,52],[40,12,52,42],[4,4,58,58],[32,4,12,60]],
    ];

    const lines = patterns[Math.min(stage-1, 4)];
    lines.forEach(([x1,y1,x2,y2]) => {
      ctx.strokeStyle = 'rgba(0,0,0,0.9)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
      // Branch
      const mx=(x1+x2)/2, my=(y1+y2)/2;
      ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(mx,my);
      ctx.lineTo(mx+(Math.random()-.5)*18, my+(Math.random()-.5)*18);
      ctx.stroke();
    });

    const crackTex = new THREE.CanvasTexture(crackCanvas);
    crackTex.magFilter = THREE.NearestFilter;
    const crackGeo = new THREE.BoxGeometry(1.012, 1.012, 1.012);
    const crackMats = Array(6).fill(null).map(()=>new THREE.MeshBasicMaterial({
      map: crackTex, transparent: true,
      opacity: 0.6 + progress * 0.4,
      depthWrite: false, side: THREE.FrontSide,
    }));
    const crackMesh = new THREE.Mesh(crackGeo, crackMats);
    crackMesh.position.set(x + 0.5, y + 0.5, z + 0.5);
    crackMesh.name = `cracktex_${key}`;
    this.scene.add(crackMesh);

    // Shake block
    const blockMesh = this.blockMeshes.get(key);
    if (blockMesh) {
      const shake = progress * 0.025;
      blockMesh.position.set(
        x+0.5+(Math.random()-.5)*shake,
        y+0.5+(Math.random()-.5)*shake,
        z+0.5+(Math.random()-.5)*shake
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
    if (blockMesh) blockMesh.position.set(x+0.5, y+0.5, z+0.5);
  }
};
