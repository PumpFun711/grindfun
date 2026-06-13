const Game = {
  scene: null,
  camera: null,
  renderer: null,
  animFrame: null,
  myId: null,
  myNickname: '',
  mySkinColor: '',
  myPoints: 0,
  myBlocks: 0,
  myPickaxe: 0,

  miningTarget: null,
  miningInterval: null,
  miningHits: 0,
  miningHitsNeeded: 1,
  lastMoveUpdate: 0,
  shopOpen: false,

  init() {
    this.setupScene();
    Network.connect();
  },

  setupScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog = new THREE.Fog(0x87ceeb, 20, 60);

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
    this.scene.add(this.camera);

    const canvas = document.getElementById('game-canvas');
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambient);
    const sun = new THREE.DirectionalLight(0xfff5e0, 1.0);
    sun.position.set(20, 40, 20);
    this.scene.add(sun);
    const fill = new THREE.DirectionalLight(0x8888ff, 0.3);
    fill.position.set(-10, 10, -10);
    this.scene.add(fill);

    this.buildClouds();

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // E key to open/close shop
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyE' && document.getElementById('game-screen').classList.contains('active')) {
        e.preventDefault();
        this.toggleShop();
      }
    });
  },

  buildClouds() {
    this.clouds = [];
    const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
    for (let i = 0; i < 12; i++) {
      const group = new THREE.Group();
      const count = 3 + Math.floor(Math.random() * 4);
      for (let j = 0; j < count; j++) {
        const geo = new THREE.BoxGeometry(2 + Math.random() * 3, 0.6 + Math.random() * 0.6, 1.5 + Math.random() * 2);
        const mesh = new THREE.Mesh(geo, cloudMat);
        mesh.position.set((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 3);
        group.add(mesh);
      }
      group.position.set(Math.random() * 40 - 10, 22 + Math.random() * 4, Math.random() * 40 - 10);
      group.userData.cloudSpeed = 0.002 + Math.random() * 0.003;
      this.scene.add(group);
      this.clouds.push(group);
    }
  },

  toggleShop() {
    this.shopOpen = !this.shopOpen;
    const shop = document.getElementById('shop-overlay');
    if (this.shopOpen) {
      shop.classList.add('open');
      // Release pointer lock so mouse works in shop
      if (document.exitPointerLock) document.exitPointerLock();
      HUD.buildShop(this.myPickaxe, this.myPoints);
    } else {
      shop.classList.remove('open');
    }
  },

  closeShop() {
    this.shopOpen = false;
    document.getElementById('shop-overlay').classList.remove('open');
  },

  onInit(data) {
    this.myId = data.playerId;
    this.myNickname = Player.nickname;

    World.init(this.scene, data.world);
    Player.init(this.camera, this.scene, data.world, Player.nickname, Player.skinColor);
    Multiplayer.init(this.scene, this.myId);

    data.players.forEach(p => {
      if (p.id !== this.myId) Multiplayer.addPlayer(p.id, p);
    });

    HUD.init();
    HUD.setRoomInfo(data.roomName, data.playerCount, Player.nickname);
    HUD.buildShop(0, 0);

    Network.getLeaderboard();

    if (this.animFrame) cancelAnimationFrame(this.animFrame);
    this.loop();
    this.bindMining();

    showToast('⛏ Joined ' + data.roomName + ' — WASD move, SPACE jump, E for shop!');
  },

  onPlayerJoined(data) {
    Multiplayer.addPlayer(data.id, data);
    document.getElementById('hud-online').textContent = (Multiplayer.players.size + 1) + '/60';
    showToast('👤 ' + data.nickname + ' joined');
  },

  onPlayerMoved(data) {
    Multiplayer.updatePlayer(data.id, data);
  },

  onPlayerLeft(data) {
    const p = Multiplayer.players.get(data.id);
    if (p) showToast('👤 ' + p.data.nickname + ' left');
    Multiplayer.removePlayer(data.id);
  },

  onBlockBroken(data) {
    World.removeBlock(data.x, data.y, data.z, data.blockType);
    World.clearCrack(data.x, data.y, data.z);
    World.highlightBlock(null);

    if (data.minedBy === this.myId) {
      this.myPoints = data.playerPoints;
      this.myBlocks = data.playerBlocks;
      HUD.updateStats(this.myPoints, this.myBlocks, this.myPickaxe);
      HUD.buildShop(this.myPickaxe, this.myPoints);
      HUD.hideMineProgress();

      const blockColor = BLOCKS[data.blockType]
        ? '#' + BLOCKS[data.blockType].color.toString(16).padStart(6, '0')
        : '#00ff88';
      HUD.showFloatText('+' + data.points + ' pts', blockColor);

      this.miningTarget = null;
      this.miningHits = 0;
      Player.isMining = false;

      // Auto refresh shop if open
      if (this.shopOpen) HUD.buildShop(this.myPickaxe, this.myPoints);
    }
  },

  onBlockHit(data) {
    this.miningHits = data.hitsNeeded - data.hitsLeft;
    this.miningHitsNeeded = data.hitsNeeded;
    const progress = this.miningHits / this.miningHitsNeeded;
    World.showCrack(data.x, data.y, data.z, progress);

    if (this.miningTarget) {
      HUD.showMineProgress(progress, World.getBlock(data.x, data.y, data.z));
    }
  },

  onPickaxeUpgraded(data) {
    this.myPickaxe = data.tier;
    this.myPoints = data.newPoints;
    HUD.updateStats(this.myPoints, this.myBlocks, this.myPickaxe);
    HUD.buildShop(this.myPickaxe, this.myPoints);
    Player.updatePickaxeColor(data.tier);
    showToast('⛏ Upgraded to ' + PICKS[data.tier].name + ' Pickaxe!');
    if (this.shopOpen) HUD.buildShop(this.myPickaxe, this.myPoints);
  },

  onPlayerPickaxeChanged(data) {
    Multiplayer.updatePickaxeColor(data.id, data.tier);
  },

  bindMining() {
    const canvas = document.getElementById('game-canvas');

    canvas.addEventListener('mousedown', (e) => {
      if (e.button !== 0 || !Player.isPointerLocked || this.shopOpen) return;
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

    this.miningTarget = { x: hit.x, y: hit.y, z: hit.z, blockType: hit.blockType };
    this.miningHits = 0;
    Player.isMining = true;

    World.highlightBlock(hit.x, hit.y, hit.z);
    Network.mineBlock(hit.x, hit.y, hit.z);

    this.miningInterval = setInterval(() => {
      if (!this.miningTarget) { this.stopMining(); return; }
      const hit = World.raycast(this.camera, 5);
      if (!hit || hit.x !== this.miningTarget.x || hit.y !== this.miningTarget.y || hit.z !== this.miningTarget.z) {
        this.stopMining();
        return;
      }
      Network.mineBlock(this.miningTarget.x, this.miningTarget.y, this.miningTarget.z);
    }, 250);
  },

  stopMining() {
    if (this.miningInterval) { clearInterval(this.miningInterval); this.miningInterval = null; }
    if (this.miningTarget) {
      World.clearCrack(this.miningTarget.x, this.miningTarget.y, this.miningTarget.z);
      World.highlightBlock(null);
      HUD.hideMineProgress();
    }
    this.miningTarget = null;
    this.miningHits = 0;
    Player.isMining = false;
  },

  loop() {
    this.animFrame = requestAnimationFrame(() => this.loop());

    // Only update player if shop is closed
    if (!this.shopOpen) {
      Player.update();
    }

    Multiplayer.update();

    if (this.clouds) {
      this.clouds.forEach(cloud => {
        cloud.position.x += cloud.userData.cloudSpeed;
        if (cloud.position.x > 50) cloud.position.x = -20;
      });
    }

    const now = Date.now();
    if (now - this.lastMoveUpdate > 50) {
      this.lastMoveUpdate = now;
      const pos = Player.getPosition();
      Network.move(pos.x, pos.y, pos.z, pos.rotY, pos.isWalking);
    }

    this.renderer.render(this.scene, this.camera);
  },

  leave() {
    this.stopMining();
    this.closeShop();
    if (this.animFrame) cancelAnimationFrame(this.animFrame);
    if (Network.socket) Network.socket.disconnect();
    this.renderer.dispose();
    this.scene.clear();
    document.getElementById('game-screen').classList.remove('active');
    Player.isPointerLocked = false;
    if (document.pointerLockElement) document.exitPointerLock();
  }
};

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}
