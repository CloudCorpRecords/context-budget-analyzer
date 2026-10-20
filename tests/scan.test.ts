// Independent prototype. Not affiliated with Anthropic.
// Tests for the directory scanner, run against a generated fixture tree.

import { strict as assert } from "node:assert";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";
import { scanDirectory } from "../src/scan.ts";

function makeFixture(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ctx-budget-"));
  fs.mkdirSync(path.join(root, "src"));
  fs.mkdirSync(path.join(root, "node_modules", "dep"), { recursive: true });
  fs.mkdirSync(path.join(root, ".git"));
  fs.writeFileSync(path.join(root, "src", "app.ts"), "const x = 1;\n".repeat(100));
  fs.writeFileSync(path.join(root, "src", "huge.ts"), "x".repeat(10000));
  fs.writeFileSync(path.join(root, "empty.ts"), "");
  fs.writeFileSync(path.join(root, "image.png"), Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x00]));
  fs.writeFileSync(path.join(root, "node_modules", "dep", "lib.js"), "junk".repeat(5000));
  fs.writeFileSync(path.join(root, ".git", "config"), "config-data");
  return root;
}

test("scanner counts real files and skips dirs and binaries", () => {
  const root = makeFixture();
  try {
    const s = scanDirectory(root);
    assert.equal(s.fileCount, 3); // app.ts, huge.ts, empty.ts
    const names = s.entries.map((e) => e.path).sort();
    assert.deepEqual(names, ["empty.ts", "src/app.ts", "src/huge.ts"]);
    assert.ok(s.totalEstTokens > 0);
    // ranking: biggest first
    assert.equal(s.entries[0].path, "src/huge.ts");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("empty files scan as zero tokens", () => {
  const root = makeFixture();
  try {
    const s = scanDirectory(root);
    const empty = s.entries.find((e) => e.path === "empty.ts");
    assert.equal(empty?.estTokens, 0);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("scanner throws on a non directory", () => {
  assert.throws(() => scanDirectory("/definitely/not/a/real/path"), /Not a directory/);
});
