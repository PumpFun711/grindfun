const Game = {
  scene: null,
  camera: null,
  renderer: null,
  animFrame: null,
  myId: null,
  myNickname: '',
  myPoints: 0,
  myBlocks: 0,
  myPickaxe: 0,

  miningTarget: null,
  miningInterval: null,
  miningHits: 0,
  miningHitsNeeded: 1,
  lastMoveUpdate: 0,
  shopOpen: false,
  _frameCount: 0,

  init() {
    this.setupScene();
    Network.connect();
  },

  setupScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog = new THREE.Fog(0x87ceeb, 24, 55);

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 80);
    this.scene.add(this.camera);

    const canvas = document.getElementById('game-canvas');
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias:false, powerPreference:'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(1);
    this.renderer.shadowMap.enabled = false;
    this.renderer.sortObjects = false;

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const sun = new THREE.DirectionalLight(0xfff5e0, 0.9);
    sun.position.set(15,30,15);
    sun.castShadow = false;
    this.scene.add(sun);

    this.buildClouds();

    window.addEventListener('resize', ()=>{
      this.camera.aspect = window.innerWidth/window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    window.addEventListener('keydown', (e)=>{
      if (e.code==='KeyE' && document.getElementById('game-screen').classList.contains('active')) {
        e.preventDefault();
        this.toggleShop();
      }
    });
  },

  buildClouds() {
    this.clouds = [];
    const mat = new THREE.MeshLambertMaterial({color:0xffffff,transparent:true,opacity:0.82});
    for (let i=0;i<8;i++) {
      const g = new THREE.Group();
      for (let j=0;j<2+Math.floor(Math.random()*3);j++) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(2+Math.random()*3,0.5+Math.random()*0.5,1.5+Math.random()*2), mat);
        m.position.set((Math.random()-.5)*3,(Math.random()-.5)*0.4,(Math.random()-.5)*2);
        m.matrixAutoUpdate=false; m.updateMatrix();
        g.add(m);
      }
      g.position.set(Math.random()*60-10, 20+Math.random()*4, Math.random()*60-10);
      g.userData.speed = 0.003+Math.random()*0.003;
      this.scene.add(g);
      this.clouds.push(g);
    }
  },

  toggleShop() {
    this.shopOpen = !this.shopOpen;
    const shop = document.getElementById('shop-overlay');
    if (this.shopOpen) {
      shop.classList.add('open');
      if (document.exitPointerLock) document.exitPointerLock();
      HUD.buildShop(this.myPickaxe, this.myPoints);
      const pts = document.getElementById('shop-pts');
      if (pts) pts.textContent = this.myPoints.toLocaleString();
    } else {
      shop.classList.remove('open');
    }
  },

  closeShop() {
    this.shopOpen = false;
    document.getElementById('shop-overlay').classList.remove('open');
  },

  onInit(data) {
    this.myId       = data.playerId;
    this.myNickname = Player.nickname;

    // Load saved progress from server
    if (data.savedPoints  !== undefined) this.myPoints  = data.savedPoints;
    if (data.savedPickaxe !== undefined) this.myPickaxe = data.savedPickaxe;
    if (data.savedBlocks  !== undefined) this.myBlocks  = data.savedBlocks;

    World.init(this.scene, data.world);
    Player.init(this.camera, this.scene, data.world, Player.nickname, Player.skinColor);
    Multiplayer.init(this.scene, this.myId);

    data.players.forEach(p => { if (p.id !== this.myId) Multiplayer.addPlayer(p.id, p); });

    HUD.init();
    HUD.setRoomInfo(data.roomName, data.playerCount, Player.nickname);
    HUD.updateStats(this.myPoints, this.myBlocks, this.myPickaxe);
    HUD.buildShop(this.myPickaxe, this.myPoints);

    // Set pickaxe color to match saved tier
    if (this.myPickaxe > 0) Player.updatePickaxeColor(this.myPickaxe);

    Network.getLeaderboard();

    if (this.animFrame) cancelAnimationFrame(this.animFrame);
    this.loop();
    this.bindMining();

    showToast('⛏ Joined ' + data.roomName + ' — welcome back!');
  },

  // Progress loaded from DB
  onProgressLoaded(data) {
    this.myPoints  = data.points;
    this.myPickaxe = data.pickaxe;
    this.myBlocks  = data.totalBlocks;
    HUD.updateStats(this.myPoints, this.myBlocks, this.myPickaxe);
    HUD.buildShop(this.myPickaxe, this.myPoints);
    if (this.myPickaxe > 0) Player.updatePickaxeColor(this.myPickaxe);
    showToast('✅ Progress loaded — ' + this.myPoints.toLocaleString() + ' pts');
  },

  onPlayerJoined(data) {
    Multiplayer.addPlayer(data.id, data);
    document.getElementById('hud-online').textContent = (Multiplayer.players.size+1)+'/60';
    showToast('👤 '+data.nickname+' joined');
  },

  onPlayerMoved(data)  { Multiplayer.updatePlayer(data.id, data); },

  onPlayerLeft(data) {
    const p = Multiplayer.players.get(data.id);
    if (p) showToast('👤 '+p.data.nickname+' left');
    Multiplayer.removePlayer(data.id);
  },

  onBlockBroken(data) {
    World.removeBlock(data.x, data.y, data.z, data.blockType);
    World.clearCrack(data.x, data.y, data.z);
    World.highlightBlock(null, null, null);

    if (data.minedBy === this.myId) {
      this.myPoints = data.playerPoints;
      this.myBlocks = data.playerBlocks;
      HUD.updateStats(this.myPoints, this.myBlocks, this.myPickaxe);
      HUD.buildShop(this.myPickaxe, this.myPoints);
      HUD.hideMineProgress();
      const col = BLOCKS[data.blockType]
        ? '#'+BLOCKS[data.blockType].color.toString(16).padStart(6,'0')
        : '#00ff88';
      HUD.showFloatText('+'+data.points+' pts', col);
      this.miningTarget = null;
      this.miningHits   = 0;
      Player.isMining   = false;
      if (this.shopOpen) HUD.buildShop(this.myPickaxe, this.myPoints);
    }
  },

  onBlockHit(data) {
    this.miningHits      = data.hitsNeeded - data.hitsLeft;
    this.miningHitsNeeded = data.hitsNeeded;
    const prog = this.miningHits / this.miningHitsNeeded;
    World.showCrack(data.x, data.y, data.z, prog);
    if (this.miningTarget) HUD.showMineProgress(prog, World.getBlock(data.x, data.y, data.z));
  },

  onPickaxeUpgraded(data) {
    this.myPickaxe = data.tier;
    this.myPoints  = data.newPoints;
    HUD.updateStats(this.myPoints, this.myBlocks, this.myPickaxe);
    HUD.buildShop(this.myPickaxe, this.myPoints);
    Player.updatePickaxeColor(data.tier);
    showToast('⛏ Upgraded to '+PICKS[data.tier].name+' Pickaxe!');
    if (this.shopOpen) HUD.buildShop(this.myPickaxe, this.myPoints);
  },

  onPlayerPickaxeChanged(data) { Multiplayer.updatePickaxeColor(data.id, data.tier); },

  bindMining() {
    const canvas = document.getElementById('game-canvas');
    canvas.addEventListener('mousedown', (e) => {
      if (e.button!==0||!Player.isPointerLocked||this.shopOpen) return;
      this.startMining();
    });
    canvas.addEventListener('mouseup', () => this.stopMining());
    document.addEventListener('pointerlockchange', () => {
      if (!Player.isPointerLocked) this.stopMining();
    });
  },

  startMining() {
    this.stopMining();
    const hit = World.raycast(this.camera, 5);
    if (!hit) return;
    this.miningTarget = { x:hit.x, y:hit.y, z:hit.z, blockType:hit.blockType };
    this.miningHits   = 0;
    Player.isMining   = true;
    World.highlightBlock(hit.x, hit.y, hit.z);
    Network.mineBlock(hit.x, hit.y, hit.z);
    Network.startMining();
    this.miningInterval = setInterval(()=>{
      if (!this.miningTarget) { this.stopMining(); return; }
      const h = World.raycast(this.camera, 5);
      if (!h||h.x!==this.miningTarget.x||h.y!==this.miningTarget.y||h.z!==this.miningTarget.z) {
        this.stopMining(); return;
      }
      Network.mineBlock(this.miningTarget.x, this.miningTarget.y, this.miningTarget.z);
    }, 250);
  },

  stopMining() {
    if (this.miningInterval) { clearInterval(this.miningInterval); this.miningInterval=null; }
    if (this.miningTarget) {
      World.clearCrack(this.miningTarget.x, this.miningTarget.y, this.miningTarget.z);
      World.highlightBlock(null, null, null);
      HUD.hideMineProgress();
    }
    this.miningTarget = null;
    this.miningHits   = 0;
    Player.isMining   = false;
    Network.stopMining();
  },

  loop() {
    this.animFrame = requestAnimationFrame(()=>this.loop());
    this._frameCount++;
    if (!this.shopOpen) Player.update();
    Multiplayer.update();
    if (this._frameCount%3===0 && this.clouds) {
      this.clouds.forEach(c=>{
        c.position.x += c.userData.speed;
        if (c.position.x>60) c.position.x=-20;
      });
    }
    const now = Date.now();
    if (now-this.lastMoveUpdate>50) {
      this.lastMoveUpdate=now;
      const p=Player.getPosition();
      Network.move(p.x,p.y,p.z,p.rotY,p.isWalking);
    }
    this.renderer.render(this.scene, this.camera);
  },

  leave() {
    this.stopMining(); this.closeShop();
    if (this.animFrame) cancelAnimationFrame(this.animFrame);
    if (Network.socket) Network.socket.disconnect();
    this.renderer.dispose(); this.scene.clear();
    document.getElementById('game-screen').classList.remove('active');
    Player.isPointerLocked = false;
    if (document.pointerLockElement) document.exitPointerLock();
  }
};

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'), 3000);
}
