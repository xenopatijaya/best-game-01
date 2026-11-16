// VOID BLOOM — the HUD. Everything the player reads at a glance, drawn over
// the world: the heart-root and her growth on the left, the bell and the
// night's progress across the top, score and the BLOOM CHAIN on the right,
// the Husk's great bar at the bottom when it roots, and the bell banners
// that announce the night as it turns.

import { VIEW, BELLS, COLOURS, xpForLevel } from './config.js';

function bar(ctx, x, y, w, h, frac, fill, back = 'rgba(8, 10, 24, 0.72)') {
  ctx.fillStyle = back;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, Math.max(0, Math.min(1, frac)) * w, h);
  ctx.strokeStyle = 'rgba(233, 236, 245, 0.25)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

function label(ctx, text, x, y, size = 12, colour = COLOURS.dim, align = 'left') {
  ctx.fillStyle = colour;
  ctx.font = `bold ${size}px Georgia, serif`;
  ctx.textAlign = align;
  ctx.fillText(text, x, y);
}

export function drawHUD(ctx, game, muted) {
  const player = game.player;
  const pad = 22;

  // Heart-root, top left.
  label(ctx, 'HEART-ROOT', pad, 30, 12);
  bar(ctx, pad, 38, 240, 15, player.hp / player.maxHp, player.hp / player.maxHp > 0.3 ? COLOURS.heart : '#ff3b30');
  label(ctx, `${Math.max(0, Math.ceil(player.hp))} / ${player.maxHp}`, pad + 248, 51, 13, COLOURS.ink);
  // Growth: level and pollen.
  label(ctx, `LEVEL ${player.level}`, pad, 78, 12, COLOURS.pollen);
  bar(ctx, pad, 84, 240, 7, player.xp / xpForLevel(player.level), COLOURS.pollen);
  // Her grafts, as a quiet row of names.
  const owned = [];
  for (const [id, lvl] of game.arsenal.owned) owned.push(`${id.toUpperCase()} ${lvl}`);
  label(ctx, owned.join('  ·  '), pad, 112, 11, COLOURS.dim);

  // The bell and the night, top centre.
  label(ctx, `BELL ${['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][game.bellIndex]} OF X`, VIEW.width / 2, 30, 15, COLOURS.ink, 'center');
  const nightW = 340;
  const nightX = VIEW.width / 2 - nightW / 2;
  bar(ctx, nightX, 40, nightW, 8, game.nightFrac, COLOURS.amber);
  for (let i = 1; i < BELLS.length; i += 1) {
    const x = nightX + (nightW * i) / BELLS.length;
    ctx.fillStyle = 'rgba(5, 7, 15, 0.8)';
    ctx.fillRect(x - 1, 40, 2, 8);
  }
  label(ctx, game.bellIndex === BELLS.length - 1 ? 'DAWN AFTER THIS BELL' : `${Math.ceil(game.bellTimer)}s TO THE NEXT BELL`, VIEW.width / 2, 66, 11, COLOURS.dim, 'center');
  // The moon, travelling the bar.
  const moonX = nightX + nightW * game.nightFrac;
  ctx.fillStyle = '#f4ead0';
  ctx.beginPath();
  ctx.arc(moonX, 44, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLOURS.night;
  ctx.beginPath();
  ctx.arc(moonX + 2.5, 42, 5, 0, Math.PI * 2);
  ctx.fill();

  // Score and chain, top right.
  label(ctx, 'SCORE', VIEW.width - pad, 30, 12, COLOURS.dim, 'right');
  label(ctx, `${game.score.toLocaleString('en-US')}`, VIEW.width - pad, 56, 26, COLOURS.ink, 'right');
  label(ctx, `BEST ${Math.max(game.best, game.score).toLocaleString('en-US')}`, VIEW.width - pad, 76, 11, COLOURS.dim, 'right');
  if (game.chain.count > 0) {
    const mult = game.chainMultiplier;
    label(ctx, `BLOOM CHAIN ×${mult}`, VIEW.width - pad, 104, 16, mult >= 5 ? COLOURS.amber : COLOURS.petal, 'right');
    bar(ctx, VIEW.width - pad - 130, 110, 130, 5, game.chain.timer / 2.6, COLOURS.petal);
  }

  // Controls whisper, bottom left; sound state, bottom right.
  label(ctx, 'WASD move · mouse aim · SPACE dash · P pause · M sound', pad, VIEW.height - 16, 11, 'rgba(139, 147, 184, 0.8)');
  if (muted) label(ctx, 'SOUND OFF', VIEW.width - pad, VIEW.height - 16, 11, COLOURS.amber, 'right');

  // The Husk's bar, bottom centre.
  const boss = game.swarm.boss;
  if (boss) {
    const w = 520;
    const x = VIEW.width / 2 - w / 2;
    const y = VIEW.height - 52;
    label(ctx, `THE HOLLOW HUSK — PHASE ${boss.phase}`, VIEW.width / 2, y - 8, 13, '#e8e3d5', 'center');
    bar(ctx, x, y, w, 12, boss.hp / boss.maxHp, '#e8e3d5');
  }

  drawBanner(ctx, game);
}

/** The great centre announcements: bells, elites, the Husk, its cracking. */
export function drawBanner(ctx, game) {
  const banner = game.banner;
  if (!banner) return;
  const fade = Math.min(1, banner.timer / 0.5, (banner.max - banner.timer) / 0.35 + 0.001);
  const alpha = Math.max(0, Math.min(1, fade));
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign = 'center';
  ctx.fillStyle = COLOURS.ink;
  ctx.font = 'bold 44px Georgia, serif';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
  ctx.shadowBlur = 18;
  ctx.fillText(banner.title, VIEW.width / 2, 168);
  if (banner.sub) {
    ctx.font = 'italic 19px Georgia, serif';
    ctx.fillStyle = COLOURS.amber;
    ctx.fillText(banner.sub, VIEW.width / 2, 202);
  }
  ctx.restore();
}
