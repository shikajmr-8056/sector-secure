<<<<<<< HEAD
import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { ScanProgress }     from "@/components/scan/ScanProgress";
import { SectorPanel }      from "@/components/scan/SectorPanel";
import { FileTreeHeatmap }  from "@/components/scan/FileTreeHeatmap";
import { FindingsTable }    from "@/components/scan/FindingsTable";
import { DastPanel }        from "@/components/scan/DastPanel";
import { SastSummary }      from "@/components/scan/SastSummary";
import { SeverityTreemap }  from "@/components/scan/SeverityTreemap";
import { BeforeAfterPanel } from "@/components/scan/BeforeAfterPanel";
import { SourceBreakdown }  from "@/components/scan/SourceBreakdown";
import {
  type Sector, type Finding, type TreeNode,
  buildFileTreeFromFindings, computeStats,
} from "@/lib/scan-data";

export const Route = createFileRoute("/scan")({
  validateSearch: z.object({
    repo:    z.string().default(""),
    dastUrl: z.string().default(""),
  }),
=======
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
  validateSearch: z.object({ repo: z.string().default("") }),
>>>>>>> 86aa094 (feat: update UI components, styling, and add backend scanner service)
  head: () => ({
    meta: [
      { title: "Scan results — AVSS" },
      { name: "description", content: "Repository scan results with sector-weighted AVSS scores." },
      { property: "og:title", content: "Scan results — AVSS" },
      { property: "og:type",  content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ScanDashboard,
});

<<<<<<< HEAD
type SubTab = "overview" | "heatmap" | "compare" | "breakdown";

function ScanDashboard() {
  const { repo, dastUrl } = Route.useSearch();
  const initialTab = dastUrl && !repo ? "dast" : "static";

  const [scanning,        setScanning]        = useState(true);
  const [sector,          setSector]          = useState<Sector>("fintech");
  const [applied,         setApplied]         = useState(false);
  const [focusPath,       setFocusPath]       = useState<string | null>(null);
  const [tab,             setTab]             = useState<"static" | "dast">(initialTab);
  const [subTab,          setSubTab]          = useState<SubTab>("overview");
  const [findings,        setFindings]        = useState<Finding[]>([]);
  const [fileTree,        setFileTree]        = useState<TreeNode[]>([]);
  const [sectorConfidence,setSectorConfidence]= useState<Record<Sector, number>>({ fintech: 0, healthcare: 0, ecommerce: 0, general: 1 });
  const [sectorEvidence,  setSectorEvidence]  = useState<string[]>([]);
  const [scanError,       setScanError]       = useState<string | null>(null);
  const [scanId,          setScanId]          = useState<string | undefined>(undefined);

  const shouldRunSast = !!repo && !(dastUrl && !repo);

  const stats = useMemo(
    () => computeStats(findings, sector, applied),
    [findings, sector, applied]
  );

  useEffect(() => {
    if (!shouldRunSast) { setScanning(false); return; }
    let isMounted = true;

=======
function ScanDashboard() {
  const { repo } = Route.useSearch();
  const [scanning, setScanning] = useState(true);
  const [sector, setSector] = useState<Sector>("fintech");
  const [applied, setApplied] = useState(false);
  const [focusPath, setFocusPath] = useState<string | null>(null);
  const [tab, setTab] = useState<"static" | "dast">("static");
  
  const [findings, setFindings] = useState<Finding[]>([]);
  const [fileTree, setFileTree] = useState<TreeNode[]>([]);
  const [sectorConfidence, setSectorConfidence] = useState<Record<Sector, number>>({ fintech: 0, healthcare: 0, ecommerce: 0, general: 1 });
  const [sectorEvidence, setSectorEvidence] = useState<string[]>([]);
  const [scanError, setScanError] = useState<string | null>(null);
  
  const cached = /demo|cached|offline/i.test(repo);

  useEffect(() => {
    if (!repo) {
      setScanning(false);
      return;
    }

    let isMounted = true;
    
>>>>>>> 86aa094 (feat: update UI components, styling, and add backend scanner service)
    async function runScan() {
      try {
        setScanning(true);
        setScanError(null);
<<<<<<< HEAD
        const API_URL = (import.meta.env as any)["VITE_API_URL"] || "http://localhost:5000";

        const sastRes = await fetch(`${API_URL}/scan/sast`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ repoUrl: repo }),
        });
        if (!sastRes.ok) throw new Error("SAST scan failed");
        const sastData = await sastRes.json();
        if (sastData.scanId) setScanId(sastData.scanId);

        const parsedFindings: Finding[] = (sastData.findings || []).map((f: any) => {
          if (f.codeSnippet && !f.snippet) {
            const lines = f.codeSnippet.split("\n");
=======
        
        const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
        
        // 1. SAST Scan
        const sastRes = await fetch(`${API_URL}/scan/sast`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ repoUrl: repo })
        });
        
        if (!sastRes.ok) throw new Error("SAST scan failed");
        
        const sastData = await sastRes.json();
        
        // Ensure snippets are in array format for the UI
        const parsedFindings: Finding[] = (sastData.findings || []).map((f: any) => {
          if (f.codeSnippet && !f.snippet) {
            const lines = f.codeSnippet.split('\n');
>>>>>>> 86aa094 (feat: update UI components, styling, and add backend scanner service)
            const startLine = Math.max(1, (f.lineNumber || 1) - Math.floor(lines.length / 2));
            f.snippet = lines.map((l: string, i: number) => ({ n: startLine + i, code: l }));
          }
          return f;
        });
<<<<<<< HEAD
        if (!isMounted) return;

=======

        if (!isMounted) return;

        // 2. Score & Sector Detect
>>>>>>> 86aa094 (feat: update UI components, styling, and add backend scanner service)
        const scoreRes = await fetch(`${API_URL}/score`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            findings: parsedFindings,
            repoTextSample: sastData.repoTextSample || "",
<<<<<<< HEAD
            detectedRoutes:  sastData.detectedRoutes  || [],
          }),
        });
        if (!scoreRes.ok) throw new Error("Scoring failed");
        const scoreData = await scoreRes.json();
=======
            detectedRoutes: sastData.detectedRoutes || [],
          })
        });

        if (!scoreRes.ok) throw new Error("Scoring failed");

        const scoreData = await scoreRes.json();
        
>>>>>>> 86aa094 (feat: update UI components, styling, and add backend scanner service)
        if (!isMounted) return;

        const finalFindings = scoreData.findings || parsedFindings;
        setFindings(finalFindings);
        setFileTree(buildFileTreeFromFindings(finalFindings));
        setSector(scoreData.suggestedSector || "general");
        setSectorConfidence(scoreData.scores || { fintech: 0, healthcare: 0, ecommerce: 0, general: 1 });
        setSectorEvidence(scoreData.matchedEvidence || []);
<<<<<<< HEAD
=======
        
>>>>>>> 86aa094 (feat: update UI components, styling, and add backend scanner service)
      } catch (err: any) {
        if (isMounted) setScanError(err.message || "An error occurred");
      } finally {
        if (isMounted) setScanning(false);
      }
    }
<<<<<<< HEAD
    runScan();
    return () => { isMounted = false; };
  }, [repo, shouldRunSast]);
=======

    runScan();

    return () => { isMounted = false; };
  }, [repo]);
>>>>>>> 86aa094 (feat: update UI components, styling, and add backend scanner service)

  const handleSectorChange = async (newSector: Sector) => {
    setSector(newSector);
    setApplied(false);
<<<<<<< HEAD
    try {
      const API_URL = (import.meta.env as any)["VITE_API_URL"] || "http://localhost:5000";
      const res = await fetch(`${API_URL}/score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ findings, sector: newSector }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.findings) setFindings(data.findings);
      }
    } catch (e) { console.error("Re-scoring failed", e); }
=======
    
    // Re-score findings via backend
    try {
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const scoreRes = await fetch(`${API_URL}/score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          findings,
          sector: newSector,
        })
      });
      if (scoreRes.ok) {
        const data = await scoreRes.json();
        if (data.findings) setFindings(data.findings);
      }
    } catch (e) {
      console.error("Re-scoring failed", e);
    }
>>>>>>> 86aa094 (feat: update UI components, styling, and add backend scanner service)
  };

  const selectFile = (path: string) => {
    setFocusPath(path);
<<<<<<< HEAD
    setSubTab("overview");
=======
>>>>>>> 86aa094 (feat: update UI components, styling, and add backend scanner service)
    const f = findings.find((x) => x.filePath === path);
    if (f) document.getElementById(`finding-${f.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  // Sub-tab definitions — only show when we have results
  const SUB_TABS: { id: SubTab; label: string; badge?: number }[] = [
    { id: "overview",  label: "Overview" },
    { id: "heatmap",   label: "Heatmap",      ...(findings.length > 0 ? { badge: findings.length } : {}) },
    { id: "compare",   label: "Before / After" },
    { id: "breakdown", label: "Breakdown" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* ── Sticky header ───────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-6">
            <Link to="/" className="font-mono text-sm font-bold tracking-[0.22em]">AVSS</Link>
            <div className="hidden gap-1 md:flex">
              <button
                onClick={() => setTab("static")}
                className={`rounded-md px-3 py-1.5 text-xs transition-colors ${
                  tab === "static" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Static analysis
              </button>
              <button
                onClick={() => setTab("dast")}
                className={`rounded-md px-3 py-1.5 text-xs transition-colors ${
                  tab === "dast" ? "bg-dast/15 text-dast" : "text-muted-foreground hover:text-foreground"
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
        {/* Error */}
        {scanError && tab === "static" && (
          <div className="rounded-lg border border-sev-critical/40 bg-sev-critical/10 px-4 py-2.5 text-xs text-sev-critical">
            {scanError}
          </div>
        )}
        
        {scanError && (
          <div className="rounded-lg border border-sev-critical/40 bg-sev-critical/10 px-4 py-2.5 text-xs text-sev-critical">
            {scanError}
          </div>
        )}

<<<<<<< HEAD
        {/* ── DAST tab ─────────────────────────────────────────────────── */}
=======
        {repo ? (
          <ScanProgress repo={repo} isScanning={scanning} findingsCount={findings.length} />
        ) : (
          <div className="rounded-lg border border-border bg-panel/60 px-4 py-2.5 text-xs text-muted-foreground">
            No repository selected. Please go back and enter a repository URL.
          </div>
        )}

>>>>>>> 86aa094 (feat: update UI components, styling, and add backend scanner service)
        {tab === "dast" ? (
          <DastPanel initialUrl={dastUrl || ""} />
        ) : (
          /* ── Static analysis tab ──────────────────────────────────────── */
          <>
            {/* Progress bar */}
            {repo ? (
              <ScanProgress
                repo={repo}
                isScanning={scanning}
                findingsCount={findings.length}
                {...(scanId ? { scanId } : {})}
              />
            ) : (
              <div className="rounded-lg border border-border bg-panel/60 px-4 py-2.5 text-xs text-muted-foreground">
                No repository selected. Go back and enter a repository URL.
              </div>
            )}

            {/* Sector panel — always visible */}
            <SectorPanel
              sector={sector}
              onSector={handleSectorChange}
              confirmed={applied}
              onConfirm={() => setApplied(true)}
              sectorConfidence={sectorConfidence}
              sectorEvidence={sectorEvidence}
            />

<<<<<<< HEAD
            {/* Stats summary — appears as soon as findings arrive */}
            {!scanning && findings.length > 0 && (
              <SastSummary stats={stats} applied={applied} />
            )}

            {/* Sub-tab bar — only shown when we have results */}
            {!scanning && findings.length > 0 && (
              <div className="flex gap-1 border-b border-border pb-0 pt-1">
                {SUB_TABS.map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setSubTab(st.id)}
                    className={`flex items-center gap-1.5 rounded-t-md px-4 py-2 text-xs transition-colors ${
                      subTab === st.id
                        ? "border border-b-background border-border bg-panel/60 text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {st.label}
                    {st.badge != null && (
                      <span className="rounded-full bg-primary/10 px-1.5 py-0.5 font-mono text-[9px] text-primary">
                        {st.badge}
                      </span>
                    )}
                  </button>
                ))}
=======
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
                <FindingsTable sector={sector} applied={applied} focusPath={focusPath} findings={findings} />
>>>>>>> 86aa094 (feat: update UI components, styling, and add backend scanner service)
              </div>
            )}

            {/* ── Overview sub-tab: file tree + findings table ─────────── */}
            {(subTab === "overview" || scanning || findings.length === 0) && (
              <div className={scanning ? "pointer-events-none opacity-50" : ""}>
                <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
                  <FileTreeHeatmap
                    sector={sector}
                    applied={applied}
                    selected={focusPath}
                    onSelect={selectFile}
                    fileTree={fileTree}
                    findings={findings}
                  />
                  <FindingsTable
                    sector={sector}
                    applied={applied}
                    focusPath={focusPath}
                    findings={findings}
                  />
                </div>
              </div>
            )}

            {/* ── Heatmap sub-tab: full-width severity treemap ─────────── */}
            {subTab === "heatmap" && !scanning && findings.length > 0 && (
              <div className="space-y-4">
                <SeverityTreemap
                  findings={findings}
                  sector={sector}
                  applied={applied}
                  onSelect={selectFile}
                />
                {/* Also show the file tree for navigation */}
                <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
                  <FileTreeHeatmap
                    sector={sector}
                    applied={applied}
                    selected={focusPath}
                    onSelect={selectFile}
                    fileTree={fileTree}
                    findings={findings}
                  />
                  <FindingsTable
                    sector={sector}
                    applied={applied}
                    focusPath={focusPath}
                    findings={findings}
                  />
                </div>
              </div>
            )}

            {/* ── Before/After sub-tab ────────────────────────────────── */}
            {subTab === "compare" && !scanning && findings.length > 0 && (
              <BeforeAfterPanel findings={findings} sector={sector} />
            )}

            {/* ── Breakdown sub-tab ────────────────────────────────────── */}
            {subTab === "breakdown" && !scanning && findings.length > 0 && (
              <div className="space-y-4">
                <SourceBreakdown stats={stats} />
                <FindingsTable
                  sector={sector}
                  applied={applied}
                  focusPath={focusPath}
                  findings={findings}
                />
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
