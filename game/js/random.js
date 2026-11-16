// VOID BLOOM — seeded randomness. A run is grown from one seed so the
// screenshot scenes and any replay of a run meet the same garden: mulberry32,
// small and exact, plus the handful of helpers every module reaches for.

export function makeRng(seed) {
  let state = (seed >>> 0) || 1;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    /** Float in [min, max). */
    range: (min, max) => min + next() * (max - min),
    /** Integer in [min, max]. */
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    /** True with probability p. */
    chance: (p) => next() < p,
    /** One key of `weights` ({name: weight}), picked by weight. */
    pickWeighted(weights) {
      let total = 0;
      for (const key in weights) total += weights[key];
      let roll = next() * total;
      for (const key in weights) {
        roll -= weights[key];
        if (roll <= 0) return key;
      }
      return Object.keys(weights)[0];
    },
    /** One element of an array. */
    pick(list) {
      return list[Math.floor(next() * list.length)];
    },
  };
}
