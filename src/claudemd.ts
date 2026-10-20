// Independent prototype. Not affiliated with Anthropic.
// Generates a CLAUDE.md-style project brief skeleton from the scan data.
// The goal: give a coding agent a compact, curated entry point so it does not
// have to discover the repo by reading everything.

import type { ContextReport, ScanSummary } from "./types.ts";

function titleCaseRepo(root: string): string {
  const base = root.split(/[\\/]/).filter(Boolean).pop() ?? "project";
  return base.replace(/[-_]/g, " ");
}

export function generateClaudeMd(report: ContextReport): string {
  const s: ScanSummary = report.summary;
  const lines: string[] = [];

  lines.push("# Project: " + titleCaseRepo(s.root));
  lines.push("");
  lines.push(
    "> Auto-generated brief skeleton from a context-budget scan (" +
    s.fileCount + " readable files, ~" +
    s.totalEstTokens.toLocaleString("en-US") + " estimated tokens). " +
    "Review and edit before sharing with your team: estimates are heuristic, " +
    "and only a human knows what actually matters.",
  );
  lines.push("");

  lines.push("## What this project is");
  lines.push("");
  lines.push("- One-sentence purpose: <fill in>");
  lines.push("- Primary language(s): " + topExtensions(s));
  lines.push("- Entry points a new contributor should read first:");
  for (const e of s.entries.slice(0, 5)) {
    lines.push("  - `" + e.path + "` (~" + e.estTokens.toLocaleString("en-US") + " tok est.)");
  }
  lines.push("");

  lines.push("## Repo map");
  lines.push("");
  const dirTokens = new Map<string, number>();
  for (const e of s.entries) {
    const topDir = e.path.includes("/") ? e.path.slice(0, e.path.indexOf("/")) : "(root files)";
    dirTokens.set(topDir, (dirTokens.get(topDir) ?? 0) + e.estTokens);
  }
  const sorted = [...dirTokens.entries()].sort((a, b) => b[1] - a[1]);
  for (const [dir, tokens] of sorted.slice(0, 10)) {
    lines.push("- `" + dir + "`  -  ~" + tokens.toLocaleString("en-US") + " tok est.  -  <what lives here>");
  }
  lines.push("");

  lines.push("## Context rules for agents working here");
  lines.push("");
  const flagged = report.flags.filter((f) => f.kind === "oversize_file" || f.kind === "minified_suspect");
  if (flagged.length > 0) {
    for (const f of flagged.slice(0, 8)) {
      lines.push("- Do not read `" + f.path + "` raw unless asked (" +
        f.estTokens.toLocaleString("en-US") + " tok est.).");
    }
  } else {
    lines.push("- No file is large enough to need a read restriction at the current budget.");
  }
  lines.push("- Prefer running tests and searching over reading whole files.");
  lines.push("- When adding a file, keep it small and single-purpose: context is a shared budget.");
  lines.push("");

  lines.push("## How to verify your work");
  lines.push("");
  lines.push("- Run the project's test suite before claiming a task is done.");
  lines.push("- <fill in: exact test command>");
  lines.push("- <fill in: lint / typecheck commands>");
  lines.push("");

  return lines.join("\n");
}

function topExtensions(s: ScanSummary): string {
  const counts = new Map<string, number>();
  for (const e of s.entries) {
    const ext = e.ext || "(no ext)";
    counts.set(ext, (counts.get(ext) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([ext]) => ext)
    .join(", ");
}
