// Seeded random numbers for the sample generator. Never Math.random: the same seed must always give the same data.

/** mulberry32: a small, fast 32-bit PRNG. Returns floats in [0, 1). @param {number} seed */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Mixes several numbers into one 32-bit seed, so each recipe gets its own stream. @param {...number} parts */
export function mixSeed(...parts) {
  let h = 0x811c9dc5;
  for (const p of parts) {
    h = Math.imul(h ^ (p >>> 0), 0x01000193);
    h ^= h >>> 13;
  }
  return h >>> 0;
}

/** Helpers over one random stream. @param {number} seed */
export function random(seed) {
  const next = mulberry32(seed);
  const rng = {
    next,
    /** Whole number in [min, max]. */
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    /** True with probability p. */
    chance: (p) => next() < p,
    /** One item of a list. @template T @param {readonly T[]} list @returns {T} */
    pick: (list) => list[Math.floor(next() * list.length)],
    /** A shuffled copy. @template T @param {readonly T[]} list @returns {T[]} */
    shuffle: (list) => {
      const out = [...list];
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    },
    /** `n` different items, in random order. @template T @param {readonly T[]} list @param {number} n @returns {T[]} */
    sample: (list, n) => rng.shuffle(list).slice(0, n),
    /** A whole number of minutes in [min, max], rounded to 5 when above 10. */
    minutes: (min, max) => {
      const m = rng.int(min, max);
      return m > 10 ? Math.max(min, Math.round(m / 5) * 5) : m;
    },
  };
  return rng;
}
