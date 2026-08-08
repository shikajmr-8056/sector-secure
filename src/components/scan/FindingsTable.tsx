import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { avss, scoreColor, severityBucket, BUCKET_COLOR, type Finding, type Sector } from "@/lib/scan-data";
import { apiPath } from "@/lib/api";

// ── Syntax highlighter ────────────────────────────────────────────────────────
function Code({ code }: { code: string }) {
  const parts = code.split(/(".*?"|'.*?'|`.*?`)/g);
  return (
    <>
      {parts.map((p, i) =>
        /^["'`]/.test(p) ? (
          <span key={i} style={{ color: "var(--sev-low)" }}>{p}</span>
        ) : (
          <span key={i}>
            {p.split(/\b(const|let|var|await|return|if|else|new|function|async|res|req|import|export|from)\b/g)
              .map((w, j) =>
                /^(const|let|var|await|return|if|else|new|function|async|import|export|from)$/.test(w)
                  ? <span key={j} className="text-primary/80">{w}</span>
                  : <span key={j}>{w}</span>
              )}
          </span>
        )
      )}
    </>
  );
}

// ── Animated score counter ────────────────────────────────────────────────────
function AnimatedScore({ from, to, color }: { from: number; to: number; color: string }) {
  const [display, setDisplay] = useState(from);
  const rafRef = useRef(0);
  useEffect(() => {
    const start = performance.now();
    const dur = 900;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const ease = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (to - from) * ease);
      if (t < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [from, to]);
  return <span style={{ color }}>{display.toFixed(1)}</span>;
}

// ── Fix response type ─────────────────────────────────────────────────────────
type FixResult = {
  analysis: string;
  criticality: string;
  consequences: string[];
  diff: { sign: string; code: string }[];
  fixNote: string;
  postFixScore: number;
  scoreReduction: number;
  aiPowered: boolean;
};

// ── Expanded row ──────────────────────────────────────────────────────────────
function ExpandedRow({ f, sector }: { f: Finding; sector: Sector }) {
  const [fixResult, setFixResult] = useState<FixResult | null>(null);
  const [loadingFix, setLoadingFix] = useState(false);
  const [showFix, setShowFix] = useState(false);
  const [fixApplied, setFixApplied] = useState(false);

  const liveScore = avss(f, sector);
  const bucket    = severityBucket(liveScore);

  const handleSuggestFix = async () => {
    if (showFix && fixResult) { setShowFix(false); return; }
    if (fixResult) { setShowFix(true); return; }
    setLoadingFix(true);
    setShowFix(true);
    try {
      const snippetCode = f.snippet?.map(l => l.code).join("\n") ?? "";
      const res = await fetch(apiPath("/suggest-fix"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ finding: { ...f, codeSnippet: snippetCode } }),
      });
      if (res.ok) setFixResult(await res.json());
    } catch (e) { console.error("suggest-fix failed", e); }
    finally { setLoadingFix(false); }
  };

  const postScore = fixResult?.postFixScore ?? liveScore;
  const reduction = fixResult?.scoreReduction ?? 0;

  return (
    <div className="border-t border-border bg-background/40 px-4 py-4 space-y-4">

      {/* ── Code snippet ── */}
      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="overflow-hidden rounded-md border border-border bg-panel/60">
          {f.snippet ? (
            f.snippet.map((l) => (
              <div key={l.n}
                className={`flex gap-3 px-3 py-1 font-mono text-[11.5px] ${l.n === f.lineNumber ? "bg-sev-critical/10" : ""}`}>
                <span className="w-8 shrink-0 text-right text-muted-foreground/60">{l.n}</span>
                <span className="whitespace-pre-wrap text-foreground/90"><Code code={l.code} /></span>
              </div>
            ))
          ) : (
            <div className="p-4 text-xs text-muted-foreground italic">No code snippet available</div>
          )}
        </div>

        {/* ── Score + meta ── */}
        <div className="space-y-3">
          <div className="rounded-md border border-border bg-panel/40 px-3 py-2.5 space-y-1.5">
            <p className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">AVSS score</p>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-3xl font-black" style={{ color: BUCKET_COLOR[bucket] }}>
                {liveScore.toFixed(1)}
              </span>
              <span className="font-mono text-xs text-muted-foreground line-through">{(f.baseSeverity ?? 0).toFixed(1)}</span>
              <span className="font-mono text-[10px] text-muted-foreground">{f.reason ?? ""}</span>
            </div>
            {f.epssScore != null && (
              <p className="font-mono text-[10px] text-muted-foreground">
                EPSS <span className="text-primary">{f.epssScore.toFixed(4)}</span>
                {f.cveId && <span className="ml-2 text-muted-foreground/60">{f.cveId}</span>}
              </p>
            )}
          </div>
          <div>
            <p className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase mb-1">Regulatory context</p>
            <p className="text-xs text-muted-foreground">{f.citations?.[sector] ?? f.regulatoryTag ?? "No specific regulation cited."}</p>
          </div>
          <div>
            <p className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase mb-1">Evidence</p>
            <p className="text-xs text-foreground">{f.evidence ?? f.reason ?? "Identified by scanner"}</p>
          </div>
          <button onClick={handleSuggestFix}
            className="glow-accent rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20">
            {loadingFix ? "Generating AI fix…" : showFix ? "Hide fix" : "AI-suggested fix"}
          </button>
        </div>
      </div>

      {/* ── AI Fix Panel ── */}
      <AnimatePresence initial={false}>
        {showFix && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            {loadingFix ? (
              <div className="rounded-xl border border-border bg-panel/60 p-5">
                <div className="flex items-center gap-3">
                  <motion.div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent"
                    animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} />
                  <p className="text-xs text-muted-foreground">Generating AI-powered analysis…</p>
                </div>
              </div>
            ) : fixResult ? (
              <div className="space-y-3">

                {/* Problem description */}
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-border bg-panel/60 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    <p className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">What is this problem?</p>
                    {fixResult.aiPowered && (
                      <span className="ml-auto font-mono text-[9px] rounded border border-primary/40 px-1.5 py-0.5 text-primary">AI</span>
                    )}
                  </div>
                  <p className="text-xs text-foreground/90 leading-relaxed">{fixResult.analysis}</p>
                </motion.div>

                {/* Criticality */}
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.07 }}
                  className="rounded-xl border p-4 space-y-2"
                  style={{
                    borderColor: `color-mix(in oklab, ${BUCKET_COLOR[bucket]} 40%, transparent)`,
                    background: `color-mix(in oklab, ${BUCKET_COLOR[bucket]} 7%, transparent)`,
                  }}>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full animate-pulse" style={{ background: BUCKET_COLOR[bucket] }} />
                    <p className="font-mono text-[10px] tracking-widest uppercase" style={{ color: BUCKET_COLOR[bucket] }}>Why is this critical?</p>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: BUCKET_COLOR[bucket] }}>{fixResult.criticality}</p>
                </motion.div>

                {/* Consequences */}
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
                  className="rounded-xl border border-border bg-panel/60 p-4 space-y-2">
                  <p className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">What can this cause?</p>
                  <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {fixResult.consequences.map((c, i) => (
                      <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.15 + i * 0.06 }}
                        className="flex items-start gap-2 rounded-md border border-border/60 px-3 py-2">
                        <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sev-critical" />
                        <span className="text-xs text-foreground/80">{c}</span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                {/* Diff */}
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
                  className="rounded-xl border border-border overflow-hidden">
                  <div className="border-b border-border bg-panel/60 px-4 py-2.5 flex items-center justify-between">
                    <p className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">Suggested fix</p>
                    {!fixApplied && (
                      <button onClick={() => setFixApplied(true)}
                        className="rounded-md bg-primary/10 px-2.5 py-1 font-mono text-[10px] text-primary hover:bg-primary/20 transition-colors">
                        Apply fix
                      </button>
                    )}
                    {fixApplied && (
                      <span className="font-mono text-[10px] text-sev-low">✓ Fix applied</span>
                    )}
                  </div>
                  <div className="bg-panel/40">
                    {fixResult.diff.map((d, i) => (
                      <div key={i} className="flex gap-3 px-3 py-1 font-mono text-[11.5px]"
                        style={{
                          background: d.sign === "+" ? "color-mix(in oklab, var(--sev-low) 12%, transparent)"
                            : d.sign === "-" ? "color-mix(in oklab, var(--sev-critical) 12%, transparent)"
                            : "transparent",
                        }}>
                        <span className="w-3 shrink-0"
                          style={{ color: d.sign === "+" ? "var(--sev-low)" : d.sign === "-" ? "var(--sev-critical)" : "var(--muted-foreground)" }}>
                          {d.sign}
                        </span>
                        <span className="whitespace-pre-wrap text-foreground/90"><Code code={d.code} /></span>
                      </div>
                    ))}
                  </div>
                  {fixResult.fixNote && (
                    <p className="border-t border-border px-4 py-2.5 text-xs text-muted-foreground">{fixResult.fixNote}</p>
                  )}
                </motion.div>

                {/* Score reduction */}
                <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.22 }}
                  className="rounded-xl border p-4"
                  style={{
                    borderColor: "color-mix(in oklab, var(--sev-low) 35%, transparent)",
                    background:  "color-mix(in oklab, var(--sev-low) 6%, transparent)",
                  }}>
                  <p className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase mb-3">Score after fix</p>
                  <div className="flex items-center gap-5">
                    <div className="text-center">
                      <p className="font-mono text-[9px] text-muted-foreground mb-1">Before</p>
                      <span className="font-mono text-2xl font-black" style={{ color: BUCKET_COLOR[bucket] }}>
                        {liveScore.toFixed(1)}
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-0.5">
                      <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.3, duration: 0.5 }}
                        className="h-0.5 w-16 origin-left"
                        style={{ background: "var(--sev-low)" }} />
                      <span className="font-mono text-[10px] font-bold" style={{ color: "var(--sev-low)" }}>
                        −{reduction.toFixed(1)}
                      </span>
                    </div>
                    <div className="text-center">
                      <p className="font-mono text-[9px] text-muted-foreground mb-1">After fix</p>
                      <span className="font-mono text-2xl font-black" style={{ color: "var(--sev-low)" }}>
                        <AnimatedScore from={liveScore} to={postScore} color="var(--sev-low)" />
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <motion.div className="h-full rounded-full bg-sev-low"
                          initial={{ width: `${(liveScore / 10) * 100}%` }}
                          animate={{ width: `${(postScore / 10) * 100}%` }}
                          transition={{ delay: 0.35, duration: 0.8, ease: "easeOut" }} />
                      </div>
                      <p className="mt-1 font-mono text-[9px] text-muted-foreground">
                        {Math.round((reduction / liveScore) * 100)}% risk reduction
                      </p>
                    </div>
                  </div>
                </motion.div>

              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Filter chip ────────────────────────────────────────────────────────────────
function FilterChip({ label, count, active, color, onClick }: {
  label: string; count: number; active: boolean; color?: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[10px] transition-all ${
        active ? "border-transparent text-background" : "border-border text-muted-foreground hover:text-foreground"
      }`}
      style={active ? { background: color ?? "var(--primary)", borderColor: color ?? "var(--primary)" } : {}}>
      {label}
      <span className={`rounded-full px-1 font-bold tabular-nums ${active ? "bg-background/20" : "bg-muted"}`}>{count}</span>
    </button>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────
export function FindingsTable({ sector, applied, focusPath, findings }: {
  sector: Sector; applied: boolean; focusPath: string | null; findings: Finding[];
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [filterSource, setFilterSource] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const sources = useMemo(() => {
    const map: Record<string, number> = {};
    findings.forEach((f) => { const s = f.source ?? f.tool ?? "unknown"; map[s] = (map[s] ?? 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [findings]);

  const types = useMemo(() => {
    const map: Record<string, number> = {};
    findings.forEach((f) => { if (f.type) map[f.type] = (map[f.type] ?? 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [findings]);

  const rows = useMemo(() => {
    let filtered = findings;
    if (filterSource) filtered = filtered.filter((f) => (f.source ?? f.tool ?? "unknown") === filterSource);
    if (filterType)   filtered = filtered.filter((f) => f.type === filterType);
    return [...filtered].sort((a, b) =>
      applied ? avss(b, sector) - avss(a, sector)
              : (b.baseSeverity ?? b.baseline ?? 0) - (a.baseSeverity ?? a.baseline ?? 0)
    );
  }, [sector, applied, findings, filterSource, filterType]);

  const handleExport = useCallback(() => {
    const payload = JSON.stringify(
      rows.map((f) => ({
        id: f.id, title: f.title, type: f.type, source: f.source,
        filePath: f.filePath, lineNumber: f.lineNumber,
        baseSeverity: f.baseSeverity ?? f.baseline,
        avssScore: f.avssScore ?? avss(f, sector),
        epssScore: f.epssScore, cveId: f.cveId, evidence: f.evidence, regulatoryTag: f.regulatoryTag,
      })), null, 2);
    navigator.clipboard.writeText(payload).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }, [rows, sector]);

  const SOURCE_COLOR: Record<string, string> = {
    semgrep: "var(--primary)", gitleaks: "var(--sev-critical)",
    "custom-rule": "var(--sev-medium)", sca: "var(--sev-high)",
  };

  return (
    <div className="panel overflow-hidden rounded-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-medium">
          Findings {(filterSource || filterType) && <span className="ml-2 font-mono text-[10px] text-muted-foreground">{rows.length} shown</span>}
        </h2>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] text-muted-foreground">
            baseline <span className="line-through">flat</span> → AVSS · {applied ? "sector applied" : "unweighted"}
          </span>
          <button onClick={handleExport}
            className="rounded-md border border-border px-2.5 py-1 font-mono text-[10px] text-muted-foreground transition-colors hover:text-foreground">
            {copied ? "✓ copied" : "export JSON"}
          </button>
        </div>
      </div>

      {/* Filter bar */}
      {(sources.length > 1 || types.length > 1) && (
        <div className="border-b border-border px-4 py-2 space-y-1.5">
          {sources.length > 1 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-mono text-[9px] tracking-widest text-muted-foreground uppercase w-12">Scanner</span>
              {filterSource && <FilterChip label="All" count={findings.length} active={false} onClick={() => setFilterSource(null)} />}
              {sources.map(([src, count]) => (
                <FilterChip key={src} label={src} count={count} active={filterSource === src}
                  {...(SOURCE_COLOR[src] ? { color: SOURCE_COLOR[src] } : {})}
                  onClick={() => setFilterSource(filterSource === src ? null : src)} />
              ))}
            </div>
          )}
          {types.length > 1 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-mono text-[9px] tracking-widest text-muted-foreground uppercase w-12">Type</span>
              {filterType && <FilterChip label="All" count={findings.length} active={false} onClick={() => setFilterType(null)} />}
              {types.map(([type, count]) => (
                <FilterChip key={type} label={type.replace(/-/g, " ")} count={count} active={filterType === type}
                  onClick={() => setFilterType(filterType === type ? null : type)} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Rows */}
      <div className="divide-y divide-border">
        {rows.length === 0 && (
          <p className="px-4 py-8 text-center text-xs text-muted-foreground">No findings match the selected filters.</p>
        )}
        {rows.map((f, i) => {
          const base   = f.baseSeverity ?? f.baseline ?? 0;
          const live   = applied ? avss(f, sector) : base;
          const isOpen = open === f.id;
          const focused= focusPath === f.filePath;
          const bucket = severityBucket(live);
          return (
            <motion.div key={f.id} layout
              transition={{ layout: { type: "spring", stiffness: 260, damping: 30, delay: i * 0.03 } }}
              id={`finding-${f.id}`} className={focused ? "bg-primary/5" : ""}>
              <button onClick={() => setOpen(isOpen ? null : f.id)}
                className="flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-muted/40">
                <span className="w-4 shrink-0 font-mono text-[11px] text-muted-foreground">{isOpen ? "−" : "+"}</span>
                <div className="h-8 w-0.5 shrink-0 rounded-full" style={{ background: BUCKET_COLOR[bucket] }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">{f.title}</p>
                  <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                    {f.filePath}:{f.lineNumber} ·{" "}
                    <span style={{ color: SOURCE_COLOR[f.source ?? ""] ?? "var(--muted-foreground)" }}>{f.source ?? f.tool ?? "unknown"}</span>
                    {f.cveId && <span className="ml-2 text-muted-foreground/60">{f.cveId}</span>}
                  </p>
                </div>
                <span className="hidden shrink-0 rounded-full border px-2 py-0.5 font-mono text-[10px] sm:block"
                  style={{ color: BUCKET_COLOR[bucket], borderColor: BUCKET_COLOR[bucket] }}>{bucket}</span>
                <div className="flex shrink-0 items-baseline gap-2 font-mono tabular-nums">
                  <span className="text-xs text-muted-foreground line-through">{base.toFixed(1)}</span>
                  <motion.span key={`${live}`} initial={{ opacity: 0.4, y: -3 }} animate={{ opacity: 1, y: 0 }}
                    className="text-base font-bold" style={{ color: scoreColor(live) }}>{live.toFixed(1)}</motion.span>
                </div>
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <ExpandedRow f={f} sector={sector} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
