// HUD — manages all in-game UI elements
const HUD = {
  mineProgress: 0,
  mineTarget: null,

  init() {
    this.buildBlockLegend();
    this.buildShop(0, 0);
  },

  // ── MINING PROGRESS BAR ──
  showMineProgress(progress, blockType) {
    const el = document.getElementById('mine-progress');
    const bar = document.getElementById('mine-bar');
    const label = document.getElementById('mine-label');
    if (!el || !bar) return;

    el.style.display = 'block';
    bar.style.width = (progress * 100) + '%';

    if (blockType >= 0 && BLOCKS[blockType]) {
      const color = '#' + BLOCKS[blockType].color.toString(16).padStart(6, '0');
      bar.style.background = color;
      label.textContent = 'MINING ' + BLOCKS[blockType].name.toUpperCase() + '...';
    }
  },

  hideMineProgress() {
    const el = document.getElementById('mine-progress');
    const bar = document.getElementById('mine-bar');
    if (!el || !bar) return;
    el.style.display = 'none';
    bar.style.width = '0%';
  },

  // ── STATS ──
  updateStats(points, blocks, pickTier) {
    const pts = document.getElementById('hud-pts');
    const blk = document.getElementById('hud-blocks');
    const pick = document.getElementById('hud-pick');
    if (pts) pts.textContent = points.toLocaleString();
    if (blk) blk.textContent = blocks;
    if (pick) {
      pick.textContent = PICKS[pickTier].name;
      pick.style.color = PICKS[pickTier].color;
    }
  },

  // ── BLOCK LEGEND ──
  buildBlockLegend() {
    const el = document.getElementById('block-legend');
    if (!el) return;
    el.innerHTML = BLOCKS.map(b => {
      const color = '#' + b.color.toString(16).padStart(6, '0');
      return `<div class="block-legend-item">
        <div class="block-legend-dot" style="background:${color}"></div>
        <span>${b.name}</span>
        <span class="block-legend-pts">+${b.pts}</span>
      </div>`;
    }).join('');
  },

  // ── PICKAXE SHOP ──
  buildShop(currentTier, currentPoints) {
    const el = document.getElementById('shop-list');
    if (!el) return;
    el.innerHTML = PICKS.map((p, i) => {
      const owned = i <= currentTier;
      const isNext = i === currentTier + 1;
      const canAfford = currentPoints >= p.cost && isNext;
      const label = owned
        ? `✓ ${p.name}`
        : `${p.name} — ${p.cost.toLocaleString()} pts`;
      return `<button
        class="shop-btn${owned ? ' owned' : ''}"
        ${!owned && !canAfford ? 'disabled' : ''}
        onclick="Network.buyPickaxe(${i})"
        style="${owned ? `color:${p.color}` : ''}"
      >${label}</button>`;
    }).join('');
  },

  // ── LEADERBOARD ──
  updateLeaderboard(data) {
    const el = document.getElementById('leaderboard-list');
    if (!el) return;
    const medals = ['🥇', '🥈', '🥉'];
    el.innerHTML = data.map((p, i) => {
      const isMe = Game.myNickname && p.nickname === Game.myNickname;
      return `<div class="lb-item${isMe ? ' me' : ''}">
        <span>${medals[i] || (i+1)+'.'} ${p.nickname}</span>
        <span class="lb-pts">${p.points.toLocaleString()}</span>
      </div>`;
    }).join('');
  },

  // ── FLOAT TEXT ──
  showFloatText(text, color) {
    const existing = document.getElementById('float-text');
    if (existing) existing.remove();

    const el = document.createElement('div');
    el.id = 'float-text';
    el.style.cssText = `
      position:fixed;
      top:55%;
      left:50%;
      transform:translate(-50%,-50%);
      color:${color || '#00ff88'};
      font-family:'Courier New',monospace;
      font-weight:900;
      font-size:22px;
      pointer-events:none;
      z-index:100;
      text-shadow:2px 2px 0 #000,0 0 20px ${color || '#00ff88'};
      animation:floatCenter 1.2s ease-out forwards;
    `;
    el.textContent = text;
    document.body.appendChild(el);

    // Add keyframe if not already present
    if (!document.getElementById('float-style')) {
      const style = document.createElement('style');
      style.id = 'float-style';
      style.textContent = `
        @keyframes floatCenter {
          0%   { opacity:1; transform:translate(-50%,-50%) scale(1.3); }
          30%  { opacity:1; transform:translate(-50%,-60%) scale(1); }
          100% { opacity:0; transform:translate(-50%,-80%) scale(0.8); }
        }
      `;
      document.head.appendChild(style);
    }
    setTimeout(() => el.remove(), 1200);
  },

  // ── ROOM INFO ──
  setRoomInfo(roomName, playerCount, nickname) {
    const room = document.getElementById('hud-room');
    const online = document.getElementById('hud-online');
    const name = document.getElementById('hud-name');
    if (room) room.textContent = roomName;
    if (online) online.textContent = playerCount + '/60';
    if (name) name.textContent = nickname;
  }
};
