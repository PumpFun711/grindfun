const BLOCKS = [
  { name: 'Dirt',      color: 0x8B6914, baseHits: 1,   pts: 1,   rarity: 0.20 },
  { name: 'Grass',     color: 0x5a8c3e, baseHits: 1,   pts: 1,   rarity: 0.18 },
  { name: 'Sand',      color: 0xd9c47a, baseHits: 1,   pts: 1,   rarity: 0.12 },
  { name: 'Wood',      color: 0xa0714a, baseHits: 3,   pts: 2,   rarity: 0.10 },
  { name: 'Stone',     color: 0x888888, baseHits: 6,   pts: 3,   rarity: 0.12 },
  { name: 'Coal',      color: 0x333333, baseHits: 10,  pts: 5,   rarity: 0.09 },
  { name: 'Iron Ore',  color: 0xc0896e, baseHits: 18,  pts: 10,  rarity: 0.07 },
  { name: 'Gold Ore',  color: 0xd4af37, baseHits: 28,  pts: 20,  rarity: 0.05 },
  { name: 'Redstone',  color: 0xcc2200, baseHits: 24,  pts: 15,  rarity: 0.04 },
  { name: 'Lapis',     color: 0x1a3db5, baseHits: 24,  pts: 18,  rarity: 0.03 },
  { name: 'Emerald',   color: 0x00b865, baseHits: 40,  pts: 40,  rarity: 0.02 },
  { name: 'Diamond',   color: 0x4fc3f7, baseHits: 60,  pts: 75,  rarity: 0.015 },
  { name: 'GrindFun',  color: 0x00ff88, baseHits: 120, pts: 250, rarity: 0.005 },
];

const PICKS = [
  { name: 'Wood',    cost: 0,      power: 1,   color: '#c8a060' },
  { name: 'Stone',   cost: 500,    power: 2,   color: '#aaaaaa' },
  { name: 'Iron',    cost: 2000,   power: 3.5, color: '#d4d4d4' },
  { name: 'Gold',    cost: 6000,   power: 5,   color: '#ffd700' },
  { name: 'Diamond', cost: 20000,  power: 9,   color: '#4fc3f7' },
  { name: '$GRINDFUN', cost: 75000, power: 20, color: '#00ff88' },
];

// World dimensions
const WORLD_W = 32;
const WORLD_H = 16;
const WORLD_D = 32;

function generateWorld() {
  const world = new Array(WORLD_W * WORLD_H * WORLD_D).fill(-1);

  function idx(x, y, z) {
    return y * WORLD_W * WORLD_D + z * WORLD_W + x;
  }

  for (let x = 0; x < WORLD_W; x++) {
    for (let z = 0; z < WORLD_D; z++) {
      // Surface height varies slightly
      const surfaceY = 14 + Math.floor(Math.sin(x * 0.4) * 1.5 + Math.cos(z * 0.4) * 1.5);

      for (let y = 0; y <= surfaceY; y++) {
        const depth = surfaceY - y;
        let blockType;

        if (depth === 0) {
          // Surface — grass
          blockType = 1;
        } else if (depth <= 3) {
          // Near surface — dirt
          blockType = 0;
        } else {
          // Underground — stone with ore chance
          const roll = Math.random();
          const depthRatio = y / surfaceY;

          if (roll < 0.005 && depthRatio < 0.4) blockType = 12; // GrindFun ore (deep only)
          else if (roll < 0.015 && depthRatio < 0.5) blockType = 11; // Diamond
          else if (roll < 0.035 && depthRatio < 0.6) blockType = 10; // Emerald
          else if (roll < 0.055) blockType = 9;  // Lapis
          else if (roll < 0.08)  blockType = 8;  // Redstone
          else if (roll < 0.12)  blockType = 7;  // Gold
          else if (roll < 0.18)  blockType = 6;  // Iron
          else if (roll < 0.26)  blockType = 5;  // Coal
          else                   blockType = 4;  // Stone
        }

        world[idx(x, y, z)] = blockType;
      }

      // Add some trees on surface
      if (Math.random() < 0.04) {
        const treeHeight = 4 + Math.floor(Math.random() * 3);
        for (let ty = surfaceY + 1; ty <= surfaceY + treeHeight; ty++) {
          if (ty < WORLD_H) world[idx(x, ty, z)] = 3; // Wood
        }
        // Leaf crown
        for (let lx = -2; lx <= 2; lx++) {
          for (let lz = -2; lz <= 2; lz++) {
            for (let ly = -1; ly <= 1; ly++) {
              const nx = x + lx, ny = surfaceY + treeHeight + ly, nz = z + lz;
              if (nx >= 0 && nx < WORLD_W && ny >= 0 && ny < WORLD_H && nz >= 0 && nz < WORLD_D) {
                if (world[idx(nx, ny, nz)] === -1) world[idx(nx, ny, nz)] = 1; // Leaves as grass color
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
  if (x < 0 || x >= WORLD_W || y < 0 || y >= WORLD_H || z < 0 || z >= WORLD_D) return -1;
  return world.data[y * WORLD_W * WORLD_D + z * WORLD_W + x];
}

function setBlock(world, x, y, z, type) {
  if (x < 0 || x >= WORLD_W || y < 0 || y >= WORLD_H || z < 0 || z >= WORLD_D) return;
  world.data[y * WORLD_W * WORLD_D + z * WORLD_W + x] = type;
}

if (typeof module !== 'undefined') {
  module.exports = { BLOCKS, PICKS, generateWorld, getBlock, setBlock, WORLD_W, WORLD_H, WORLD_D };
}
