const Player = {
  camera: null,
  scene: null,
  worldData: null,

  x: 8, y: 20, z: 8,
  velY: 0,
  onGround: false,
  jumpCooldown: 0,

  rotY: 0,
  rotX: 0,

  isWalking: false,
  isPointerLocked: false,
  nickname: 'Player',
  skinColor: '#00ff88',

  SPEED: 0.04,
  SPRINT_SPEED: 0.072,
  JUMP_FORCE: 0.22,
  GRAVITY: -0.018,
  PLAYER_HEIGHT: 1.7,
  EYE_HEIGHT: 1.6,

  keys: {},
  pickaxeMesh: null,
  pickaxeSwing: 0,
  isMining: false,
  bobTime: 0,
  bobOffset: 0,

  init(camera, scene, worldData, nickname, skinColor) {
    this.camera = camera;
    this.scene = scene;
    this.worldData = worldData;
    this.nickname = nickname;
    this.skinColor = skinColor;

    this.x = 8 + Math.random() * 4;
    this.z = 8 + Math.random() * 4;
    this.y = this.findSurface(Math.floor(this.x), Math.floor(this.z)) + 2;

    this.setupPointerLock();
    this.setupKeyboard();
    this.buildPickaxe();
    this.updateCamera();
  },

  findSurface(x, z) {
    const { h } = this.worldData;
    for (let y = h - 1; y >= 0; y--) {
      if (World.getBlock(x, y, z) >= 0) return y;
    }
    return 10;
  },

  respawn() {
    this.x = 8 + Math.random() * 4;
    this.z = 8 + Math.random() * 4;
    this.y = this.findSurface(Math.floor(this.x), Math.floor(this.z)) + 2;
    this.velY = 0;
    this.onGround = false;
    showToast('💀 Fell off the world! Respawning...');
  },

  setupPointerLock() {
    const canvas = document.getElementById('game-canvas');

    document.getElementById('game-screen').addEventListener('click', (e) => {
      if (Game.shopOpen) return;
      canvas.requestPointerLock =
        canvas.requestPointerLock ||
        canvas.mozRequestPointerLock ||
        canvas.webkitRequestPointerLock;
      if (canvas.requestPointerLock) canvas.requestPointerLock();
    });

    const onLockChange = () => {
      const locked = !!(
        document.pointerLockElement === canvas ||
        document.mozPointerLockElement === canvas ||
        document.webkitPointerLockElement === canvas
      );
      this.isPointerLocked = locked;
      const ctp = document.getElementById('click-to-play');
      if (!ctp) return;
      if (locked) {
        ctp.classList.add('hidden');
      } else {
        if (!Game.shopOpen) ctp.classList.remove('hidden');
      }
    };

    document.addEventListener('pointerlockchange', onLockChange);
    document.addEventListener('mozpointerlockchange', onLockChange);
    document.addEventListener('webkitpointerlockchange', onLockChange);

    document.addEventListener('mousemove', (e) => {
      if (!this.isPointerLocked) return;
      const sens = 0.0018;
      this.rotY -= e.movementX * sens;
      this.rotX -= e.movementY * sens;
      this.rotX = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, this.rotX));
    });
  },

  setupKeyboard() {
    window.addEventListener('keydown', (e) => {
      // e.repeat = true means key is being held — ignore for jump
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        if (this.onGround && this.jumpCooldown <= 0) {
          this.velY = this.JUMP_FORCE;
          this.onGround = false;
          this.jumpCooldown = 20;
        }
      }
      this.keys[e.code] = true;
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });
  },

  buildPickaxe() {
    const group = new THREE.Group();

    const handleGeo = new THREE.BoxGeometry(0.05, 0.05, 0.4);
    const handleMat = new THREE.MeshLambertMaterial({ color: 0xa07840 });
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.position.set(0, 0, -0.2);
    group.add(handle);

    const headGeo = new THREE.BoxGeometry(0.22, 0.06, 0.06);
    const headMat = new THREE.MeshLambertMaterial({ color: 0xaaaaaa });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(0, 0.04, -0.38);
    group.add(head);

    const tipGeo = new THREE.BoxGeometry(0.05, 0.1, 0.05);
    const tip = new THREE.Mesh(tipGeo, headMat);
    tip.position.set(0.1, 0, -0.4);
    group.add(tip);

    group.position.set(0.28, -0.28, -0.45);
    group.rotation.set(0.2, -0.4, 0.1);
    this.pickaxeMesh = group;
    this.camera.add(group);
  },

  updatePickaxeColor(tier) {
    const colors = [0xa07840, 0xaaaaaa, 0xd4d4d4, 0xffd700, 0x4fc3f7, 0x00ff88];
    const color = colors[tier] || 0xaaaaaa;
    if (!this.pickaxeMesh) return;
    this.pickaxeMesh.children.forEach((mesh, i) => {
      if (i > 0) mesh.material.color.setHex(color);
    });
  },

  update() {
    if (this.jumpCooldown > 0) this.jumpCooldown--;
    this.handleMovement();
    this.applyGravity();
    this.animatePickaxe();
    this.updateCamera();

    if (this.y < -15) this.respawn();
    const W = this.worldData.w;
    const D = this.worldData.d;
    if (this.x < -3 || this.x > W + 3 || this.z < -3 || this.z > D + 3) this.respawn();
  },

  handleMovement() {
    if (Game.shopOpen) return;
    const speed = this.keys['ShiftLeft'] ? this.SPRINT_SPEED : this.SPEED;
    let dx = 0, dz = 0;

    if (this.keys['KeyW'] || this.keys['ArrowUp'])    { dx -= Math.sin(this.rotY); dz -= Math.cos(this.rotY); }
    if (this.keys['KeyS'] || this.keys['ArrowDown'])  { dx += Math.sin(this.rotY); dz += Math.cos(this.rotY); }
    if (this.keys['KeyA'] || this.keys['ArrowLeft'])  { dx -= Math.cos(this.rotY); dz += Math.sin(this.rotY); }
    if (this.keys['KeyD'] || this.keys['ArrowRight']) { dx += Math.cos(this.rotY); dz -= Math.sin(this.rotY); }

    const moving = dx !== 0 || dz !== 0;
    this.isWalking = moving;

    if (moving) {
      const len = Math.sqrt(dx * dx + dz * dz);
      dx = (dx / len) * speed;
      dz = (dz / len) * speed;

      const newX = this.x + dx;
      if (!this.collidesAt(newX, this.y, this.z)) {
        this.x = Math.max(0.3, Math.min(this.worldData.w - 0.3, newX));
      }

      const newZ = this.z + dz;
      if (!this.collidesAt(this.x, this.y, newZ)) {
        this.z = Math.max(0.3, Math.min(this.worldData.d - 0.3, newZ));
      }

      this.bobTime += 0.1;
      this.bobOffset = Math.sin(this.bobTime) * 0.03;
    } else {
      this.bobOffset *= 0.75;
    }
  },

  applyGravity() {
    this.velY += this.GRAVITY;
    if (this.velY < -0.5) this.velY = -0.5;

    const newY = this.y + this.velY;
    const floorY = this.getFloorY();

    if (floorY > -900 && newY <= floorY) {
      this.y = floorY;
      this.velY = 0;
      this.onGround = true;
    } else {
      const ceilY = this.getCeilY();
      if (newY + this.PLAYER_HEIGHT > ceilY) {
        this.y = ceilY - this.PLAYER_HEIGHT;
        this.velY = 0;
      } else {
        this.y = newY;
        this.onGround = false;
      }
    }
  },

  collidesAt(x, y, z) {
    const margin = 0.3;
    for (let bx = Math.floor(x - margin); bx <= Math.floor(x + margin); bx++) {
      for (let bz = Math.floor(z - margin); bz <= Math.floor(z + margin); bz++) {
        for (let by = Math.floor(y); by <= Math.floor(y + this.PLAYER_HEIGHT); by++) {
          if (World.getBlock(bx, by, bz) >= 0) return true;
        }
      }
    }
    return false;
  },

  getFloorY() {
    const margin = 0.3;
    let floor = -999;
    for (let bx = Math.floor(this.x - margin); bx <= Math.floor(this.x + margin); bx++) {
      for (let bz = Math.floor(this.z - margin); bz <= Math.floor(this.z + margin); bz++) {
        for (let by = Math.floor(this.y); by >= 0; by--) {
          if (World.getBlock(bx, by, bz) >= 0) {
            floor = Math.max(floor, by + 1);
            break;
          }
        }
      }
    }
    return floor;
  },

  getCeilY() {
    for (let by = Math.floor(this.y + this.PLAYER_HEIGHT); by < this.worldData.h; by++) {
      if (World.getBlock(Math.floor(this.x), by, Math.floor(this.z)) >= 0) return by;
    }
    return this.worldData.h;
  },

  animatePickaxe() {
    if (!this.pickaxeMesh) return;
    const t = Date.now() * 0.001;
    if (this.isMining) {
      this.pickaxeSwing += 0.25;
      this.pickaxeMesh.rotation.x = 0.2 + Math.sin(this.pickaxeSwing) * 0.4;
      this.pickaxeMesh.position.y = -0.28 + Math.abs(Math.sin(this.pickaxeSwing)) * 0.05;
    } else {
      this.pickaxeMesh.rotation.x = 0.2 + Math.sin(t * 1.5) * 0.02;
      this.pickaxeMesh.position.y = -0.28 + Math.sin(t * 1.5) * 0.008;
      this.pickaxeMesh.rotation.z = this.isWalking ? 0.1 + Math.sin(t * 6) * 0.04 : 0.1;
    }
  },

  updateCamera() {
    this.camera.position.set(
      this.x,
      this.y + this.EYE_HEIGHT + this.bobOffset,
      this.z
    );
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.rotY;
    this.camera.rotation.x = this.rotX;
  },

  getPosition() {
    return { x: this.x, y: this.y, z: this.z, rotY: this.rotY, isWalking: this.isWalking };
  }
};
