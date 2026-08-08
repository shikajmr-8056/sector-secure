import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  type DastCheck, type DastScanResult, type DastResult,
  DAST_STAGES, DAST_CATEGORY_COLOR, dastResultColor, gradeColor,
} from "@/lib/scan-data";
import { apiPath } from "@/lib/api";

// ── Radar / spider chart (pure SVG, no lib dependency) ─────────────────────
function RadarChart({ scores }: { scores: Record<string, number> }) {
  const cats = Object.keys(scores);
  const n = cats.length;
  if (n < 3) return null;
  const cx = 90; const cy = 90; const r = 70;
  const angleStep = (2 * Math.PI) / n;
  const pt = (i: number, val: number) => {
    const a = angleStep * i - Math.PI / 2;
    const rv = (val / 10) * r;
    return { x: cx + rv * Math.cos(a), y: cy + rv * Math.sin(a) };
  };
  const axis = (i: number) => {
    const a = angleStep * i - Math.PI / 2;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  };
  const polygon = (vals: number[]) =>
    vals.map((v, i) => { const p = pt(i, v); return `${p.x},${p.y}`; }).join(" ");
  const values = cats.map(c => scores[c] || 0);
  const gridLevels = [2, 4, 6, 8, 10];
  return (
    <svg viewBox="0 0 180 180" className="w-full max-w-[180px]" aria-label="Risk radar chart">
      {gridLevels.map(lv => (
        <polygon key={lv} points={polygon(cats.map(() => lv))}
          fill="none" stroke="var(--border)" strokeWidth="0.5" opacity="0.5" />
      ))}
      {cats.map((_, i) => {
        const a = axis(i);
        return <line key={i} x1={cx} y1={cy} x2={a.x} y2={a.y}
          stroke="var(--border)" strokeWidth="0.5" opacity="0.5" />;
      })}
      <motion.polygon
        initial={{ points: polygon(cats.map(() => 0)) }}
        animate={{ points: polygon(values) }}
        transition={{ duration: 0.9, ease: "easeOut" }}
        fill="color-mix(in oklab, var(--sev-critical) 18%, transparent)"
        stroke="var(--sev-critical)" strokeWidth="1.5" />
      {cats.map((c, i) => {
        const a = axis(i);
        const dx = a.x < cx - 5 ? -4 : a.x > cx + 5 ? 4 : 0;
        const dy = a.y < cy - 5 ? -6 : a.y > cy + 5 ? 10 : 0;
        return (
          <text key={c} x={a.x + dx} y={a.y + dy}
            textAnchor="middle" fontSize="7" fill="var(--muted-foreground)">{c}</text>
        );
      })}
    </svg>
  );
}

// ── Severity heatmap bar (horizontal) ──────────────────────────────────────
function SeverityBar({ value, max = 10 }: { value: number; max?: number }) {
  const pct = Math.min(100, (value / max) * 100);
  const color =
    value >= 8 ? "var(--sev-critical)"
    : value >= 5 ? "var(--sev-medium)"
    : value > 0 ? "var(--primary)"
    : "var(--muted-foreground)";
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <motion.div className="h-full rounded-full"
        style={{ backgroundColor: color }}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.6, ease: "easeOut" }} />
    </div>
  );
}

// ── Grade badge ─────────────────────────────────────────────────────────────
function GradeBadge({ grade }: { grade: string }) {
  return (
    <motion.div
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className="flex h-16 w-16 items-center justify-center rounded-xl border-2 font-mono text-2xl font-black"
      style={{ borderColor: gradeColor(grade), color: gradeColor(grade) }}>
      {grade}
    </motion.div>
  );
}

// ── Result chip ──────────────────────────────────────────────────────────────
function ResultChip({ result }: { result: DastResult }) {
  const label = { pass: "PASS", fail: "FAIL", warn: "WARN", info: "INFO" }[result];
  return (
    <span className="shrink-0 rounded border px-2 py-0.5 font-mono text-[10px] font-bold uppercase"
      style={{ color: dastResultColor(result), borderColor: dastResultColor(result) }}>
      {label}
    </span>
  );
}

// ── AI Fix panel per check ───────────────────────────────────────────────────
function AISuggestion({ check }: { check: DastCheck }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fix, setFix] = useState<{ steps: string[]; snippet: string; note: string } | null>(null);

  const handleOpen = async () => {
    if (open) { setOpen(false); return; }
    setOpen(true);
    if (fix) return;
    setLoading(true);
    try {
      // Call /suggest-fix with a DAST-shaped payload
      const res = await fetch(apiPath("/suggest-fix"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          finding: {
            type: check.id,
            title: check.name,
            description: check.description,
            codeSnippet: check.remediation || "",
            fixNote: check.remediation || "",
          },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        // Augment with structured DAST steps derived from remediation text
        setFix({
          steps: (check.remediation || "Follow security best practices.").split(". ").filter(Boolean),
          snippet: data.diff?.map((d: any) => `${d.sign} ${d.code}`).join("\n") || "",
          note: data.fixNote || check.remediation || "",
        });
      }
    } catch (_) {
      setFix({ steps: ["Review the remediation guidance above."], snippet: "", note: check.remediation || "" });
    } finally { setLoading(false); }
  };

  if (!check.remediation) return null;
  return (
    <div className="mt-2">
      <button onClick={handleOpen}
        className="rounded-md bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary hover:bg-primary/20 transition-colors">
        {open ? "Hide fix" : "AI-suggested fix"}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} className="overflow-hidden mt-2">
            {loading ? (
              <p className="text-xs text-muted-foreground animate-pulse">Generating remediation plan…</p>
            ) : fix ? (
              <div className="rounded-md border border-border bg-panel/60 p-3 space-y-2">
                <p className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">Remediation steps</p>
                <ol className="space-y-1 list-decimal list-inside">
                  {fix.steps.map((s, i) => (
                    <li key={i} className="text-[11px] text-foreground/90">{s}</li>
                  ))}
                </ol>
                {fix.snippet && (
                  <pre className="mt-2 overflow-x-auto rounded bg-background/60 p-2 font-mono text-[10px] text-foreground/80">
                    {fix.snippet}
                  </pre>
                )}
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Category heatmap grid ────────────────────────────────────────────────────
function CategoryHeatmap({ checks }: { checks: DastCheck[] }) {
  const cats = ["TLS", "Headers", "Cookies", "Info Leakage"] as const;
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {cats.map(cat => {
        const catChecks = checks.filter(c => c.category === cat);
        const failing = catChecks.filter(c => c.result === "fail").length;
        const warning = catChecks.filter(c => c.result === "warn").length;
        const maxSev = catChecks.reduce((m, c) => Math.max(m, c.severity), 0);
        const color = maxSev >= 8 ? "var(--sev-critical)" : maxSev >= 5 ? "var(--sev-medium)" : maxSev > 0 ? "var(--primary)" : "var(--muted-foreground)";
        return (
          <motion.div key={cat}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-lg border border-border p-3 flex flex-col gap-1.5"
            style={{ borderColor: maxSev > 0 ? color : undefined }}>
            <span className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">{cat}</span>
            <span className="font-mono text-xl font-black" style={{ color }}>{maxSev > 0 ? maxSev.toFixed(1) : "—"}</span>
            <div className="flex gap-2 font-mono text-[10px]">
              {failing > 0 && <span style={{ color: "var(--sev-critical)" }}>{failing} fail</span>}
              {warning > 0 && <span style={{ color: "var(--sev-medium)" }}>{warning} warn</span>}
              {failing === 0 && warning === 0 && <span className="text-muted-foreground">all clear</span>}
            </div>
            <SeverityBar value={maxSev} />
          </motion.div>
        );
      })}
    </div>
  );
}

// ── Individual check row ─────────────────────────────────────────────────────
function CheckRow({ check, index }: { check: DastCheck; index: number }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
      className="rounded-lg border border-border overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors">
        <span className="w-4 shrink-0 font-mono text-[11px] text-muted-foreground">{expanded ? "−" : "+"}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground truncate">{check.name}</p>
          <p className="font-mono text-[10px] text-muted-foreground mt-0.5">{check.category}</p>
        </div>
        <ResultChip result={check.result} />
        {check.severity > 0 && (
          <span className="shrink-0 font-mono text-sm font-bold tabular-nums"
            style={{ color: dastResultColor(check.result) }}>
            {check.severity.toFixed(1)}
          </span>
        )}
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="border-t border-border px-4 py-4 bg-background/40 space-y-3">
              <p className="text-xs text-foreground/90">{check.description}</p>
              {check.evidence && (
                <div>
                  <p className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase mb-1">Evidence</p>
                  <code className="text-[11px] text-muted-foreground bg-panel/60 rounded px-2 py-1 block overflow-x-auto">{check.evidence}</code>
                </div>
              )}
              {check.result !== "pass" && check.severity > 0 && (
                <div>
                  <p className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase mb-1">Risk</p>
                  <SeverityBar value={check.severity} />
                  <span className="font-mono text-[10px] text-muted-foreground mt-1 block">CVSS-like: {check.severity.toFixed(1)} / 10</span>
                </div>
              )}
              <AISuggestion check={check} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Progress overlay ─────────────────────────────────────────────────────────
function ScanningOverlay({ stage }: { stage: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16">
      <div className="relative h-12 w-12">
        <motion.div className="absolute inset-0 rounded-full border-2 border-dast/30"
          animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }} />
        <motion.div className="absolute inset-0 rounded-full border-t-2 border-dast"
          animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} />
      </div>
      <p className="font-mono text-sm text-dast">{stage}</p>
      <div className="flex gap-1.5 mt-2">
        {DAST_STAGES.map((s, i) => (
          <motion.div key={s}
            className="h-1 w-1 rounded-full bg-dast"
            animate={{ opacity: [0.2, 1, 0.2] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }} />
        ))}
      </div>
    </div>
  );
}

// ── URL input bar ────────────────────────────────────────────────────────────
function UrlInput({
  value, onChange, onScan, scanning,
}: { value: string; onChange: (v: string) => void; onScan: () => void; scanning: boolean }) {
  return (
    <form onSubmit={(e) => { e.preventDefault(); onScan(); }}
      className="flex w-full items-center gap-2 rounded-none border border-dast/50 bg-panel/60 p-1.5 backdrop-blur-md">
      <span className="pl-2 font-mono text-xs text-muted-foreground">https://</span>
      <input value={value} onChange={e => onChange(e.target.value)}
        placeholder="api.example.com or app.yoursite.com"
        aria-label="DAST target URL"
        disabled={scanning}
        className="min-w-0 flex-1 bg-transparent font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground/60 disabled:opacity-50" />
      <button type="submit" disabled={scanning || !value.trim()}
        className="shrink-0 rounded-none bg-dast px-5 py-2 text-sm font-bold text-background hover:bg-dast/90 transition-colors disabled:opacity-40">
        {scanning ? "Scanning…" : "Scan"}
      </button>
    </form>
  );
}

// ── Main DastPanel export ────────────────────────────────────────────────────
export function DastPanel({ initialUrl = "" }: { initialUrl?: string }) {
  const [url, setUrl] = useState<string>(initialUrl ?? "");
  const [scanning, setScanning] = useState(false);
  const [currentStage, setCurrentStage] = useState("");
  const [result, setResult] = useState<DastScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const stageRef = useRef(0);

  // Auto-scan if a URL was passed in via the route
  const didAutoScan = useRef(false);
  useEffect(() => {
    if (initialUrl && !didAutoScan.current) {
      didAutoScan.current = true;
      runScan(initialUrl);
    }
  }, [initialUrl]);

  async function runScan(targetUrl?: string) {
    const scanUrl = targetUrl || url;
    if (!scanUrl.trim()) return;
    setScanning(true);
    setError(null);
    setResult(null);
    stageRef.current = 0;

    // Cycle stage labels visually while waiting
    const stageInterval = setInterval(() => {
      stageRef.current = (stageRef.current + 1) % DAST_STAGES.length;
      setCurrentStage(DAST_STAGES[stageRef.current] ?? "");
    }, 900);
    setCurrentStage(DAST_STAGES[0] ?? "");

    try {
      const res = await fetch(apiPath("/scan/dast"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUrl: scanUrl }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Server returned ${res.status}`);
      }
      const data: DastScanResult = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Scan failed");
    } finally {
      clearInterval(stageInterval);
      setScanning(false);
    }
  }

  const displayChecks = result
    ? (activeCategory
        ? result.checks.filter(c => c.category === activeCategory)
        : [...result.checks].sort((a, b) => {
            const order = { fail: 0, warn: 1, pass: 2, info: 3 };
            return order[a.result] - order[b.result] || b.severity - a.severity;
          })
      )
    : [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl border border-dast/30 bg-dast/[0.06] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-medium text-foreground">Passive Surface Scan</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Read-only header, cookie, TLS and information-leakage inspection.
              No active exploitation or data injection.
            </p>
          </div>
          <span className="rounded border border-dast/50 px-2 py-0.5 font-mono text-[11px] text-dast">
            passive · non-destructive
          </span>
        </div>
        <UrlInput value={url} onChange={setUrl} onScan={() => runScan()} scanning={scanning} />
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-sev-critical/40 bg-sev-critical/10 px-4 py-3 text-xs text-sev-critical">
          Scan failed: {error}
        </div>
      )}

      {/* Scanning progress */}
      {scanning && <ScanningOverlay stage={currentStage} />}

      {/* Results */}
      <AnimatePresence mode="wait">
        {result && !scanning && (
          <motion.div key={result.targetUrl}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }} className="space-y-4">

            {/* Summary row */}
            <div className="rounded-xl border border-border bg-panel/60 p-5">
              <div className="flex flex-wrap items-center gap-6">
                <GradeBadge grade={result.summary.grade} />
                <div className="flex-1 space-y-1.5">
                  <p className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                    {result.targetUrl}
                  </p>
                  <div className="flex flex-wrap gap-4 font-mono text-xs">
                    <span style={{ color: "var(--sev-critical)" }}>
                      {result.summary.failCount} failures
                    </span>
                    <span style={{ color: "var(--sev-medium)" }}>
                      {result.summary.warnCount} warnings
                    </span>
                    <span style={{ color: "var(--sev-low)" }}>
                      {result.summary.passCount} passed
                    </span>
                  </div>
                  {result.summary.topFindings.length > 0 && (
                    <p className="text-[11px] text-muted-foreground">
                      Top issues: {result.summary.topFindings.join(" · ")}
                    </p>
                  )}
                </div>
                <div className="shrink-0">
                  <RadarChart scores={result.summary.categoryScores} />
                </div>
              </div>
            </div>

            {/* Category heatmap */}
            <div className="space-y-2">
              <p className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase px-1">
                Category risk heatmap
              </p>
              <CategoryHeatmap checks={result.checks} />
            </div>

            {/* Category filter tabs */}
            <div className="flex flex-wrap gap-1.5">
              <button onClick={() => setActiveCategory(null)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${!activeCategory ? "bg-dast/20 text-dast" : "text-muted-foreground hover:text-foreground"}`}>
                All ({result.checks.length})
              </button>
              {["TLS", "Headers", "Cookies", "Info Leakage"].map(cat => {
                const n = result.checks.filter(c => c.category === cat).length;
                return (
                  <button key={cat} onClick={() => setActiveCategory(cat === activeCategory ? null : cat)}
                    className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${activeCategory === cat ? "bg-dast/20 text-dast" : "text-muted-foreground hover:text-foreground"}`}>
                    {cat} ({n})
                  </button>
                );
              })}
            </div>

            {/* Check rows */}
            <div className="space-y-2">
              {displayChecks.map((check, i) => (
                <CheckRow key={check.id} check={check} index={i} />
              ))}
            </div>

          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {!scanning && !result && !error && (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="rounded-full border border-dast/30 p-4">
            <svg className="h-6 w-6 text-dast" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <p className="text-sm text-muted-foreground">Enter a URL above to run a passive security surface scan</p>
          <p className="font-mono text-[11px] text-muted-foreground/60">TLS · Headers · Cookies · Info Leakage</p>
        </div>
      )}
    </div>
  );
}

