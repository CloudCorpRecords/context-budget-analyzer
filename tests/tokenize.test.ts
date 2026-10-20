// Independent prototype. Not affiliated with Anthropic.
// Tests for the token estimator. Numbers are checked as exact integers so
// any change to the heuristic breaks loudly on purpose.

import { strict as assert } from "node:assert";
import { test } from "node:test";
import { breakdown, budgetShare, estimateTokens, findDenseRunChars } from "../src/tokenize.ts";

test("empty text costs nothing", () => {
  assert.equal(estimateTokens(""), 0);
  assert.equal(estimateTokens("hello world"), 3); // 11 chars, ceil(11/4)
});

test("estimator follows chars over 4 with ceil", () => {
  assert.equal(estimateTokens("a".repeat(16)), 4);
  assert.equal(estimateTokens("a".repeat(17)), 5);
});

test("long dense runs count cheaper per char", () => {
  const dense = "x".repeat(120);
  const normal = "word ".repeat(24); // 120 chars of spaced words
  assert.ok(estimateTokens(dense) < estimateTokens(normal));
});

test("findDenseRunChars finds whitespace-free runs of 40 plus", () => {
  assert.equal(findDenseRunChars("short words only"), 0);
  assert.equal(findDenseRunChars("y".repeat(39)), 0);
  assert.equal(findDenseRunChars("y".repeat(40)), 40);
  assert.equal(findDenseRunChars("ok " + "z".repeat(50) + " end"), 50);
});

test("breakdown reports all three fields", () => {
  const b = breakdown("hello");
  assert.equal(b.chars, 5);
  assert.equal(b.estTokens, 2);
  assert.equal(b.denseRunChars, 0);
});

test("budgetShare formats a percentage", () => {
  assert.equal(budgetShare(50000, 200000), "25.0%");
  assert.equal(budgetShare(0, 0), "n/a");
});
