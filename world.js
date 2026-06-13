const World = {
  blockMeshes: new Map(),
  crackMeshes: new Map(),
  scene: null,
  worldData: null,
  textureCache: new Map(),
  matCache: new Map(),
  respawnQueue: new Map(),
  RESPAWN_TIME: 10000,

  BLOCK_COLORS: [
    0x8B6914, 0x5a8c3e, 0xd9c47a, 0xa0714a,
    0x888888, 0x222222, 0xc0896e, 0xd4af37,
    0xcc2200, 0x1a3db5, 0x00b865, 0x4fc3f7,
    0x00ff88, 0x2d7a2d,
  ],

  BLOCK_EMISSIVE: {
    12: 0x002211,
    11: 0x000811,
    10: 0x000800,
  },

  RESPAWN_POOL: [
    [1,35],[0,18],[2,8],[4,14],[5,8],
    [6,6],[7,4],[8,3],[9,2],[10,1],[11,1],[12,1]
  ],

  pickRespawnBlock() {
    const total = this.RESPAWN_POOL.reduce((a,b)=>a+b[1],0);
    let roll = Math.random()*total;
    for (const [t,w] of this.RESPAWN_POOL) { roll-=w; if(roll<=0) return t; }
    return 1;
  },

  makeTexture(blockType) {
    const key = 'tex_'+blockType;
    if (this.textureCache.has(key)) return this.textureCache.get(key);

    const size = 32;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');

    const base = this.BLOCK_COLORS[blockType] || 0x888888;
    const r=(base>>16)&0xff, g=(base>>8)&0xff, b=base&0xff;
    const baseC=`rgb(${r},${g},${b})`;
    const darkC=`rgb(${Math.floor(r*.6)},${Math.floor(g*.6)},${Math.floor(b*.6)})`;
    const lightC=`rgb(${Math.min(255,Math.floor(r*1.3))},${Math.min(255,Math.floor(g*1.3))},${Math.min(255,Math.floor(b*1.3))})`;

    ctx.fillStyle=baseC; ctx.fillRect(0,0,size,size);

    switch(blockType) {
      case 0:
        for(let i=0;i<10;i++){ctx.fillStyle=i%2?darkC:lightC;ctx.fillRect(Math.random()*size|0,Math.random()*size|0,(Math.random()*4+1)|0,(Math.random()*2+1)|0);}
        break;
      case 1:
        ctx.fillStyle='#4a8c2e';ctx.fillRect(0,0,size,size);
        for(let i=0;i<8;i++){ctx.fillStyle=i%2?'#3a7020':'#6ab840';ctx.fillRect(Math.random()*size|0,Math.random()*size|0,(Math.random()*4+1)|0,(Math.random()*3+1)|0);}
        break;
      case 2:
        for(let i=0;i<10;i++){ctx.fillStyle=i%2?'#c8b060':'#e8d48a';ctx.fillRect(Math.random()*size|0,Math.random()*size|0,(Math.random()*3+1)|0,1);}
        break;
      case 3:
        ctx.fillStyle='#6a4020';ctx.fillRect(0,0,size,size);
        ctx.strokeStyle='#4a2810';ctx.lineWidth=1;
        ctx.beginPath();ctx.arc(size/2,size/2,10,0,Math.PI*2);ctx.stroke();
        ctx.beginPath();ctx.arc(size/2,size/2,5,0,Math.PI*2);ctx.stroke();
        break;
      case 4:
        ctx.fillStyle='#7a7a7a';ctx.fillRect(0,0,size,size);
        ctx.strokeStyle='#555';ctx.lineWidth=1;
        ctx.beginPath();ctx.moveTo(4,2);ctx.lineTo(10,14);ctx.moveTo(18,4);ctx.lineTo(14,16);ctx.stroke();
        for(let i=0;i<4;i++){ctx.fillStyle='#aaa';ctx.fillRect(Math.random()*size|0,Math.random()*size|0,(Math.random()*5+2)|0,2);}
        break;
      case 5:
        ctx.fillStyle='#2a2a2a';ctx.fillRect(0,0,size,size);
        [[4,4,7,5],[14,9,5,6],[5,16,7,5],[17,17,6,4]].forEach(([x,y,w,h])=>{ctx.fillStyle='#111';ctx.fillRect(x,y,w,h);ctx.fillStyle='#444';ctx.fillRect(x,y,w,1);});
        break;
      case 6:
        ctx.fillStyle='#6a6a6a';ctx.fillRect(0,0,size,size);
        [[3,3,5,4],[13,6,5,4],[4,14,5,4],[15,15,5,4],[9,9,4,3]].forEach(([x,y,w,h])=>{ctx.fillStyle='#c0896e';ctx.fillRect(x,y,w,h);ctx.fillStyle='#e0a98e';ctx.fillRect(x,y,w,1);});
        break;
      case 7:
        ctx.fillStyle='#6a6a6a';ctx.fillRect(0,0,size,size);
        [[3,3,5,4],[13,6,5,4],[4,14,5,4],[15,15,5,4],[9,9,4,3]].forEach(([x,y,w,h])=>{ctx.fillStyle='#d4af37';ctx.fillRect(x,y,w,h);ctx.fillStyle='#f0d060';ctx.fillRect(x,y,w,1);});
        break;
      case 8:
        ctx.fillStyle='#5a5a5a';ctx.fillRect(0,0,size,size);
        [[3,3,5,4],[13,6,5,4],[4,14,5,4],[15,15,5,4],[9,9,4,3]].forEach(([x,y,w,h])=>{ctx.fillStyle='#cc2200';ctx.fillRect(x,y,w,h);ctx.fillStyle='#ff4422';ctx.fillRect(x,y,w,1);});
        break;
      case 9:
        ctx.fillStyle='#5a5a6a';ctx.fillRect(0,0,size,size);
        [[3,3,6,5],[13,6,6,5],[4,14,6,5],[15,15,6,5],[8,8,5,4]].forEach(([x,y,w,h])=>{ctx.fillStyle='#1a3db5';ctx.fillRect(x,y,w,h);ctx.fillStyle='#4466ff';ctx.fillRect(x,y,w,1);});
        break;
      case 10:
        ctx.fillStyle='#444';ctx.fillRect(0,0,size,size);
        [[3,2,6,6],[14,5,6,6],[3,14,6,6],[14,14,6,6],[9,9,5,5]].forEach(([x,y,w,h])=>{ctx.fillStyle='#00b865';ctx.fillRect(x,y,w,h);ctx.fillStyle='#00ff88';ctx.fillRect(x,y,w,1);ctx.fillRect(x,y,1,h);});
        break;
      case 11:
        ctx.fillStyle='#333344';ctx.fillRect(0,0,size,size);
        [[3,2,6,5],[14,5,6,5],[3,14,6,5],[14,14,6,5],[9,9,6,5]].forEach(([x,y,w,h])=>{ctx.fillStyle='#2aafd4';ctx.fillRect(x,y,w,h);ctx.fillStyle='#88eeff';ctx.fillRect(x,y,w,1);ctx.fillRect(x,y,1,h);});
        break;
      case 12:
        ctx.fillStyle='#111122';ctx.fillRect(0,0,size,size);
        [[2,2,8,6],[14,3,8,6],[2,14,8,6],[14,14,8,6],[7,7,8,6]].forEach(([x,y,w,h])=>{ctx.fillStyle='#00aa55';ctx.fillRect(x,y,w,h);ctx.fillStyle='#00ff88';ctx.fillRect(x,y,w,2);ctx.fillRect(x,y,2,h);ctx.fillStyle='rgba(0,255,136,0.5)';ctx.fillRect(x+2,y+2,3,3);});
        break;
      case 13:
        ctx.fillStyle='#2d7a2d';ctx.fillRect(0,0,size,size);
        for(let i=0;i<10;i++){ctx.fillStyle=i%3===0?'#1a5a1a':i%3===1?'#3a9a3a':'#4ab040';ctx.fillRect(Math.random()*size|0,Math.random()*size|0,(Math.random()*5+2)|0,(Math.random()*4+1)|0);}
        break;
    }

    ctx.strokeStyle='rgba(0,0,0,0.18)';ctx.lineWidth=0.5;ctx.strokeRect(0,0,size,size);

    const tex=new THREE.CanvasTexture(canvas);
    tex.magFilter=THREE.NearestFilter;
    tex.minFilter=THREE.NearestMipMapLinearFilter;
    tex.generateMipmaps=true;
    this.textureCache.set(key,tex);
    return tex;
  },

  makeGrassSideTex() {
    const key='grassside';
    if(this.textureCache.has(key)) return this.textureCache.get(key);
    const size=32;
    const canvas=document.createElement('canvas');canvas.width=size;canvas.height=size;
    const ctx=canvas.getContext('2d');
    ctx.fillStyle='#8B6914';ctx.fillRect(0,6,size,size-6);
    for(let i=0;i<8;i++){ctx.fillStyle=i%2?'#6b4f0a':'#a07820';ctx.fillRect(Math.random()*size|0,6+Math.random()*(size-6)|0,(Math.random()*5+1)|0,2);}
    ctx.fillStyle='#4a8c2e';ctx.fillRect(0,0,size,6);
    ctx.fillStyle='#3a7020';ctx.fillRect(0,4,size,2);
    ctx.strokeStyle='rgba(0,0,0,0.18)';ctx.lineWidth=0.5;ctx.strokeRect(0,0,size,size);
    const tex=new THREE.CanvasTexture(canvas);
    tex.magFilter=THREE.NearestFilter;tex.minFilter=THREE.NearestMipMapLinearFilter;
    this.textureCache.set(key,tex);return tex;
  },

  makeWoodSideTex() {
    const key='woodside';
    if(this.textureCache.has(key)) return this.textureCache.get(key);
    const size=32;
    const canvas=document.createElement('canvas');canvas.width=size;canvas.height=size;
    const ctx=canvas.getContext('2d');
    for(let x=0;x<size;x+=3){ctx.fillStyle=x%6===0?'#5a3818':x%6===3?'#7a5030':'#6a4020';ctx.fillRect(x,0,3,size);}
    ctx.fillStyle='rgba(0,0,0,0.15)';
    for(let y=0;y<size;y+=5){ctx.fillRect(0,y,size,1);}
    ctx.strokeStyle='rgba(0,0,0,0.18)';ctx.lineWidth=0.5;ctx.strokeRect(0,0,size,size);
    const tex=new THREE.CanvasTexture(canvas);
    tex.magFilter=THREE.NearestFilter;tex.minFilter=THREE.NearestMipMapLinearFilter;
    this.textureCache.set(key,tex);return tex;
  },

  getMat(blockType, face) {
    const key=`${blockType}_${face}`;
    if(this.matCache.has(key)) return this.matCache.get(key);

    let tex;
    if(face==='top') tex=this.makeTexture(blockType);
    else if(face==='side') tex=blockType===1?this.makeGrassSideTex():blockType===3?this.makeWoodSideTex():this.makeTexture(blockType);
    else tex=blockType===1?this.makeTexture(0):this.makeTexture(blockType);

    const isLeaf=blockType===13;
    const mat=new THREE.MeshLambertMaterial({
      map:tex,
      emissive:new THREE.Color(this.BLOCK_EMISSIVE[blockType]||0),
      transparent:isLeaf,
      opacity:isLeaf?0.88:1,
    });
    this.matCache.set(key,mat);
    return mat;
  },

  init(scene, worldData) {
    this.scene=scene;
    this.worldData=worldData;
    this.buildWorld();
    this.startRespawnLoop();
  },

  getBlock(x, y, z) {
    const{w,h,d,data}=this.worldData;
    if(x<0||x>=w||y<0||y>=h||z<0||z>=d) return -1;
    return data[y*w*d+z*w+x];
  },

  isOpaque(x, y, z) { return this.getBlock(x,y,z)>=0; },

  buildWorld() {
    const{w,h,d}=this.worldData;
    this.blockMeshes.forEach(m=>this.scene.remove(m));
    this.blockMeshes.clear();
    const geo=new THREE.BoxGeometry(1,1,1);
    for(let y=0;y<h;y++) {
      for(let z=0;z<d;z++) {
        for(let x=0;x<w;x++) {
          const bt=this.getBlock(x,y,z);
          if(bt<0) continue;
          if(this.isOpaque(x+1,y,z)&&this.isOpaque(x-1,y,z)&&this.isOpaque(x,y+1,z)&&this.isOpaque(x,y-1,z)&&this.isOpaque(x,y,z+1)&&this.isOpaque(x,y,z-1)) continue;
          this.addBlockMesh(x,y,z,bt,geo);
        }
      }
    }
    console.log(`[World] ${this.blockMeshes.size} meshes`);
  },

  addBlockMesh(x, y, z, blockType, geo) {
    geo=geo||new THREE.BoxGeometry(1,1,1);
    const mats=[
      this.getMat(blockType,'side'),this.getMat(blockType,'side'),
      this.getMat(blockType,'top'),this.getMat(blockType,'bottom'),
      this.getMat(blockType,'side'),this.getMat(blockType,'side'),
    ];
    const mesh=new THREE.Mesh(geo,mats);
    mesh.position.set(x+0.5,y+0.5,z+0.5);
    mesh.userData={blockType,bx:x,by:y,bz:z};
    mesh.matrixAutoUpdate=false;
    mesh.updateMatrix();
    this.scene.add(mesh);
    this.blockMeshes.set(`${x},${y},${z}`,mesh);
    return mesh;
  },

  removeBlock(x, y, z, blockType) {
    const key=`${x},${y},${z}`;
    const mesh=this.blockMeshes.get(key);
    if(mesh){this.scene.remove(mesh);this.blockMeshes.delete(key);}
    const{w,d}=this.worldData;
    this.worldData.data[y*w*d+z*w+x]=-1;
    if(blockType!==13) {
      this.respawnQueue.set(key,{x,y,z,blockType,respawnAt:Date.now()+this.RESPAWN_TIME});
    }
  },

  startRespawnLoop() {
    setInterval(()=>{
      const now=Date.now();
      this.respawnQueue.forEach((item,key)=>{
        if(now>=item.respawnAt){
          if(this.getBlock(item.x,item.y,item.z)<0){
            const newType=this.pickRespawnBlock();
            const{w,d}=this.worldData;
            this.worldData.data[item.y*w*d+item.z*w+item.x]=newType;
            this.addBlockMesh(item.x,item.y,item.z,newType);
          }
          this.respawnQueue.delete(key);
        }
      });
    },1000);
  },

  raycast(camera, maxDist) {
    const raycaster=new THREE.Raycaster();
    raycaster.setFromCamera({x:0,y:0},camera);
    raycaster.far=maxDist;
    const hits=raycaster.intersectObjects(Array.from(this.blockMeshes.values()));
    if(hits.length>0){
      const{bx,by,bz,blockType}=hits[0].object.userData;
      return{x:bx,y:by,z:bz,blockType,distance:hits[0].distance};
    }
    return null;
  },

  highlightBlock(x, y, z) {
    const old=this.scene.getObjectByName('blockHL');
    if(old) this.scene.remove(old);
    if(x===null) return;
    const mat=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.18,side:THREE.BackSide});
    const hl=new THREE.Mesh(new THREE.BoxGeometry(1.03,1.03,1.03),mat);
    hl.name='blockHL';
    hl.position.set(x+0.5,y+0.5,z+0.5);
    hl.matrixAutoUpdate=false;hl.updateMatrix();
    this.scene.add(hl);
  },

  showCrack(x, y, z, progress) {
    this.clearCrack(x,y,z);
    if(progress<=0) return;
    const key=`${x},${y},${z}`;
    const stage=Math.ceil(progress*5);

    const mat=new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:0.08+progress*0.38,side:THREE.FrontSide,depthWrite:false});
    const ov=new THREE.Mesh(new THREE.BoxGeometry(1.006,1.006,1.006),mat);
    ov.position.set(x+0.5,y+0.5,z+0.5);
    ov.name=`crack_${key}`;
    ov.matrixAutoUpdate=false;ov.updateMatrix();
    this.scene.add(ov);
    this.crackMeshes.set(key,ov);

    const cv=document.createElement('canvas');cv.width=32;cv.height=32;
    const ctx=cv.getContext('2d');
    ctx.clearRect(0,0,32,32);
    const pts=[
      [[10,5,18,14]],
      [[10,5,18,14],[4,15,14,26]],
      [[10,5,18,14],[4,15,14,26],[20,6,26,21]],
      [[10,5,18,14],[4,15,14,26],[20,6,26,21],[2,2,29,29]],
      [[10,5,18,14],[4,15,14,26],[20,6,26,21],[2,2,29,29],[16,2,6,30]]
    ];
    const lines=pts[Math.min(stage-1,4)];
    ctx.strokeStyle='rgba(0,0,0,0.85)';ctx.lineWidth=1;
    lines.forEach(([x1,y1,x2,y2])=>{ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();});
    const ct=new THREE.CanvasTexture(cv);ct.magFilter=THREE.NearestFilter;
    const cmats=Array(6).fill(null).map(()=>new THREE.MeshBasicMaterial({map:ct,transparent:true,opacity:0.55+progress*0.4,depthWrite:false,side:THREE.FrontSide}));
    const cm=new THREE.Mesh(new THREE.BoxGeometry(1.012,1.012,1.012),cmats);
    cm.position.set(x+0.5,y+0.5,z+0.5);
    cm.name=`cracktex_${key}`;
    cm.matrixAutoUpdate=false;cm.updateMatrix();
    this.scene.add(cm);

    const bm=this.blockMeshes.get(key);
    if(bm){
      const sh=progress*0.02;
      bm.position.set(x+0.5+(Math.random()-.5)*sh,y+0.5+(Math.random()-.5)*sh,z+0.5+(Math.random()-.5)*sh);
      bm.updateMatrix();
    }
  },

  clearCrack(x, y, z) {
    const key=`${x},${y},${z}`;
    const ov=this.crackMeshes.get(key);
    if(ov){this.scene.remove(ov);this.crackMeshes.delete(key);}
    const ct=this.scene.getObjectByName(`cracktex_${key}`);
    if(ct) this.scene.remove(ct);
    const bm=this.blockMeshes.get(key);
    if(bm){bm.position.set(x+0.5,y+0.5,z+0.5);bm.updateMatrix();}
  }
};
