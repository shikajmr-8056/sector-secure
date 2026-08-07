import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { ScanProgress } from "@/components/scan/ScanProgress";
import { SectorPanel } from "@/components/scan/SectorPanel";
import { FileTreeHeatmap } from "@/components/scan/FileTreeHeatmap";
import { FindingsTable } from "@/components/scan/FindingsTable";
import { DastPanel } from "@/components/scan/DastPanel";
import { type Sector, type Finding, type TreeNode, buildFileTreeFromFindings } from "@/lib/scan-data";

export const Route = createFileRoute("/scan")({
  validateSearch: z.object({
    repo: z.string().default(""),
    dastUrl: z.string().default(""),
  }),
  head: () => ({
    meta: [
      { title: "Scan results — AVSS" },
      {
        name: "description",
        content:
          "Repository scan results with sector-weighted AVSS scores, file-tree heatmap, evidence and regulatory context for each finding.",
      },
      { property: "og:title", content: "Scan results — AVSS" },
      {
        property: "og:description",
        content: "Baseline severity next to sector-weighted AVSS, with evidence and fix diffs.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ScanDashboard,
});

function ScanDashboard() {
  const { repo, dastUrl } = Route.useSearch();

  // If a dastUrl is present, open DAST tab by default; otherwise SAST
  const initialTab = dastUrl && !repo ? "dast" : "static";

  const [scanning, setScanning] = useState(true);
  const [sector, setSector] = useState<Sector>("fintech");
  const [applied, setApplied] = useState(false);
  const [focusPath, setFocusPath] = useState<string | null>(null);
  const [tab, setTab] = useState<"static" | "dast">(initialTab);

  const [findings, setFindings] = useState<Finding[]>([]);
  const [fileTree, setFileTree] = useState<TreeNode[]>([]);
  const [sectorConfidence, setSectorConfidence] = useState<Record<Sector, number>>({
    fintech: 0, healthcare: 0, ecommerce: 0, general: 1,
  });
  const [sectorEvidence, setSectorEvidence] = useState<string[]>([]);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanId, setScanId] = useState<string | undefined>(undefined);

  // Only run SAST scan if there's a repo URL and we're NOT purely in DAST mode
  const shouldRunSast = !!repo && !(dastUrl && !repo);

  useEffect(() => {
    if (!shouldRunSast) {
      setScanning(false);
      return;
    }

    let isMounted = true;

    async function runScan() {
      try {
        setScanning(true);
        setScanError(null);

        const API_URL = (import.meta.env as any)['VITE_API_URL'] || "http://localhost:5000";

        // 1. SAST Scan
        const sastRes = await fetch(`${API_URL}/scan/sast`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ repoUrl: repo }),
        });

        if (!sastRes.ok) throw new Error("SAST scan failed");

        const sastData = await sastRes.json();
        if (sastData.scanId) setScanId(sastData.scanId);

        // Normalise codeSnippet → snippet array for the UI
        const parsedFindings: Finding[] = (sastData.findings || []).map((f: any) => {
          if (f.codeSnippet && !f.snippet) {
            const lines = f.codeSnippet.split("\n");
            const startLine = Math.max(1, (f.lineNumber || 1) - Math.floor(lines.length / 2));
            f.snippet = lines.map((l: string, i: number) => ({ n: startLine + i, code: l }));
          }
          return f;
        });

        if (!isMounted) return;

        // 2. Score & Sector Detect
        const scoreRes = await fetch(`${API_URL}/score`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            findings: parsedFindings,
            repoTextSample: sastData.repoTextSample || "",
            detectedRoutes: sastData.detectedRoutes || [],
          }),
        });

        if (!scoreRes.ok) throw new Error("Scoring failed");

        const scoreData = await scoreRes.json();

        if (!isMounted) return;

        const finalFindings = scoreData.findings || parsedFindings;
        setFindings(finalFindings);
        setFileTree(buildFileTreeFromFindings(finalFindings));
        setSector(scoreData.suggestedSector || "general");
        setSectorConfidence(
          scoreData.scores || { fintech: 0, healthcare: 0, ecommerce: 0, general: 1 }
        );
        setSectorEvidence(scoreData.matchedEvidence || []);
      } catch (err: any) {
        if (isMounted) setScanError(err.message || "An error occurred");
      } finally {
        if (isMounted) setScanning(false);
      }
    }

    runScan();

    return () => { isMounted = false; };
  }, [repo, shouldRunSast]);

  const handleSectorChange = async (newSector: Sector) => {
    setSector(newSector);
    setApplied(false);

    try {
      const API_URL = (import.meta.env as any)['VITE_API_URL'] || "http://localhost:5000";
      const scoreRes = await fetch(`${API_URL}/score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ findings, sector: newSector }),
      });
      if (scoreRes.ok) {
        const data = await scoreRes.json();
        if (data.findings) setFindings(data.findings);
      }
    } catch (e) {
      console.error("Re-scoring failed", e);
    }
  };

  const selectFile = (path: string) => {
    setFocusPath(path);
    const f = findings.find((x) => x.filePath === path);
    if (f)
      document
        .getElementById(`finding-${f.id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-6">
            <Link to="/" className="font-mono text-sm font-bold tracking-[0.22em]">
              AVSS
            </Link>
            <div className="hidden gap-1 md:flex">
              <button
                onClick={() => setTab("static")}
                className={`rounded-md px-3 py-1.5 text-xs transition-colors ${
                  tab === "static"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Static analysis
              </button>
              <button
                onClick={() => setTab("dast")}
                className={`rounded-md px-3 py-1.5 text-xs transition-colors ${
                  tab === "dast"
                    ? "bg-dast/15 text-dast"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                DAST
              </button>
            </div>
          </div>
          <Link
            to="/"
            className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            New scan
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-4 px-6 py-6">
        {scanError && tab === "static" && (
          <div className="rounded-lg border border-sev-critical/40 bg-sev-critical/10 px-4 py-2.5 text-xs text-sev-critical">
            {scanError}
          </div>
        )}

        {tab === "dast" ? (
          /* ── DAST view — completely independent of SAST state ─────────── */
          <DastPanel initialUrl={dastUrl || ""} />
        ) : (
          /* ── Static analysis view ─────────────────────────────────────── */
          <>
            {repo ? (
              <ScanProgress
                repo={repo}
                isScanning={scanning}
                findingsCount={findings.length}
                {...(scanId ? { scanId } : {})}
              />
            ) : (
              <div className="rounded-lg border border-border bg-panel/60 px-4 py-2.5 text-xs text-muted-foreground">
                No repository selected. Please go back and enter a repository URL.
              </div>
            )}

            <SectorPanel
              sector={sector}
              onSector={handleSectorChange}
              confirmed={applied}
              onConfirm={() => setApplied(true)}
              sectorConfidence={sectorConfidence}
              sectorEvidence={sectorEvidence}
            />

            <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
              <FileTreeHeatmap
                sector={sector}
                applied={applied}
                selected={focusPath}
                onSelect={selectFile}
                fileTree={fileTree}
                findings={findings}
              />
              <div className={scanning ? "pointer-events-none opacity-50" : ""}>
                <FindingsTable
                  sector={sector}
                  applied={applied}
                  focusPath={focusPath}
                  findings={findings}
                />
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
