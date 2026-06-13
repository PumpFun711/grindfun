const SKIN_COLORS = [
  '#f4b07a','#d4956a','#c07840','#8b5e3c',
  '#5a3620','#fddbb4','#00ff88','#4fc3f7',
  '#ff4444','#aa44ff','#ffd700','#ffffff'
];

const UI = {
  selectedSkin: SKIN_COLORS[0],

  init() {
    document.getElementById('btn-connect-nav').onclick = () => this.openCharModal();
    document.getElementById('btn-play-now').onclick = () => this.openCharModal();
    document.getElementById('btn-spectate').onclick = () => showToast('👁 Spectate mode coming soon!');

    document.getElementById('modal-char-close').onclick = () => this.closeCharModal();
    document.getElementById('btn-enter-world').onclick = () => this.enterWorld();
    document.getElementById('modal-char').onclick = (e) => {
      if (e.target === document.getElementById('modal-char')) this.closeCharModal();
    };

    document.getElementById('btn-leave').onclick = () => {
      if (confirm('Leave the server?')) Game.leave();
    };

    document.getElementById('ca-copy').onclick = () => {
      navigator.clipboard.writeText('$GRINDFUN').catch(() => {});
      showToast('📋 $GRINDFUN copied!');
    };

    this.buildSkinPicker();
    this.buildPickaxeGrid();
    this.buildBlockGrid();
    this.animateLiveCount();
    this.initBgCanvas();

    Game.init();
  },

  openCharModal() {
    document.getElementById('modal-char').classList.add('open');
    setTimeout(() => document.getElementById('char-nickname').focus(), 100);
  },

  closeCharModal() {
    document.getElementById('modal-char').classList.remove('open');
  },

  buildSkinPicker() {
    const el = document.getElementById('skin-colors');
    if (!el) return;
    el.innerHTML = '';
    SKIN_COLORS.forEach((c, i) => {
      const btn = document.createElement('button');
      btn.className = 'color-btn' + (i === 0 ? ' active' : '');
      btn.style.background = c;
      btn.title = c;
      btn.onclick = () => {
        el.querySelectorAll('.color-btn').forEach((b, j) => b.classList.toggle('active', j === i));
        this.selectedSkin = c;
      };
      el.appendChild(btn);
    });
  },

  enterWorld() {
    const nickname = document.getElementById('char-nickname').value.trim() || 'GrindFun';
    this.closeCharModal();

    Player.nickname = nickname;
    Player.skinColor = this.selectedSkin;

    document.getElementById('game-screen').classList.add('active');

    Network.join({
      nickname,
      skinColor: this.selectedSkin
    });
  },

  buildPickaxeGrid() {
    const el = document.getElementById('picks-grid');
    if (!el) return;
    const EMOJIS = ['🪵','🪨','⚙️','✨','💎','⛏'];
    el.innerHTML = PICKS.map((p, i) =>
      `<div class="pick-card${i === PICKS.length-1 ? ' featured' : ''}">
        <span class="pick-emoji">${EMOJIS[i]}</span>
        <div class="pick-name" style="color:${p.color}">${p.name} Pickaxe</div>
        <div class="pick-cost" style="color:${i===PICKS.length-1?'#00ff88':'rgba(255,255,255,0.5)'}">
          ${p.cost === 0 ? 'Free' : p.cost.toLocaleString() + ' pts'}
        </div>
        <div class="pick-power">Power: ${p.power}×</div>
      </div>`
    ).join('');
  },

  buildBlockGrid() {
    const el = document.getElementById('blocks-grid');
    if (!el) return;
    const RARE_COLORS = [
      '#888','#888','#888','#888',
      '#4fc3f7','#4fc3f7','#4fc3f7',
      '#ffd700','#ffd700','#ffd700',
      '#aa44ff','#aa44ff',
      '#00ff88'
    ];
    const RARE_NAMES = [
      'Common','Common','Common','Common',
      'Uncommon','Uncommon','Uncommon',
      'Rare','Rare','Rare',
      'Epic','Epic',
      'Legendary'
    ];
    el.innerHTML = BLOCKS.map((b, i) => {
      const color = '#' + b.color.toString(16).padStart(6, '0');
      return `<div class="block-card">
        <div class="block-swatch" style="background:${color};border:1px solid rgba(255,255,255,0.1)"></div>
        <div>
          <div class="block-name">${b.name}</div>
          <div class="block-pts">+${b.pts} pts</div>
          <div class="block-rare" style="color:${RARE_COLORS[i]}">${RARE_NAMES[i]}</div>
        </div>
      </div>`;
    }).join('');
  },

  animateLiveCount() {
    let base = 847;
    setInterval(() => {
      base += Math.floor((Math.random() - 0.45) * 3);
      base = Math.max(600, Math.min(1200, base));
      const el = document.getElementById('live-players');
      if (el) el.textContent = base.toLocaleString() + ' players online';
    }, 3000);
  },

  initBgCanvas() {
    const canvas = document.getElementById('bg-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W, H, t = 0;

    const COLORS = [
      '#5a8c3e','#8B6914','#888888','#222222',
      '#c0896e','#d4af37','#4fc3f7','#00ff88'
    ];

    const blocks = [];

    function buildBlocks() {
      blocks.length = 0;
      for (let i = 0; i < 40; i++) {
        blocks.push({
          x: Math.random() * W,
          y: Math.random() * H,
          size: 20 + Math.random() * 50,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          speed: 0.2 + Math.random() * 0.5,
          rot: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.02,
          alpha: 0.08 + Math.random() * 0.2
        });
      }
    }

    function resize() {
      W = canvas.offsetWidth;
      H = canvas.offsetHeight;
      canvas.width = W;
      canvas.height = H;
      buildBlocks();
    }

    function drawBlock(b) {
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.rot);
      ctx.globalAlpha = b.alpha;
      ctx.fillStyle = b.color;
      ctx.fillRect(-b.size/2, -b.size/2, b.size, b.size);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(b.size/2 - b.size*0.2, -b.size/2, b.size*0.2, b.size);
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(-b.size/2, b.size/2 - b.size*0.2, b.size, b.size*0.2);
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    function loop() {
      requestAnimationFrame(loop);
      t += 0.016;
      ctx.clearRect(0, 0, W, H);

      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, '#0a1a0a');
      grad.addColorStop(1, '#050a05');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      blocks.forEach(b => {
        b.y -= b.speed;
        b.rot += b.rotSpeed;
        if (b.y + b.size < 0) {
          b.y = H + b.size;
          b.x = Math.random() * W;
        }
        drawBlock(b);
      });

      ctx.fillStyle = 'rgba(0,0,0,0.03)';
      for (let y = 0; y < H; y += 4) {
        ctx.fillRect(0, y, W, 2);
      }
    }

    window.addEventListener('resize', resize);
    resize();
    loop();
  }
};

window.addEventListener('DOMContentLoaded', () => {
  UI.init();
});
