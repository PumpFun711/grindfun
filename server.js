const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const RoomManager = require('./rooms');
const { initDB, loadPlayer, savePlayer, getLeaderboard, getDailyLeaderboard, getAllPlayers } = require('./db');

const app = express();
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// ── ROUTES ──
app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));
app.get('/leaderboard', (req, res) => res.sendFile(__dirname + '/leaderboard.html'));
app.get('/admin', (req, res) => res.sendFile(__dirname + '/admin.html'));

app.get('/health', (req, res) => res.json({ status: 'ok', rooms: roomManager.getRoomStats() }));

// ── API ENDPOINTS ──

// Public leaderboard API
app.get('/api/leaderboard', async (req, res) => {
  const data = await getLeaderboard(100);
  res.json(data);
});

// Daily leaderboard API
app.get('/api/leaderboard/daily', async (req, res) => {
  const data = await getDailyLeaderboard(100);
  res.json(data);
});

// Admin API — password protected
app.get('/api/admin/players', async (req, res) => {
  const pass = req.headers['x-admin-password'];
  if (pass !== process.env.ADMIN_PASSWORD && pass !== 'grindfun2024') {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const data = await getAllPlayers();
  res.json(data);
});

// Admin API — export wallet addresses for airdrop
app.get('/api/admin/wallets', async (req, res) => {
  const pass = req.headers['x-admin-password'];
  if (pass !== process.env.ADMIN_PASSWORD && pass !== 'grindfun2024') {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const data = await getAllPlayers();
  const wallets = data.map(p => ({
    wallet: p.wallet_address,
    nickname: p.nickname,
    points: p.points
  }));
  res.json(wallets);
});

const roomManager = new RoomManager();

io.on('connection', (socket) => {
  console.log(`[+] Connected: ${socket.id}`);

  socket.on('join', async (data) => {
    const { nickname, skinColor, walletAddress } = data;

    // Load saved progress from DB
    let savedData = null;
    if (walletAddress && walletAddress !== 'unknown') {
      savedData = await loadPlayer(walletAddress);
    }

    const room = roomManager.joinRoom(socket.id, {
      nickname:      nickname || savedData?.nickname || 'Player',
      skinColor:     skinColor || '#f4b07a',
      walletAddress: walletAddress || 'unknown',
      x: 8 + Math.random() * 4,
      y: 20,
      z: 8 + Math.random() * 4,
      rotY: 0,
      // Load saved progress or start fresh
      points:      savedData?.points      || 0,
      pickaxe:     savedData?.pickaxe     || 0,
      totalBlocks: savedData?.total_blocks || 0,
    });

    socket.join(room.id);
    socket.roomId = room.id;

    const player = room.getPlayer(socket.id);

    socket.emit('init', {
      playerId:    socket.id,
      roomId:      room.id,
      roomName:    room.name,
      playerCount: room.getPlayerCount(),
      world:       room.world,
      players:     room.getPlayersData(),
      // Send saved progress back to client
      savedPoints:  player.points,
      savedPickaxe: player.pickaxe,
      savedBlocks:  player.totalBlocks,
    });

    socket.to(room.id).emit('playerJoined', {
      id: socket.id,
      ...room.getPlayer(socket.id)
    });

    if (savedData) {
      socket.emit('progressLoaded', {
        points:      savedData.points,
        pickaxe:     savedData.pickaxe,
        totalBlocks: savedData.total_blocks,
        nickname:    savedData.nickname
      });
    }

    console.log(`[${room.name}] ${nickname} (${walletAddress?.slice(0,8)}...) joined — ${player.points} pts saved`);
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

  socket.on('mineBlock', async (data) => {
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

      // Save to DB every 10 blocks
      const player = room.getPlayer(socket.id);
      if (player && player.totalBlocks % 10 === 0) {
        await savePlayer(
          player.walletAddress,
          player.nickname,
          player.points,
          player.pickaxe,
          player.totalBlocks
        );
      }

    } else {
      socket.emit('blockHit', {
        x: data.x, y: data.y, z: data.z,
        hitsLeft:   result.hitsLeft,
        hitsNeeded: result.hitsNeeded
      });
    }
  });

  socket.on('buyPickaxe', async (data) => {
    const room = roomManager.getRoom(socket.roomId);
    if (!room) return;
    const result = room.buyPickaxe(socket.id, data.tier);
    if (result.success) {
      socket.emit('pickaxeUpgraded', { tier: data.tier, newPoints: result.newPoints });
      socket.to(socket.roomId).emit('playerPickaxeChanged', { id: socket.id, tier: data.tier });

      // Save immediately on pickaxe upgrade
      const player = room.getPlayer(socket.id);
      if (player) {
        await savePlayer(
          player.walletAddress,
          player.nickname,
          player.points,
          player.pickaxe,
          player.totalBlocks
        );
      }
    } else {
      socket.emit('gameError', { message: result.message });
    }
  });

  socket.on('getLeaderboard', () => {
    const room = roomManager.getRoom(socket.roomId);
    if (!room) return;
    socket.emit('leaderboard', room.getLeaderboard());
  });

  socket.on('disconnect', async () => {
    const room = roomManager.getRoom(socket.roomId);
    if (room) {
      const player = room.getPlayer(socket.id);
      if (player && player.walletAddress !== 'unknown') {
        // Final save on disconnect
        await savePlayer(
          player.walletAddress,
          player.nickname,
          player.points,
          player.pickaxe,
          player.totalBlocks
        );
        console.log(`[-] ${player.nickname} disconnected — saved ${player.points} pts`);
      }
      room.removePlayer(socket.id);
      io.to(socket.roomId).emit('playerLeft', { id: socket.id });
      io.to(socket.roomId).emit('playerMining', { id: socket.id, isMining: false });
      if (room.getPlayerCount() === 0) roomManager.removeRoom(room.id);
    }
  });
});

// Broadcast leaderboard every 5 seconds
setInterval(() => {
  roomManager.getAllRooms().forEach(room => {
    io.to(room.id).emit('leaderboard', room.getLeaderboard());
    io.to(room.id).emit('playerCount', room.getPlayerCount());
  });
}, 5000);

// Save all players every 60 seconds as backup
setInterval(async () => {
  for (const room of roomManager.getAllRooms()) {
    for (const player of room.getPlayersData()) {
      if (player.walletAddress !== 'unknown') {
        await savePlayer(
          player.walletAddress,
          player.nickname,
          player.points,
          player.pickaxe,
          player.totalBlocks
        );
      }
    }
  }
  console.log('[DB] Auto-saved all players');
}, 60000);

const PORT = process.env.PORT || 3000;

// Init DB then start server
initDB().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`\n⛏  GrindFun server running on port ${PORT}`);
    console.log(`   http://localhost:${PORT}\n`);
  });
});
