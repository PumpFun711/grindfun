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

    this.socket.on('gameError', (data) => { showToast('❌ '+data.message); });
    this.socket.on('init',                (data) => { Game.onInit(data); });
    this.socket.on('playerJoined',        (data) => { Game.onPlayerJoined(data); });
    this.socket.on('playerMoved',         (data) => { Game.onPlayerMoved(data); });
    this.socket.on('playerLeft',          (data) => { Game.onPlayerLeft(data); });
    this.socket.on('blockBroken',         (data) => { Game.onBlockBroken(data); });
    this.socket.on('blockHit',            (data) => { Game.onBlockHit(data); });
    this.socket.on('pickaxeUpgraded',     (data) => { Game.onPickaxeUpgraded(data); });
    this.socket.on('playerPickaxeChanged',(data) => { Game.onPlayerPickaxeChanged(data); });

    // Show other players mining animation
    this.socket.on('playerMining', (data) => {
      Multiplayer.showPlayerMining(data.id, data.isMining);
    });

    this.socket.on('leaderboard',  (data) => { HUD.updateLeaderboard(data); });
    this.socket.on('playerCount',  (count) => {
      document.getElementById('hud-online').textContent = count+'/60';
    });
  },

  join(playerData) {
    if (!this.socket) return;
    this.socket.emit('join', playerData);
  },

  move(x, y, z, rotY, isWalking) {
    if (!this.socket) return;
    this.socket.emit('move', { x,y,z,rotY,isWalking });
  },

  mineBlock(x, y, z) {
    if (!this.socket) return;
    this.socket.emit('mineBlock', { x,y,z });
  },

  startMining() {
    if (!this.socket) return;
    this.socket.emit('startMining');
  },

  stopMining() {
    if (!this.socket) return;
    this.socket.emit('stopMining');
  },

  buyPickaxe(tier) {
    if (!this.socket) return;
    this.socket.emit('buyPickaxe', { tier });
  },

  getLeaderboard() {
    if (!this.socket) return;
    this.socket.emit('getLeaderboard');
  }
};
