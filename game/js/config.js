// VOID BLOOM — tuning. Every number that shapes a run lives here: the field,
// the ten bells of the night, the blight kinds, the four weapons and the
// grafts the garden can offer. The other modules read this file and nothing
// else needs to know a balance number.

export const VIEW = { width: 1280, height: 720 };
export const WORLD = { width: 2560, height: 1760 };

export const PLAYER = {
  radius: 16,
  baseSpeed: 218,
  baseHp: 100,
  dashSpeed: 640,
  dashSeconds: 0.16,
  dashCooldown: 1.6,
  dashInvulnerable: 0.28,
  pickupRadius: 54,
  contactInvulnerable: 0.45,
};

/** XP needed to grow from `level` to `level + 1`. */
export function xpForLevel(level) {
  return 6 + (level - 1) * 5;
}

// One bell is one wave of the night. `mix` weights the blight kinds that may
// spawn; `elite` names the great blight that roots mid-bell on bells 3, 6, 9;
// bell 10 is the Hollow Husk. Survive bell 10's timer (or fell the Husk) and
// dawn breaks.
export const BELLS = [
  { seconds: 34, spawnEvery: 1.55, mix: { mite: 1.0 } },
  { seconds: 36, spawnEvery: 1.30, mix: { mite: 0.85, skitter: 0.15 } },
  { seconds: 38, spawnEvery: 1.15, mix: { mite: 0.7, skitter: 0.3 }, elite: { kind: 'mite', name: 'GOREMOTHER, THE FIRST MAW' } },
  { seconds: 38, spawnEvery: 1.02, mix: { mite: 0.55, skitter: 0.3, spitter: 0.15 } },
  { seconds: 40, spawnEvery: 0.92, mix: { mite: 0.45, skitter: 0.3, bulwark: 0.1, spitter: 0.15 } },
  { seconds: 40, spawnEvery: 0.84, mix: { mite: 0.4, skitter: 0.3, bulwark: 0.14, spitter: 0.16 }, elite: { kind: 'bulwark', name: 'THE PALE SHEPHERD' } },
  { seconds: 42, spawnEvery: 0.76, mix: { mite: 0.34, skitter: 0.32, bulwark: 0.16, spitter: 0.18 } },
  { seconds: 42, spawnEvery: 0.68, mix: { mite: 0.3, skitter: 0.32, bulwark: 0.18, spitter: 0.2 } },
  { seconds: 44, spawnEvery: 0.62, mix: { mite: 0.26, skitter: 0.32, bulwark: 0.2, spitter: 0.22 }, elite: { kind: 'skitter', name: 'THE THRESHER' } },
  { seconds: 60, spawnEvery: 0.85, mix: { mite: 0.4, skitter: 0.3, bulwark: 0.12, spitter: 0.18 }, boss: true },
];

/** Blight strength grows bell by bell; speed barely, so kiting stays honest. */
export function bellHpScale(bell) {
  return Math.pow(1.22, bell - 1);
}
export function bellSpeedScale(bell) {
  return 1 + (bell - 1) * 0.016;
}

export const ENEMIES = {
  mite: { radius: 14, hp: 7, speed: 57, damage: 8, score: 10, xp: 1, colour: '#9d8bd0' },
  skitter: { radius: 10, hp: 4, speed: 112, damage: 5, score: 15, xp: 1, colour: '#c2b280' },
  bulwark: { radius: 25, hp: 46, speed: 31, damage: 14, score: 30, xp: 3, colour: '#7d8c5c' },
  spitter: { radius: 13, hp: 10, speed: 50, damage: 6, score: 25, xp: 2, colour: '#d08bb0' },
};

export const ELITE = { radiusScale: 2.4, hpScale: 34, damageScale: 1.6, score: 400, xp: 12 };
export const BOSS = {
  name: 'THE HOLLOW HUSK',
  radius: 56,
  hp: 2400,
  speed: 40,
  damage: 22,
  score: 5000,
  xp: 30,
  colour: '#e8e3d5',
};

// Weapons by id. `levels` is the stat line per level (index 0 = level 1);
// the arsenal reads the row for the level it owns.
export const WEAPONS = {
  petals: {
    name: 'Petal Fan',
    blurb: 'A fan of glowing petals toward your aim.',
    levels: [
      { damage: 5, count: 3, cooldown: 0.52, speed: 520, spread: 0.34 },
      { damage: 6, count: 4, cooldown: 0.48, speed: 540, spread: 0.38 },
      { damage: 8, count: 5, cooldown: 0.44, speed: 560, spread: 0.42 },
      { damage: 10, count: 6, cooldown: 0.40, speed: 580, spread: 0.46 },
      { damage: 13, count: 8, cooldown: 0.36, speed: 620, spread: 0.52 },
    ],
  },
  orbit: {
    name: 'Thorn Orbit',
    blurb: 'Thorns circle you and shred what touches them.',
    levels: [
      { damage: 6, count: 2, radius: 74, spin: 2.6 },
      { damage: 8, count: 3, radius: 80, spin: 2.8 },
      { damage: 10, count: 3, radius: 88, spin: 3.0 },
      { damage: 13, count: 4, radius: 94, spin: 3.2 },
      { damage: 17, count: 5, radius: 102, spin: 3.5 },
    ],
  },
  nova: {
    name: 'Nova Bloom',
    blurb: 'Every few breaths you burst in a ring of light.',
    levels: [
      { damage: 12, cooldown: 3.4, radius: 130 },
      { damage: 17, cooldown: 3.1, radius: 142 },
      { damage: 24, cooldown: 2.8, radius: 154 },
      { damage: 33, cooldown: 2.5, radius: 168 },
      { damage: 45, cooldown: 2.2, radius: 184 },
    ],
  },
  wisps: {
    name: 'Wisp Seekers',
    blurb: 'Pale wisps hunt the blight on their own.',
    levels: [
      { damage: 7, count: 1, cooldown: 1.15, speed: 430 },
      { damage: 9, count: 2, cooldown: 1.05, speed: 450 },
      { damage: 12, count: 2, cooldown: 0.95, speed: 470 },
      { damage: 15, count: 3, cooldown: 0.85, speed: 490 },
      { damage: 19, count: 4, cooldown: 0.75, speed: 520 },
    ],
  },
};

export const CHAIN_WINDOW = 2.6;
export const CHAIN_PER_TIER = 8;

export const COLOURS = {
  night: '#0b1026',
  nightDeep: '#070a1a',
  pollen: '#6ef2d8',
  petal: '#ff5da2',
  amber: '#ffc857',
  wisp: '#bfe9ff',
  thorn: '#a7e07f',
  heart: '#ff6b81',
  ink: '#e9ecf5',
  dim: '#8b93b8',
  blight: '#584a7a',
};
