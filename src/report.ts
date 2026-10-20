// Independent prototype. Not affiliated with Anthropic.
// Turns a scan into an actionable context-budget report: ranking, flags,
// and concrete trimming suggestions a team can act on.

import { budgetShare } from "./tokenize.ts";
import type { ContextFlag, ContextReport, FileEntry, ScanSummary } from "./types.ts";

export interface ReportOptions {
  budget?: number;        // context budget in tokens, default 200000
  top?: number;           // how many files to surface, default 15
  fileFlagAt?: number;    // flag a single file above this many tokens, default 10000
  dirFlagAt?: number;     // flag a top-level dir above this many tokens, default 50000
}

const DEFAULTS: Required<ReportOptions> = {
  budget: 200000,
  top: 15,
  fileFlagAt: 10000,
  dirFlagAt: 50000,
};

export function buildReport(
  summary: ScanSummary,
  opts: ReportOptions = {},
): ContextReport {
  const o: Required<ReportOptions> = { ...DEFAULTS, ...opts };
  const flags: ContextFlag[] = [];

  for (const e of summary.entries) {
    if (e.estTokens >= o.fileFlagAt) {
      flags.push({
        kind: "oversize_file",
        path: e.path,
        estTokens: e.estTokens,
        message:
          "Eats " + budgetShare(e.estTokens, o.budget) +
          " of the context budget alone. Split it, summarize it, or exclude it from agent reads.",
      });
    }
    if (e.estTokens >= o.fileFlagAt * 3) {
      flags.push({
        kind: "minified_suspect",
        path: e.path,
        estTokens: e.estTokens,
        message:
          "Unusually dense for one file. Often a minified bundle or generated file " +
          "that agents should never read; exclude it in CLAUDE.md or .claudeignore.",
      });
    }
  }

  const dirTokens = new Map<string, number>();
  for (const e of summary.entries) {
    const topDir = e.path.includes("/") ? e.path.slice(0, e.path.indexOf("/")) : "(root)";
    dirTokens.set(topDir, (dirTokens.get(topDir) ?? 0) + e.estTokens);
  }
  for (const [dir, tokens] of dirTokens) {
    if (tokens >= o.dirFlagAt) {
      flags.push({
        kind: "heavy_dir",
        path: dir,
        estTokens: tokens,
        message:
          "Top-level directory holds " + budgetShare(tokens, o.budget) +
          " of the budget. Give agents a directory-level summary in CLAUDE.md instead of raw reads.",
      });
    }
  }

  if (summary.totalEstTokens > o.budget) {
    flags.push({
      kind: "oversize_total",
      path: "(repo)",
      estTokens: summary.totalEstTokens,
      message:
        "The whole readable repo exceeds the budget. No agent can hold it all; " +
        "a CLAUDE.md project brief is mandatory, not optional.",
    });
  }

  flags.sort((a, b) => b.estTokens - a.estTokens);

  return {
    summary,
    flags,
    budget: o.budget,
    withinBudget: summary.totalEstTokens <= o.budget,
    topFiles: summary.entries.slice(0, o.top),
  };
}

export function formatHuman(report: ContextReport): string {
  const s = report.summary;
  const lines: string[] = [];
  lines.push("Context budget report: " + s.root);
  lines.push(
    "Files: " + s.fileCount + "  Estimated tokens: " +
    s.totalEstTokens.toLocaleString("en-US") +
    "  Budget: " + report.budget.toLocaleString("en-US") +
    "  (" + (report.withinBudget ? "within budget" : "OVER BUDGET") + ")",
  );
  lines.push("");
  lines.push("Top context consumers:");
  for (const e of report.topFiles) {
    lines.push(
      "  " + e.path +
      "  " + e.estTokens.toLocaleString("en-US") + " tok" +
      "  (" + budgetShare(e.estTokens, report.budget) + ")",
    );
  }
  if (report.flags.length > 0) {
    lines.push("");
    lines.push("Flags (" + report.flags.length + "):");
    for (const f of report.flags) {
      lines.push(
        "  [" + f.kind + "] " + f.path +
        " (" + f.estTokens.toLocaleString("en-US") + " tok): " + f.message,
      );
    }
  } else {
    lines.push("");
    lines.push("No flags. Repo is agent-friendly at this budget.");
  }
  return lines.join("\n");
}

export function suggestionList(report: ContextReport): string[] {
  const out: string[] = [];
  for (const f of report.flags) {
    if (f.kind === "oversize_file") {
      out.push("Split or summarize " + f.path + " so no single read costs a full agent turn.");
    } else if (f.kind === "minified_suspect") {
      out.push("Exclude " + f.path + " from agent reads; it looks generated or bundled.");
    } else if (f.kind === "heavy_dir") {
      out.push("Add a " + f.path + " section to CLAUDE.md with a hand-written directory map.");
    } else if (f.kind === "oversize_total") {
      out.push("Write the CLAUDE.md brief and treat it as the primary context source.");
    }
  }
  return out;
}

export type { FileEntry };
