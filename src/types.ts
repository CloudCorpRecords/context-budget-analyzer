// Independent prototype. Not affiliated with Anthropic.
// Context budget analyzer for AI coding agents: core types.
// Independent prototype. Not affiliated with Anthropic.

export interface FileEntry {
  path: string;        // path relative to the scanned root, forward slashes
  bytes: number;       // raw byte size on disk
  chars: number;       // decoded character count
  estTokens: number;   // deterministic estimate, see tokenize.ts
  ext: string;         // file extension, lowercase, includes dot
  skippedReason?: string;
}

export interface ScanSummary {
  root: string;
  fileCount: number;
  totalBytes: number;
  totalEstTokens: number;
  entries: FileEntry[]; // sorted by estTokens descending
}

export interface ContextFlag {
  kind: "oversize_file" | "oversize_total" | "minified_suspect" | "heavy_dir";
  path: string;
  estTokens: number;
  message: string;
}

export interface ContextReport {
  summary: ScanSummary;
  flags: ContextFlag[];
  budget: number;      // configured context budget in tokens
  withinBudget: boolean;
  topFiles: FileEntry[];
}
