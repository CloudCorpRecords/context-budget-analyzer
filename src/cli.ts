// Independent prototype. Not affiliated with Anthropic.
// CLI: node src/cli.ts scan <dir> [--json] [--brief out.md] [--budget N] [--top N]
//
//   scan <dir>     analyze a codebase directory and print a context-budget report
//   --json         machine-readable output instead of the human report
//   --brief FILE   also write a CLAUDE.md-style project brief skeleton to FILE
//   --budget N     context budget in tokens (default 200000)
//   --top N        files to rank in the report (default 15)
//
// Exit code is 0 when the repo fits the budget, 2 when it exceeds it.
// The exit code is a signal CI can gate on, not an error.

import * as fs from "node:fs";
import * as path from "node:path";
import { scanDirectory } from "./scan.ts";
import { buildReport, formatHuman } from "./report.ts";
import { generateClaudeMd } from "./claudemd.ts";

function usage(exitCode: number): never {
  console.error("Usage: node src/cli.ts scan <dir> [--json] [--brief FILE] [--budget N] [--top N]");
  process.exit(exitCode);
}

function main(): void {
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0] === "-h" || args[0] === "--help") usage(0);
  if (args[0] !== "scan" || args.length < 2) usage(1);

  const dir = args[1];
  let json = false;
  let briefFile: string | null = null;
  let budget = 200000;
  let top = 15;

  for (let i = 2; i < args.length; i++) {
    const a = args[i];
    if (a === "--json") json = true;
    else if (a === "--brief") {
      i++;
      if (i >= args.length) usage(1);
      briefFile = args[i];
    } else if (a === "--budget") {
      i++;
      budget = Number(args[i]);
      if (!Number.isFinite(budget) || budget <= 0) {
        console.error("--budget must be a positive number");
        process.exit(1);
      }
    } else if (a === "--top") {
      i++;
      top = Number(args[i]);
      if (!Number.isFinite(top) || top <= 0) {
        console.error("--top must be a positive number");
        process.exit(1);
      }
    } else {
      console.error("Unknown flag: " + a);
      usage(1);
    }
  }

  let summary;
  try {
    summary = scanDirectory(dir);
  } catch (err) {
    console.error("Scan failed: " + (err as Error).message);
    process.exit(1);
  }

  const report = buildReport(summary, { budget, top });

  if (briefFile) {
    const outPath = path.resolve(briefFile);
    fs.writeFileSync(outPath, generateClaudeMd(report), "utf8");
    if (!json) console.error("Brief written to " + outPath);
  }

  if (json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(formatHuman(report));
  }

  process.exit(report.withinBudget ? 0 : 2);
}

main();
