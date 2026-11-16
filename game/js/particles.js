// VOID BLOOM — particles and pollen. Two pooled systems, both drawn as soft
// light: the burst field (petal sparks, blight ichor, nova rings, dash
// trails and floating score text) and the pollen motes the blight sheds,
// which drift, glow, and stream to the Bloomkeeper when she comes near.

import { COLOURS } from './config.js';

const MAX_PARTICLES = 900;

export class ParticleField {
  constructor() {
    this.items = [];
  }

  spawn({ x, y, vx = 0, vy = 0, life = 0.5, size = 3, colour = COLOURS.pollen, drag = 2, gravity = 0, ring = false, text = null }) {
    if (this.items.length >= MAX_PARTICLES) this.items.shift();
    this.items.push({ x, y, vx, vy, life, maxLife: life, size, colour, drag, gravity, ring, text });
  }

  burst(x, y, colour, count = 10, speed = 160, size = 3) {
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const v = speed * (0.3 + Math.random() * 0.9);
      this.spawn({
        x, y,
        vx: Math.cos(angle) * v,
        vy: Math.sin(angle) * v,
        life: 0.35 + Math.random() * 0.4,
        size: size * (0.6 + Math.random() * 0.8),
        colour,
        drag: 3,
      });
    }
  }

  ringBurst(x, y, radius, colour) {
    this.spawn({ x, y, life: 0.32, size: radius, colour, ring: true });
  }

  floatText(x, y, text, colour = COLOURS.ink, size = 15) {
    this.spawn({ x, y, vx: 0, vy: -46, life: 0.8, size, colour, drag: 0.5, text });
  }

  trail(x, y, colour, size = 5) {
    this.spawn({ x, y, vx: 0, vy: 0, life: 0.3, size, colour, drag: 0 });
  }

  update(dt) {
    const items = this.items;
    for (let i = items.length - 1; i >= 0; i -= 1) {
      const p = items[i];
      p.life -= dt;
      if (p.life <= 0) {
        items.splice(i, 1);
        continue;
      }
      const dragK = Math.max(0, 1 - p.drag * dt);
      p.vx *= dragK;
      p.vy = p.vy * dragK + p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  draw(ctx) {
    for (const p of this.items) {
      const fade = Math.max(0, p.life / p.maxLife);
      if (p.text !== null) {
        ctx.globalAlpha = fade;
        ctx.fillStyle = p.colour;
        ctx.font = `bold ${p.size}px Georgia, serif`;
        ctx.textAlign = 'center';
        ctx.fillText(p.text, p.x, p.y);
        continue;
      }
      if (p.ring) {
        const grown = 1 - fade;
        ctx.globalAlpha = fade * 0.8;
        ctx.strokeStyle = p.colour;
        ctx.lineWidth = 3 + 3 * fade;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (0.25 + 0.75 * grown), 0, Math.PI * 2);
        ctx.stroke();
        continue;
      }
      ctx.globalAlpha = fade;
      ctx.fillStyle = p.colour;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.4 + 0.6 * fade), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

/** Pollen motes: the garden's XP, dropped by kills, gathered by proximity. */
export class MoteField {
  constructor() {
    this.items = [];
  }

  drop(x, y, count, rng) {
    for (let i = 0; i < count; i += 1) {
      const angle = rng.range(0, Math.PI * 2);
      const dist = rng.range(4, 30);
      this.items.push({
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        vx: Math.cos(angle) * 60,
        vy: Math.sin(angle) * 60,
        age: rng.range(0, 6),
      });
    }
  }

  /** Move motes; returns how many the player gathered this step. */
  update(dt, player) {
    let gathered = 0;
    const items = this.items;
    for (let i = items.length - 1; i >= 0; i -= 1) {
      const m = items[i];
      m.age += dt;
      const dx = player.x - m.x;
      const dy = player.y - m.y;
      const dist = Math.hypot(dx, dy) || 1;
      if (dist < player.magnetRadius) {
        const pull = 340 * (1 - dist / (player.magnetRadius + 40)) + 120;
        m.vx += (dx / dist) * pull * dt * 4;
        m.vy += (dy / dist) * pull * dt * 4;
      }
      m.vx *= Math.max(0, 1 - 3.2 * dt);
      m.vy *= Math.max(0, 1 - 3.2 * dt);
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      if (dist < player.radius + 12) {
        items.splice(i, 1);
        gathered += 1;
      }
    }
    return gathered;
  }

  draw(ctx, time) {
    for (const m of this.items) {
      const pulse = 0.75 + 0.25 * Math.sin(time * 3 + m.age * 2);
      ctx.globalAlpha = 0.35 * pulse;
      ctx.fillStyle = COLOURS.pollen;
      ctx.beginPath();
      ctx.arc(m.x, m.y, 8 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#d9fff4';
      ctx.beginPath();
      ctx.arc(m.x, m.y, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
