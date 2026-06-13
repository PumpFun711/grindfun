const { generateWorld, getBlock, setBlock, BLOCKS, PICKS, WORLD_W, WORLD_H, WORLD_D } = require('./gamedata');

const MAX_PLAYERS = 60;
let roomCounter = 1;

class Room {
  constructor(id) {
    this.id = id;
    this.name = `GF-${String(roomCounter++).padStart(2, '0')}`;
    this.players = new Map();
    this.world = generateWorld();
    this.cracks = {};
    this.createdAt = Date.now();
  }

  getPlayerCount() { return this.players.size; }
  isFull() { return this.players.size >= MAX_PLAYERS; }

  addPlayer(socketId, data) {
    this.players.set(socketId, {
      id: socketId,
      nickname: data.nickname,
      skinColor: data.skinColor,
      x: data.x, y: data.y, z: data.z,
      rotY: 0,
      points: 0,
      totalBlocks: 0,
      pickaxe: 0,
      isWalking: false,
      joinedAt: Date.now()
    });
  }

  removePlayer(socketId) { this.players.delete(socketId); }
  getPlayer(socketId) { return this.players.get(socketId); }
  getPlayersData() { return Array.from(this.players.values()); }

  updatePlayer(socketId, data) {
    const p = this.players.get(socketId);
    if (!p) return;
    p.x = data.x; p.y = data.y; p.z = data.z;
    p.rotY = data.rotY; p.isWalking = data.isWalking;
  }

  mineBlock(socketId, x, y, z) {
    const player = this.players.get(socketId);
    if (!player) return null;

    x = Math.floor(x); y = Math.floor(y); z = Math.floor(z);
    const blockType = getBlock(this.world, x, y, z);
    if (blockType < 0) return null;

    const B = BLOCKS[blockType];
    const pick = PICKS[player.pickaxe];
    const hitsNeeded = Math.max(1, Math.ceil(B.baseHits / pick.power));

    const key = `${x},${y},${z}`;
    if (!this.cracks[key]) this.cracks[key] = 0;
    this.cracks[key]++;

    if (this.cracks[key] >= hitsNeeded) {
      setBlock(this.world, x, y, z, -1);
      delete this.cracks[key];
      player.points += B.pts;
      player.totalBlocks++;

      // Respawn ores server side
      if (blockType >= 4 && blockType !== 13) {
        setTimeout(() => {
          if (getBlock(this.world, x, y, z) < 0) {
            setBlock(this.world, x, y, z, blockType);
          }
        }, 30000);
      }

      return {
        broken: true,
        points: B.pts,
        playerPoints: player.points,
        playerBlocks: player.totalBlocks,
        blockType
      };
    }

    return {
      broken: false,
      hitsLeft: hitsNeeded - this.cracks[key],
      hitsNeeded
    };
  }

  buyPickaxe(socketId, tier) {
    const player = this.players.get(socketId);
    if (!player) return { success: false, message: 'Player not found' };
    if (tier !== player.pickaxe + 1) return { success: false, message: 'Must upgrade in order' };
    if (tier >= PICKS.length) return { success: false, message: 'Max tier reached' };
    const pick = PICKS[tier];
    if (player.points < pick.cost) {
      return { success: false, message: `Need ${pick.cost.toLocaleString()} pts. You have ${player.points.toLocaleString()}.` };
    }
    player.points -= pick.cost;
    player.pickaxe = tier;
    return { success: true, newPoints: player.points };
  }

  getLeaderboard() {
    return Array.from(this.players.values())
      .sort((a, b) => b.points - a.points)
      .slice(0, 10)
      .map(p => ({
        nickname: p.nickname,
        points: p.points,
        pickaxe: p.pickaxe,
        totalBlocks: p.totalBlocks
      }));
  }
}

class RoomManager {
  constructor() { this.rooms = new Map(); }

  joinRoom(socketId, playerData) {
    for (const room of this.rooms.values()) {
      if (!room.isFull()) { room.addPlayer(socketId, playerData); return room; }
    }
    const roomId = `room_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const room = new Room(roomId);
    room.addPlayer(socketId, playerData);
    this.rooms.set(roomId, room);
    return room;
  }

  getRoom(roomId) { return this.rooms.get(roomId); }
  removeRoom(roomId) { this.rooms.delete(roomId); }
  getAllRooms() { return Array.from(this.rooms.values()); }
  getRoomStats() {
    return Array.from(this.rooms.values()).map(r => ({
      name: r.name, players: r.getPlayerCount()
    }));
  }
}

module.exports = RoomManager;
