// VOID BLOOM — the blight. One swarm owns every enemy: the four kinds with
// their own ways of hunting (mites swarm, skitters dart, bulwarks plod,
// spitters keep their distance and spit), the named elites of bells 3, 6
// and 9, and the Hollow Husk itself, with its three phases. The game asks
// the swarm to spawn and to step; killing is the weapons' work, done
// through hurt().

import { WORLD, ENEMIES, ELITE, BOSS, bellHpScale, bellSpeedScale } from './config.js';

let nextId = 1;

export class BlightSwarm {
  constructor(rng) {
    this.rng = rng;
    this.enemies = [];
    this.globs = [];
    this.boss = null;
  }

  get count() {
    return this.enemies.length;
  }

  /** Spawn a blight of `kind` on a ring around the player, inside the hedge. */
  spawn(kind, bell, player, eliteName = null) {
    const base = ENEMIES[kind];
    const angle = this.rng.range(0, Math.PI * 2);
    const dist = this.rng.range(680, 900);
    const x = Math.max(70, Math.min(WORLD.width - 70, player.x + Math.cos(angle) * dist));
    const y = Math.max(70, Math.min(WORLD.height - 70, player.y + Math.sin(angle) * dist));
    const hpScale = bellHpScale(bell) * (eliteName ? ELITE.hpScale : 1);
    const enemy = {
      id: nextId++,
      kind,
      x, y,
      vx: 0, vy: 0,
      radius: base.radius * (eliteName ? ELITE.radiusScale : 1),
      hp: base.hp * hpScale,
      maxHp: base.hp * hpScale,
      speed: base.speed * bellSpeedScale(bell) * this.rng.range(0.9, 1.1),
      damage: base.damage * (eliteName ? ELITE.damageScale : 1),
      score: eliteName ? ELITE.score : base.score,
      xp: eliteName ? ELITE.xp : base.xp,
      colour: base.colour,
      elite: eliteName !== null,
      name: eliteName,
      flash: 0,
      wobble: this.rng.range(0, Math.PI * 2),
      attackCooldown: this.rng.range(0.2, 0.7),
      spitTimer: this.rng.range(1.2, 2.6),
      orbitHitAt: new Map(),
    };
    this.enemies.push(enemy);
    return enemy;
  }

  spawnBoss(player) {
    const enemy = {
      id: nextId++,
      kind: 'husk',
      x: Math.max(200, Math.min(WORLD.width - 200, player.x + 620)),
      y: Math.max(200, Math.min(WORLD.height - 200, player.y - 420)),
      vx: 0, vy: 0,
      radius: BOSS.radius,
      hp: BOSS.hp,
      maxHp: BOSS.hp,
      speed: BOSS.speed,
      damage: BOSS.damage,
      score: BOSS.score,
      xp: BOSS.xp,
      colour: BOSS.colour,
      elite: true,
      name: BOSS.name,
      flash: 0,
      wobble: 0,
      attackCooldown: 1,
      spitTimer: 2,
      phase: 1,
      chargeState: 'stalk', // stalk | warn | charge | rest
      chargeTimer: 3.5,
      chargeDx: 0,
      chargeDy: 0,
      burstTimer: 4,
      summonTimer: 6,
      orbitHitAt: new Map(),
    };
    this.enemies.push(enemy);
    this.boss = enemy;
    return enemy;
  }

  /** Damage an enemy; knockback unless it is too heavy. Returns true if it died. */
  hurt(enemy, amount, angle = 0, knock = 0) {
    enemy.hp -= amount;
    enemy.flash = 0.09;
    const resist = enemy.kind === 'husk' ? 0.02 : enemy.kind === 'bulwark' ? 0.25 : enemy.elite ? 0.4 : 1;
    enemy.vx += Math.cos(angle) * knock * resist;
    enemy.vy += Math.sin(angle) * knock * resist;
    return enemy.hp <= 0;
  }

  remove(enemy) {
    const i = this.enemies.indexOf(enemy);
    if (i >= 0) this.enemies.splice(i, 1);
    if (this.boss === enemy) this.boss = null;
  }

  /** The nearest living enemy to a point, or null. */
  nearest(x, y, maxDist = Infinity) {
    let best = null;
    let bestSq = maxDist * maxDist;
    for (const e of this.enemies) {
      const dx = e.x - x;
      const dy = e.y - y;
      const sq = dx * dx + dy * dy;
      if (sq < bestSq) {
        bestSq = sq;
        best = e;
      }
    }
    return best;
  }

  update(dt, player, fx, audio, onBossEvent) {
    const enemies = this.enemies;
    // Light separation so the swarm reads as bodies, not a single blob: a
    // uniform grid keeps it cheap even at the tenth bell's thickest swarm.
    const cell = 64;
    const grid = new Map();
    for (let i = 0; i < enemies.length; i += 1) {
      const e = enemies[i];
      const key = ((e.x / cell) | 0) + ((e.y / cell) | 0) * 8192;
      let bucket = grid.get(key);
      if (!bucket) {
        bucket = [];
        grid.set(key, bucket);
      }
      bucket.push(i);
    }
    for (let i = 0; i < enemies.length; i += 1) {
      const a = enemies[i];
      if (a.kind === 'husk') continue;
      const cx = (a.x / cell) | 0;
      const cy = (a.y / cell) | 0;
      for (let gx = cx - 1; gx <= cx + 1; gx += 1) {
        for (let gy = cy - 1; gy <= cy + 1; gy += 1) {
          const bucket = grid.get(gx + gy * 8192);
          if (!bucket) continue;
          for (const j of bucket) {
            if (j === i) continue;
            const b = enemies[j];
            const dx = a.x - b.x;
            const dy = a.y - b.y;
            const min = (a.radius + b.radius) * 0.82;
            const sq = dx * dx + dy * dy;
            if (sq > 0.01 && sq < min * min) {
              const dist = Math.sqrt(sq);
              const push = ((min - dist) / dist) * 26 * dt;
              a.x += dx * push;
              a.y += dy * push;
            }
          }
        }
      }
    }

    for (const e of enemies) {
      e.flash = Math.max(0, e.flash - dt);
      e.age = (e.age || 0) + dt;
      e.attackCooldown = Math.max(0, e.attackCooldown - dt);
      const dx = player.x - e.x;
      const dy = player.y - e.y;
      const dist = Math.hypot(dx, dy) || 1;
      const ux = dx / dist;
      const uy = dy / dist;
      let moveX = ux;
      let moveY = uy;
      let speed = e.speed;

      if (e.kind === 'skitter') {
        const sway = Math.sin(e.wobble + e.age * 6) * 0.7;
        moveX = ux - uy * sway;
        moveY = uy + ux * sway;
      } else if (e.kind === 'spitter') {
        if (dist < 230) {
          moveX = -ux;
          moveY = -uy;
        } else if (dist < 300) {
          moveX = -uy * 0.4;
          moveY = ux * 0.4;
        }
        e.spitTimer -= dt;
        if (e.spitTimer <= 0 && dist < 430) {
          e.spitTimer = 2.6;
          this.globs.push({ x: e.x, y: e.y, vx: ux * 200, vy: uy * 200, radius: 6, damage: 10, life: 2.6 });
          fx.burst(e.x + ux * 14, e.y + uy * 14, e.colour, 3, 60, 2.4);
        }
      } else if (e.kind === 'husk') {
        this.updateBoss(e, dt, player, ux, uy, dist, onBossEvent);
        if (e.chargeState === 'charge' || e.chargeState === 'warn') {
          moveX = 0;
          moveY = 0;
        } else if (e.chargeState === 'rest') {
          moveX *= 0.3;
          moveY *= 0.3;
        }
      }

      // Glide toward the heading's speed — an exponential approach, so the
      // blight moves at its tuned pace at any frame rate.
      const blend = Math.min(1, 6 * dt);
      e.vx += (moveX * speed - e.vx) * blend;
      e.vy += (moveY * speed - e.vy) * blend;
      // During a charge the boss moves on its own velocity alone.
      if (e.kind === 'husk' && (e.chargeState === 'charge')) {
        e.x += e.chargeDx * dt;
        e.y += e.chargeDy * dt;
      } else {
        e.x += e.vx * dt;
        e.y += e.vy * dt;
      }
      e.x = Math.max(50 + e.radius * 0.4, Math.min(WORLD.width - 50 - e.radius * 0.4, e.x));
      e.y = Math.max(50 + e.radius * 0.4, Math.min(WORLD.height - 50 - e.radius * 0.4, e.y));
    }

    // Spitter globs fly and fade.
    for (let i = this.globs.length - 1; i >= 0; i -= 1) {
      const g = this.globs[i];
      g.x += g.vx * dt;
      g.y += g.vy * dt;
      g.life -= dt;
      if (g.life <= 0) this.globs.splice(i, 1);
    }
    void audio;
  }

  updateBoss(e, dt, player, ux, uy, dist, onBossEvent) {
    const frac = e.hp / e.maxHp;
    const phase = frac > 0.66 ? 1 : frac > 0.33 ? 2 : 3;
    if (phase !== e.phase) {
      e.phase = phase;
      onBossEvent('phase', e);
    }
    e.burstTimer -= dt;
    e.summonTimer -= dt;
    if (e.phase >= 2 && e.burstTimer <= 0) {
      e.burstTimer = e.phase === 3 ? 3.1 : 4.2;
      for (let i = 0; i < 14; i += 1) {
        const a = (i / 14) * Math.PI * 2 + e.wobble;
        this.globs.push({ x: e.x, y: e.y, vx: Math.cos(a) * 165, vy: Math.sin(a) * 165, radius: 7, damage: 12, life: 3.4 });
      }
      onBossEvent('burst', e);
    }
    if (e.summonTimer <= 0) {
      e.summonTimer = 7.5;
      for (let i = 0; i < 4; i += 1) {
        const a = (i / 4) * Math.PI * 2 + 0.4;
        const mite = this.spawn('mite', 10, player);
        mite.x = e.x + Math.cos(a) * 90;
        mite.y = e.y + Math.sin(a) * 90;
      }
      onBossEvent('summon', e);
    }
    if (e.phase === 3) {
      e.chargeTimer -= dt;
      if (e.chargeState === 'stalk' && e.chargeTimer <= 0) {
        e.chargeState = 'warn';
        e.chargeTimer = 0.7;
        e.chargeDx = ux * 430;
        e.chargeDy = uy * 430;
        onBossEvent('warn', e);
      } else if (e.chargeState === 'warn' && e.chargeTimer <= 0) {
        e.chargeState = 'charge';
        e.chargeTimer = 0.55;
        onBossEvent('charge', e);
      } else if (e.chargeState === 'charge' && e.chargeTimer <= 0) {
        e.chargeState = 'rest';
        e.chargeTimer = 1.1;
      } else if (e.chargeState === 'rest' && e.chargeTimer <= 0) {
        e.chargeState = 'stalk';
        e.chargeTimer = 3.2;
      }
    }
    void dist;
  }

  draw(ctx, time) {
    for (const g of this.globs) {
      ctx.globalAlpha = Math.min(1, g.life);
      ctx.fillStyle = '#e58fc0';
      ctx.beginPath();
      ctx.arc(g.x, g.y, g.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#ffd7ec';
      ctx.beginPath();
      ctx.arc(g.x - 2, g.y - 2, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const e of this.enemies) {
      this.drawEnemy(ctx, e, time);
    }
  }

  drawEnemy(ctx, e, time) {
    ctx.save();
    ctx.translate(e.x, e.y);
    const flash = e.flash > 0;
    const body = flash ? '#ffffff' : e.colour;
    const wob = Math.sin(time * 5 + e.wobble) * 0.06;

    if (e.kind === 'mite' || e.elite && e.kind === 'mite') {
      ctx.rotate(wob);
      ctx.strokeStyle = flash ? '#fff' : '#4a3d66';
      ctx.lineWidth = 3;
      for (let leg = 0; leg < 3; leg += 1) {
        const ly = -e.radius * 0.5 + leg * e.radius * 0.5;
        const kick = Math.sin(time * 10 + e.wobble + leg * 2) * 4;
        ctx.beginPath();
        ctx.moveTo(-e.radius * 0.6, ly);
        ctx.lineTo(-e.radius * 1.25, ly + kick);
        ctx.moveTo(e.radius * 0.6, ly);
        ctx.lineTo(e.radius * 1.25, ly - kick);
        ctx.stroke();
      }
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.ellipse(0, 0, e.radius, e.radius * 0.84, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2c2145';
      ctx.beginPath();
      ctx.ellipse(0, e.radius * 0.3, e.radius * 0.55, e.radius * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffd7ec';
      ctx.beginPath();
      ctx.arc(-e.radius * 0.32, -e.radius * 0.25, 2.4, 0, Math.PI * 2);
      ctx.arc(e.radius * 0.32, -e.radius * 0.25, 2.4, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.kind === 'skitter') {
      const tilt = Math.sin(time * 9 + e.wobble) * 0.3;
      ctx.rotate(tilt);
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.ellipse(0, 0, e.radius * 1.25, e.radius * 0.62, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(240, 235, 210, 0.75)';
      const flap = Math.sin(time * 40 + e.wobble) * 0.5;
      ctx.beginPath();
      ctx.ellipse(-e.radius * 0.4, -e.radius * 0.7, e.radius * 0.62, e.radius * 0.3, -0.6 + flap * 0.3, 0, Math.PI * 2);
      ctx.ellipse(e.radius * 0.4, -e.radius * 0.7, e.radius * 0.62, e.radius * 0.3, 0.6 - flap * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3a2c14';
      ctx.beginPath();
      ctx.arc(e.radius * 0.8, 0, 2.6, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.kind === 'bulwark') {
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(0, 0, e.radius, Math.PI * 0.95, Math.PI * 2.05);
      ctx.quadraticCurveTo(0, e.radius * 0.75, -e.radius, 0);
      ctx.fill();
      ctx.strokeStyle = 'rgba(20, 26, 14, 0.55)';
      ctx.lineWidth = 3;
      const crack = 1 - e.hp / e.maxHp;
      ctx.beginPath();
      ctx.arc(0, 0, e.radius * 0.66, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
      if (crack > 0.35) {
        ctx.beginPath();
        ctx.moveTo(-e.radius * 0.3, -e.radius * 0.5);
        ctx.lineTo(-e.radius * 0.05, -e.radius * 0.1);
        ctx.lineTo(-e.radius * 0.35, e.radius * 0.25);
        ctx.stroke();
      }
      if (crack > 0.7) {
        ctx.beginPath();
        ctx.moveTo(e.radius * 0.4, -e.radius * 0.45);
        ctx.lineTo(e.radius * 0.15, 0);
        ctx.stroke();
      }
      ctx.fillStyle = '#d8e6a0';
      ctx.beginPath();
      ctx.arc(-e.radius * 0.3, e.radius * 0.18, 3, 0, Math.PI * 2);
      ctx.arc(e.radius * 0.3, e.radius * 0.18, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.kind === 'spitter') {
      const pulse = 1 + Math.sin(time * 6 + e.wobble) * 0.07;
      ctx.scale(pulse, pulse);
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#8c4a6e';
      ctx.beginPath();
      ctx.arc(0, 2, e.radius * 0.52, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffe3f1';
      ctx.beginPath();
      ctx.arc(0, 2, e.radius * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#40203a';
      ctx.beginPath();
      ctx.arc(-e.radius * 0.34, -e.radius * 0.4, 2.4, 0, Math.PI * 2);
      ctx.arc(e.radius * 0.34, -e.radius * 0.4, 2.4, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.kind === 'husk') {
      this.drawHusk(ctx, e, time);
    }

    if (e.elite && e.kind !== 'husk') {
      // Thorn crown for the named great blights.
      ctx.strokeStyle = '#e8e3d5';
      ctx.lineWidth = 3;
      for (let s = 0; s < 7; s += 1) {
        const a = (s / 7) * Math.PI * 2 + time * 0.4;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * e.radius * 0.95, Math.sin(a) * e.radius * 0.95);
        ctx.lineTo(Math.cos(a) * e.radius * 1.3, Math.sin(a) * e.radius * 1.3);
        ctx.stroke();
      }
      // Local health bar.
      const w = e.radius * 2;
      ctx.fillStyle = 'rgba(5, 7, 15, 0.7)';
      ctx.fillRect(-w / 2, -e.radius - 16, w, 5);
      ctx.fillStyle = '#e8e3d5';
      ctx.fillRect(-w / 2, -e.radius - 16, w * Math.max(0, e.hp / e.maxHp), 5);
    }
    ctx.restore();
  }

  drawHusk(ctx, e, time) {
    // Telegraph: a red line while the Husk gathers its charge.
    if (e.chargeState === 'warn') {
      ctx.save();
      ctx.rotate(Math.atan2(e.chargeDy, e.chargeDx));
      const grad = ctx.createLinearGradient(0, 0, 700, 0);
      grad.addColorStop(0, 'rgba(255, 80, 90, 0.30)');
      grad.addColorStop(1, 'rgba(255, 80, 90, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, -e.radius * 0.8, 700, e.radius * 1.6);
      ctx.restore();
    }
    const flash = e.flash > 0;
    ctx.fillStyle = flash ? '#ffffff' : '#ddd6c2';
    ctx.beginPath();
    ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
    ctx.fill();
    // Shell plates.
    ctx.strokeStyle = '#8f887a';
    ctx.lineWidth = 4;
    for (let i = 0; i < 5; i += 1) {
      const a = (i / 5) * Math.PI * 2 + 0.5;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * e.radius * 0.45, Math.sin(a) * e.radius * 0.45, e.radius * 0.34, 0, Math.PI * 2);
      ctx.stroke();
    }
    // The hollow core, glowing hotter by phase.
    const coreColours = ['#574a7a', '#b0403f', '#ff5a3c'];
    const core = coreColours[e.phase - 1];
    const pulse = 1 + Math.sin(time * (2 + e.phase)) * 0.08;
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(0, 0, e.radius * 0.34 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0a0c18';
    ctx.beginPath();
    ctx.arc(0, 0, e.radius * 0.16 * pulse, 0, Math.PI * 2);
    ctx.fill();
    // Thorn spikes.
    ctx.strokeStyle = '#e8e3d5';
    ctx.lineWidth = 5;
    for (let s = 0; s < 9; s += 1) {
      const a = (s / 9) * Math.PI * 2 + time * 0.15;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * e.radius * 0.92, Math.sin(a) * e.radius * 0.92);
      ctx.lineTo(Math.cos(a) * e.radius * 1.28, Math.sin(a) * e.radius * 1.28);
      ctx.stroke();
    }
  }
}
