const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Create tables if they don't exist
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS players (
      wallet_address TEXT PRIMARY KEY,
      nickname TEXT NOT NULL,
      points INTEGER DEFAULT 0,
      pickaxe INTEGER DEFAULT 0,
      total_blocks INTEGER DEFAULT 0,
      last_seen TIMESTAMP DEFAULT NOW(),
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS daily_scores (
      id SERIAL PRIMARY KEY,
      wallet_address TEXT NOT NULL,
      nickname TEXT NOT NULL,
      points INTEGER DEFAULT 0,
      date DATE DEFAULT CURRENT_DATE,
      UNIQUE(wallet_address, date)
    );
  `);

  console.log('[DB] Tables ready');
}

// Load player from DB
async function loadPlayer(walletAddress) {
  try {
    const res = await pool.query(
      'SELECT * FROM players WHERE wallet_address = $1',
      [walletAddress]
    );
    return res.rows[0] || null;
  } catch(e) {
    console.error('[DB] loadPlayer error:', e.message);
    return null;
  }
}

// Save or update player
async function savePlayer(walletAddress, nickname, points, pickaxe, totalBlocks) {
  try {
    await pool.query(`
      INSERT INTO players (wallet_address, nickname, points, pickaxe, total_blocks, last_seen)
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (wallet_address) DO UPDATE SET
        nickname = $2,
        points = $3,
        pickaxe = $4,
        total_blocks = $5,
        last_seen = NOW()
    `, [walletAddress, nickname, points, pickaxe, totalBlocks]);

    // Save daily score
    await pool.query(`
      INSERT INTO daily_scores (wallet_address, nickname, points, date)
      VALUES ($1, $2, $3, CURRENT_DATE)
      ON CONFLICT (wallet_address, date) DO UPDATE SET
        nickname = $2,
        points = GREATEST(daily_scores.points, $3)
    `, [walletAddress, nickname, points]);

  } catch(e) {
    console.error('[DB] savePlayer error:', e.message);
  }
}

// Get global leaderboard
async function getLeaderboard(limit = 100) {
  try {
    const res = await pool.query(`
      SELECT wallet_address, nickname, points, pickaxe, total_blocks, last_seen
      FROM players
      ORDER BY points DESC
      LIMIT $1
    `, [limit]);
    return res.rows;
  } catch(e) {
    console.error('[DB] getLeaderboard error:', e.message);
    return [];
  }
}

// Get daily leaderboard
async function getDailyLeaderboard(limit = 100) {
  try {
    const res = await pool.query(`
      SELECT wallet_address, nickname, points
      FROM daily_scores
      WHERE date = CURRENT_DATE
      ORDER BY points DESC
      LIMIT $1
    `, [limit]);
    return res.rows;
  } catch(e) {
    console.error('[DB] getDailyLeaderboard error:', e.message);
    return [];
  }
}

// Get all players for admin
async function getAllPlayers() {
  try {
    const res = await pool.query(`
      SELECT wallet_address, nickname, points, pickaxe, total_blocks, last_seen, created_at
      FROM players
      ORDER BY points DESC
    `);
    return res.rows;
  } catch(e) {
    console.error('[DB] getAllPlayers error:', e.message);
    return [];
  }
}

module.exports = { initDB, loadPlayer, savePlayer, getLeaderboard, getDailyLeaderboard, getAllPlayers };
