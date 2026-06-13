const Multiplayer = {
  scene: null,
  players: new Map(),
  myId: null,

  init(scene, myId) {
    this.scene = scene;
    this.myId = myId;
  },

  buildPlayerMesh(skinColor) {
    const group = new THREE.Group();
    const color = new THREE.Color(skinColor || '#f4b07a');

    const skinMat  = new THREE.MeshLambertMaterial({ color });
    const shirtMat = new THREE.MeshLambertMaterial({ color: 0x3a6bc7 });
    const pantsMat = new THREE.MeshLambertMaterial({ color: 0x2a3a6e });
    const bootsMat = new THREE.MeshLambertMaterial({ color: 0x2a1a0a });
    const hairMat  = new THREE.MeshLambertMaterial({ color: 0x3b2314 });
    const whiteMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const blackMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const darkMat  = new THREE.MeshBasicMaterial({ color: 0x7a2a2a });

    // ── HEAD ──
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5,0.5,0.5), skinMat);
    head.position.set(0, 1.55, 0);
    group.add(head);

    // Hair
    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.52,0.14,0.52), hairMat);
    hair.position.set(0, 1.82, 0);
    group.add(hair);

    // Hair sides
    const hairSideL = new THREE.Mesh(new THREE.BoxGeometry(0.06,0.3,0.5), hairMat);
    hairSideL.position.set(-0.27, 1.65, 0);
    group.add(hairSideL);
    const hairSideR = new THREE.Mesh(new THREE.BoxGeometry(0.06,0.3,0.5), hairMat);
    hairSideR.position.set(0.27, 1.65, 0);
    group.add(hairSideR);

    // ── EYES ──
    // Eye whites
    const eyeWhiteGeo = new THREE.BoxGeometry(0.1, 0.08, 0.02);
    const eyeWL = new THREE.Mesh(eyeWhiteGeo, whiteMat);
    eyeWL.position.set(-0.12, 1.56, 0.252);
    group.add(eyeWL);
    const eyeWR = new THREE.Mesh(eyeWhiteGeo, whiteMat);
    eyeWR.position.set(0.12, 1.56, 0.252);
    group.add(eyeWR);

    // Pupils
    const pupilGeo = new THREE.BoxGeometry(0.05, 0.05, 0.02);
    const pupilL = new THREE.Mesh(pupilGeo, blackMat);
    pupilL.position.set(-0.12, 1.555, 0.262);
    group.add(pupilL);
    const pupilR = new THREE.Mesh(pupilGeo, blackMat);
    pupilR.position.set(0.12, 1.555, 0.262);
    group.add(pupilR);

    // Mouth
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.04, 0.02), darkMat);
    mouth.position.set(0, 1.49, 0.252);
    group.add(mouth);

    // ── TORSO ──
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5,0.6,0.28), shirtMat);
    torso.position.set(0, 1.05, 0);
    group.add(torso);

    // ── ARMS ──
    const armGeo = new THREE.BoxGeometry(0.16,0.55,0.16);
    const armL = new THREE.Mesh(armGeo, skinMat);
    armL.position.set(-0.34, 1.05, 0);
    armL.name = 'armL';
    group.add(armL);

    const armR = new THREE.Mesh(armGeo, skinMat);
    armR.position.set(0.34, 1.05, 0);
    armR.name = 'armR';
    group.add(armR);

    // ── PICKAXE in right hand ──
    const pickGroup = new THREE.Group();
    pickGroup.name = 'pickaxe';

    const handleMat = new THREE.MeshLambertMaterial({ color: 0xa07840 });
    const headMat2  = new THREE.MeshLambertMaterial({ color: 0xaaaaaa });

    const pickHandle = new THREE.Mesh(new THREE.BoxGeometry(0.04,0.04,0.32), handleMat);
    pickHandle.position.set(0,0,-0.16);
    pickGroup.add(pickHandle);

    const pickHead = new THREE.Mesh(new THREE.BoxGeometry(0.18,0.05,0.05), headMat2);
    pickHead.position.set(0,0.03,-0.3);
    pickGroup.add(pickHead);

    const pickTip = new THREE.Mesh(new THREE.BoxGeometry(0.04,0.08,0.04), headMat2);
    pickTip.position.set(0.08,0.01,-0.32);
    pickGroup.add(pickTip);

    pickGroup.position.set(0.34, 0.82, 0.1);
    pickGroup.rotation.set(0.3, 0, 0);
    group.add(pickGroup);

    // ── LEGS ──
    const legGeo = new THREE.BoxGeometry(0.2,0.55,0.2);
    const legL = new THREE.Mesh(legGeo, pantsMat);
    legL.position.set(-0.13, 0.5, 0);
    legL.name = 'legL';
    group.add(legL);

    const legR = new THREE.Mesh(legGeo, pantsMat);
    legR.position.set(0.13, 0.5, 0);
    legR.name = 'legR';
    group.add(legR);

    // ── BOOTS ──
    const bootGeo = new THREE.BoxGeometry(0.22,0.12,0.24);
    const bootL = new THREE.Mesh(bootGeo, bootsMat);
    bootL.position.set(-0.13, 0.18, 0.02);
    group.add(bootL);
    const bootR = new THREE.Mesh(bootGeo, bootsMat);
    bootR.position.set(0.13, 0.18, 0.02);
    group.add(bootR);

    return group;
  },

  buildNameTag(nickname) {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 64;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath();
    ctx.roundRect(4, 4, canvas.width-8, canvas.height-8, 8);
    ctx.fill();

    ctx.fillStyle = '#00ff88';
    ctx.font = 'bold 26px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(nickname.slice(0,14), canvas.width/2, canvas.height/2);

    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.MeshBasicMaterial({ map:tex, transparent:true, depthWrite:false, side:THREE.DoubleSide });
    const sprite = new THREE.Mesh(new THREE.PlaneGeometry(1.2,0.3), mat);
    sprite.position.set(0, 2.2, 0);
    sprite.name = 'nameTag';
    return sprite;
  },

  addPlayer(id, data) {
    if (id===this.myId || this.players.has(id)) return;
    const mesh = this.buildPlayerMesh(data.skinColor);
    mesh.position.set(data.x, data.y, data.z);
    mesh.rotation.y = data.rotY || 0;
    mesh.add(this.buildNameTag(data.nickname));
    this.scene.add(mesh);
    this.players.set(id, { mesh, data:{...data}, walkTick:0, miningTick:0, isMining:false });
  },

  removePlayer(id) {
    const p = this.players.get(id);
    if (p) { this.scene.remove(p.mesh); this.players.delete(id); }
  },

  updatePlayer(id, data) {
    const p = this.players.get(id);
    if (!p) return;

    // Smooth interpolation
    p.mesh.position.x += (data.x - p.mesh.position.x) * 0.2;
    p.mesh.position.y += (data.y - p.mesh.position.y) * 0.2;
    p.mesh.position.z += (data.z - p.mesh.position.z) * 0.2;
    p.mesh.rotation.y = data.rotY || 0;

    // Walk animation
    if (data.isWalking) {
      p.walkTick += 0.1;
      const swing = Math.sin(p.walkTick) * 0.4;
      const legL = p.mesh.getObjectByName('legL');
      const legR = p.mesh.getObjectByName('legR');
      const armL = p.mesh.getObjectByName('armL');
      const armR = p.mesh.getObjectByName('armR');
      if (legL) legL.rotation.x = swing;
      if (legR) legR.rotation.x = -swing;
      if (armL) armL.rotation.x = -swing * 0.5;
      if (armR && !p.isMining) armR.rotation.x = swing * 0.5;
    } else {
      p.walkTick = 0;
      ['legL','legR','armL'].forEach(n => {
        const o = p.mesh.getObjectByName(n);
        if (o) o.rotation.x *= 0.8;
      });
      if (!p.isMining) {
        const armR = p.mesh.getObjectByName('armR');
        if (armR) armR.rotation.x *= 0.8;
      }
    }

    p.data = { ...p.data, ...data };
  },

  // Called when we see another player mining
  showPlayerMining(id, isMining) {
    const p = this.players.get(id);
    if (!p) return;
    p.isMining = isMining;
  },

  updatePickaxeColor(id, tier) {
    const p = this.players.get(id);
    if (!p) return;
    const colors = [0xa07840, 0xaaaaaa, 0xd4d4d4, 0xffd700, 0x4fc3f7, 0x00ff88];
    const color = colors[tier] || 0xaaaaaa;
    const pick = p.mesh.getObjectByName('pickaxe');
    if (pick) {
      pick.children.forEach((child, i) => {
        if (i > 0) child.material.color.setHex(color);
      });
    }
  },

  update() {
    this.players.forEach((p) => {
      // Mining animation — slower, more natural swing speed
      if (p.isMining) {
        p.miningTick += 0.08; // Slow swing speed
        const pick = p.mesh.getObjectByName('pickaxe');
        const armR = p.mesh.getObjectByName('armR');
        if (pick) {
          pick.rotation.x = 0.3 + Math.sin(p.miningTick) * 0.5;
          pick.position.y = 0.82 + Math.abs(Math.sin(p.miningTick)) * 0.06;
        }
        if (armR) {
          armR.rotation.x = -0.3 - Math.abs(Math.sin(p.miningTick)) * 0.6;
        }
      } else {
        p.miningTick = 0;
        const pick = p.mesh.getObjectByName('pickaxe');
        const armR = p.mesh.getObjectByName('armR');
        if (pick) {
          pick.rotation.x += (0.3 - pick.rotation.x) * 0.15;
          pick.position.y += (0.82 - pick.position.y) * 0.15;
        }
        if (armR) {
          armR.rotation.x *= 0.85;
        }
      }

      // Billboard name tags
      if (Game.camera) {
        const tag = p.mesh.getObjectByName('nameTag');
        if (tag) tag.lookAt(Game.camera.position);
      }
    });
  }
};
