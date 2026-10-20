// Independent prototype. Not affiliated with Anthropic.
// Recursive codebase scanner. Skips directories and binary files so the
// report reflects what a coding agent would actually read.

import * as fs from "node:fs";
import * as path from "node:path";
import { estimateTokens } from "./tokenize.ts";
import type { FileEntry, ScanSummary } from "./types.ts";

const SKIP_DIRS = new Set([
  ".git",
  "node_modules",
  ".svn",
  ".hg",
  "dist",
  "build",
  "out",
  ".next",
  ".turbo",
  "__pycache__",
  ".venv",
  "venv",
  "target",
  "vendor",
  ".idea",
  ".vscode",
]);

const BINARY_EXTS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".bmp", ".svg",
  ".pdf", ".zip", ".tar", ".gz", ".exe", ".dll", ".so", ".dylib",
  ".mp4", ".mov", ".mp3", ".wav", ".woff", ".woff2", ".ttf", ".otf",
]);

const MAX_READ_BYTES = 8 * 1024 * 1024; // 8 MB cap per file

function isProbablyBinary(buf: Buffer): boolean {
  // Null bytes are the classic binary marker.
  const sample = buf.subarray(0, Math.min(buf.length, 8192));
  for (let i = 0; i < sample.length; i++) {
    if (sample[i] === 0) return true;
  }
  return false;
}

export interface ScanOptions {
  maxFiles?: number;
}

export function scanDirectory(root: string, opts: ScanOptions = {}): ScanSummary {
  const absRoot = path.resolve(root);
  if (!fs.existsSync(absRoot) || !fs.statSync(absRoot).isDirectory()) {
    throw new Error("Not a directory: " + root);
  }

  const entries: FileEntry[] = [];
  const maxFiles = opts.maxFiles ?? 20000;
  let count = 0;

  function walk(dir: string): void {
    if (count >= maxFiles) return;
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      if (count >= maxFiles) return;
      const full = path.join(dir, item.name);
      if (item.isDirectory()) {
        if (!SKIP_DIRS.has(item.name)) walk(full);
        continue;
      }
      if (!item.isFile()) continue;
      count++;
      const rel = path.relative(absRoot, full).split(path.sep).join("/");
      const ext = path.extname(item.name).toLowerCase();

      const stat = fs.statSync(full);
      if (stat.size === 0) {
        entries.push({ path: rel, bytes: 0, chars: 0, estTokens: 0, ext });
        continue;
      }
      if (BINARY_EXTS.has(ext)) {
        entries.push({
          path: rel, bytes: stat.size, chars: 0, estTokens: 0, ext,
          skippedReason: "binary extension",
        });
        continue;
      }
      const size = Math.min(stat.size, MAX_READ_BYTES);
      const buf = Buffer.alloc(size);
      const fd = fs.openSync(full, "r");
      try {
        fs.readSync(fd, buf, 0, size, 0);
      } finally {
        fs.closeSync(fd);
      }
      if (isProbablyBinary(buf)) {
        entries.push({
          path: rel, bytes: stat.size, chars: 0, estTokens: 0, ext,
          skippedReason: "binary content",
        });
        continue;
      }
      const text = buf.toString("utf8");
      entries.push({
        path: rel,
        bytes: stat.size,
        chars: text.length,
        estTokens: estimateTokens(text),
        ext,
      });
    }
  }

  walk(absRoot);
  const counted = entries.filter((e) => !e.skippedReason);
  const totalEstTokens = counted.reduce((sum, e) => sum + e.estTokens, 0);
  const totalBytes = entries.reduce((sum, e) => sum + e.bytes, 0);
  counted.sort((a, b) => b.estTokens - a.estTokens);

  return {
    root: absRoot,
    fileCount: counted.length,
    totalBytes,
    totalEstTokens,
    entries: counted,
  };
}
