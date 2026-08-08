import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { type ScanStats, type Sector, BUCKET_COLOR, scoreColor, severityBucket } from "@/lib/scan-data";

// Human-readable type labels (shared with DeepDive)
const TYPE_LABELS: Record<string, string> = {
  "phi-log-leak":            "PHI Log Leak",
  "hardcoded-secret":        "Hardcoded Secret",
  "card-number-exposure":    "Card Number (Luhn ✓)",
  "raw-cvv-pin-exposure":    "Raw CVV / PIN",
  "price-manipulation":      "Price Manipulation",
  "sql-injection":           "SQL Injection",
  "cross-site-scripting":    "XSS",
  "insecure-deserialization":"Unsafe Deser",
  "missing-authentication":  "No Auth",
  "command-injection":       "Cmd Injection",
  "path-traversal":          "Path Traversal",
  "vulnerable-dependency":   "CVE Dependency",
  "generic-sast-finding":    "SAST Finding",
};

function humanType(t: string): string {
  for (const [key, val] of Object.entries(TYPE_LABELS)) {
    if (t === key || t.includes(key)) return val;
  }
  return t.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

const TYPE_COLOR: Record<string, string> = {
  "phi-log-leak":          "var(--sev-critical)",
  "card-number-exposure":  "var(--sev-critical)",
  "hardcoded-secret":      "var(--sev-critical)",
  "raw-cvv-pin-exposure":  "var(--sev-critical)",
  "price-manipulation":    "var(--sev-high)",
  "sql-injection":         "var(--sev-high)",
  "command-injection":     "var(--sev-high)",
  "insecure-deserialization": "var(--sev-high)",
  "cross-site-scripting":  "var(--sev-medium)",
  "missing-authentication":"var(--sev-medium)",
  "vulnerable-dependency": "var(--sev-medium)",
};

// Animated counter — tweens from previous value to new target (not from 0)
function Counter({ target, decimals = 0, duration = 700 }: { target: number; decimals?: number; duration?: number }) {
  const [display, setDisplay] = useState(target);
  const prevRef  = useRef(target);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    if (typeof requestAnimationFrame === "undefined") { setDisplay(target); return; }
    const from = prevRef.current;
    prevRef.current = target;
    if (from === target) return;

    cancelAnimationFrame(frameRef.current);
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const ease = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (target - from) * ease);
      if (t < 1) frameRef.current = requestAnimationFrame(tick);
      else setDisplay(target);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration]);

  return <>{display.toFixed(decimals)}</>;
}

function StatCard({
  label,
  value,
  color,
  sub,
  decimals = 0,
}: {
  label: string;
  value: number;
  color?: string;
  sub?: string;
  decimals?: number;
}) {
  const prevValue = useRef(value);
  const changed   = prevValue.current !== value;
  const decreased = value < prevValue.current;
  useEffect(() => { prevValue.current = value; });

  return (
    <motion.div
      animate={changed ? { scale: [1, 1.04, 1] } : {}}
      transition={{ duration: 0.35 }}
      className="flex flex-col gap-1 rounded-xl border border-border bg-panel/60 px-4 py-3 backdrop-blur-sm relative overflow-hidden"
    >
      {/* Green flash when a value drops (fix applied) */}
      {decreased && (
        <motion.div
          key={value}
          initial={{ opacity: 0.5 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="absolute inset-0 rounded-xl"
          style={{ background: "color-mix(in oklab, var(--sev-low) 20%, transparent)" }}
        />
      )}
      <span className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">{label}</span>
      <span className="font-mono text-2xl font-black tabular-nums" style={{ color: color ?? "var(--foreground)" }}>
        <Counter target={value} decimals={decimals} />
      </span>
      {sub && <span className="truncate font-mono text-[10px] text-muted-foreground">{sub}</span>}
    </motion.div>
  );
}

export function SastSummary({ stats, applied }: { stats: ScanStats; applied: boolean }) {
  if (stats.total === 0) return null;

  const topFileName = stats.topRiskFile.split("/").pop() ?? stats.topRiskFile;

  return (
    <div className="space-y-3">
      {/* Main stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Total findings" value={stats.total} />
        <StatCard label="Critical" value={stats.critical}
          {...(stats.critical > 0 ? { color: BUCKET_COLOR.critical } : {})}
        />
        <StatCard label="High" value={stats.high}
          {...(stats.high > 0 ? { color: BUCKET_COLOR.high } : {})}
        />
        <StatCard label="Medium" value={stats.medium}
          {...(stats.medium > 0 ? { color: BUCKET_COLOR.medium } : {})}
        />
        <StatCard
          label="Threat score"
          value={stats.threatScore}
          decimals={1}
          color={scoreColor(stats.threatScore)}
          sub={applied ? "sector-weighted" : "baseline"}
        />
        <StatCard
          label="Avg EPSS"
          value={stats.avgEpss}
          decimals={3}
          color="var(--primary)"
          sub="exploitation likelihood"
        />
      </div>

      {/* Vulnerability types found */}
      {Object.keys(stats.byType).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-panel/60 px-4 py-2.5"
        >
          <span className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase shrink-0">
            Vuln types
          </span>
          {Object.entries(stats.byType)
            .sort((a, b) => b[1] - a[1])
            .map(([type, count]) => {
              const color = TYPE_COLOR[type] ?? "var(--muted-foreground)";
              return (
                <motion.span
                  key={type}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-[10px] font-medium"
                  style={{
                    color,
                    borderColor: `color-mix(in oklab, ${color} 35%, transparent)`,
                    background: `color-mix(in oklab, ${color} 8%, transparent)`,
                  }}
                >
                  {humanType(type)}
                  <span
                    className="rounded-full px-1 font-bold tabular-nums text-[9px]"
                    style={{ background: `color-mix(in oklab, ${color} 20%, transparent)` }}
                  >
                    {count}
                  </span>
                </motion.span>
              );
            })}
        </motion.div>
      )}

      {/* Top risk file banner */}
      {stats.topRiskFile !== "—" && (
        <motion.div
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-3 rounded-lg border px-4 py-2.5"
          style={{
            borderColor: `color-mix(in oklab, ${BUCKET_COLOR.critical} 35%, transparent)`,
            background: `color-mix(in oklab, ${BUCKET_COLOR.critical} 8%, transparent)`,
          }}
        >
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ background: BUCKET_COLOR.critical, boxShadow: `0 0 6px ${BUCKET_COLOR.critical}` }}
          />
          <span className="font-mono text-xs text-muted-foreground">Highest risk file</span>
          <span className="min-w-0 flex-1 truncate font-mono text-xs text-foreground">{topFileName}</span>
          <span className="shrink-0 font-mono text-xs font-bold" style={{ color: scoreColor(stats.topRiskScore) }}>
            AVSS {stats.topRiskScore.toFixed(1)}
          </span>
          <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{stats.topRiskFile}</span>
        </motion.div>
      )}
    </div>
  );
}
