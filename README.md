# context-budget

Independent prototype. Not affiliated with Anthropic.

Scan a codebase directory and estimate each file's cost against an AI coding
agent's context window. Output: a ranked report, actionable flags, and an
optional CLAUDE.md-style project brief skeleton.

## Why this exists

Teams adopting AI coding agents hit the same wall: a repo that feels small to
a human can blow a 200k context window the moment an agent starts reading it.
This tool answers the practical version of that question fast, locally, with
no API calls: which files eat the budget, what should agents never read raw,
and what belongs in a curated project brief instead.

## How the token estimate works, and its limits

`src/tokenize.ts` implements a deterministic heuristic, not a tokenizer:

- Base cost: `ceil(chars / 4)`, the standard rough rule for code-heavy English text.
- Dense runs: whitespace-free runs of 40+ characters (minified bundles, base64
  blobs) are counted at `ceil(denseChars / 6)`, since dense text packs more
  meaning per character. The adjustment is deliberately small.

Limits, stated plainly: this is a ranking and triage tool, not a tokenizer.
Do not use the numbers for billing, exact context-window math, or claims about
any specific model. Real tokenizers differ per model; the value here is the
relative ordering and the flags, which are stable across reasonable estimators.

## Run it (under 2 minutes)

Requirements: Node.js 22.6 or newer. No install step, no dependencies.

```sh
cd builds/anthropic
node src/cli.ts scan <directory>
node src/cli.ts scan <directory> --json
node src/cli.ts scan <directory> --brief CLAUDE.md
node src/cli.ts scan <directory> --budget 100000 --top 20
```

Options: `--json` for machine-readable output, `--brief FILE` to also write a
CLAUDE.md-style project brief skeleton, `--budget N` and `--top N` to tune the
budget and ranking depth.

Exit code is 0 when the repo fits the budget, 2 when it exceeds it, so CI can
gate on agent-readiness: `node src/cli.ts scan . --budget 200000`.

The scanner skips `.git`, `node_modules`, `dist`, `build`, and similar dirs,
plus binary files (by extension and by null-byte detection). Caps: 20,000
files, 8 MB read per file.

## What it checks for

- **oversize_file**: a single file costing >= 10,000 estimated tokens. Split it,
  summarize it, or exclude it from agent reads.
- **minified_suspect**: a single file at >= 3x that threshold. Usually a
  generated bundle or minified file agents should never read raw.
- **heavy_dir**: a top-level directory holding >= 50,000 estimated tokens.
  Write a directory map in CLAUDE.md instead of letting agents discover it by reading.
- **oversize_total**: the whole readable repo exceeds the budget, which makes a
  curated project brief mandatory rather than optional.

## Test report (real, 2026-10-19)

```
npm test   # node --test tests/*.test.ts, zero dependencies
tests 19, pass 19, fail 0
```

Also smoke-tested: human report, `--json` output shape, `--brief` file
generation, and the exit code 2 path on a 10-token budget, all against this
project's own directory.

## How this maps to developer productivity for teams adopting AI coding agents

Developer productivity for agent-assisted teams is largely context
productivity: every token an agent spends rediscovering your repo is a token
not spent on the task. This tool operationalizes that in three concrete ways:

1. **Agent-readiness as a number.** Run it in CI and you get a gate: this repo
   costs X estimated tokens against the team's budget, and these specific files
   are the offenders.
2. **Curated briefs over discovery.** The generated CLAUDE.md skeleton turns
   the scan into the team's shared entry point: entry points, repo map, and
   do-not-read rules, with explicit `<fill in>` markers where human judgment
   is required.
3. **Trimming with evidence.** Flags point at the exact files and directories
   to split, summarize, or exclude, so context hygiene becomes a reviewable
   checklist instead of folklore.

## Files

- `src/cli.ts`  -  argument parsing and output wiring
- `src/scan.ts`  -  recursive walker, skips, binary detection
- `src/tokenize.ts`  -  deterministic token estimate heuristic
- `src/report.ts`  -  flags, ranking, human and suggestion rendering
- `src/claudemd.ts`  -  CLAUDE.md brief skeleton generator
- `src/types.ts`  -  shared types
- `tests/`  -  19 tests across the four core modules
