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

app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));
app.get('/leaderboard', (req, res) => res.sendFile(__dirname + '/leaderboard.html'));
app.get('/admin', (req, res) => res.sendFile(__dirname + '/admin.html'));
app.get('/health', (req, res) => res.json({ status: 'ok', rooms: roomManager.getRoomStats() }));

app.get('/api/leaderboard', async (req, res) => {
  const data = await getLeaderboard(100);
  res.json(data);
});

app.get('/api/leaderboard/daily', async (req, res) => {
  const data = await getDailyLeaderboard(100);
  res.json(data);
});

app.get('/api/admin/players', async (req, res) => {
  const pass = req.headers['x-admin-password'];
  if (pass !== process.env.ADMIN_PASSWORD && pass !== 'grindfun2024') {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const data = await getAllPlayers();
  res.json(data);
});

app.get('/api/admin/wallets', async (req, res) => {
  const pass = req.headers['x-admin-password'];
  if (pass !== process.env.ADMIN_PASSWORD && pass !== 'grindfun2024') {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const data = await getAllPlayers();
  res.json(data.map(p => ({ wallet: p.wallet_address, nickname: p.nickname, points: p.points })));
});

const roomManager = new RoomManager();

// Track wallets connected — prevent duplicate sessions
const connectedWallets = new Map(); // walletAddress -> socketId

// Track mining rate per socket — anti-bot
const miningRates = new Map(); // socketId -> { count, resetAt }

// Banned words for nicknames
const BANNED_WORDS = [
  'nigger','nigga','chink','spic','kike','faggot','retard',
  'cunt','whore','tranny','beaner','wetback','gook','cracker'
];

function isNicknameClean(nickname) {
  const lower = nickname.toLowerCase().replace(/[^a-z0-9]/g, '');
  return !BANNED_WORDS.some(word => lower.includes(word));
}

function checkMiningRate(socketId) {
  const now = Date.now();
  if (!miningRates.has(socketId)) {
    miningRates.set(socketId, { count: 0, resetAt: now + 1000 });
  }
  const rate = miningRates.get(socketId);
  if (now > rate.resetAt) {
    rate.count = 0;
    rate.resetAt = now + 1000;
  }
  rate.count++;
  // Max 6 mine attempts per second — bots do 20-50+
  return rate.count <= 6;
}

io.on('connection', (socket) => {
  console.log(`[+] Connected: ${socket.id}`);

  socket.on('join', async (data) => {
    const { nickname, skinColor, walletAddress } = data;

    // Nickname filter
    if (!isNicknameClean(nickname || '')) {
      socket.emit('gameError', { message: '❌ Nickname not allowed. Please choose another.' });
      socket.disconnect();
      return;
    }

    // Limit nickname length
    const cleanNickname = (nickname || 'Player').slice(0, 16).trim() || 'Player';

    // Prevent duplicate wallet connections
    if (walletAddress && walletAddress !== 'unknown') {
      if (connectedWallets.has(walletAddress)) {
        const existingSocketId = connectedWallets.get(walletAddress);
        const existingSocket = io.sockets.sockets.get(existingSocketId);
        if (existingSocket) {
          existingSocket.emit('gameError', { message: '⚠️ You connected from another device. Disconnecting this session.' });
          existingSocket.disconnect();
        }
      }
      connectedWallets.set(walletAddress, socket.id);
    }

    socket.walletAddress = walletAddress;

    // Load saved progress
    let savedData = null;
    if (walletAddress && walletAddress !== 'unknown') {
      savedData = await loadPlayer(walletAddress);
    }

    const room = roomManager.joinRoom(socket.id, {
      nickname:      cleanNickname,
      skinColor:     skinColor || '#f4b07a',
      walletAddress: walletAddress || 'unknown',
      x: 8 + Math.random() * 4,
      y: 20,
      z: 8 + Math.random() * 4,
      rotY: 0,
      points:      savedData?.points       || 0,
      pickaxe:     savedData?.pickaxe      || 0,
      totalBlocks: savedData?.total_blocks || 0,
    });

    socket.join(room.id);
    socket.roomId = room.id;

    const player = room.getPlayer(socket.id);

    socket.emit('init', {
      playerId:     socket.id,
      roomId:       room.id,
      roomName:     room.name,
      playerCount:  room.getPlayerCount(),
      world:        room.world,
      players:      room.getPlayersData(),
      savedPoints:  player.points,
      savedPickaxe: player.pickaxe,
      savedBlocks:  player.totalBlocks,
    });

    socket.to(room.id).emit('playerJoined', { id: socket.id, ...room.getPlayer(socket.id) });

    if (savedData) {
      socket.emit('progressLoaded', {
        points:      savedData.points,
        pickaxe:     savedData.pickaxe,
        totalBlocks: savedData.total_blocks,
        nickname:    savedData.nickname
      });
    }

    console.log(`[${room.name}] ${cleanNickname} (${walletAddress?.slice(0,8)}...) joined — ${player.points} pts`);
  });

  socket.on('move', (data) => {
    const room = roomManager.getRoom(socket.roomId);
    if (!room) return;

    // Clamp position to world bounds — prevent teleport hacks
    const wx = Math.max(0, Math.min(data.x, 48));
    const wy = Math.max(-5, Math.min(data.y, 30));
    const wz = Math.max(0, Math.min(data.z, 48));

    room.updatePlayer(socket.id, { ...data, x: wx, y: wy, z: wz });
    socket.to(socket.roomId).emit('playerMoved', {
      id: socket.id, x: wx, y: wy, z: wz,
      rotY: data.rotY, isWalking: data.isWalking
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

    // Anti-bot rate limit
    if (!checkMiningRate(socket.id)) {
      socket.emit('gameError', { message: '⛏ Mining too fast! Slow down.' });
      return;
    }

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
    // Clean up wallet tracking
    if (socket.walletAddress && connectedWallets.get(socket.walletAddress) === socket.id) {
      connectedWallets.delete(socket.walletAddress);
    }
    miningRates.delete(socket.id);

    const room = roomManager.getRoom(socket.roomId);
    if (room) {
      const player = room.getPlayer(socket.id);
      if (player && player.walletAddress !== 'unknown') {
        await savePlayer(
          player.walletAddress,
          player.nickname,
          player.points,
          player.pickaxe,
          player.totalBlocks
        );
        console.log(`[-] ${player.nickname} left — saved ${player.points} pts`);
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

// Auto save all players every 60 seconds
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

initDB().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`\n⛏  GrindFun server running on port ${PORT}`);
    console.log(`   http://localhost:${PORT}\n`);
  });
});
