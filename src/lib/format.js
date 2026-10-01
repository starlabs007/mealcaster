const FRACTIONS = [
  [0, ''],
  [1 / 4, '1/4'],
  [1 / 3, '1/3'],
  [1 / 2, '1/2'],
  [2 / 3, '2/3'],
  [3 / 4, '3/4'],
  [1, ''],
];

/** 0.5 → "1/2", 3.5 → "3 1/2", 2.4 → "2.4" */
export function formatQty(n) {
  const whole = Math.floor(n);
  const frac = n - whole;
  const match = FRACTIONS.find(([v]) => Math.abs(frac - v) < 0.04);
  if (!match) return String(Math.round(n * 10) / 10);
  const w = match[0] === 1 ? whole + 1 : whole;
  return [w || '', match[1]].filter(Boolean).join(' ') || '0';
}
