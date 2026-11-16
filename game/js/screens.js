// VOID BLOOM — the screens around the play: the title with its story and
// controls, the graft draft's three cards (their rectangles are exported
// so the mouse and the drawing never disagree), the held-breath pause, and
// the two endings — dawn, or withered — each with the run's whole account
// and its way back in.

import { VIEW, COLOURS } from './config.js';
import { graftCurrentLevel } from './grafts.js';

const CARD = { w: 300, h: 336, gap: 28, y: 218 };

export function draftCardRects() {
  const total = CARD.w * 3 + CARD.gap * 2;
  const x0 = (VIEW.width - total) / 2;
  return [0, 1, 2].map((i) => ({ x: x0 + i * (CARD.w + CARD.gap), y: CARD.y, w: CARD.w, h: CARD.h }));
}

function wrap(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (const word of words) {
    const trial = line ? `${line} ${word}` : word;
    if (ctx.measureText(trial).width > maxWidth && line) {
      ctx.fillText(line, x, yy);
      line = word;
      yy += lineHeight;
    } else {
      line = trial;
    }
  }
  if (line) ctx.fillText(line, x, yy);
  return yy;
}

function dim(ctx, alpha = 0.55) {
  ctx.fillStyle = `rgba(4, 5, 12, ${alpha})`;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
}

function centreText(ctx, text, y, font, colour) {
  ctx.font = font;
  ctx.fillStyle = colour;
  ctx.textAlign = 'center';
  ctx.fillText(text, VIEW.width / 2, y);
}

export function drawTitle(ctx, game, time) {
  dim(ctx, 0.42);
  const pulse = 0.85 + 0.15 * Math.sin(time * 2.2);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(110, 242, 216, 0.55)';
  ctx.shadowBlur = 34 * pulse;
  ctx.fillStyle = COLOURS.ink;
  ctx.font = 'bold 96px Georgia, serif';
  ctx.fillText('VOID BLOOM', VIEW.width / 2, 196);
  ctx.restore();

  centreText(ctx, 'o n e   n i g h t   i n   t h e   b l i g h t   g a r d e n', 240, 'italic 22px Georgia, serif', COLOURS.amber);
  ctx.font = '17px Georgia, serif';
  ctx.fillStyle = COLOURS.ink;
  const story = [
    'You are the last Bloomkeeper. The blight comes in ten bells — mites, skitters,',
    'bulwarks and spitters, a named horror at the third, sixth and ninth bell, and at',
    'the tenth THE HOLLOW HUSK. Outlast the night, or fell the Husk, and dawn breaks.',
    'Let your heart-root empty and you wither where you stand.',
  ];
  story.forEach((line, i) => ctx.fillText(line, VIEW.width / 2, 292 + i * 24));

  ctx.font = '15px Georgia, serif';
  ctx.fillStyle = COLOURS.dim;
  const controls = [
    'WASD / arrows — move        mouse — aim (your light fires on its own)',
    'SPACE / SHIFT — dash through the swarm        P — pause        M — sound',
    'Gather pollen, choose a graft at every growth, chain kills for the BLOOM CHAIN.',
  ];
  controls.forEach((line, i) => ctx.fillText(line, VIEW.width / 2, 424 + i * 23));

  const glow = 0.6 + 0.4 * Math.sin(time * 3);
  ctx.save();
  ctx.globalAlpha = glow;
  centreText(ctx, '—  ENTER  or  CLICK  to take root  —', 540, 'bold 24px Georgia, serif', COLOURS.pollen);
  ctx.restore();

  if (game.best > 0) {
    centreText(ctx, `best night so far: ${game.best.toLocaleString('en-US')}`, 592, '15px Georgia, serif', COLOURS.dim);
  }
  centreText(ctx, 'a complete game in ten bells: grow, draft, survive, dawn', 664, 'italic 14px Georgia, serif', 'rgba(139, 147, 184, 0.75)');
}

function drawIcon(ctx, icon, cx, cy, scale = 1) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.lineWidth = 3;
  if (icon === 'petals') {
    ctx.fillStyle = COLOURS.petal;
    for (let i = -1; i <= 1; i += 1) {
      ctx.save();
      ctx.rotate(i * 0.5);
      ctx.beginPath();
      ctx.ellipse(0, -14, 7, 15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  } else if (icon === 'orbit') {
    ctx.strokeStyle = COLOURS.thorn;
    ctx.beginPath();
    ctx.arc(0, 0, 20, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = COLOURS.thorn;
    for (let i = 0; i < 3; i += 1) {
      const a = (i / 3) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * 20, Math.sin(a) * 20, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (icon === 'nova') {
    ctx.strokeStyle = COLOURS.pollen;
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 7, Math.sin(a) * 7);
      ctx.lineTo(Math.cos(a) * 22, Math.sin(a) * 22);
      ctx.stroke();
    }
    ctx.fillStyle = COLOURS.pollen;
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fill();
  } else if (icon === 'wisps') {
    ctx.fillStyle = COLOURS.wisp;
    ctx.beginPath();
    ctx.arc(-8, -4, 7, 0, Math.PI * 2);
    ctx.arc(10, 6, 5.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-8, -4, 2.6, 0, Math.PI * 2);
    ctx.arc(10, 6, 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (icon === 'roots') {
    ctx.strokeStyle = '#a7e07f';
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(0, 2);
    ctx.moveTo(0, 2);
    ctx.quadraticCurveTo(-12, 10, -14, 20);
    ctx.moveTo(0, 2);
    ctx.quadraticCurveTo(0, 12, -2, 22);
    ctx.moveTo(0, 2);
    ctx.quadraticCurveTo(12, 10, 14, 20);
    ctx.stroke();
  } else if (icon === 'bark') {
    ctx.fillStyle = '#8a6f4d';
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.quadraticCurveTo(18, -16, 18, -2);
    ctx.quadraticCurveTo(18, 14, 0, 24);
    ctx.quadraticCurveTo(-18, 14, -18, -2);
    ctx.quadraticCurveTo(-18, -16, 0, -22);
    ctx.fill();
    ctx.strokeStyle = '#5d4830';
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.lineTo(0, 24);
    ctx.stroke();
  } else if (icon === 'sap') {
    ctx.fillStyle = COLOURS.pollen;
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.quadraticCurveTo(14, -2, 14, 6);
    ctx.quadraticCurveTo(14, 20, 0, 20);
    ctx.quadraticCurveTo(-14, 20, -14, 6);
    ctx.quadraticCurveTo(-14, -2, 0, -22);
    ctx.fill();
  } else if (icon === 'magnet') {
    ctx.strokeStyle = COLOURS.amber;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(0, -2, 15, Math.PI * 0.95, Math.PI * 2.05);
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-15, -2);
    ctx.lineTo(-15, 8);
    ctx.moveTo(15, -2);
    ctx.lineTo(15, 8);
    ctx.stroke();
  } else if (icon === 'heart') {
    ctx.fillStyle = COLOURS.heart;
    ctx.beginPath();
    ctx.moveTo(0, 18);
    ctx.bezierCurveTo(-26, 0, -18, -20, 0, -8);
    ctx.bezierCurveTo(18, -20, 26, 0, 0, 18);
    ctx.fill();
  } else if (icon === 'lantern') {
    ctx.strokeStyle = COLOURS.amber;
    ctx.strokeRect(-11, -16, 22, 32);
    ctx.beginPath();
    ctx.moveTo(-11, -16);
    ctx.lineTo(0, -24);
    ctx.lineTo(11, -16);
    ctx.stroke();
    ctx.fillStyle = COLOURS.amber;
    ctx.beginPath();
    ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawDraft(ctx, game, mouse) {
  dim(ctx, 0.62);
  centreText(ctx, 'THE GARDEN OFFERS A GRAFT', 128, 'bold 34px Georgia, serif', COLOURS.ink);
  centreText(ctx, `growth ${game.player.level} — choose one (keys 1 · 2 · 3, or click)`, 162, 'italic 17px Georgia, serif', COLOURS.amber);
  const rects = draftCardRects();
  game.draft.forEach((graft, i) => {
    const r = rects[i];
    const hover = mouse && mouse.x >= r.x && mouse.x <= r.x + r.w && mouse.y >= r.y && mouse.y <= r.y + r.h;
    const current = graftCurrentLevel(graft, game.graftLevels, game.arsenal);
    ctx.fillStyle = hover ? '#1b2450' : '#121833';
    ctx.strokeStyle = hover ? COLOURS.pollen : 'rgba(110, 242, 216, 0.35)';
    ctx.lineWidth = hover ? 3 : 1.5;
    ctx.beginPath();
    ctx.roundRect(r.x, r.y, r.w, r.h, 14);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'center';
    const tag = graft.kind === 'weapon' ? (current === 0 ? 'NEW WEAPON' : 'WEAPON GROWS') : 'GROWTH';
    ctx.font = 'bold 12px Georgia, serif';
    ctx.fillStyle = graft.kind === 'weapon' ? COLOURS.petal : COLOURS.pollen;
    ctx.fillText(tag, r.x + r.w / 2, r.y + 34);

    drawIcon(ctx, graft.icon, r.x + r.w / 2, r.y + 92, 1.25);

    ctx.font = 'bold 25px Georgia, serif';
    ctx.fillStyle = COLOURS.ink;
    ctx.fillText(graft.name, r.x + r.w / 2, r.y + 152);

    // Level pips: filled to current, the next one lit.
    const pipY = r.y + 178;
    const pipW = 16;
    const totalW = graft.max * pipW + (graft.max - 1) * 6;
    let px = r.x + (r.w - totalW) / 2;
    for (let p = 0; p < graft.max; p += 1) {
      ctx.fillStyle = p < current ? COLOURS.pollen : p === current ? COLOURS.amber : 'rgba(233, 236, 245, 0.18)';
      ctx.beginPath();
      ctx.arc(px + pipW / 2, pipY, 5, 0, Math.PI * 2);
      ctx.fill();
      px += pipW + 6;
    }
    ctx.font = '14px Georgia, serif';
    ctx.fillStyle = COLOURS.dim;
    ctx.fillText(current === 0 ? 'not yet yours' : `level ${current} → ${current + 1} of ${graft.max}`, r.x + r.w / 2, pipY + 26);

    ctx.font = '16px Georgia, serif';
    ctx.fillStyle = COLOURS.ink;
    wrap(ctx, graft.describe(current), r.x + r.w / 2, r.y + 240, r.w - 44, 22);

    ctx.font = 'bold 15px Georgia, serif';
    ctx.fillStyle = hover ? COLOURS.pollen : COLOURS.dim;
    ctx.fillText(`— press ${i + 1} —`, r.x + r.w / 2, r.y + r.h - 22);
  });
}

export function drawPause(ctx) {
  dim(ctx, 0.6);
  centreText(ctx, 'A HELD BREATH', 320, 'bold 44px Georgia, serif', COLOURS.ink);
  centreText(ctx, 'the night waits with you', 356, 'italic 19px Georgia, serif', COLOURS.amber);
  centreText(ctx, 'P or ESC — breathe again        M — sound on/off', 420, '16px Georgia, serif', COLOURS.dim);
}

function statRow(ctx, labelText, value, y) {
  ctx.font = '16px Georgia, serif';
  ctx.fillStyle = COLOURS.dim;
  ctx.textAlign = 'right';
  ctx.fillText(labelText, VIEW.width / 2 - 18, y);
  ctx.font = 'bold 19px Georgia, serif';
  ctx.fillStyle = COLOURS.ink;
  ctx.textAlign = 'left';
  ctx.fillText(value, VIEW.width / 2 + 18, y);
}

export function drawEnd(ctx, game, time) {
  const won = game.screen === 'dawn';
  dim(ctx, won ? 0.34 : 0.58);
  ctx.save();
  ctx.shadowColor = won ? 'rgba(255, 183, 77, 0.6)' : 'rgba(255, 107, 129, 0.5)';
  ctx.shadowBlur = 30;
  centreText(ctx, won ? 'DAWN BREAKS' : 'WITHERED', 178, 'bold 72px Georgia, serif', won ? '#ffd9a0' : '#ffb3c0');
  ctx.restore();
  centreText(
    ctx,
    won
      ? game.huskFelled
        ? 'the Hollow Husk is felled, and the garden blooms again'
        : 'you outlasted the tenth bell — the garden blooms again'
      : `the blight took the garden on bell ${game.bell} of ten`,
    216,
    'italic 19px Georgia, serif',
    COLOURS.amber,
  );

  centreText(ctx, `${game.score.toLocaleString('en-US')}`, 292, 'bold 54px Georgia, serif', COLOURS.ink);
  centreText(ctx, 'SCORE', 318, 'bold 12px Georgia, serif', COLOURS.dim);

  const mins = Math.floor(game.elapsed / 60);
  const secs = Math.floor(game.elapsed % 60).toString().padStart(2, '0');
  statRow(ctx, 'bells survived', `${won ? 10 : game.bell} / 10`, 366);
  statRow(ctx, 'blight felled', `${game.kills}`, 398);
  statRow(ctx, 'growth reached', `level ${game.player.level}`, 430);
  statRow(ctx, 'best bloom chain', `×${Math.max(1, game.chain.best)}`, 462);
  statRow(ctx, 'night lasted', `${mins}:${secs}`, 494);

  const pulse = 0.6 + 0.4 * Math.sin(time * 3);
  ctx.save();
  ctx.globalAlpha = pulse;
  centreText(ctx, '—  R  or  ENTER  —  root again', 574, 'bold 22px Georgia, serif', COLOURS.pollen);
  ctx.restore();
  centreText(ctx, 'every night is a new seed: the garden regrows, the blight returns', 620, 'italic 14px Georgia, serif', 'rgba(139, 147, 184, 0.8)');
}
