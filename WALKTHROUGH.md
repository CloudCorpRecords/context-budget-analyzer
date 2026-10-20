# Interview walkthrough: context-budget

Use these five bullets to present the build in 3 to 5 minutes. Everything
below is grounded in the actual code in this folder.

## The 5 bullets

1. **The problem is real and expensive.** Teams adopting AI coding agents
   discover that a "small" repo can silently blow a 200k context window. This
   CLI answers which files eat the budget before an agent ever opens them.
2. **Zero dependencies, zero API calls, deterministic.** The estimator in
   `src/tokenize.ts` is a documented heuristic (roughly chars/4, denser for
   minified runs), so the report is reproducible anywhere, including CI, with
   no keys and no network.
3. **It outputs decisions, not just data.** `src/report.ts` flags oversized
   files, suspected minified bundles, heavy directories, and over-budget repos,
   each with a concrete action (split, exclude, map in CLAUDE.md). Exit code 2
   on over-budget means CI can gate on agent-readiness directly.
4. **It writes the fix, not just the diagnosis.** `--brief` generates a
   CLAUDE.md project brief skeleton (entry points, repo map, do-not-read
   rules) with explicit `<fill in>` markers where a human must decide.
5. **It is honest about what it is not.** The README states the limits: a
   heuristic for ranking and triage, never for billing or exact context-window
   math. Developer productivity tooling has to be trustworthy, and trustworthy
   means naming your error bars.

## Likely follow-ups, with honest answers

**"Why not use the real tokenizer?"**
Real tokenizers are per-model and heavier; the value here is relative ranking
and flags, which are stable across reasonable estimators. A team that needs
exact per-model math would swap in a real tokenizer behind the same
`estimateTokens` interface. The architecture already isolates that seam.

**"How accurate is the estimate?"**
Rough, on purpose. It orders files correctly and finds the hogs, which is the
job. I would not defend a single number to within 10 percent, and the README
says so. For the actual use case (find what to split, exclude, or brief), the
ordering is what matters.

**"What would you add next?"**
Three things, in this order: a `.claudeignore`-style exclusion file the scanner
respects; per-directory brief generation for monorepos; and an optional real
tokenizer adapter for teams that want exact numbers for one specific model.

**"Why is the scanner capped at 20,000 files and 8 MB per file?"**
So one pathological repo cannot hang CI. The caps are constants at the top of
`src/scan.ts` and easy to tune; they are documented behavior, not hidden limits.

**"Is this affiliated with Anthropic?"**
No. Independent prototype, built to demonstrate developer-productivity
thinking in the Claude Code problem space. Every file says so.
