// Independent prototype. Not affiliated with Anthropic.
// Tests for the CLAUDE.md brief generator.

import { strict as assert } from "node:assert";
import { test } from "node:test";
import { generateClaudeMd } from "../src/claudemd.ts";
import { buildReport } from "../src/report.ts";
import type { ScanSummary } from "../src/types.ts";

function fakeSummary(): ScanSummary {
  return {
    root: "/home/user/my-project",
    fileCount: 4,
    totalBytes: 200,
    totalEstTokens: 61000,
    entries: [
      { path: "src/big.ts", bytes: 100, chars: 240000, estTokens: 60000, ext: ".ts" },
      { path: "src/small.ts", bytes: 40, chars: 4000, estTokens: 1000, ext: ".ts" },
      { path: "README.md", bytes: 40, chars: 2000, estTokens: 500, ext: ".md" },
      { path: "package.json", bytes: 20, chars: 800, estTokens: 200, ext: ".json" },
    ],
  };
}

test("brief names the project and warns it is a skeleton", () => {
  const r = buildReport(fakeSummary(), { budget: 200000 });
  const md = generateClaudeMd(r);
  assert.ok(md.includes("# Project: my project"));
  assert.ok(md.includes("skeleton"));
  assert.ok(md.includes("61,000"));
});

test("brief lists entry points and repo map", () => {
  const r = buildReport(fakeSummary(), { budget: 200000 });
  const md = generateClaudeMd(r);
  assert.ok(md.includes("## Repo map"));
  assert.ok(md.includes("`src`"));
  assert.ok(md.includes("## What this project is"));
});

test("brief tells agents to avoid flagged files", () => {
  const r = buildReport(fakeSummary(), { budget: 200000, fileFlagAt: 10000 });
  const md = generateClaudeMd(r);
  assert.ok(md.includes("Do not read `src/big.ts` raw"));
});

test("brief has fill in markers a human must complete", () => {
  const r = buildReport(fakeSummary(), { budget: 200000 });
  const md = generateClaudeMd(r);
  assert.ok(md.includes("<fill in"));
});
