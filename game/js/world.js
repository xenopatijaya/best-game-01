// VOID BLOOM — the garden and the camera. The garden is generated once from
// the run's seed: ponds, stone rings, glowflowers, grass and drowned trees
// scattered over a field larger than the screen, ringed by a thorn hedge
// nothing crosses. The camera follows the Bloomkeeper and shakes when the
// night lands a blow.

import { WORLD, VIEW, COLOURS } from './config.js';

export class Camera {
  constructor() {
    this.x = WORLD.width / 2 - VIEW.width / 2;
    this.y = WORLD.height / 2 - VIEW.height / 2;
    this.shake = 0;
  }

  follow(target, dt) {
    const wantX = target.x - VIEW.width / 2;
    const wantY = target.y - VIEW.height / 2;
    const k = Math.min(1, dt * 5);
    this.x += (wantX - this.x) * k;
    this.y += (wantY - this.y) * k;
    this.x = Math.max(0, Math.min(WORLD.width - VIEW.width, this.x));
    this.y = Math.max(0, Math.min(WORLD.height - VIEW.height, this.y));
    this.shake = Math.max(0, this.shake - dt * 26);
  }

  jolt(amount) {
    this.shake = Math.min(14, this.shake + amount);
  }

  /** Offset to apply to the world transform this frame. */
  offset(time) {
    if (this.shake <= 0) return { x: -this.x, y: -this.y };
    const s = this.shake;
    return {
      x: -this.x + Math.sin(time * 91) * s * 0.6,
      y: -this.y + Math.cos(time * 113) * s * 0.6,
    };
  }
}

export function generateGarden(rng) {
  const decor = { ponds: [], rings: [], flowers: [], grass: [], trees: [] };
  for (let i = 0; i < 7; i += 1) {
    decor.ponds.push({
      x: rng.range(220, WORLD.width - 220),
      y: rng.range(220, WORLD.height - 220),
      rx: rng.range(90, 190),
      ry: rng.range(55, 110),
    });
  }
  for (let i = 0; i < 9; i += 1) {
    decor.rings.push({
      x: rng.range(160, WORLD.width - 160),
      y: rng.range(160, WORLD.height - 160),
      r: rng.range(38, 74),
      stones: rng.int(7, 11),
      phase: rng.range(0, Math.PI * 2),
    });
  }
  const flowerColours = [COLOURS.petal, COLOURS.pollen, COLOURS.amber, '#b48cff'];
  for (let i = 0; i < 130; i += 1) {
    decor.flowers.push({
      x: rng.range(50, WORLD.width - 50),
      y: rng.range(50, WORLD.height - 50),
      colour: flowerColours[i % flowerColours.length],
      phase: rng.range(0, Math.PI * 2),
      size: rng.range(2.2, 4.2),
    });
  }
  for (let i = 0; i < 420; i += 1) {
    decor.grass.push({
      x: rng.range(30, WORLD.width - 30),
      y: rng.range(30, WORLD.height - 30),
      h: rng.range(7, 15),
      lean: rng.range(-3, 3),
    });
  }
  for (let i = 0; i < 12; i += 1) {
    const side = rng.int(0, 3);
    const along = rng.range(0, 1);
    const x = side === 0 ? 70 : side === 1 ? WORLD.width - 70 : along * WORLD.width;
    const y = side === 2 ? 70 : side === 3 ? WORLD.height - 70 : along * WORLD.height;
    decor.trees.push({ x, y, scale: rng.range(0.8, 1.5), phase: rng.range(0, Math.PI * 2) });
  }
  return decor;
}

function drawTree(ctx, tree) {
  ctx.save();
  ctx.translate(tree.x, tree.y);
  ctx.scale(tree.scale, tree.scale);
  ctx.strokeStyle = '#05070f';
  ctx.lineCap = 'round';
  ctx.lineWidth = 13;
  ctx.beginPath();
  ctx.moveTo(0, 26);
  ctx.lineTo(0, -34);
  ctx.stroke();
  ctx.lineWidth = 7;
  for (const dir of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.quadraticCurveTo(dir * 20, -34, dir * 34, -52);
    ctx.stroke();
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(dir * 22, -38);
    ctx.quadraticCurveTo(dir * 34, -48, dir * 44, -66);
    ctx.stroke();
    ctx.lineWidth = 7;
  }
  ctx.restore();
}

export function drawGarden(ctx, decor, camera, time) {
  // Ground: a deep night gradient with a slow breathing glow at the centre.
  const ground = ctx.createRadialGradient(
    WORLD.width / 2, WORLD.height / 2, 200,
    WORLD.width / 2, WORLD.height / 2, WORLD.width * 0.62,
  );
  ground.addColorStop(0, '#131a3d');
  ground.addColorStop(0.55, COLOURS.night);
  ground.addColorStop(1, COLOURS.nightDeep);
  ctx.fillStyle = ground;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);

  // Ponds: still dark water with a moonlit rim.
  for (const pond of decor.ponds) {
    ctx.fillStyle = '#0a1e3a';
    ctx.beginPath();
    ctx.ellipse(pond.x, pond.y, pond.rx, pond.ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(110, 200, 255, 0.20)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = 'rgba(160, 220, 255, 0.05)';
    ctx.beginPath();
    ctx.ellipse(pond.x - pond.rx * 0.2, pond.y - pond.ry * 0.25, pond.rx * 0.5, pond.ry * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Grass: small dark strokes, drawn cheaply in view only.
  ctx.strokeStyle = 'rgba(64, 110, 84, 0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (const blade of decor.grass) {
    if (blade.x < camera.x - 40 || blade.x > camera.x + VIEW.width + 40) continue;
    if (blade.y < camera.y - 40 || blade.y > camera.y + VIEW.height + 40) continue;
    ctx.moveTo(blade.x, blade.y);
    ctx.lineTo(blade.x + blade.lean, blade.y - blade.h);
  }
  ctx.stroke();

  // Stone rings: old shrines of the garden.
  for (const ring of decor.rings) {
    for (let i = 0; i < ring.stones; i += 1) {
      const a = ring.phase + (i / ring.stones) * Math.PI * 2;
      const sx = ring.x + Math.cos(a) * ring.r;
      const sy = ring.y + Math.sin(a) * ring.r * 0.82;
      ctx.fillStyle = '#232c4e';
      ctx.beginPath();
      ctx.ellipse(sx, sy, 9, 7, a, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(140, 160, 220, 0.16)';
      ctx.beginPath();
      ctx.ellipse(sx - 2, sy - 2, 4, 3, a, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Glowflowers: the garden still trying to bloom.
  for (const flower of decor.flowers) {
    const pulse = 0.6 + 0.4 * Math.sin(time * 1.6 + flower.phase);
    ctx.globalAlpha = 0.16 * pulse;
    ctx.fillStyle = flower.colour;
    ctx.beginPath();
    ctx.arc(flower.x, flower.y, flower.size * 4.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = flower.colour;
    for (let p = 0; p < 5; p += 1) {
      const a = flower.phase + (p / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(flower.x + Math.cos(a) * flower.size, flower.y + Math.sin(a) * flower.size, flower.size * 0.62, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#fff6d8';
    ctx.beginPath();
    ctx.arc(flower.x, flower.y, 1.4, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const tree of decor.trees) drawTree(ctx, tree);

  // The thorn hedge: a dense dark border the night cannot cross, and neither can you.
  ctx.strokeStyle = '#04060d';
  ctx.lineWidth = 54;
  ctx.strokeRect(10, 10, WORLD.width - 20, WORLD.height - 20);
  ctx.strokeStyle = 'rgba(88, 74, 122, 0.5)';
  ctx.lineWidth = 3;
  ctx.setLineDash([14, 22]);
  ctx.strokeRect(38, 38, WORLD.width - 76, WORLD.height - 76);
  ctx.setLineDash([]);
}

/** Drifting fireflies over everything: the garden's own small lights. */
export function drawFireflies(ctx, camera, time) {
  ctx.fillStyle = COLOURS.amber;
  for (let i = 0; i < 42; i += 1) {
    const seedX = (i * 613) % WORLD.width;
    const seedY = (i * 389) % WORLD.height;
    const x = seedX + Math.sin(time * 0.24 + i * 1.7) * 34;
    const y = seedY + Math.cos(time * 0.19 + i * 2.3) * 26;
    if (x < camera.x - 20 || x > camera.x + VIEW.width + 20) continue;
    if (y < camera.y - 20 || y > camera.y + VIEW.height + 20) continue;
    const twinkle = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(time * 2 + i * 3.1));
    ctx.globalAlpha = twinkle;
    ctx.beginPath();
    ctx.arc(x, y, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}
