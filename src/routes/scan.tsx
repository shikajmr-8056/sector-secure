import { useCallback, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { ScanProgress } from "@/components/scan/ScanProgress";
import { SectorPanel } from "@/components/scan/SectorPanel";
import { FileTreeHeatmap } from "@/components/scan/FileTreeHeatmap";
import { FindingsTable } from "@/components/scan/FindingsTable";
import { DastPanel } from "@/components/scan/DastPanel";
import { FINDINGS, type Sector } from "@/lib/scan-data";

export const Route = createFileRoute("/scan")({
  validateSearch: z.object({ repo: z.string().default("github.com/acme-labs/ledger-api") }),
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
  const { repo } = Route.useSearch();
  const [scanning, setScanning] = useState(true);
  const [sector, setSector] = useState<Sector>("fintech");
  const [applied, setApplied] = useState(false);
  const [focusPath, setFocusPath] = useState<string | null>(null);
  const [tab, setTab] = useState<"static" | "dast">("static");
  const cached = /demo|cached|offline/i.test(repo);

  const handleDone = useCallback(() => setScanning(false), []);

  const selectFile = (path: string) => {
    setFocusPath(path);
    const f = FINDINGS.find((x) => x.filePath === path);
    if (f) document.getElementById(`finding-${f.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
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
        {cached && (
          <div className="rounded-lg border border-sev-medium/40 bg-sev-medium/10 px-4 py-2.5 text-xs text-sev-medium">
            Live scan unavailable — showing cached scan from 14 Jul 2026, 09:22 UTC.
          </div>
        )}

        <ScanProgress repo={repo} onDone={handleDone} />

        {tab === "dast" ? (
          <DastPanel />
        ) : (
          <>
            <SectorPanel
              sector={sector}
              onSector={(s) => {
                setSector(s);
                setApplied(false);
              }}
              confirmed={applied}
              onConfirm={() => setApplied(true)}
            />

            <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
              <FileTreeHeatmap
                sector={sector}
                applied={applied}
                selected={focusPath}
                onSelect={selectFile}
              />
              <div className={scanning ? "pointer-events-none opacity-50" : ""}>
                <FindingsTable sector={sector} applied={applied} focusPath={focusPath} />
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
