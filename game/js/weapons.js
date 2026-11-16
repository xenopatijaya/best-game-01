// VOID BLOOM — the arsenal. Four weapons, each with five levels of growth:
// the Petal Fan sprays toward the nearest blight, Thorn Orbit shreds what
// wanders close, Nova Bloom bursts in a ring on a breath timer, and the
// Wisp Seekers hunt on their own. Damage is reported through a callback —
// the game decides what a kill is worth; this file only throws the light.

import { WEAPONS, COLOURS } from './config.js';

export class Arsenal {
  constructor() {
    this.owned = new Map([['petals', 1]]);
    this.projectiles = [];
    this.timers = { petals: 0, nova: 1.2, wisps: 0.6 };
    this.orbitAngle = 0;
  }

  has(id) {
    return this.owned.has(id);
  }

  level(id) {
    return this.owned.get(id) || 0;
  }

  /** Add a weapon at level 1, or grow the one she has. Returns the new level. */
  grow(id) {
    const next = (this.owned.get(id) || 0) + 1;
    this.owned.set(id, next);
    return next;
  }

  stats(id) {
    const lvl = this.level(id);
    return lvl > 0 ? WEAPONS[id].levels[lvl - 1] : null;
  }

  update(dt, player, swarm, fx, audio, onDamage) {
    this.updatePetals(dt, player, swarm, fx, audio);
    this.updateOrbit(dt, player, swarm, onDamage);
    this.updateNova(dt, player, swarm, fx, audio, onDamage);
    this.updateWisps(dt, player, swarm, fx, audio);
    this.updateProjectiles(dt, swarm, fx, onDamage);
  }

  updatePetals(dt, player, swarm, fx, audio) {
    const stats = this.stats('petals');
    if (!stats) return;
    this.timers.petals -= dt;
    if (this.timers.petals > 0) return;
    const target = swarm.nearest(player.x, player.y, 760);
    if (!target) return;
    this.timers.petals = stats.cooldown;
    const base = Math.atan2(target.y - player.y, target.x - player.x);
    for (let i = 0; i < stats.count; i += 1) {
      const t = stats.count === 1 ? 0 : i / (stats.count - 1) - 0.5;
      const angle = base + t * stats.spread;
      this.projectiles.push({
        kind: 'petal',
        x: player.x + Math.cos(base) * 18,
        y: player.y + Math.sin(base) * 18,
        vx: Math.cos(angle) * stats.speed,
        vy: Math.sin(angle) * stats.speed,
        damage: stats.damage,
        radius: 6,
        life: 0.85,
      });
    }
    fx.burst(player.x + Math.cos(base) * 22, player.y + Math.sin(base) * 22, COLOURS.petal, 2, 50, 2.4);
    audio.shoot();
  }

  orbitThorns(player) {
    const stats = this.stats('orbit');
    if (!stats) return [];
    const thorns = [];
    for (let i = 0; i < stats.count; i += 1) {
      const a = this.orbitAngle + (i / stats.count) * Math.PI * 2;
      thorns.push({ x: player.x + Math.cos(a) * stats.radius, y: player.y + Math.sin(a) * stats.radius, angle: a });
    }
    return thorns;
  }

  updateOrbit(dt, player, swarm, onDamage) {
    const stats = this.stats('orbit');
    if (!stats) return;
    this.orbitAngle += dt * stats.spin;
    for (const e of swarm.enemies) {
      const left = (e.orbitHitAt.get('orbit') || 0) - dt;
      e.orbitHitAt.set('orbit', Math.max(0, left));
      if (left > 0) continue;
      const dx = e.x - player.x;
      const dy = e.y - player.y;
      if (Math.abs(dx) > stats.radius + e.radius + 14 || Math.abs(dy) > stats.radius + e.radius + 14) continue;
      for (const thorn of this.orbitThorns(player)) {
        const ddx = e.x - thorn.x;
        const ddy = e.y - thorn.y;
        if (ddx * ddx + ddy * ddy < (e.radius + 13) * (e.radius + 13)) {
          e.orbitHitAt.set('orbit', 0.38);
          onDamage(e, stats.damage, Math.atan2(ddy, ddx), 120, 'orbit');
          break;
        }
      }
    }
  }

  updateNova(dt, player, swarm, fx, audio, onDamage) {
    const stats = this.stats('nova');
    if (!stats) return;
    this.timers.nova -= dt;
    if (this.timers.nova > 0) return;
    this.timers.nova = stats.cooldown;
    fx.ringBurst(player.x, player.y, stats.radius, COLOURS.pollen);
    fx.burst(player.x, player.y, COLOURS.pollen, 22, 260, 3.4);
    audio.nova();
    for (const e of [...swarm.enemies]) {
      const dx = e.x - player.x;
      const dy = e.y - player.y;
      const dist = Math.hypot(dx, dy);
      if (dist < stats.radius + e.radius) {
        onDamage(e, stats.damage, Math.atan2(dy, dx), 260, 'nova');
      }
    }
  }

  updateWisps(dt, player, swarm, fx, audio) {
    const stats = this.stats('wisps');
    if (!stats) return;
    this.timers.wisps -= dt;
    if (this.timers.wisps > 0) return;
    if (swarm.count === 0) return;
    this.timers.wisps = stats.cooldown;
    for (let i = 0; i < stats.count; i += 1) {
      const angle = player.facing + (i - (stats.count - 1) / 2) * 0.5;
      this.projectiles.push({
        kind: 'wisp',
        x: player.x,
        y: player.y - 8,
        vx: Math.cos(angle) * stats.speed * 0.6,
        vy: Math.sin(angle) * stats.speed * 0.6,
        damage: stats.damage,
        radius: 7,
        life: 2.4,
        speed: stats.speed,
        target: null,
      });
    }
    audio.wisp();
    void fx;
  }

  updateProjectiles(dt, swarm, fx, onDamage) {
    for (let i = this.projectiles.length - 1; i >= 0; i -= 1) {
      const p = this.projectiles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.projectiles.splice(i, 1);
        continue;
      }
      if (p.kind === 'wisp') {
        if (!p.target || p.target.hp <= 0) p.target = swarm.nearest(p.x, p.y, 900);
        if (p.target) {
          const dx = p.target.x - p.x;
          const dy = p.target.y - p.y;
          const dist = Math.hypot(dx, dy) || 1;
          const steer = 7.5 * dt;
          p.vx += (dx / dist) * p.speed * steer;
          p.vy += (dy / dist) * p.speed * steer;
          const v = Math.hypot(p.vx, p.vy) || 1;
          p.vx = (p.vx / v) * p.speed;
          p.vy = (p.vy / v) * p.speed;
        }
        if (Math.random() < 0.5) fx.trail(p.x, p.y, 'rgba(191, 233, 255, 0.5)', 4);
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      // Collision: first enemy whose body the projectile touches.
      let consumed = false;
      for (const e of swarm.enemies) {
        const dx = e.x - p.x;
        const dy = e.y - p.y;
        const rr = e.radius + p.radius;
        if (dx * dx + dy * dy < rr * rr) {
          onDamage(e, p.damage, Math.atan2(p.vy, p.vx), p.kind === 'petal' ? 90 : 40, p.kind);
          consumed = true;
          break;
        }
      }
      if (consumed) this.projectiles.splice(i, 1);
    }
  }

  draw(ctx, player, time) {
    // Nova's breathing ring: the player can feel the next burst coming.
    const nova = this.stats('nova');
    if (nova) {
      const charge = 1 - Math.max(0, this.timers.nova) / nova.cooldown;
      ctx.globalAlpha = 0.05 + charge * 0.1;
      ctx.strokeStyle = COLOURS.pollen;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(player.x, player.y, nova.radius * (0.92 + 0.08 * Math.sin(time * 3)), 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // Thorn orbit.
    for (const thorn of this.orbitThorns(player)) {
      ctx.save();
      ctx.translate(thorn.x, thorn.y);
      ctx.rotate(thorn.angle + Math.PI / 2);
      ctx.fillStyle = COLOURS.thorn;
      ctx.beginPath();
      ctx.moveTo(0, -11);
      ctx.lineTo(6, 7);
      ctx.lineTo(-6, 7);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#e6ffc9';
      ctx.beginPath();
      ctx.arc(0, -3, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // Projectiles.
    for (const p of this.projectiles) {
      if (p.kind === 'petal') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(Math.atan2(p.vy, p.vx));
        ctx.fillStyle = COLOURS.petal;
        ctx.beginPath();
        ctx.ellipse(0, 0, 8, 4.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffd7ec';
        ctx.beginPath();
        ctx.ellipse(2, 0, 3.4, 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else {
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = COLOURS.wisp;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#eef9ff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}
