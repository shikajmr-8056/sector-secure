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
          tree[currentPath].isDir = true;
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
  return Math.max(
    ...matches.map((f) => (applied ? avss(f, sector) : f.baseSeverity ?? f.baseline ?? 0))
  );
}

export const SCAN_STAGES = [
  "Cloning repo…",
  "Running Semgrep…",
  "Checking for exposed secrets…",
  "Validating card-number matches…",
  "Cross-referencing CVEs…",
  "Weighting by EPSS…",
];
