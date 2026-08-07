import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { type ScanStats } from "@/lib/scan-data";

const SOURCE_META: Record<string, { label: string; color: string; desc: string }> = {
  semgrep:      { label: "Semgrep",       color: "var(--primary)",       desc: "SAST — generic rules (SQLi, XSS, eval, path traversal…)" },
  gitleaks:     { label: "Gitleaks",      color: "var(--sev-critical)",  desc: "Secret detection — API keys, AWS creds, JWT tokens, private keys" },
  "custom-rule":{ label: "Custom rules",  color: "var(--sev-medium)",    desc: "Sector-pattern engine — PHI sinks, Luhn card, CVV/PIN, price-manip" },
  sca:          { label: "SCA / OSV.dev", color: "var(--sev-high)",      desc: "Dependency vulnerabilities with EPSS scores from FIRST.org" },
  unknown:      { label: "Other",         color: "var(--muted-foreground)", desc: "Unclassified findings" },
};

const TYPE_META: Record<string, string> = {
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
  "path-traversal":        "var(--sev-medium)",
  "vulnerable-dependency": "var(--sev-medium)",
  "generic-sast-finding":  "var(--muted-foreground)",
};

function HBar({
  label,
  count,
  total,
  color,
  desc,
  pct,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
  desc?: string;
  pct: number;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between font-mono text-[11px]">
        <span className="text-foreground">{label}</span>
        <span className="text-muted-foreground tabular-nums">
          {count} <span className="text-muted-foreground/50">/ {total}</span>
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.65, ease: "easeOut" }}
        />
      </div>
      {desc && <p className="font-mono text-[9px] text-muted-foreground/70">{desc}</p>}
    </div>
  );
}

export function SourceBreakdown({ stats }: { stats: ScanStats }) {
  const [view, setView] = useState<"source" | "type">("source");

  const { sourceRows, typeRows } = useMemo(() => {
    const total = stats.total || 1;

    const sourceRows = Object.entries(stats.bySource)
      .sort((a, b) => b[1] - a[1])
      .map(([src, count]) => {
        const meta = SOURCE_META[src] ?? SOURCE_META["unknown"]!;
        return {
          key: src,
          label: meta.label,
          color: meta.color,
          desc: meta.desc,
          count,
          pct: (count / total) * 100,
        };
      });

    const typeRows = Object.entries(stats.byType)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([type, count]) => ({
        key: type,
        label: type.replace(/-/g, " "),
        color: TYPE_META[type] ?? "var(--muted-foreground)",
        count,
        pct: (count / total) * 100,
      }));

    return { sourceRows, typeRows };
  }, [stats]);

  if (stats.total === 0) return null;

  const rows = view === "source" ? sourceRows : typeRows;

  return (
    <div className="panel rounded-xl p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-medium">Findings breakdown</h2>
        <div className="flex gap-1">
          {(["source", "type"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-md px-3 py-1 font-mono text-[10px] uppercase tracking-widest transition-colors ${
                view === v
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {v === "source" ? "By scanner" : "By type"}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {rows.map((r) => (
          <HBar
            key={r.key}
            label={r.label}
            count={r.count}
            total={stats.total}
            color={r.color}
            desc={"desc" in r ? (r as any).desc : undefined}
            pct={r.pct}
          />
        ))}
      </div>

      {/* Donut-style summary (pure CSS) */}
      <div className="mt-4 flex flex-wrap gap-3">
        {sourceRows.map((r) => (
          <span key={r.key} className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
            <i className="inline-block h-2 w-2 rounded-full shrink-0" style={{ background: r.color }} />
            {r.label} ({Math.round(r.pct)}%)
          </span>
        ))}
      </div>
    </div>
  );
}
