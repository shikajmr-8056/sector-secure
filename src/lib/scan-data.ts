export type Sector = "healthcare" | "fintech" | "ecommerce" | "general";

export const SECTORS: { id: Sector; label: string }[] = [
  { id: "fintech", label: "Fintech" },
  { id: "healthcare", label: "Healthcare" },
  { id: "ecommerce", label: "E-commerce" },
  { id: "general", label: "General" },
];

export type Finding = {
  id: string;
  source?: string;
  type?: string;
  title: string;
  description?: string;
  filePath: string;
  lineNumber?: number;
  tool?: string;
  severity?: "critical" | "high" | "medium" | "low";
  baseSeverity?: number;
  baseline?: number; // legacy compat
  epssScore?: number;
  epss?: number;     // legacy compat
  evidence?: string;
  cveId?: string;

  // Optional overrides from /score endpoint
  multipliers?: Record<Sector, number>;
  citations?: Record<Sector, string>;
  avssScore?: number;
  regulatoryTag?: string;
  reason?: string;

  // UI Specific
  snippet?: { n: number; code: string }[];
  diff?: { sign: "+" | "-" | " "; code: string }[];
  fixNote?: string;
  /** Set true when user clicks "Apply fix" — dashboard re-derives all scores from postFixScore */
  fixApplied?: boolean;
  /** The estimated post-fix AVSS score — written into avssScore when fixApplied is true */
  postFixScore?: number;
};

export function avss(f: Finding, sector: Sector): number {
  if (f.avssScore !== undefined) return f.avssScore;
  const epssWeight = 0.85 + (f.epssScore ?? f.epss ?? 0) * 0.35;
  const multiplier = f.multipliers?.[sector] ?? 1.0;
  return Math.min(10, Math.round((f.baseSeverity ?? f.baseline ?? 0) * multiplier * epssWeight * 10) / 10);
}

export function scoreColor(score: number): string {
  if (score >= 8) return "var(--sev-critical)";
  if (score >= 5) return "var(--sev-medium)";
  return "var(--muted-foreground)";
}

export type TreeNode = {
  path: string;
  name: string;
  depth: number;
  isDir: boolean;
};

export function buildFileTreeFromFindings(findings: Finding[]): TreeNode[] {
  const tree: Record<string, TreeNode> = {};

  findings.forEach((f) => {
    if (!f.filePath) return;
    const parts = f.filePath.split("/");
    let currentPath = "";

    parts.forEach((part, index) => {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const isDir = index < parts.length - 1;

      if (!tree[currentPath]) {
        tree[currentPath] = {
          path: currentPath,
          name: part,
          depth: index,
          isDir,
        };
      } else {
        // If it was already added as a file, but now it's a dir, update it
        if (isDir) {
          const existing = tree[currentPath];
          if (existing) existing.isDir = true;
        }
      }
    });
  });

  return Object.values(tree).sort((a, b) => {
    // Sort directories first, then alphabetically
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
    return a.path.localeCompare(b.path);
  });
}

export function maxScoreForPath(
  path: string,
  sector: Sector,
  applied: boolean,
  findings: Finding[]
): number {
  const matches = findings.filter((f) => f.filePath === path || f.filePath.startsWith(path + "/"));
  if (!matches.length) return 0;
  const scores = matches.map((f) => (applied ? avss(f, sector) : f.baseSeverity ?? f.baseline ?? 0));
  return Math.max(0, ...scores);
}

// These labels must match what the server emits via GET /scan/sast/progress/:scanId
export const SCAN_STAGES = [
  "Cloning repository…",
  "Running Semgrep (general rules)…",
  "Checking for exposed secrets…",
  "Running custom sector-pattern rules…",
  "Validating card-number matches (Luhn)…",
  "Cross-referencing CVEs (OSV.dev + EPSS)…",
  "Extracting routes and repo metadata…",
  "Deduplicating and ranking findings…",
  "Scan complete.",
];

// ─────────────────────────────────────────────────────────────────────────────
// DAST types
// ─────────────────────────────────────────────────────────────────────────────
export type DastResult = "pass" | "fail" | "warn" | "info";

export type DastCheck = {
  id: string;
  category: "TLS" | "Headers" | "Cookies" | "Info Leakage";
  name: string;
  result: DastResult;
  severity: number; // 0–10 (0 = passing check, no risk)
  description: string;
  remediation: string | null;
  evidence: string;
};

export type DastSummary = {
  grade: "A+" | "A" | "B" | "C" | "D" | "F";
  failCount: number;
  warnCount: number;
  passCount: number;
  avgSeverity: number;
  categoryScores: Record<string, number>;
  topFindings: string[];
};

export type DastScanResult = {
  checks: DastCheck[];
  summary: DastSummary;
  stages: { ts: number; label: string }[];
  targetUrl: string;
};

export const DAST_STAGES = [
  "Checking TLS configuration…",
  "Fetching security headers…",
  "Analysing cookie security…",
  "Checking for info leakage…",
  "Computing risk summary…",
];

export const DAST_CATEGORY_COLOR: Record<string, string> = {
  TLS:           "var(--sev-critical)",
  Headers:       "var(--primary)",
  Cookies:       "var(--sev-medium)",
  "Info Leakage": "var(--sev-high)",
};

export function dastResultColor(result: DastResult): string {
  switch (result) {
    case "fail": return "var(--sev-critical)";
    case "warn": return "var(--sev-medium)";
    case "pass": return "var(--sev-low)";
    default:     return "var(--muted-foreground)";
  }
}

export function gradeColor(grade: string): string {
  if (grade === "A+" || grade === "A") return "var(--sev-low)";
  if (grade === "B") return "var(--primary)";
  if (grade === "C") return "var(--sev-medium)";
  return "var(--sev-critical)";
}

// ─────────────────────────────────────────────────────────────────────────────
// SAST Analytics helpers
// ─────────────────────────────────────────────────────────────────────────────

export type SeverityBucket = "critical" | "high" | "medium" | "low";

export function severityBucket(score: number): SeverityBucket {
  if (score >= 8) return "critical";
  if (score >= 6) return "high";
  if (score >= 4) return "medium";
  return "low";
}

export const BUCKET_COLOR: Record<SeverityBucket, string> = {
  critical: "var(--sev-critical)",
  high:     "var(--sev-high)",
  medium:   "var(--sev-medium)",
  low:      "var(--sev-low)",
};

export type ScanStats = {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  topRiskFile: string;
  topRiskScore: number;
  avgEpss: number;
  threatScore: number; // 0-10 composite
  bySource: Record<string, number>;
  byType: Record<string, number>;
};

export function computeStats(findings: Finding[], sector: Sector, applied: boolean): ScanStats {
  if (findings.length === 0) {
    return {
      total: 0, critical: 0, high: 0, medium: 0, low: 0,
      topRiskFile: "—", topRiskScore: 0, avgEpss: 0, threatScore: 0,
      bySource: {}, byType: {},
    };
  }

  const scores = findings.map((f) => applied ? avss(f, sector) : (f.baseSeverity ?? f.baseline ?? 0));
  const buckets = scores.map(severityBucket);

  // Per-file max score
  const fileScores: Record<string, number> = {};
  findings.forEach((f, i) => {
    const s = scores[i] ?? 0;
    fileScores[f.filePath] = Math.max(fileScores[f.filePath] ?? 0, s);
  });
  const topEntry = Object.entries(fileScores).sort((a, b) => b[1] - a[1])[0];

  // EPSS
  const epssValues = findings.map((f) => f.epssScore ?? f.epss ?? 0).filter((v) => v > 0);
  const avgEpss = epssValues.length ? epssValues.reduce((a, b) => a + b, 0) / epssValues.length : 0;

  // Threat score: weighted average of top-5 AVSS scores
  const top5 = scores.sort((a, b) => b - a).slice(0, 5);
  const threatScore = Math.min(10, top5.reduce((a, b) => a + b, 0) / top5.length);

  // By source
  const bySource: Record<string, number> = {};
  const byType: Record<string, number> = {};
  findings.forEach((f) => {
    const src = f.source ?? f.tool ?? "unknown";
    bySource[src] = (bySource[src] ?? 0) + 1;
    const t = f.type ?? "unknown";
    byType[t] = (byType[t] ?? 0) + 1;
  });

  return {
    total: findings.length,
    critical: buckets.filter((b) => b === "critical").length,
    high:     buckets.filter((b) => b === "high").length,
    medium:   buckets.filter((b) => b === "medium").length,
    low:      buckets.filter((b) => b === "low").length,
    topRiskFile: topEntry?.[0] ?? "—",
    topRiskScore: topEntry?.[1] ?? 0,
    avgEpss: Math.round(avgEpss * 1000) / 1000,
    threatScore: Math.round(threatScore * 10) / 10,
    bySource,
    byType,
  };
}

/** Groups findings by file path, returns entries sorted by max AVSS desc */
export function groupByFile(
  findings: Finding[],
  sector: Sector,
  applied: boolean
): Array<{ path: string; count: number; maxScore: number; findings: Finding[] }> {
  const map: Record<string, Finding[]> = {};
  findings.forEach((f) => {
    (map[f.filePath] ??= []).push(f);
  });
  return Object.entries(map)
    .map(([path, fs]) => ({
      path,
      count: fs.length,
      maxScore: Math.max(...fs.map((f) => applied ? avss(f, sector) : (f.baseSeverity ?? f.baseline ?? 0))),
      findings: fs,
    }))
    .sort((a, b) => b.maxScore - a.maxScore);
}
