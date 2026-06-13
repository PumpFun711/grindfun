const BLOCKS = [
  { name: 'Dirt',      color: 0x8B6914, baseHits: 8,   pts: 1,   rarity: 0 },
  { name: 'Grass',     color: 0x5a8c3e, baseHits: 8,   pts: 1,   rarity: 0 },
  { name: 'Sand',      color: 0xd9c47a, baseHits: 6,   pts: 1,   rarity: 0 },
  { name: 'Wood',      color: 0xa0714a, baseHits: 14,  pts: 2,   rarity: 0 },
  { name: 'Stone',     color: 0x888888, baseHits: 22,  pts: 3,   rarity: 0 },
  { name: 'Coal',      color: 0x222222, baseHits: 32,  pts: 5,   rarity: 0 },
  { name: 'Iron Ore',  color: 0xc0896e, baseHits: 50,  pts: 10,  rarity: 0 },
  { name: 'Gold Ore',  color: 0xd4af37, baseHits: 80,  pts: 20,  rarity: 0 },
  { name: 'Redstone',  color: 0xcc2200, baseHits: 70,  pts: 15,  rarity: 0 },
  { name: 'Lapis',     color: 0x1a3db5, baseHits: 70,  pts: 18,  rarity: 0 },
  { name: 'Emerald',   color: 0x00b865, baseHits: 110, pts: 40,  rarity: 0 },
  { name: 'Diamond',   color: 0x4fc3f7, baseHits: 160, pts: 75,  rarity: 0 },
  { name: 'GrindFun',  color: 0x00ff88, baseHits: 300, pts: 250, rarity: 0 },
  { name: 'Leaves',    color: 0x2d7a2d, baseHits: 4,   pts: 0,   rarity: 0 },
];

const PICKS = [
  { name: 'Wood',      cost: 0,      power: 1,   color: '#c8a060' },
  { name: 'Stone',     cost: 500,    power: 2,   color: '#aaaaaa' },
  { name: 'Iron',      cost: 2000,   power: 3.5, color: '#d4d4d4' },
  { name: 'Gold',      cost: 6000,   power: 5,   color: '#ffd700' },
  { name: 'Diamond',   cost: 20000,  power: 9,   color: '#4fc3f7' },
  { name: '$GRINDFUN', cost: 75000,  power: 20,  color: '#00ff88' },
];

const WORLD_W = 48;
const WORLD_H = 10;
const WORLD_D = 48;

// Weighted surface block picker
const SURFACE_BLOCKS = [
  [1,  35],  // Grass
  [0,  18],  // Dirt
  [2,   8],  // Sand
  [4,  14],  // Stone
  [5,   8],  // Coal
  [6,   6],  // Iron Ore
  [7,   4],  // Gold Ore
  [8,   3],  // Redstone
  [9,   2],  // Lapis
  [10,  1],  // Emerald
  [11,  1],  // Diamond
  [12,  1],  // GrindFun Ore
];
const SURFACE_TOTAL = SURFACE_BLOCKS.reduce((a,b) => a + b[1], 0);

function pickSurfaceBlock() {
  let roll = Math.random() * SURFACE_TOTAL;
  for (const [type, weight] of SURFACE_BLOCKS) {
    roll -= weight;
    if (roll <= 0) return type;
  }
  return 1;
}

function generateWorld() {
  const world = new Array(WORLD_W * WORLD_H * WORLD_D).fill(-1);

  function idx(x, y, z) {
    return y * WORLD_W * WORLD_D + z * WORLD_W + x;
  }

  function setB(x, y, z, type) {
    if (x<0||x>=WORLD_W||y<0||y>=WORLD_H||z<0||z>=WORLD_D) return;
    world[idx(x,y,z)] = type;
  }

  const BASE_Y = 4; // Ground level

  for (let x = 0; x < WORLD_W; x++) {
    for (let z = 0; z < WORLD_D; z++) {
      // Gentle hills — max 2 block variation
      const hill = Math.floor(
        Math.sin(x * 0.25) * 1.2 +
        Math.cos(z * 0.25) * 1.2 +
        Math.sin((x + z) * 0.18) * 0.8
      );
      const surfaceY = BASE_Y + Math.max(-1, Math.min(2, hill));

      // ONLY place ONE layer of surface block — no underground
      setB(x, surfaceY, z, pickSurfaceBlock());

      // Trees on grass blocks
      if (world[idx(x, surfaceY, z)] === 1 && Math.random() < 0.025) {
        const treeH = 4 + Math.floor(Math.random() * 3);

        // Trunk
        for (let ty = surfaceY + 1; ty <= surfaceY + treeH; ty++) {
          setB(x, ty, z, 3);
        }

        // Leaves — round crown
        const crownY = surfaceY + treeH;
        for (let lx = -2; lx <= 2; lx++) {
          for (let lz = -2; lz <= 2; lz++) {
            for (let ly = -1; ly <= 2; ly++) {
              if (Math.abs(lx) === 2 && Math.abs(lz) === 2) continue;
              if (Math.abs(lx) === 2 && ly === 2) continue;
              if (Math.abs(lz) === 2 && ly === 2) continue;
              const ny = crownY + ly;
              const ni = idx(x+lx, ny, z+lz);
              if (ni >= 0 && ni < world.length && world[ni] === -1) {
                setB(x+lx, ny, z+lz, 13);
              }
            }
          }
        }
      }
    }
  }

  return { data: world, w: WORLD_W, h: WORLD_H, d: WORLD_D };
}

function getBlock(world, x, y, z) {
  if (x<0||x>=WORLD_W||y<0||y>=WORLD_H||z<0||z>=WORLD_D) return -1;
  return world.data[y * WORLD_W * WORLD_D + z * WORLD_W + x];
}

function setBlock(world, x, y, z, type) {
  if (x<0||x>=WORLD_W||y<0||y>=WORLD_H||z<0||z>=WORLD_D) return;
  world.data[y * WORLD_W * WORLD_D + z * WORLD_W + x] = type;
}

if (typeof module !== 'undefined') {
  module.exports = { BLOCKS, PICKS, generateWorld, getBlock, setBlock, WORLD_W, WORLD_H, WORLD_D };
}
