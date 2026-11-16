// VOID BLOOM — the Bloomkeeper. A seed-spirit with a lantern heart: she
// moves, dashes through the swarm untouched, gathers pollen, grows. Her
// graft-modified stats arrive from the game each time she grows; this file
// owns only her body — position, dash, hurt and healing, and her drawing.

import { WORLD, PLAYER, COLOURS, xpForLevel } from './config.js';

export class Bloomkeeper {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = WORLD.width / 2;
    this.y = WORLD.height / 2;
    this.vx = 0;
    this.vy = 0;
    this.radius = PLAYER.radius;
    this.facing = 0;
    this.maxHp = PLAYER.baseHp;
    this.hp = this.maxHp;
    this.xp = 0;
    this.level = 1;
    this.pendingDrafts = 0;
    this.dashTime = 0;
    this.dashCooldown = 0;
    this.invulnerable = 0;
    this.magnetRadius = PLAYER.pickupRadius;
    this.regen = 0;
    this.armor = 0;
    this.speedMul = 1;
    this.walkCycle = 0;
  }

  get speed() {
    return PLAYER.baseSpeed * this.speedMul;
  }

  /** Add pollen. Returns how many drafts the garden now owes her. */
  gainXp(amount) {
    this.xp += amount;
    let owed = 0;
    while (this.xp >= xpForLevel(this.level)) {
      this.xp -= xpForLevel(this.level);
      this.level += 1;
      owed += 1;
    }
    this.pendingDrafts += owed;
    return owed;
  }

  /** Take a hit through armour; dash and fresh hurt make her untouchable. */
  hurt(amount) {
    if (this.invulnerable > 0 || this.dashTime > 0) return false;
    const soaked = Math.max(1, Math.round(amount * (1 - this.armor)));
    this.hp -= soaked;
    this.invulnerable = PLAYER.contactInvulnerable;
    return true;
  }

  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  get dead() {
    return this.hp <= 0;
  }

  /** move: a unit-ish vector from input (or the autopilot). aim: world point she faces. */
  update(dt, move, aim, wantsDash) {
    this.invulnerable = Math.max(0, this.invulnerable - dt);
    this.dashCooldown = Math.max(0, this.dashCooldown - dt);
    if (this.regen > 0) this.heal(this.regen * dt);

    if (wantsDash && this.dashCooldown <= 0 && this.dashTime <= 0) {
      this.dashTime = PLAYER.dashSeconds;
      this.dashCooldown = PLAYER.dashCooldown;
      this.invulnerable = Math.max(this.invulnerable, PLAYER.dashInvulnerable);
    }

    let mx = move.x;
    let my = move.y;
    const len = Math.hypot(mx, my);
    if (len > 1) {
      mx /= len;
      my /= len;
    }
    const speedNow = this.dashTime > 0 ? PLAYER.dashSpeed : this.speed;
    const dashDir = this.dashTime > 0 && len === 0 ? { x: Math.cos(this.facing), y: Math.sin(this.facing) } : { x: mx, y: my };
    this.vx = dashDir.x * speedNow;
    this.vy = dashDir.y * speedNow;
    this.dashTime = Math.max(0, this.dashTime - dt);

    this.x = Math.max(46 + this.radius, Math.min(WORLD.width - 46 - this.radius, this.x + this.vx * dt));
    this.y = Math.max(46 + this.radius, Math.min(WORLD.height - 46 - this.radius, this.y + this.vy * dt));
    if (len > 0) this.walkCycle += dt * 9;

    if (aim) this.facing = Math.atan2(aim.y - this.y, aim.x - this.x);
  }

  draw(ctx, time) {
    const blink = this.invulnerable > 0 && Math.floor(time * 18) % 2 === 0;
    // Lantern glow.
    const glow = ctx.createRadialGradient(this.x, this.y, 4, this.x, this.y, 120);
    glow.addColorStop(0, 'rgba(255, 200, 87, 0.30)');
    glow.addColorStop(0.5, 'rgba(255, 93, 162, 0.10)');
    glow.addColorStop(1, 'rgba(255, 93, 162, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 120, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(this.x, this.y);
    if (blink) ctx.globalAlpha = 0.35;
    // Petal cloak: five petals turning slowly around the body.
    ctx.fillStyle = COLOURS.petal;
    for (let i = 0; i < 5; i += 1) {
      const a = time * 0.9 + (i / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * 13, Math.sin(a) * 13 + 2, 7.5, 4.6, a, 0, Math.PI * 2);
      ctx.fill();
    }
    // Body.
    const bob = Math.sin(this.walkCycle) * 1.6;
    const body = ctx.createRadialGradient(-4, -6 + bob, 2, 0, bob, 17);
    body.addColorStop(0, '#fff3cf');
    body.addColorStop(0.55, COLOURS.amber);
    body.addColorStop(1, '#e07f2e');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(0, bob, 14.5, 0, Math.PI * 2);
    ctx.fill();
    // The lantern heart.
    ctx.fillStyle = '#fffbe8';
    ctx.beginPath();
    ctx.arc(0, bob, 5.2 + Math.sin(time * 4) * 0.7, 0, Math.PI * 2);
    ctx.fill();
    // Aim whisker: a short bright line toward where she faces.
    ctx.strokeStyle = 'rgba(255, 246, 216, 0.75)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(this.facing) * 16, bob + Math.sin(this.facing) * 16);
    ctx.lineTo(Math.cos(this.facing) * 26, bob + Math.sin(this.facing) * 26);
    ctx.stroke();
    ctx.restore();

    // Dash readiness ring.
    if (this.dashCooldown > 0) {
      const frac = 1 - this.dashCooldown / PLAYER.dashCooldown;
      ctx.strokeStyle = 'rgba(110, 242, 216, 0.5)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(this.x, this.y, 22, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
      ctx.stroke();
    }
  }
}
