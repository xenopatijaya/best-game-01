// VOID BLOOM — the screenshot scenes behind ?shot=title|action|graft|dawn.
// Each scene starts a fresh run from the given seed and plays the real
// rules forward at a fixed step, steered by a small autopilot (flee the
// swarm, gather pollen, dash when crowded, grow by a fixed set of
// priorities), so a frame is what a real game looks like at that moment —
// and the same seed always grows the same frame.

import { SCREEN } from './game.js';
import { WORLD } from './config.js';

const STEP = 1 / 60;

/** Graft ids in the order the autopilot prefers them when a draft opens. */
export const PRIORITIES = [
  'weapon:orbit',
  'weapon:petals',
  'bark',
  'weapon:nova',
  'heart',
  'sap',
  'weapon:wisps',
  'roots',
  'magnet',
  'lantern',
];

export function pilotControls(game) {
  const player = game.player;
  let fleeX = 0;
  let fleeY = 0;
  let nearX = 0;
  let nearY = 0;
  let nearCount = 0;
  let nearest = null;
  let nearestDist = Infinity;
  for (const e of game.swarm.enemies) {
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const dist = Math.hypot(dx, dy) || 1;
    if (dist < nearestDist) {
      nearestDist = dist;
      nearest = e;
    }
    if (dist < 200) {
      nearX += e.x;
      nearY += e.y;
      nearCount += 1;
    }
    if (dist < 400) {
      const w = (1 - dist / 400) ** 2 * (e.elite ? 4 : 1) * (e.kind === 'bulwark' ? 1.3 : 1);
      fleeX += (dx / dist) * w;
      fleeY += (dy / dist) * w;
    }
  }
  let moveX = fleeX;
  let moveY = fleeY;
  // Escape the local centroid outright — a ring of foes cancels a repulsion
  // sum, but it never cancels the direction away from their middle.
  if (nearCount > 0) {
    const cx = nearX / nearCount - player.x;
    const cy = nearY / nearCount - player.y;
    const cd = Math.hypot(cx, cy) || 1;
    const urgency = Math.max(0, 1 - nearestDist / 190);
    moveX += (-cx / cd) * urgency * 1.6;
    moveY += (-cy / cd) * urgency * 1.6;
  }
  // Pollen, only when nothing is close enough to punish gathering it.
  if (nearestDist > 175 && game.motes.items.length > 0) {
    let mote = null;
    let moteDist = Infinity;
    for (const m of game.motes.items) {
      const d = Math.hypot(m.x - player.x, m.y - player.y);
      if (d < moteDist) {
        moteDist = d;
        mote = m;
      }
    }
    if (mote && moteDist < 560) {
      moveX += ((mote.x - player.x) / (moteDist || 1)) * 0.8;
      moveY += ((mote.y - player.y) / (moteDist || 1)) * 0.8;
    }
  }
  // Sidestep spitter globs already in flight.
  for (const g of game.swarm.globs) {
    const dx = player.x - g.x;
    const dy = player.y - g.y;
    const d = Math.hypot(dx, dy);
    if (d < 120 && d > 0.01) {
      const w = (1 - d / 120) * 1.8;
      moveX += (dx / d) * w;
      moveY += (dy / d) * w;
    }
  }
  // Keep off the hedge — early and firm, so the swarm never pins her there.
  const margin = 340;
  if (player.x < margin) moveX += ((margin - player.x) / margin) ** 2 * 3;
  if (player.x > WORLD.width - margin) moveX -= ((margin - (WORLD.width - player.x)) / margin) ** 2 * 3;
  if (player.y < margin) moveY += ((margin - player.y) / margin) ** 2 * 3;
  if (player.y > WORLD.height - margin) moveY -= ((margin - (WORLD.height - player.y)) / margin) ** 2 * 3;

  const aim = nearest ? { x: nearest.x, y: nearest.y } : { x: player.x + Math.cos(player.facing) * 100, y: player.y + Math.sin(player.facing) * 100 };
  return { move: { x: moveX, y: moveY }, aim, dash: nearestDist < 100 };
}

function pilotPick(game) {
  let bestIndex = 0;
  let bestRank = Infinity;
  game.draft.forEach((graft, i) => {
    const rank = PRIORITIES.indexOf(graft.id);
    const r = rank === -1 ? 99 : rank;
    if (r < bestRank) {
      bestRank = r;
      bestIndex = i;
    }
  });
  return bestIndex;
}

/**
 * Play forward under the autopilot. `stopWhen(game)` ends the scene;
 * `leaveDraftOpen` stops the moment the Nth draft opens instead of picking.
 */
export function playForward(game, maxSeconds, { stopWhen = null, leaveDraftOpenAt = 0 } = {}) {
  let draftsSeen = 0;
  const steps = Math.floor(maxSeconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    if (game.screen === SCREEN.DRAFT) {
      draftsSeen += 1;
      if (leaveDraftOpenAt > 0 && draftsSeen >= leaveDraftOpenAt) return draftsSeen;
      game.chooseDraft(pilotPick(game));
      continue;
    }
    if (game.screen !== SCREEN.PLAY) break;
    if (stopWhen && stopWhen(game)) break;
    game.update(STEP, pilotControls(game));
  }
  return draftsSeen;
}

/** Set `game` to the named scene and report the state the frame shows. */
export function stageShot(name, game, seed) {
  if (name === 'action') {
    game.startRun(seed);
    // The cover frame: bell X, the Hollow Husk on screen and in reach, the
    // chain lit — the whole game in one frame. Falls back to late bell X.
    playForward(game, 470, {
      stopWhen: (g) => {
        if (g.elapsed >= 388) return true;
        if (g.bell !== 10 || g.elapsed < 359 || g.chainMultiplier < 3) return false;
        const husk = g.swarm.enemies.find((e) => e.kind === 'husk');
        if (!husk) return false;
        return Math.hypot(husk.x - g.player.x, husk.y - g.player.y) < 330;
      },
    });
  } else if (name === 'graft') {
    game.startRun(seed);
    playForward(game, 420, { leaveDraftOpenAt: 3 });
  } else if (name === 'dawn') {
    game.startRun(seed);
    playForward(game, 780, { stopWhen: (g) => g.screen === SCREEN.DAWN || g.screen === SCREEN.OVER });
  } else {
    game.reset(seed);
    game.screen = SCREEN.TITLE;
    for (let i = 0; i < 240; i += 1) game.update(STEP, null);
  }
  return {
    shot: name,
    screen: game.screen,
    bell: game.bell,
    score: game.score,
    kills: game.kills,
    level: game.player.level,
    hp: Math.ceil(game.player.hp),
    chain: game.chainMultiplier,
  };
}
