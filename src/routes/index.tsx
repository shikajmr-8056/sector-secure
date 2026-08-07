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

function RepoInput({ size = "lg" }: { size?: "lg" | "sm" }) {
  const navigate = useNavigate();
  const [repo, setRepo] = useState("github.com/acme-labs/ledger-api");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        navigate({ to: "/scan", search: { repo } });
      }}
      className={`flex w-full items-center gap-2 rounded-lg border border-border bg-panel/60 p-1.5 backdrop-blur-md ${
        size === "lg" ? "max-w-xl" : ""
      }`}
    >
      <span className="pl-2 font-mono text-xs text-muted-foreground">https://</span>
      <input
        value={repo}
        onChange={(e) => setRepo(e.target.value)}
        placeholder="github.com/org/repo"
        aria-label="Repository URL"
        className="min-w-0 flex-1 bg-transparent font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
      />
      <button
        type="submit"
        className="glow-accent shrink-0 rounded-md bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
      >
        Scan now
      </button>
    </form>
  );
}

function Landing() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-40" />
      <div className="pointer-events-none absolute -top-40 right-0 h-[38rem] w-[38rem] rounded-full bg-primary/10 blur-[140px]" />

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-8">
          <span className="font-mono text-lg font-bold tracking-[0.22em] text-foreground">
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
        <Link
          to="/scan"
          search={{ repo: "github.com/acme-labs/ledger-api" }}
          className="glow-accent rounded-md px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
        >
          Scan a repo
        </Link>
      </header>

      <main className="relative z-10">
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-6 pt-10 pb-20 lg:grid-cols-[1.05fr_1fr] lg:pt-16">
          <div>
            <p className="font-mono text-xs tracking-[0.2em] text-primary/80 uppercase">
              AI Vulnerability Severity Score
            </p>
            <h1 className="mt-5 text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
              Vulnerability scoring that knows your sector
            </h1>
            <p className="mt-5 max-w-lg text-base text-muted-foreground">
              Sink-based detection, EPSS-weighted likelihood and sector multipliers — every finding
              shows its flat baseline next to its AVSS score.
            </p>
            <div className="mt-8">
              <RepoInput />
            </div>
            <p className="mt-3 font-mono text-xs text-muted-foreground">
              Read-only clone · no code retained after scoring
            </p>
          </div>

          <div className="relative aspect-square w-full">
            <div className="absolute inset-0 rounded-full bg-primary/5 blur-3xl" />
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

        <section id="product" className="mx-auto max-w-6xl px-6 pb-20">
          <div className="grid gap-4 md:grid-cols-3">
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
            ].map((c) => (
              <div key={c.title} className="panel rounded-xl p-5">
                <h2 className="text-sm font-medium text-foreground">{c.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.body}</p>
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
