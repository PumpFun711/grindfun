// Handles rendering other players in the 3D world
const Multiplayer = {
  scene: null,
  players: new Map(), // id -> { mesh, nameTag, data }
  myId: null,

  init(scene, myId) {
    this.scene = scene;
    this.myId = myId;
  },

  // Build a simple blocky player mesh
  buildPlayerMesh(skinColor) {
    const group = new THREE.Group();
    const color = new THREE.Color(skinColor || '#f4b07a');

    // Materials
    const skinMat = new THREE.MeshLambertMaterial({ color });
    const shirtMat = new THREE.MeshLambertMaterial({ color: 0x3a6bc7 });
    const pantsMat = new THREE.MeshLambertMaterial({ color: 0x2a3a6e });
    const bootsMat = new THREE.MeshLambertMaterial({ color: 0x2a1a0a });
    const hairMat = new THREE.MeshLambertMaterial({ color: 0x3b2314 });

    // Head
    const headGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.set(0, 1.55, 0);
    group.add(head);

    // Hair
    const hairGeo = new THREE.BoxGeometry(0.52, 0.15, 0.52);
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.set(0, 1.83, 0);
    group.add(hair);

    // Eyes
    const eyeGeo = new THREE.BoxGeometry(0.1, 0.08, 0.02);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.12, 1.57, 0.252);
    group.add(eyeL);
    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(0.12, 1.57, 0.252);
    group.add(eyeR);

    // Torso
    const torsoGeo = new THREE.BoxGeometry(0.5, 0.6, 0.28);
    const torso = new THREE.Mesh(torsoGeo, shirtMat);
    torso.position.set(0, 1.05, 0);
    group.add(torso);

    // Left arm
    const armGeo = new THREE.BoxGeometry(0.18, 0.55, 0.18);
    const armL = new THREE.Mesh(armGeo, skinMat);
    armL.position.set(-0.34, 1.05, 0);
    armL.name = 'armL';
    group.add(armL);

    // Right arm (holds pickaxe)
    const armR = new THREE.Mesh(armGeo, skinMat);
    armR.position.set(0.34, 1.05, 0);
    armR.name = 'armR';
    group.add(armR);

    // Pickaxe in right hand
    const pickGroup = new THREE.Group();
    const pickHandleGeo = new THREE.BoxGeometry(0.04, 0.04, 0.32);
    const pickHandleMat = new THREE.MeshLambertMaterial({ color: 0xa07840 });
    const pickHandle = new THREE.Mesh(pickHandleGeo, pickHandleMat);
    pickHandle.position.set(0, 0, -0.16);
    pickGroup.add(pickHandle);
    const pickHeadGeo = new THREE.BoxGeometry(0.18, 0.05, 0.05);
    const pickHeadMat = new THREE.MeshLambertMaterial({ color: 0xaaaaaa });
    const pickHead = new THREE.Mesh(pickHeadGeo, pickHeadMat);
    pickHead.position.set(0, 0.03, -0.3);
    pickGroup.add(pickHead);
    pickGroup.position.set(0.34, 0.82, 0);
    pickGroup.rotation.set(0.3, 0, 0);
    pickGroup.name = 'pickaxe';
    group.add(pickGroup);

    // Left leg
    const legGeo = new THREE.BoxGeometry(0.2, 0.55, 0.2);
    const legL = new THREE.Mesh(legGeo, pantsMat);
    legL.position.set(-0.13, 0.5, 0);
    legL.name = 'legL';
    group.add(legL);

    // Right leg
    const legR = new THREE.Mesh(legGeo, pantsMat);
    legR.position.set(0.13, 0.5, 0);
    legR.name = 'legR';
    group.add(legR);

    // Boots
    const bootGeo = new THREE.BoxGeometry(0.22, 0.12, 0.24);
    const bootL = new THREE.Mesh(bootGeo, bootsMat);
    bootL.position.set(-0.13, 0.18, 0.02);
    group.add(bootL);
    const bootR = new THREE.Mesh(bootGeo, bootsMat);
    bootR.position.set(0.13, 0.18, 0.02);
    group.add(bootR);

    return group;
  },

  // Build floating name tag using canvas texture
  buildNameTag(nickname, isMe) {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 64;
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.roundRect(4, 4, canvas.width-8, canvas.height-8, 8);
    ctx.fill();

    // Text
    ctx.fillStyle = isMe ? '#00ff88' : '#ffffff';
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(nickname, canvas.width/2, canvas.height/2);

    const texture = new THREE.CanvasTexture(canvas);
    const geo = new THREE.PlaneGeometry(1.2, 0.3);
    const mat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const sprite = new THREE.Mesh(geo, mat);
    sprite.position.set(0, 2.2, 0);
    return sprite;
  },

  addPlayer(id, data) {
    if (id === this.myId) return;
    if (this.players.has(id)) return;

    const mesh = this.buildPlayerMesh(data.skinColor);
    mesh.position.set(data.x, data.y, data.z);
    mesh.rotation.y = data.rotY || 0;

    const nameTag = this.buildNameTag(data.nickname, false);
    mesh.add(nameTag);

    this.scene.add(mesh);
    this.players.set(id, { mesh, data: { ...data }, walkTick: 0 });
  },

  removePlayer(id) {
    const p = this.players.get(id);
    if (p) {
      this.scene.remove(p.mesh);
      this.players.delete(id);
    }
  },

  updatePlayer(id, data) {
    const p = this.players.get(id);
    if (!p) return;

    // Smooth position interpolation
    p.mesh.position.x += (data.x - p.mesh.position.x) * 0.2;
    p.mesh.position.y += (data.y - p.mesh.position.y) * 0.2;
    p.mesh.position.z += (data.z - p.mesh.position.z) * 0.2;
    p.mesh.rotation.y = data.rotY || 0;

    // Walk animation
    if (data.isWalking) {
      p.walkTick += 0.12;
      const swing = Math.sin(p.walkTick) * 0.4;

      const legL = p.mesh.getObjectByName('legL');
      const legR = p.mesh.getObjectByName('legR');
      const armL = p.mesh.getObjectByName('armL');
      const armR = p.mesh.getObjectByName('armR');

      if (legL) legL.rotation.x = swing;
      if (legR) legR.rotation.x = -swing;
      if (armL) armL.rotation.x = -swing * 0.5;
      if (armR) armR.rotation.x = swing * 0.5;
    } else {
      p.walkTick = 0;
      ['legL','legR','armL','armR'].forEach(name => {
        const obj = p.mesh.getObjectByName(name);
        if (obj) obj.rotation.x *= 0.8;
      });
    }

    // Make name tag always face camera
    const nameTag = p.mesh.children.find(c => c.geometry && c.geometry.type === 'PlaneGeometry');
    if (nameTag && Game.camera) {
      nameTag.lookAt(Game.camera.position);
    }

    p.data = { ...p.data, ...data };
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

  // Called every frame
  update() {
    this.players.forEach((p) => {
      // Billboard name tags toward camera
      if (Game.camera) {
        p.mesh.children.forEach(child => {
          if (child.geometry && child.geometry.type === 'PlaneGeometry') {
            child.lookAt(Game.camera.position);
          }
        });
      }
    });
  }
};
