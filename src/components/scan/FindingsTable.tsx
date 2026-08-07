import { useMemo, useState, useCallback } from "react";
import { AnimatePresence, motion } from "motion/react";
<<<<<<< HEAD
import { avss, scoreColor, severityBucket, BUCKET_COLOR, type Finding, type Sector } from "@/lib/scan-data";

// ── Syntax-highlighted code ────────────────────────────────────────────────
=======
import { avss, scoreColor, type Finding, type Sector } from "@/lib/scan-data";

>>>>>>> 86aa094 (feat: update UI components, styling, and add backend scanner service)
const SEV_COLOR: Record<NonNullable<Finding["severity"]>, string> = {
  critical: "var(--sev-critical)",
  high:     "var(--sev-high)",
  medium:   "var(--sev-medium)",
  low:      "var(--sev-low)",
};

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
                /^(const|let|var|await|return|if|else|new|function|async|import|export|from)$/.test(w) ? (
                  <span key={j} className="text-primary/80">{w}</span>
                ) : (
                  <span key={j}>{w}</span>
                )
              )}
          </span>
        )
      )}
    </>
  );
}

// ── Expanded finding row ────────────────────────────────────────────────────
function ExpandedRow({ f, sector }: { f: Finding; sector: Sector }) {
  const [showFix, setShowFix] = useState(false);
  const [loadingFix, setLoadingFix] = useState(false);
  const [fixDiff, setFixDiff] = useState<Finding["diff"]>(f.diff);
  const [fixNote, setFixNote] = useState<string | undefined>(f.fixNote);
<<<<<<< HEAD

=======
  
>>>>>>> 86aa094 (feat: update UI components, styling, and add backend scanner service)
  const handleSuggestFix = async () => {
    if (!showFix && !fixDiff) {
      setLoadingFix(true);
      setShowFix(true);
      try {
<<<<<<< HEAD
        const API_URL = (import.meta.env as any)["VITE_API_URL"] || "http://localhost:5000";
=======
        const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
>>>>>>> 86aa094 (feat: update UI components, styling, and add backend scanner service)
        const res = await fetch(`${API_URL}/suggest-fix`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ finding: f }),
        });
        if (res.ok) {
          const data = await res.json();
          setFixDiff(data.diff);
          setFixNote(data.fixNote);
        }
      } catch (e) {
        console.error("Failed to suggest fix", e);
      } finally {
        setLoadingFix(false);
      }
    } else {
      setShowFix((s) => !s);
    }
  };

<<<<<<< HEAD
  const score = avss(f, sector);
  const bucket = severityBucket(score);

=======
>>>>>>> 86aa094 (feat: update UI components, styling, and add backend scanner service)
  return (
    <div className="border-t border-border bg-background/40 px-4 py-4">
      <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
        {/* Code snippet */}
        <div className="overflow-hidden rounded-md border border-border bg-panel/60">
          {f.snippet ? (
            f.snippet.map((l) => (
              <div
                key={l.n}
                className={`flex gap-3 px-3 py-1 font-mono text-[11.5px] ${
<<<<<<< HEAD
                  l.n === f.lineNumber ? "bg-sev-critical/10" : ""
=======
                  l.n === (f.lineNumber ?? f.lineNumber) ? "bg-sev-critical/10" : ""
>>>>>>> 86aa094 (feat: update UI components, styling, and add backend scanner service)
                }`}
              >
                <span className="w-8 shrink-0 text-right text-muted-foreground/60">{l.n}</span>
                <span className="whitespace-pre-wrap text-foreground/90">
                  <Code code={l.code} />
                </span>
              </div>
            ))
          ) : (
            <div className="p-4 text-xs text-muted-foreground italic">No code snippet available</div>
          )}
        </div>

        {/* Meta + actions */}
        <div className="space-y-3">
<<<<<<< HEAD
          {/* AVSS score breakdown */}
          <div className="rounded-md border border-border bg-panel/40 px-3 py-2 space-y-1">
            <p className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">AVSS score breakdown</p>
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-2xl font-black" style={{ color: BUCKET_COLOR[bucket] }}>
                {score.toFixed(1)}
              </span>
              <span className="font-mono text-xs text-muted-foreground line-through">{(f.baseSeverity ?? f.baseline ?? 0).toFixed(1)}</span>
              <span className="font-mono text-[10px] text-muted-foreground">{f.reason ?? ""}</span>
            </div>
            {f.epssScore != null && (
              <p className="font-mono text-[10px] text-muted-foreground">
                EPSS: <span className="text-primary">{f.epssScore.toFixed(4)}</span>
                {f.cveId && <span className="ml-2">{f.cveId}</span>}
              </p>
            )}
=======
          <div>
            <p className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
              Evidence
            </p>
            <p className="mt-1 text-xs text-foreground">{f.evidence ?? f.reason ?? "Identified by scanner"}</p>
>>>>>>> 86aa094 (feat: update UI components, styling, and add backend scanner service)
          </div>

          <div>
<<<<<<< HEAD
            <p className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">Evidence</p>
            <p className="mt-1 text-xs text-foreground">{f.evidence ?? f.reason ?? "Identified by scanner"}</p>
=======
            <p className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
              Regulatory context
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{f.citations?.[sector] ?? f.regulatoryTag ?? "No specific regulation cited."}</p>
>>>>>>> 86aa094 (feat: update UI components, styling, and add backend scanner service)
          </div>

          <div>
            <p className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">Regulatory context</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {f.citations?.[sector] ?? f.regulatoryTag ?? "No specific regulation cited."}
            </p>
          </div>

          <button
            onClick={handleSuggestFix}
            className="glow-accent rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
          >
            {showFix ? "Hide fix" : "Suggest fix"}
          </button>
        </div>
      </div>

      {/* Fix diff */}
      <AnimatePresence initial={false}>
        {showFix && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            {loadingFix ? (
<<<<<<< HEAD
              <div className="mt-4 rounded-md border border-border bg-panel/60 p-4">
                <p className="animate-pulse text-xs text-muted-foreground">Generating remediation patch…</p>
=======
              <div className="mt-4 p-4 rounded-md border border-border bg-panel/60">
                <p className="text-xs text-muted-foreground animate-pulse">Generating AI patch and remediation plan...</p>
>>>>>>> 86aa094 (feat: update UI components, styling, and add backend scanner service)
              </div>
            ) : fixDiff ? (
              <>
                <div className="mt-4 overflow-hidden rounded-md border border-border bg-panel/60">
                  {fixDiff.map((d, i) => (
                    <div
                      key={i}
                      className="flex gap-3 px-3 py-1 font-mono text-[11.5px]"
                      style={{
                        background:
                          d.sign === "+"
                            ? "color-mix(in oklab, var(--sev-low) 12%, transparent)"
                            : d.sign === "-"
                              ? "color-mix(in oklab, var(--sev-critical) 12%, transparent)"
                              : "transparent",
                      }}
                    >
                      <span
                        className="w-3 shrink-0"
                        style={{
<<<<<<< HEAD
                          color: d.sign === "+" ? "var(--sev-low)" : d.sign === "-" ? "var(--sev-critical)" : "var(--muted-foreground)",
=======
                          color:
                            d.sign === "+"
                              ? "var(--sev-low)"
                              : d.sign === "-"
                                ? "var(--sev-critical)"
                                : "var(--muted-foreground)",
>>>>>>> 86aa094 (feat: update UI components, styling, and add backend scanner service)
                        }}
                      >
                        {d.sign}
                      </span>
                      <span className="whitespace-pre-wrap text-foreground/90">
                        <Code code={d.code} />
                      </span>
                    </div>
                  ))}
                </div>
                {fixNote && <p className="mt-2 text-xs text-muted-foreground">{fixNote}</p>}
              </>
            ) : (
<<<<<<< HEAD
              <div className="mt-4 rounded-md border border-border bg-panel/60 p-4">
                <p className="italic text-xs text-muted-foreground">No fix available.</p>
=======
              <div className="mt-4 p-4 rounded-md border border-border bg-panel/60">
                <p className="text-xs text-muted-foreground italic">No fix available for this finding.</p>
>>>>>>> 86aa094 (feat: update UI components, styling, and add backend scanner service)
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Filter chip ─────────────────────────────────────────────────────────────
function FilterChip({
  label,
  count,
  active,
  color,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  color?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[10px] transition-all ${
        active
          ? "border-transparent text-background"
          : "border-border text-muted-foreground hover:text-foreground"
      }`}
      style={active ? { background: color ?? "var(--primary)", borderColor: color ?? "var(--primary)" } : {}}
    >
      {label}
      <span
        className={`rounded-full px-1 font-bold tabular-nums ${active ? "bg-background/20" : "bg-muted"}`}
      >
        {count}
      </span>
    </button>
  );
}

// ── Main export ─────────────────────────────────────────────────────────────
export function FindingsTable({
  sector,
  applied,
  focusPath,
  findings,
}: {
  sector: Sector;
  applied: boolean;
  focusPath: string | null;
  findings: Finding[];
}) {
  const [open, setOpen] = useState<string | null>(null);
<<<<<<< HEAD
  const [filterSource, setFilterSource] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Compute filter options
  const sources = useMemo(() => {
    const map: Record<string, number> = {};
    findings.forEach((f) => {
      const s = f.source ?? f.tool ?? "unknown";
      map[s] = (map[s] ?? 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [findings]);

  const types = useMemo(() => {
    const map: Record<string, number> = {};
    findings.forEach((f) => {
      if (f.type) map[f.type] = (map[f.type] ?? 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [findings]);

  const rows = useMemo(() => {
    let filtered = findings;
    if (filterSource) filtered = filtered.filter((f) => (f.source ?? f.tool ?? "unknown") === filterSource);
    if (filterType)   filtered = filtered.filter((f) => f.type === filterType);
    return [...filtered].sort((a, b) =>
      applied
        ? avss(b, sector) - avss(a, sector)
        : (b.baseSeverity ?? b.baseline ?? 0) - (a.baseSeverity ?? a.baseline ?? 0)
    );
  }, [sector, applied, findings, filterSource, filterType]);

  const handleExport = useCallback(() => {
    const payload = JSON.stringify(
      rows.map((f) => ({
        id: f.id,
        title: f.title,
        type: f.type,
        source: f.source,
        filePath: f.filePath,
        lineNumber: f.lineNumber,
        baseSeverity: f.baseSeverity ?? f.baseline,
        avssScore: f.avssScore ?? avss(f, sector),
        epssScore: f.epssScore,
        cveId: f.cveId,
        evidence: f.evidence,
        regulatoryTag: f.regulatoryTag,
      })),
      null,
      2
    );
    navigator.clipboard.writeText(payload).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [rows, sector]);

  const SOURCE_COLOR: Record<string, string> = {
    semgrep:       "var(--primary)",
    gitleaks:      "var(--sev-critical)",
    "custom-rule": "var(--sev-medium)",
    sca:           "var(--sev-high)",
  };
=======

  const rows = useMemo(() => {
    return [...findings].sort((a, b) =>
      applied ? avss(b, sector) - avss(a, sector) : (b.baseSeverity ?? b.baseline ?? 0) - (a.baseSeverity ?? a.baseline ?? 0),
    );
  }, [sector, applied, findings]);
>>>>>>> 86aa094 (feat: update UI components, styling, and add backend scanner service)

  return (
    <div className="panel overflow-hidden rounded-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-medium">
          Findings
          {(filterSource || filterType) && (
            <span className="ml-2 font-mono text-[10px] text-muted-foreground">
              {rows.length} shown
            </span>
          )}
        </h2>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] text-muted-foreground">
            baseline <span className="line-through">flat</span> → AVSS ·{" "}
            {applied ? "sector applied" : "unweighted"}
          </span>
          <button
            onClick={handleExport}
            className="rounded-md border border-border px-2.5 py-1 font-mono text-[10px] text-muted-foreground transition-colors hover:text-foreground"
          >
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
              {filterSource && (
                <FilterChip label="All" count={findings.length} active={false} onClick={() => setFilterSource(null)} />
              )}
              {sources.map(([src, count]) => (
                <FilterChip
                  key={src}
                  label={src}
                  count={count}
                  active={filterSource === src}
                  {...(SOURCE_COLOR[src] ? { color: SOURCE_COLOR[src] } : {})}
                  onClick={() => setFilterSource(filterSource === src ? null : src)}
                />
              ))}
            </div>
          )}
          {types.length > 1 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-mono text-[9px] tracking-widest text-muted-foreground uppercase w-12">Type</span>
              {filterType && (
                <FilterChip label="All" count={findings.length} active={false} onClick={() => setFilterType(null)} />
              )}
              {types.map(([type, count]) => (
                <FilterChip
                  key={type}
                  label={type.replace(/-/g, " ")}
                  count={count}
                  active={filterType === type}
                  onClick={() => setFilterType(filterType === type ? null : type)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Rows */}
      <div className="divide-y divide-border">
        {rows.length === 0 && (
          <p className="px-4 py-8 text-center text-xs text-muted-foreground">
            No findings match the selected filters.
          </p>
        )}
        {rows.map((f, i) => {
          const base = f.baseSeverity ?? f.baseline ?? 0;
          const live = applied ? avss(f, sector) : base;
          const isOpen = open === f.id;
          const focused = focusPath === f.filePath;
          const bucket = severityBucket(live);

          return (
            <motion.div
              key={f.id}
              layout
              transition={{ layout: { type: "spring", stiffness: 260, damping: 30, delay: i * 0.03 } }}
              id={`finding-${f.id}`}
              className={focused ? "bg-primary/5" : ""}
            >
              <button
                onClick={() => setOpen(isOpen ? null : f.id)}
                className="flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-muted/40"
              >
                <span className="w-4 shrink-0 font-mono text-[11px] text-muted-foreground">
                  {isOpen ? "−" : "+"}
                </span>

                {/* Severity color bar on left */}
                <div
                  className="h-8 w-0.5 shrink-0 rounded-full"
                  style={{ background: BUCKET_COLOR[bucket] }}
                />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">{f.title}</p>
                  <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
<<<<<<< HEAD
                    {f.filePath}:{f.lineNumber} ·{" "}
                    <span style={{ color: SOURCE_COLOR[f.source ?? ""] ?? "var(--muted-foreground)" }}>
                      {f.source ?? f.tool ?? "unknown"}
                    </span>
                    {f.cveId && (
                      <span className="ml-2 text-muted-foreground/60">{f.cveId}</span>
                    )}
=======
                    {f.filePath}:{f.lineNumber ?? f.line} · {f.tool ?? f.source ?? "unknown"}
>>>>>>> 86aa094 (feat: update UI components, styling, and add backend scanner service)
                  </p>
                </div>

                <span
                  className="hidden shrink-0 rounded-full border px-2 py-0.5 font-mono text-[10px] sm:block"
<<<<<<< HEAD
                  style={{ color: BUCKET_COLOR[bucket], borderColor: BUCKET_COLOR[bucket] }}
                >
                  {bucket}
=======
                  style={{ color: SEV_COLOR[f.severity ?? "low"], borderColor: SEV_COLOR[f.severity ?? "low"] }}
                >
                  {f.severity ?? "low"}
>>>>>>> 86aa094 (feat: update UI components, styling, and add backend scanner service)
                </span>

                <div className="flex shrink-0 items-baseline gap-2 font-mono tabular-nums">
<<<<<<< HEAD
                  <span className="text-xs text-muted-foreground line-through">{base.toFixed(1)}</span>
=======
                  <span className="text-xs text-muted-foreground line-through">
                    {base.toFixed(1)}
                  </span>
>>>>>>> 86aa094 (feat: update UI components, styling, and add backend scanner service)
                  <motion.span
                    key={`${live}`}
                    initial={{ opacity: 0.4, y: -3 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-base font-bold"
                    style={{ color: scoreColor(live) }}
                  >
                    {live.toFixed(1)}
                  </motion.span>
                </div>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
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
