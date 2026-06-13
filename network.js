const Network = {
  socket: null,
  connected: false,
  playerId: null,

  connect() {
    this.socket = io();

    this.socket.on('connect', ()=>{
      this.connected = true;
      this.playerId  = this.socket.id;
      console.log('[Network] Connected:', this.playerId);
    });

    this.socket.on('disconnect', ()=>{
      this.connected = false;
      showToast('❌ Disconnected. Reconnecting...');
    });

    this.socket.on('gameError',           (d)=>{ showToast('❌ '+d.message); });
    this.socket.on('init',                (d)=>{ Game.onInit(d); });
    this.socket.on('progressLoaded',      (d)=>{ Game.onProgressLoaded(d); });
    this.socket.on('playerJoined',        (d)=>{ Game.onPlayerJoined(d); });
    this.socket.on('playerMoved',         (d)=>{ Game.onPlayerMoved(d); });
    this.socket.on('playerLeft',          (d)=>{ Game.onPlayerLeft(d); });
    this.socket.on('blockBroken',         (d)=>{ Game.onBlockBroken(d); });
    this.socket.on('blockHit',            (d)=>{ Game.onBlockHit(d); });
    this.socket.on('pickaxeUpgraded',     (d)=>{ Game.onPickaxeUpgraded(d); });
    this.socket.on('playerPickaxeChanged',(d)=>{ Game.onPlayerPickaxeChanged(d); });
    this.socket.on('playerMining',        (d)=>{ Multiplayer.showPlayerMining(d.id, d.isMining); });
    this.socket.on('leaderboard',         (d)=>{ HUD.updateLeaderboard(d); });
    this.socket.on('playerCount',         (c)=>{
      document.getElementById('hud-online').textContent = c+'/60';
    });
  },

  join(playerData) {
    if (!this.socket) return;
    this.socket.emit('join', {
      nickname:      playerData.nickname,
      skinColor:     playerData.skinColor,
      walletAddress: playerData.walletAddress || 'unknown'
    });
  },

  move(x,y,z,rotY,isWalking) {
    if (!this.socket) return;
    this.socket.emit('move', {x,y,z,rotY,isWalking});
  },

  mineBlock(x,y,z) {
    if (!this.socket) return;
    this.socket.emit('mineBlock', {x,y,z});
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
    this.socket.emit('buyPickaxe', {tier});
  },

  getLeaderboard() {
    if (!this.socket) return;
    this.socket.emit('getLeaderboard');
  }
};
