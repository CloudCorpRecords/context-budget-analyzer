// Independent prototype. Not affiliated with Anthropic.
// Tests for the report builder and human formatter.

import { strict as assert } from "node:assert";
import { test } from "node:test";
import { buildReport, formatHuman, suggestionList } from "../src/report.ts";
import type { ScanSummary } from "../src/types.ts";

function fakeSummary(): ScanSummary {
  return {
    root: "/repo",
    fileCount: 3,
    totalBytes: 100,
    totalEstTokens: 25000,
    entries: [
      { path: "src/big.ts", bytes: 50, chars: 48000, estTokens: 12000, ext: ".ts" },
      { path: "src/mid.ts", bytes: 30, chars: 40000, estTokens: 10000, ext: ".ts" },
      { path: "src/small.ts", bytes: 20, chars: 12000, estTokens: 3000, ext: ".ts" },
    ],
  };
}

test("flags fire at thresholds", () => {
  const r = buildReport(fakeSummary(), { budget: 200000, fileFlagAt: 10000 });
  const flagged = r.flags.map((f) => f.path);
  assert.ok(flagged.includes("src/big.ts"));
  assert.ok(flagged.includes("src/mid.ts"));
  assert.ok(r.withinBudget);
});

test("over budget totals flag the repo", () => {
  const r = buildReport(fakeSummary(), { budget: 20000 });
  assert.ok(!r.withinBudget);
  assert.ok(r.flags.some((f) => f.kind === "oversize_total"));
});

test("dense single file triggers minified suspect", () => {
  const s = fakeSummary();
  s.entries[0].estTokens = 40000;
  const r = buildReport(s, { fileFlagAt: 10000 });
  assert.ok(r.flags.some((f) => f.kind === "minified_suspect" && f.path === "src/big.ts"));
});

test("human formatter names the top files and flags", () => {
  const r = buildReport(fakeSummary(), { budget: 200000 });
  const text = formatHuman(r);
  assert.ok(text.includes("src/big.ts"));
  assert.ok(text.includes("12,000"));
  assert.ok(text.includes("within budget"));
  const over = buildReport(fakeSummary(), { budget: 20000 });
  assert.ok(formatHuman(over).includes("OVER BUDGET"));
});

test("suggestions are concrete and non empty when flagged", () => {
  const r = buildReport(fakeSummary(), { budget: 20000, fileFlagAt: 10000 });
  const suggestions = suggestionList(r);
  assert.ok(suggestions.length > 0);
  assert.ok(suggestions.every((s2) => s2.length > 10));
});

test("quiet repo produces no flags", () => {
  const s = fakeSummary();
  s.entries.forEach((e) => (e.estTokens = 10));
  s.totalEstTokens = 30;
  const r = buildReport(s, {});
  assert.equal(r.flags.length, 0);
  assert.ok(formatHuman(r).includes("agent-friendly"));
});
