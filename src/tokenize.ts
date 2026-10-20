// Independent prototype. Not affiliated with Anthropic.
// Deterministic token-cost estimator.
//
// This is a heuristic, NOT a tokenizer. It exists so teams can rank files by
// relative cost and spot context hogs without an API call. For code-heavy
// English text, one token per ~4 characters is the standard rough rule, and
// long whitespace-free runs (minified code, base64 blobs) are denser, so the
// estimator blends two signals:
//
//   base   = ceil(chars / 4)
//   dense  = ceil(denseRunChars / 6) ... words with >= 40 chars are dense runs
//   est    = max(base - denseRunChars/4 + ceil(denseRunChars / 6), 0)
//
// The adjustment is deliberately small: it keeps the number an estimate while
// pulling minified bundles slightly down toward the real cost of dense text.
// Do not use this number for billing or exact context-window math.

export interface TokenBreakdown {
  chars: number;
  estTokens: number;
  denseRunChars: number;
}

const DENSE_RUN_LENGTH = 40;

export function findDenseRunChars(text: string): number {
  let dense = 0;
  let run = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") {
      if (run >= DENSE_RUN_LENGTH) dense += run;
      run = 0;
    } else {
      run++;
    }
  }
  if (run >= DENSE_RUN_LENGTH) dense += run;
  return dense;
}

export function estimateTokens(text: string): number {
  if (!text) return 0;
  const chars = text.length;
  const dense = findDenseRunChars(text);
  const normal = chars - dense;
  return Math.ceil(normal / 4) + Math.ceil(dense / 6);
}

export function breakdown(text: string): TokenBreakdown {
  return {
    chars: text.length,
    estTokens: estimateTokens(text),
    denseRunChars: findDenseRunChars(text),
  };
}

// Share of a budget, formatted as a one-decimal percentage string.
export function budgetShare(estTokens: number, budget: number): string {
  if (budget <= 0) return "n/a";
  return ((estTokens / budget) * 100).toFixed(1) + "%";
}
