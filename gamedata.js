const BLOCKS = [
  { name: 'Dirt',      color: 0x8B6914, baseHits: 8,   pts: 1,   rarity: 0.20 },
  { name: 'Grass',     color: 0x5a8c3e, baseHits: 8,   pts: 1,   rarity: 0.18 },
  { name: 'Sand',      color: 0xd9c47a, baseHits: 6,   pts: 1,   rarity: 0.12 },
  { name: 'Wood',      color: 0xa0714a, baseHits: 14,  pts: 2,   rarity: 0.10 },
  { name: 'Stone',     color: 0x888888, baseHits: 22,  pts: 3,   rarity: 0.12 },
  { name: 'Coal',      color: 0x222222, baseHits: 32,  pts: 5,   rarity: 0.09 },
  { name: 'Iron Ore',  color: 0xc0896e, baseHits: 50,  pts: 10,  rarity: 0.07 },
  { name: 'Gold Ore',  color: 0xd4af37, baseHits: 80,  pts: 20,  rarity: 0.05 },
  { name: 'Redstone',  color: 0xcc2200, baseHits: 70,  pts: 15,  rarity: 0.04 },
  { name: 'Lapis',     color: 0x1a3db5, baseHits: 70,  pts: 18,  rarity: 0.03 },
  { name: 'Emerald',   color: 0x00b865, baseHits: 110, pts: 40,  rarity: 0.02 },
  { name: 'Diamond',   color: 0x4fc3f7, baseHits: 160, pts: 75,  rarity: 0.015 },
  { name: 'GrindFun',  color: 0x00ff88, baseHits: 300, pts: 250, rarity: 0.005 },
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
const WORLD_H = 20;
const WORLD_D = 48;

function generateWorld() {
  const world = new Array(WORLD_W * WORLD_H * WORLD_D).fill(-1);

  function idx(x, y, z) {
    return y * WORLD_W * WORLD_D + z * WORLD_W + x;
  }

  function setB(x, y, z, type) {
    if (x<0||x>=WORLD_W||y<0||y>=WORLD_H||z<0||z>=WORLD_D) return;
    world[idx(x,y,z)] = type;
  }

  for (let x = 0; x < WORLD_W; x++) {
    for (let z = 0; z < WORLD_D; z++) {
      // Smooth hills using sin/cos
      const surfaceY = 10
        + Math.floor(Math.sin(x * 0.3) * 2)
        + Math.floor(Math.cos(z * 0.3) * 2)
        + Math.floor(Math.sin(x * 0.15 + z * 0.15) * 1.5);

      for (let y = 0; y <= surfaceY; y++) {
        const depth = surfaceY - y;
        let blockType;

        if (depth === 0) {
          blockType = 1; // Grass on top
        } else if (depth <= 3) {
          blockType = 0; // Dirt under grass
        } else {
          const roll = Math.random();
          const depthRatio = y / surfaceY;

          if      (roll < 0.005 && depthRatio < 0.4) blockType = 12; // GrindFun
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

      // Trees — use block type 13 for leaves
      if (Math.random() < 0.03) {
        const treeHeight = 4 + Math.floor(Math.random() * 3);

        // Trunk
        for (let ty = surfaceY + 1; ty <= surfaceY + treeHeight; ty++) {
          if (ty < WORLD_H) setB(x, ty, z, 3); // Wood trunk
        }

        // Leaf crown — round shape, all green leaves (type 13)
        const crownY = surfaceY + treeHeight;
        for (let lx = -2; lx <= 2; lx++) {
          for (let lz = -2; lz <= 2; lz++) {
            for (let ly = -1; ly <= 2; ly++) {
              // Round off corners
              if (Math.abs(lx) === 2 && Math.abs(lz) === 2) continue;
              if (Math.abs(lx) === 2 && Math.abs(ly) === 2) continue;
              if (Math.abs(lz) === 2 && Math.abs(ly) === 2) continue;
              const ny = crownY + ly;
              if (world[idx(x+lx, ny, z+lz)] === undefined) continue;
              if (world[idx(x+lx, ny, z+lz)] === -1) {
                setB(x+lx, ny, z+lz, 13); // Leaves
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
