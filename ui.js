const SKIN_COLORS = [
  '#f4b07a','#d4956a','#c07840','#8b5e3c',
  '#5a3620','#fddbb4','#00ff88','#4fc3f7',
  '#ff4444','#aa44ff','#ffd700','#ffffff'
];

const UI = {
  selectedSkin: SKIN_COLORS[0],
  walletPublicKey: null,
  walletPrivateKey: null,
  playerNickname: 'Player',

  init() {
    // Nav + hero buttons
    document.getElementById('btn-connect-nav').onclick = () => this.openAuth();
    document.getElementById('btn-play-now').onclick   = () => this.openAuth();
    document.getElementById('btn-spectate').onclick   = () => showToast('👁 Spectate mode coming soon!');

    // Auth flow buttons
    document.getElementById('btn-go-create').onclick     = () => this.showStep('create');
    document.getElementById('btn-go-login').onclick      = () => this.showStep('login');
    document.getElementById('btn-back-create').onclick   = () => this.showStep('choose');
    document.getElementById('btn-back-login').onclick    = () => this.showStep('choose');
    document.getElementById('btn-generate-wallet').onclick = () => this.generateWallet();
    document.getElementById('btn-confirm-seed').onclick  = () => this.enterWorld();
    document.getElementById('btn-login-enter').onclick   = () => this.loginWithKey();

    // Seed confirm checkbox
    document.getElementById('seed-confirm-check').onchange = (e) => {
      document.getElementById('btn-confirm-seed').disabled = !e.target.checked;
    };

    // Leave game
    document.getElementById('btn-leave').onclick = () => {
      if (confirm('Leave the server?')) Game.leave();
    };

    // CA copy
    document.getElementById('ca-copy').onclick = () => {
      navigator.clipboard.writeText('$GRINDFUN').catch(()=>{});
      showToast('📋 $GRINDFUN copied!');
    };

    // Build color pickers for both create and login
    this.buildColorPicker('create-skin-colors', (c) => { this.selectedSkin = c; });
    this.buildColorPicker('login-skin-colors',  (c) => { this.selectedSkin = c; });

    // Landing page content
    this.buildPickaxeGrid();
    this.buildBlockGrid();
    this.animateLiveCount();
    this.initBgCanvas();

    // Init game engine
    Game.init();
  },

  // ── AUTH FLOW ──

  openAuth() {
    document.getElementById('modal-auth').classList.add('open');
    this.showStep('choose');
  },

  closeAuth() {
    document.getElementById('modal-auth').classList.remove('open');
  },

  showStep(step) {
    document.querySelectorAll('.auth-step').forEach(s => s.classList.remove('active'));
    document.getElementById(`auth-step-${step}`).classList.add('active');
  },

  // Generate a brand new Solana wallet
  generateWallet() {
    const nickname = document.getElementById('create-nickname').value.trim();
    if (!nickname) {
      showToast('❌ Enter a nickname first');
      return;
    }

    this.playerNickname = nickname;

    // Generate keypair using @solana/web3.js loaded from CDN
    const keypair = solanaWeb3.Keypair.generate();

    // Public key = wallet address
    this.walletPublicKey = keypair.publicKey.toString();

    // Private key = base58 encoded secret key
    // Convert Uint8Array to base58 string
    this.walletPrivateKey = this.uint8ArrayToBase58(keypair.secretKey);

    // Show the seed step
    document.getElementById('seed-display').textContent = this.walletPrivateKey;
    document.getElementById('wallet-addr-display').textContent = this.walletPublicKey;
    document.getElementById('seed-confirm-check').checked = false;
    document.getElementById('btn-confirm-seed').disabled = true;

    this.showStep('seed');
  },

  // Login by pasting private key
  loginWithKey() {
    const privKeyStr = document.getElementById('login-privkey').value.trim();
    const nickname   = document.getElementById('login-nickname').value.trim() || 'GrindFun';
    const errEl      = document.getElementById('login-error');
    errEl.classList.remove('show');

    try {
      const secretKey = this.base58ToUint8Array(privKeyStr);
      const keypair   = solanaWeb3.Keypair.fromSecretKey(secretKey);

      this.walletPublicKey  = keypair.publicKey.toString();
      this.walletPrivateKey = privKeyStr;
      this.playerNickname   = nickname;

      this.enterWorld();
    } catch(e) {
      console.error(e);
      errEl.classList.add('show');
    }
  },

  enterWorld() {
    this.closeAuth();

    // Set player data
    Player.nickname  = this.playerNickname;
    Player.skinColor = this.selectedSkin;

    // Show game
    document.getElementById('game-screen').classList.add('active');

    // Show wallet address in sidebar
    const wd = document.getElementById('wallet-display');
    if (wd) {
      wd.innerHTML = `<span>Your Wallet</span>${this.walletPublicKey}`;
    }

    // Join server
    Network.join({
      nickname:      this.playerNickname,
      skinColor:     this.selectedSkin,
      walletAddress: this.walletPublicKey
    });
  },

  // ── BASE58 UTILS ──
  // Simple base58 encode/decode so we don't need extra npm packages

  BASE58_ALPHABET: '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz',

  uint8ArrayToBase58(bytes) {
    const alpha = this.BASE58_ALPHABET;
    let digits = [0];
    for (let i = 0; i < bytes.length; i++) {
      let carry = bytes[i];
      for (let j = 0; j < digits.length; j++) {
        carry += digits[j] << 8;
        digits[j] = carry % 58;
        carry = Math.floor(carry / 58);
      }
      while (carry > 0) {
        digits.push(carry % 58);
        carry = Math.floor(carry / 58);
      }
    }
    let result = '';
    for (let i = 0; i < bytes.length && bytes[i] === 0; i++) result += '1';
    for (let i = digits.length - 1; i >= 0; i--) result += alpha[digits[i]];
    return result;
  },

  base58ToUint8Array(str) {
    const alpha = this.BASE58_ALPHABET;
    let bytes = [0];
    for (let i = 0; i < str.length; i++) {
      const c = alpha.indexOf(str[i]);
      if (c < 0) throw new Error('Invalid base58 character: ' + str[i]);
      let carry = c;
      for (let j = 0; j < bytes.length; j++) {
        carry += bytes[j] * 58;
        bytes[j] = carry & 0xff;
        carry >>= 8;
      }
      while (carry > 0) {
        bytes.push(carry & 0xff);
        carry >>= 8;
      }
    }
    for (let i = 0; i < str.length && str[i] === '1'; i++) bytes.push(0);
    return new Uint8Array(bytes.reverse());
  },

  // ── COLOR PICKER ──
  buildColorPicker(containerId, onSelect) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = '';
    SKIN_COLORS.forEach((c, i) => {
      const btn = document.createElement('button');
      btn.className = 'color-btn' + (i === 0 ? ' active' : '');
      btn.style.background = c;
      btn.title = c;
      btn.onclick = () => {
        el.querySelectorAll('.color-btn').forEach((b,j) => b.classList.toggle('active', j===i));
        this.selectedSkin = c;
        if (onSelect) onSelect(c);
      };
      el.appendChild(btn);
    });
  },

  // ── LANDING PAGE ──
  buildPickaxeGrid() {
    const el = document.getElementById('picks-grid');
    if (!el) return;
    const EMOJIS = ['🪵','🪨','⚙️','✨','💎','⛏'];
    el.innerHTML = PICKS.map((p,i) =>
      `<div class="pick-card${i===PICKS.length-1?' featured':''}">
        <span class="pick-emoji">${EMOJIS[i]}</span>
        <div class="pick-name" style="color:${p.color}">${p.name} Pickaxe</div>
        <div class="pick-cost" style="color:${i===PICKS.length-1?'#00ff88':'rgba(255,255,255,0.5)'}">
          ${p.cost===0?'Free':p.cost.toLocaleString()+' pts'}
        </div>
        <div class="pick-power">Power: ${p.power}×</div>
      </div>`
    ).join('');
  },

  buildBlockGrid() {
    const el = document.getElementById('blocks-grid');
    if (!el) return;
    const RARE_COLORS = ['#888','#888','#888','#888','#4fc3f7','#4fc3f7','#4fc3f7','#ffd700','#ffd700','#ffd700','#aa44ff','#aa44ff','#00ff88'];
    const RARE_NAMES  = ['Common','Common','Common','Common','Uncommon','Uncommon','Uncommon','Rare','Rare','Rare','Epic','Epic','Legendary'];
    el.innerHTML = BLOCKS.map((b,i) => {
      const color='#'+b.color.toString(16).padStart(6,'0');
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
    setInterval(()=>{
      base += Math.floor((Math.random()-.45)*3);
      base = Math.max(600, Math.min(1200, base));
      const el = document.getElementById('live-players');
      if (el) el.textContent = base.toLocaleString()+' players online';
    }, 3000);
  },

  initBgCanvas() {
    const canvas = document.getElementById('bg-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W, H;
    const COLORS = ['#5a8c3e','#8B6914','#888888','#222222','#c0896e','#d4af37','#4fc3f7','#00ff88'];
    const blocks = [];

    function buildBlocks() {
      blocks.length = 0;
      for (let i=0;i<40;i++) {
        blocks.push({
          x:Math.random()*W, y:Math.random()*H,
          size:20+Math.random()*50,
          color:COLORS[Math.floor(Math.random()*COLORS.length)],
          speed:0.2+Math.random()*0.5,
          rot:Math.random()*Math.PI*2,
          rotSpeed:(Math.random()-.5)*0.02,
          alpha:0.08+Math.random()*0.2
        });
      }
    }

    function resize() {
      W=canvas.offsetWidth; H=canvas.offsetHeight;
      canvas.width=W; canvas.height=H;
      buildBlocks();
    }

    function loop() {
      requestAnimationFrame(loop);
      ctx.clearRect(0,0,W,H);
      const grad=ctx.createLinearGradient(0,0,0,H);
      grad.addColorStop(0,'#0a1a0a'); grad.addColorStop(1,'#050a05');
      ctx.fillStyle=grad; ctx.fillRect(0,0,W,H);
      blocks.forEach(b=>{
        b.y-=b.speed; b.rot+=b.rotSpeed;
        if(b.y+b.size<0){b.y=H+b.size;b.x=Math.random()*W;}
        ctx.save();
        ctx.translate(b.x,b.y); ctx.rotate(b.rot);
        ctx.globalAlpha=b.alpha;
        ctx.fillStyle=b.color; ctx.fillRect(-b.size/2,-b.size/2,b.size,b.size);
        ctx.fillStyle='rgba(0,0,0,0.25)'; ctx.fillRect(b.size/2-b.size*.2,-b.size/2,b.size*.2,b.size);
        ctx.fillStyle='rgba(0,0,0,0.4)'; ctx.fillRect(-b.size/2,b.size/2-b.size*.2,b.size,b.size*.2);
        ctx.globalAlpha=1; ctx.restore();
      });
    }

    window.addEventListener('resize', resize);
    resize(); loop();
  }
};

window.addEventListener('DOMContentLoaded', () => {
  UI.init();
});
