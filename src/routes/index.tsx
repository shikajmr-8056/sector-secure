import { useEffect, useState, lazy, Suspense } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";

const Globe = lazy(() => import("@/components/Globe"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AVSS — Sector-aware vulnerability scoring for your repo" },
      {
        name: "description",
        content:
          "AVSS re-scores code findings with sink-based detection, EPSS weighting and sector multipliers, with plain-language regulatory context.",
      },
      { property: "og:title", content: "AVSS — Sector-aware vulnerability scoring" },
      {
        property: "og:description",
        content:
          "Sink-based detection, EPSS-weighted scores and sector multipliers — scan a repo and see baseline vs AVSS side by side.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function ScanInput({ size = "lg" }: { size?: "lg" | "sm" }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"sast" | "dast">("sast");
  const [value, setValue] = useState("");

  return (
    <div className={`flex flex-col gap-2 ${size === "lg" ? "max-w-xl" : "w-full"}`}>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => { setMode("sast"); setValue(""); }}
          className={`px-3 py-1 font-mono text-xs font-bold uppercase transition-colors border ${
            mode === "sast"
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-panel/40 text-muted-foreground hover:text-foreground"
          }`}
        >
          SAST (Repo)
        </button>
        <button
          type="button"
          onClick={() => { setMode("dast"); setValue(""); }}
          className={`px-3 py-1 font-mono text-xs font-bold uppercase transition-colors border ${
            mode === "dast"
              ? "border-dast bg-dast/15 text-dast"
              : "border-border bg-panel/40 text-muted-foreground hover:text-foreground"
          }`}
        >
          DAST (URL)
        </button>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (mode === "dast") {
            navigate({ to: "/scan", search: { repo: value || "demo-target.local" } });
          } else {
            navigate({ to: "/scan", search: { repo: value } });
          }
        }}
        className="flex w-full items-center gap-2 rounded-none border border-border bg-panel/60 p-1.5 backdrop-blur-md"
      >
        <span className="pl-2 font-mono text-xs text-muted-foreground">https://</span>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={mode === "sast" ? "github.com/org/repo" : "api.example.com or app.internal"}
          aria-label={mode === "sast" ? "Repository URL" : "DAST Target URL"}
          className="min-w-0 flex-1 bg-transparent font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
        />
        <button
          type="submit"
          className={`shrink-0 rounded-none px-5 py-2 text-sm font-bold transition-colors ${
            mode === "dast"
              ? "bg-dast text-background hover:bg-dast/90"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          }`}
        >
          {mode === "dast" ? "Scan DAST" : "Scan now"}
        </button>
      </form>
    </div>
  );
}

function Landing() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-40" />

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-8">
          <span className="font-mono text-xl font-black tracking-[0.25em] text-foreground">
            AVSS
          </span>
          <nav className="hidden gap-6 text-sm text-muted-foreground md:flex">
            <a className="transition-colors hover:text-foreground" href="#product">
              Product
            </a>
            <a className="transition-colors hover:text-foreground" href="#how">
              How it works
            </a>
            <a className="transition-colors hover:text-foreground" href="#how">
              Docs
            </a>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/scan"
            className="rounded-none border border-primary px-4 py-2 text-sm font-bold text-primary transition-colors hover:bg-primary/10"
          >
            Scan a repo
          </Link>
          <Link
            to="/scan"
            search={{ repo: "demo-dast-target.local" }}
            className="rounded-none border border-dast bg-dast/10 px-4 py-2 text-sm font-bold text-dast transition-colors hover:bg-dast/20"
          >
            Scan URL (DAST)
          </Link>
        </div>
      </header>

      <main className="relative z-10">
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-6 pt-10 pb-20 lg:grid-cols-[1.05fr_1fr] lg:pt-16">
          <div className="z-20">
            <p className="font-mono text-xs font-bold tracking-[0.2em] text-primary uppercase">
              AI Vulnerability Severity Score
            </p>
            <h1 className="mt-5 text-5xl leading-[0.95] font-black tracking-tighter text-balance sm:text-6xl lg:text-7xl">
              Vulnerability scoring that knows your sector
            </h1>
            <p className="mt-5 max-w-lg text-base text-muted-foreground">
              Sink-based detection, EPSS-weighted likelihood and sector multipliers — every finding
              shows its flat baseline next to its AVSS score.
            </p>
            <div className="mt-8">
              <ScanInput />
            </div>
            <p className="mt-3 font-mono text-xs text-muted-foreground">
              Read-only clone · no code retained after scoring
            </p>
          </div>

          <div className="relative aspect-square w-full">
            {/* Top-left HUD */}
            <div className="pointer-events-none absolute top-10 -left-10 z-10 flex flex-col gap-1">
              <span className="font-mono text-[10px] text-muted-foreground tracking-widest">
                SCAN VECTOR <span className="text-primary">+X</span> / <span className="text-foreground">LOCKED</span>
              </span>
              <div className="flex h-0.5 w-32 gap-0.5">
                <div className="h-full w-1/3 bg-primary"></div>
                <div className="h-full w-2/3 bg-muted"></div>
              </div>
            </div>
            
            {/* Top-right HUD */}
            <div className="pointer-events-none absolute top-20 -right-12 z-10 flex flex-col items-end gap-1 text-right">
              <span className="font-mono text-[10px] text-muted-foreground tracking-widest">
                THREAT COMPOSITE / <span className="text-foreground">02</span> &nbsp; REALTIME
              </span>
              <span className="font-mono text-[10px] text-muted-foreground tracking-widest mt-2">
                SEVERITY PHASE &mdash; SCORING
              </span>
              <div className="flex h-0.5 w-24 justify-end">
                <div className="h-full w-1/2 bg-primary"></div>
              </div>
            </div>

            {/* Right edge HUD */}
            <div className="pointer-events-none absolute top-1/2 -right-16 z-10 -translate-y-1/2 flex flex-col gap-2">
              <span className="font-mono text-[10px] text-muted-foreground tracking-wider">EPSS <span className="text-primary">+0.42</span></span>
              <span className="font-mono text-[10px] text-muted-foreground tracking-wider">RULE PATH / <span className="text-foreground">03</span></span>
              <span className="font-mono text-[10px] text-muted-foreground tracking-wider">CVE MATCH <span className="text-primary">+1</span></span>
            </div>

            {/* Bottom-right tab row */}
            <div className="pointer-events-none absolute -bottom-6 -right-4 z-10 flex items-end gap-6">
              <div className="flex gap-4 font-mono text-[10px] tracking-widest text-muted-foreground">
                <span className="border-b border-primary text-primary pb-1">SCAN</span>
                <span className="pb-1">RULES</span>
                <span className="pb-1">SCORE</span>
                <span className="pb-1">REPORT</span>
              </div>
              <div className="font-mono text-[10px] tracking-widest text-muted-foreground pb-1">
                EST. 2026
              </div>
            </div>

            {mounted && (
              <Suspense fallback={null}>
                <Globe />
              </Suspense>
            )}
            <div className="pointer-events-none absolute bottom-2 left-2 font-mono text-[11px] text-muted-foreground">
              live scan activity · 7 regions
            </div>
          </div>
        </section>

        <section id="product" className="mx-auto max-w-6xl px-6 pb-32 pt-10">
          <div className="flex flex-col gap-12">
            {[
              {
                title: "Real sink-based detection",
                body: "Findings are reported only when tainted input reaches a dangerous sink on a reachable path.",
              },
              {
                title: "Sector-aware scoring (AVSS)",
                body: "Baseline severity is multiplied by sector weight and EPSS likelihood, not re-labelled by hand.",
              },
              {
                title: "Explainable regulatory context",
                body: "Each score cites the specific clause it maps to — PCI-DSS, HIPAA, DPDP — in plain language.",
              },
              {
                title: "Explainable, not a black box",
                body: "See exactly why a score moved up or down with transparent attribution.",
              }
            ].map((c, i) => (
              <div key={c.title} className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
                <div className="font-mono text-4xl lg:text-5xl font-black text-primary">0{i + 1}</div>
                <div className="flex flex-col">
                  <h2 className="text-lg font-bold text-foreground">{c.title}</h2>
                  <p className="mt-1 text-base text-muted-foreground">{c.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="how" className="mx-auto max-w-6xl px-6 pb-24">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3 border-y border-border py-5 font-mono text-xs text-muted-foreground">
            <span className="text-muted-foreground/60">scans against</span>
            <span>Semgrep</span>
            <span>Gitleaks</span>
            <span>OSV.dev</span>
            <span>EPSS</span>
            <span className="text-muted-foreground/60">· sector multipliers applied last</span>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-xs text-muted-foreground">
          <span className="font-mono tracking-[0.2em]">AVSS</span>
          <div className="flex gap-6">
            <a className="hover:text-foreground" href="#product">
              Product
            </a>
            <a className="hover:text-foreground" href="#how">
              Docs
            </a>
            <a className="hover:text-foreground" href="#how">
              Changelog
            </a>
            <a className="hover:text-foreground" href="#how">
              Security
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
