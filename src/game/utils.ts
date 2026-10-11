// Small math + RNG helpers used across the engine.

export const clamp = (v: number, min: number, max: number) =>
  v < min ? min : v > max ? max : v;

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// Frame-rate independent exponential smoothing.
export const damp = (a: number, b: number, lambda: number, dt: number) =>
  lerp(a, b, 1 - Math.exp(-lambda * dt));

// Move `current` toward `target` by at most `maxDelta`.
export const moveToward = (current: number, target: number, maxDelta: number) => {
  const d = target - current;
  if (Math.abs(d) <= maxDelta) return target;
  return current + Math.sign(d) * maxDelta;
};

// Deterministic-ish RNG helpers
export const rand = (min: number, max: number) => min + Math.random() * (max - min);
export const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));
export const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
export const chance = (p: number) => Math.random() < p;

// Easing
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeInOutQuad = (t: number) =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

// Format helpers
export const formatScore = (n: number) => Math.floor(n).toLocaleString("en-US");
