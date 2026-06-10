// Tiny "did you mean" helper shared by flag and model-name error paths.

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const curr = [i, ...new Array<number>(n)];
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1]! + 1, prev[j]! + 1, prev[j - 1]! + cost);
    }
    prev = curr;
  }
  return prev[n]!;
}

// Return the closest candidate within a small edit distance, or undefined
// when nothing is plausibly a typo. Threshold scales with input length so
// short names don't match wildly ("x" → "3d") but long ones tolerate more.
export function closest(input: string, candidates: string[]): string | undefined {
  const maxDist = input.length <= 4 ? 1 : input.length <= 8 ? 2 : 3;
  let best: string | undefined;
  let bestDist = maxDist + 1;
  for (const c of candidates) {
    const d = levenshtein(input.toLowerCase(), c.toLowerCase());
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return best;
}
