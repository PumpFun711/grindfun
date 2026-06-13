const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const RoomManager = require('./rooms');

const app = express();
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));
app.get('/health', (req, res) => res.json({ status: 'ok', rooms: roomManager.getRoomStats() }));

const roomManager = new RoomManager();

io.on('connection', (socket) => {
  console.log(`[+] Connected: ${socket.id}`);

  socket.on('join', (data) => {
    const { nickname, skinColor, walletAddress } = data;

    const room = roomManager.joinRoom(socket.id, {
      nickname:      nickname || 'Player',
      skinColor:     skinColor || '#f4b07a',
      walletAddress: walletAddress || 'unknown',
      x: 8 + Math.random() * 4,
      y: 20,
      z: 8 + Math.random() * 4,
      rotY: 0,
      points: 0,
      totalBlocks: 0,
      pickaxe: 0
    });

    socket.join(room.id);
    socket.roomId = room.id;

    socket.emit('init', {
      playerId:    socket.id,
      roomId:      room.id,
      roomName:    room.name,
      playerCount: room.getPlayerCount(),
      world:       room.world,
      players:     room.getPlayersData()
    });

    socket.to(room.id).emit('playerJoined', {
      id: socket.id,
      ...room.getPlayer(socket.id)
    });

    console.log(`[${room.name}] ${nickname} (${walletAddress.slice(0,8)}...) joined (${room.getPlayerCount()}/60)`);
  });

  socket.on('move', (data) => {
    const room = roomManager.getRoom(socket.roomId);
    if (!room) return;
    room.updatePlayer(socket.id, data);
    socket.to(socket.roomId).emit('playerMoved', {
      id: socket.id,
      x: data.x, y: data.y, z: data.z,
      rotY: data.rotY,
      isWalking: data.isWalking
    });
  });

  socket.on('startMining', () => {
    socket.to(socket.roomId).emit('playerMining', { id: socket.id, isMining: true });
  });

  socket.on('stopMining', () => {
    socket.to(socket.roomId).emit('playerMining', { id: socket.id, isMining: false });
  });

  socket.on('mineBlock', (data) => {
    const room = roomManager.getRoom(socket.roomId);
    if (!room) return;

    const result = room.mineBlock(socket.id, data.x, data.y, data.z);
    if (!result) return;

    if (result.broken) {
      io.to(socket.roomId).emit('blockBroken', {
        x: data.x, y: data.y, z: data.z,
        minedBy:      socket.id,
        points:       result.points,
        playerPoints: result.playerPoints,
        playerBlocks: result.playerBlocks,
        blockType:    result.blockType
      });
    } else {
      socket.emit('blockHit', {
        x: data.x, y: data.y, z: data.z,
        hitsLeft:   result.hitsLeft,
        hitsNeeded: result.hitsNeeded
      });
    }
  });

  socket.on('buyPickaxe', (data) => {
    const room = roomManager.getRoom(socket.roomId);
    if (!room) return;
    const result = room.buyPickaxe(socket.id, data.tier);
    if (result.success) {
      socket.emit('pickaxeUpgraded', { tier: data.tier, newPoints: result.newPoints });
      socket.to(socket.roomId).emit('playerPickaxeChanged', { id: socket.id, tier: data.tier });
    } else {
      socket.emit('gameError', { message: result.message });
    }
  });

  socket.on('getLeaderboard', () => {
    const room = roomManager.getRoom(socket.roomId);
    if (!room) return;
    socket.emit('leaderboard', room.getLeaderboard());
  });

  socket.on('disconnect', () => {
    const room = roomManager.getRoom(socket.roomId);
    if (room) {
      const player = room.getPlayer(socket.id);
      if (player) {
        console.log(`[-] ${player.nickname} (${player.walletAddress.slice(0,8)}...) left ${room.name} — ${player.points} pts`);
      }
      room.removePlayer(socket.id);
      io.to(socket.roomId).emit('playerLeft', { id: socket.id });
      io.to(socket.roomId).emit('playerMining', { id: socket.id, isMining: false });
      if (room.getPlayerCount() === 0) roomManager.removeRoom(room.id);
    }
  });
});

// Broadcast leaderboard + player count every 5 seconds
setInterval(() => {
  roomManager.getAllRooms().forEach(room => {
    io.to(room.id).emit('leaderboard', room.getLeaderboard());
    io.to(room.id).emit('playerCount', room.getPlayerCount());
  });
}, 5000);

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`\n⛏  GrindFun server running on port ${PORT}`);
  console.log(`   http://localhost:${PORT}\n`);
});
