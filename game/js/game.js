// VOID BLOOM — the game itself. This module owns a run: the ten bells and
// their spawning, the BLOOM CHAIN, pollen and growth, the draft, the boss
// events, and every collision between light and blight. The other modules
// own the pieces; this one owns the night.

import { BELLS, CHAIN_WINDOW, CHAIN_PER_TIER, COLOURS } from './config.js';
import { makeRng } from './random.js';
import { Bloomkeeper } from './player.js';
import { BlightSwarm } from './enemies.js';
import { Arsenal } from './weapons.js';
import { ParticleField, MoteField } from './particles.js';
import { Camera, generateGarden, drawGarden, drawFireflies } from './world.js';
import { rollDraft, graftById } from './grafts.js';

export const SCREEN = {
  TITLE: 'title',
  PLAY: 'play',
  DRAFT: 'draft',
  PAUSE: 'pause',
  OVER: 'over',
  DAWN: 'dawn',
};

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

export class Game {
  constructor(audio) {
    this.audio = audio;
    this.screen = SCREEN.TITLE;
    this.best = 0;
    this.time = 0;
    this.reset(1);
  }

  reset(seed) {
    this.seed = seed;
    this.rng = makeRng(seed * 7919 + 13);
    this.decor = generateGarden(this.rng);
    this.camera = new Camera();
    this.player = new Bloomkeeper();
    this.swarm = new BlightSwarm(this.rng);
    this.arsenal = new Arsenal();
    this.fx = new ParticleField();
    this.motes = new MoteField();
    this.graftLevels = new Map();
    this.bonuses = { damageMul: 1, xpMul: 1 };
    this.xpCarry = 0;
    this.score = 0;
    this.kills = 0;
    this.chain = { count: 0, timer: 0, best: 0 };
    this.bellIndex = 0;
    this.bellTimer = BELLS[0].seconds;
    this.spawnTimer = 0.8;
    this.eliteSpawned = false;
    this.bossSpawned = false;
    this.huskFelled = false;
    this.pendingDawn = 0;
    this.draft = null;
    this.banner = null;
    this.pickupStep = 0;
    this.lastHitSound = 0;
    this.elapsed = 0;
  }

  startRun(seed) {
    this.reset(seed);
    this.screen = SCREEN.PLAY;
    this.showBanner(`BELL ${ROMAN[0]}`, 'the blight comes to the garden');
    this.audio.bell();
    this.audio.startMusic();
  }

  get bell() {
    return this.bellIndex + 1;
  }

  get chainTier() {
    return Math.min(8, Math.floor(this.chain.count / CHAIN_PER_TIER));
  }

  get chainMultiplier() {
    return 1 + this.chainTier;
  }

  /** Fraction of the night gone, 0 at dusk to 1 at dawn. */
  get nightFrac() {
    let total = 0;
    let done = 0;
    for (let i = 0; i < BELLS.length; i += 1) {
      total += BELLS[i].seconds;
      if (i < this.bellIndex) done += BELLS[i].seconds;
      else if (i === this.bellIndex) done += BELLS[i].seconds - this.bellTimer;
    }
    return done / total;
  }

  showBanner(title, sub = '', seconds = 2.6) {
    this.banner = { title, sub, timer: seconds, max: seconds };
  }

  // ---- the run ------------------------------------------------------------

  stepRun(dt, controls) {
    this.elapsed += dt;
    const player = this.player;

    player.update(dt, controls.move, controls.aim, controls.dash);
    if (controls.dash && player.dashTime > 0) this.audio.dash();
    if (player.dashTime > 0) {
      this.fx.trail(player.x, player.y, 'rgba(110, 242, 216, 0.35)', 9);
    }

    this.stepBells(dt);
    this.swarm.update(dt, player, this.fx, this.audio, (kind, boss) => this.onBossEvent(kind, boss));
    this.arsenal.update(dt, player, this.swarm, this.fx, this.audio, (e, dmg, angle, knock, src) => this.onDamage(e, dmg, angle, knock, src));
    this.stepContact(dt);
    this.stepMotes(dt);
    this.fx.update(dt);

    if (this.chain.timer > 0) {
      this.chain.timer -= dt;
      if (this.chain.timer <= 0) this.chain.count = 0;
    }
    if (this.banner) {
      this.banner.timer -= dt;
      if (this.banner.timer <= 0) this.banner = null;
    }
    if (this.pendingDawn > 0) {
      this.pendingDawn -= dt;
      if (this.pendingDawn <= 0) this.dawnBreaks();
    }
    this.camera.follow(player, dt);

    if (player.pendingDrafts > 0 && this.screen === SCREEN.PLAY && this.pendingDawn <= 0) {
      this.openDraft();
    }
  }

  stepBells(dt) {
    const bell = BELLS[this.bellIndex];
    this.bellTimer -= dt;

    if (bell.boss && !this.bossSpawned) {
      this.bossSpawned = true;
      this.swarm.spawnBoss(this.player);
      this.showBanner('THE HOLLOW HUSK', 'fell it, or outlast it — dawn is one bell away', 3.6);
      this.audio.boss();
      this.camera.jolt(8);
    }
    if (bell.elite && !this.eliteSpawned && this.bellTimer < bell.seconds * 0.55) {
      this.eliteSpawned = true;
      this.swarm.spawn(bell.elite.kind, this.bell, this.player, bell.elite.name);
      this.showBanner(bell.elite.name, 'a great blight roots in the garden', 3);
      this.audio.boss();
    }

    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && this.swarm.count < 240) {
      this.spawnTimer = bell.spawnEvery * this.rng.range(0.75, 1.25);
      const kind = this.rng.pickWeighted(bell.mix);
      this.swarm.spawn(kind, this.bell, this.player);
    }

    if (this.bellTimer <= 0) {
      if (this.bellIndex >= BELLS.length - 1) {
        this.dawnBreaks();
        return;
      }
      this.bellIndex += 1;
      this.bellTimer = BELLS[this.bellIndex].seconds;
      this.spawnTimer = 1.2;
      this.eliteSpawned = false;
      this.showBanner(`BELL ${ROMAN[this.bellIndex]}`, this.bellIndex === BELLS.length - 1 ? 'the last bell — dawn is close' : 'the night deepens');
      this.audio.bell();
    }
  }

  stepContact(dt) {
    const player = this.player;
    for (const e of this.swarm.enemies) {
      const dx = player.x - e.x;
      const dy = player.y - e.y;
      const rr = e.radius + player.radius;
      if (dx * dx + dy * dy >= rr * rr) continue;
      if (e.attackCooldown > 0) continue;
      e.attackCooldown = 0.85;
      if (player.hurt(e.damage)) {
        this.audio.hurt();
        this.camera.jolt(7);
        this.fx.burst(player.x, player.y, COLOURS.heart, 12, 190, 3.4);
        this.chain.count = 0;
        this.chain.timer = 0;
        if (player.dead) {
          this.withered();
          return;
        }
      }
    }
    // Spitter globs.
    for (let i = this.swarm.globs.length - 1; i >= 0; i -= 1) {
      const g = this.swarm.globs[i];
      const dx = player.x - g.x;
      const dy = player.y - g.y;
      const rr = g.radius + player.radius;
      if (dx * dx + dy * dy >= rr * rr) continue;
      this.swarm.globs.splice(i, 1);
      if (player.hurt(g.damage)) {
        this.audio.hurt();
        this.camera.jolt(5);
        this.fx.burst(player.x, player.y, '#e58fc0', 8, 150, 3);
        if (player.dead) {
          this.withered();
          return;
        }
      }
    }
    void dt;
  }

  stepMotes(dt) {
    const gathered = this.motes.update(dt, this.player);
    if (gathered > 0) {
      this.pickupStep += gathered;
      this.audio.pickup(this.pickupStep);
      this.xpCarry += gathered * this.bonuses.xpMul;
      const whole = Math.floor(this.xpCarry);
      if (whole > 0) {
        this.xpCarry -= whole;
        const owedBefore = this.player.pendingDrafts;
        this.player.gainXp(whole);
        if (this.player.pendingDrafts > owedBefore) this.audio.levelup();
      }
    }
    void dt;
  }

  onDamage(enemy, amount, angle, knock, source) {
    const dealt = amount * this.bonuses.damageMul;
    const died = this.swarm.hurt(enemy, dealt, angle, knock);
    if (this.time - this.lastHitSound > 0.04) {
      this.lastHitSound = this.time;
      this.audio.hit();
    }
    this.fx.burst(enemy.x, enemy.y, enemy.colour, 2, 90, 2.4);
    if (died) this.killEnemy(enemy);
    void source;
  }

  killEnemy(enemy) {
    this.swarm.remove(enemy);
    this.kills += 1;
    this.chain.count += 1;
    this.chain.timer = CHAIN_WINDOW;
    this.chain.best = Math.max(this.chain.best, this.chainMultiplier);
    const gained = enemy.score * this.chainMultiplier;
    this.score += gained;
    this.fx.burst(enemy.x, enemy.y, enemy.colour, enemy.elite ? 30 : 11, enemy.elite ? 260 : 170, 3.6);
    this.fx.floatText(enemy.x, enemy.y - enemy.radius - 6, `+${gained}`, enemy.elite ? COLOURS.amber : COLOURS.ink, enemy.elite ? 21 : 14);
    this.motes.drop(enemy.x, enemy.y, enemy.xp, this.rng);
    this.audio.kill();
    if (enemy.kind === 'husk') {
      this.huskFelled = true;
      this.score += 2500;
      this.showBanner('THE HUSK IS FELLED', 'its light goes out — dawn rushes in', 3);
      this.camera.jolt(12);
      this.pendingDawn = 1.6;
    }
  }

  onBossEvent(kind, boss) {
    if (kind === 'phase') {
      this.showBanner(`THE HUSK CRACKS — PHASE ${boss.phase}`, boss.phase === 3 ? 'it charges now. keep moving.' : 'its core burns hotter', 2.6);
      this.audio.boss();
      this.camera.jolt(6);
    } else if (kind === 'burst') {
      this.fx.ringBurst(boss.x, boss.y, boss.radius + 30, '#e58fc0');
    }
  }

  // ---- growth ---------------------------------------------------------------

  openDraft() {
    const draft = rollDraft(this.graftLevels, this.arsenal, this.rng);
    if (draft.length === 0) {
      // Nothing left to grow into: the garden gives health instead.
      this.player.pendingDrafts = 0;
      this.player.heal(30);
      return;
    }
    this.draft = draft;
    this.screen = SCREEN.DRAFT;
  }

  chooseDraft(index) {
    if (this.screen !== SCREEN.DRAFT || !this.draft) return;
    const graft = this.draft[index];
    if (!graft) return;
    const player = this.player;
    if (graft.kind === 'weapon') {
      this.arsenal.grow(graft.weapon);
    } else {
      this.graftLevels.set(graft.id, (this.graftLevels.get(graft.id) || 0) + 1);
      if (graft.id === 'roots') player.speedMul += 0.08;
      else if (graft.id === 'bark') {
        player.maxHp += 20;
        player.heal(20);
      } else if (graft.id === 'sap') player.regen += 0.6;
      else if (graft.id === 'magnet') player.magnetRadius += 30;
      else if (graft.id === 'heart') this.bonuses.damageMul += 0.12;
      else if (graft.id === 'lantern') this.bonuses.xpMul += 0.15;
    }
    player.pendingDrafts = Math.max(0, player.pendingDrafts - 1);
    this.draft = null;
    this.audio.graft();
    this.fx.ringBurst(player.x, player.y, 90, COLOURS.pollen);
    this.fx.floatText(player.x, player.y - 34, graft.name.toUpperCase(), COLOURS.pollen, 17);
    if (player.pendingDrafts > 0) this.openDraft();
    else this.screen = SCREEN.PLAY;
    void graftById;
  }

  // ---- endings --------------------------------------------------------------

  withered() {
    this.screen = SCREEN.OVER;
    this.best = Math.max(this.best, this.score);
    this.audio.lose();
    this.audio.stopMusic();
    this.fx.burst(this.player.x, this.player.y, COLOURS.petal, 46, 280, 4.2);
  }

  dawnBreaks() {
    if (this.screen === SCREEN.DAWN) return;
    this.screen = SCREEN.DAWN;
    if (!this.huskFelled) this.score += 1000;
    this.best = Math.max(this.best, this.score);
    this.audio.win();
    this.audio.stopMusic();
    this.fx.burst(this.player.x, this.player.y, COLOURS.amber, 60, 320, 4.4);
  }

  // ---- frame ----------------------------------------------------------------

  /** Advance everything by dt. `controls` is only used in PLAY. */
  update(dt, controls) {
    this.time += dt;
    if (this.screen === SCREEN.PLAY) {
      this.stepRun(dt, controls);
    } else if (this.screen === SCREEN.TITLE) {
      this.fx.update(dt);
      this.camera.follow({ x: this.player.x + Math.sin(this.time * 0.11) * 130, y: this.player.y + Math.cos(this.time * 0.09) * 80 }, dt);
    } else {
      this.fx.update(dt);
    }
  }

  /** World-space drawing; HUD and screens are drawn over it by the caller. */
  drawWorld(ctx) {
    const offset = this.camera.offset(this.time);
    ctx.save();
    ctx.translate(offset.x, offset.y);
    drawGarden(ctx, this.decor, this.camera, this.time);
    this.motes.draw(ctx, this.time);
    this.swarm.draw(ctx, this.time);
    this.arsenal.draw(ctx, this.player, this.time);
    if (this.screen !== SCREEN.OVER) this.player.draw(ctx, this.time);
    this.fx.draw(ctx);
    drawFireflies(ctx, this.camera, this.time);
    ctx.restore();

    // Night vignette, and dawn's light when the night is won.
    const vignette = ctx.createRadialGradient(640, 360, 330, 640, 360, 760);
    vignette.addColorStop(0, 'rgba(3, 4, 10, 0)');
    vignette.addColorStop(1, 'rgba(3, 4, 10, 0.5)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, 1280, 720);
    if (this.screen === SCREEN.DAWN) {
      const dawn = ctx.createLinearGradient(0, 720, 0, 0);
      dawn.addColorStop(0, 'rgba(255, 183, 77, 0.20)');
      dawn.addColorStop(0.6, 'rgba(255, 140, 105, 0.06)');
      dawn.addColorStop(1, 'rgba(255, 140, 105, 0)');
      ctx.fillStyle = dawn;
      ctx.fillRect(0, 0, 1280, 720);
    }
  }
}
