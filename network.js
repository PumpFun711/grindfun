const Network = {
  socket: null,
  connected: false,
  playerId: null,

  connect() {
    this.socket = io();

    this.socket.on('connect', () => {
      this.connected = true;
      this.playerId = this.socket.id;
      console.log('[Network] Connected:', this.playerId);
    });

    this.socket.on('disconnect', () => {
      this.connected = false;
      showToast('❌ Disconnected. Reconnecting...');
    });

    this.socket.on('gameError', (data) => {
      showToast('❌ ' + data.message);
    });

    // Server sends full world + players on join
    this.socket.on('init', (data) => {
      Game.onInit(data);
    });

    // Another player joined
    this.socket.on('playerJoined', (data) => {
      Game.onPlayerJoined(data);
    });

    // Another player moved
    this.socket.on('playerMoved', (data) => {
      Game.onPlayerMoved(data);
    });

    // Another player left
    this.socket.on('playerLeft', (data) => {
      Game.onPlayerLeft(data);
    });

    // Block fully broken by anyone
    this.socket.on('blockBroken', (data) => {
      Game.onBlockBroken(data);
    });

    // Our hit landed but block not broken yet
    this.socket.on('blockHit', (data) => {
      Game.onBlockHit(data);
    });

    // Our pickaxe was upgraded
    this.socket.on('pickaxeUpgraded', (data) => {
      Game.onPickaxeUpgraded(data);
    });

    // Another player changed pickaxe
    this.socket.on('playerPickaxeChanged', (data) => {
      Game.onPlayerPickaxeChanged(data);
    });

    // Leaderboard update
    this.socket.on('leaderboard', (data) => {
      HUD.updateLeaderboard(data);
    });

    // Player count update
    this.socket.on('playerCount', (count) => {
      document.getElementById('hud-online').textContent = count + '/60';
    });
  },

  join(playerData) {
    if (!this.socket) return;
    this.socket.emit('join', playerData);
  },

  // Send position update
  move(x, y, z, rotY, isWalking) {
    if (!this.socket) return;
    this.socket.emit('move', { x, y, z, rotY, isWalking });
  },

  // Mine a block
  mineBlock(x, y, z) {
    if (!this.socket) return;
    this.socket.emit('mineBlock', { x, y, z });
  },

  // Buy pickaxe upgrade
  buyPickaxe(tier) {
    if (!this.socket) return;
    this.socket.emit('buyPickaxe', { tier });
  },

  // Request leaderboard
  getLeaderboard() {
    if (!this.socket) return;
    this.socket.emit('getLeaderboard');
  }
};
