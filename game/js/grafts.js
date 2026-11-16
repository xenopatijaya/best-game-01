// VOID BLOOM — grafts. When the Bloomkeeper grows, the garden offers three
// grafts and she keeps one: a new weapon, a stronger weapon, or a deeper
// root. This file is the pool and the draft — what each graft is called,
// how far it grows, what its card promises — while the game itself applies
// the keeping of one.

import { WEAPONS } from './config.js';

function weaponGraft(id) {
  const weapon = WEAPONS[id];
  return {
    id: `weapon:${id}`,
    kind: 'weapon',
    weapon: id,
    name: weapon.name,
    icon: id,
    max: weapon.levels.length,
    describe(current) {
      if (current === 0) return weapon.blurb;
      const now = weapon.levels[current - 1];
      const next = weapon.levels[current];
      const parts = [];
      if (next.damage !== now.damage) parts.push(`damage ${now.damage} → ${next.damage}`);
      if (next.count !== undefined && next.count !== now.count) parts.push(`count ${now.count} → ${next.count}`);
      if (next.cooldown !== undefined && next.cooldown !== now.cooldown) parts.push(`pace ${now.cooldown.toFixed(2)}s → ${next.cooldown.toFixed(2)}s`);
      if (next.radius !== undefined && next.radius !== now.radius) parts.push(`reach ${now.radius} → ${next.radius}`);
      return parts.length ? parts.join(' · ') : weapon.blurb;
    },
  };
}

export const GRAFTS = [
  weaponGraft('petals'),
  weaponGraft('orbit'),
  weaponGraft('nova'),
  weaponGraft('wisps'),
  {
    id: 'roots', kind: 'passive', name: 'Swift Roots', icon: 'roots', max: 5,
    describe: (current) => `Run ${8 * (current + 1)}% faster than the night.`,
  },
  {
    id: 'bark', kind: 'passive', name: 'Thick Bark', icon: 'bark', max: 5,
    describe: () => '+20 heart-root, and mend 20 now.',
  },
  {
    id: 'sap', kind: 'passive', name: 'Sap Flow', icon: 'sap', max: 4,
    describe: (current) => `Regrow ${(0.6 * (current + 1)).toFixed(1)} heart per second.`,
  },
  {
    id: 'magnet', kind: 'passive', name: 'Pollen Magnet', icon: 'magnet', max: 4,
    describe: (current) => `Pollen drifts to you from ${54 + 30 * (current + 1)} paces.`,
  },
  {
    id: 'heart', kind: 'passive', name: 'Bright Heart', icon: 'heart', max: 5,
    describe: (current) => `All your light bites ${12 * (current + 1)}% deeper.`,
  },
  {
    id: 'lantern', kind: 'passive', name: 'Wide Lantern', icon: 'lantern', max: 3,
    describe: (current) => `Gather ${15 * (current + 1)}% more pollen from every kill.`,
  },
];

export function graftById(id) {
  return GRAFTS.find((g) => g.id === id) || null;
}

/**
 * Roll a draft of three grafts she may still grow into. Weapons are a
 * little eager to appear — a new way to fight is the garden's favourite
 * gift — and a draft never offers the same graft twice.
 */
export function rollDraft(levels, arsenal, rng) {
  const open = GRAFTS.filter((g) => {
    if (g.kind === 'weapon') return arsenal.level(g.weapon) < g.max;
    return (levels.get(g.id) || 0) < g.max;
  });
  const pool = [];
  for (const g of open) {
    pool.push(g);
    if (g.kind === 'weapon') pool.push(g);
  }
  const draft = [];
  const used = new Set();
  while (draft.length < 3 && pool.length > 0) {
    const i = Math.floor(rng.next() * pool.length);
    const g = pool[i];
    pool.splice(i, 1);
    if (used.has(g.id)) continue;
    used.add(g.id);
    draft.push(g);
  }
  return draft;
}

/** The level a graft would describe from: weapons read the arsenal, roots read the map. */
export function graftCurrentLevel(graft, levels, arsenal) {
  if (graft.kind === 'weapon') return arsenal.level(graft.weapon);
  return levels.get(graft.id) || 0;
}
