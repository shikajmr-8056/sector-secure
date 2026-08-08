import { useMemo } from "react";
import { motion } from "motion/react";
import { avss, scoreColor, BUCKET_COLOR, severityBucket, type Finding, type Sector } from "@/lib/scan-data";

// ─── helpers ─────────────────────────────────────────────────────────────────

const SECTOR_MULTIPLIER: Record<Sector, number> = {
  healthcare: 1.6,
  fintech:    1.5,
  ecommerce:  1.3,
  general:    1.0,
};

function ScoreBar({ value, max = 10, color }: { value: number; max?: number; color: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
        initial={{ width: 0 }}
        animate={{ width: `${(value / max) * 100}%` }}
        transition={{ duration: 0.55, ease: "easeOut" }}
      />
    </div>
  );
}

function DeltaBadge({ delta }: { delta: number }) {
  if (Math.abs(delta) < 0.05) {
    return <span className="font-mono text-[10px] text-muted-foreground">=</span>;
  }
  const up = delta > 0;
  return (
    <motion.span
      initial={{ opacity: 0, x: up ? -4 : 4 }}
      animate={{ opacity: 1, x: 0 }}
      className="font-mono text-[10px] font-bold"
      style={{ color: up ? "var(--sev-critical)" : "var(--sev-low)" }}
    >
      {up ? "+" : ""}{delta.toFixed(1)}
    </motion.span>
  );
}

// ─── Static explanation table ─────────────────────────────────────────────────

const FORMULA_ROWS = [
  {
    aspect: "Base score source",
    cvss:  "CVSS v3.1 AV/AC/PR/UI/S/C/I/A vector",
    avss:  "Scanner baseSeverity (Semgrep / Gitleaks / OSV)",
  },
  {
    aspect: "Exploitation likelihood",
    cvss:  "Not included — static formula only",
    avss:  "EPSS score from FIRST.org multiplied into weight",
  },
  {
    aspect: "Industry context",
    cvss:  "Sector-agnostic — same score for all industries",
    avss:  "Sector multiplier: Healthcare 1.6×, Fintech 1.5×, E-commerce 1.3×",
  },
  {
    aspect: "Regulatory mapping",
    cvss:  "None built-in",
    avss:  "Automatic citation: DPDP Act, PCI-DSS, RBI 2026, HIPAA §164.312",
  },
  {
    aspect: "Finding type weighting",
    cvss:  "Uniform across finding types",
    avss:  "Regulatory weight 1.5–1.8× for PHI leaks, card data, credentials",
  },
  {
    aspect: "Score cap",
    cvss:  "10.0",
    avss:  "10.0 (capped)",
  },
  {
    aspect: "Formula",
    cvss:  "Base × Temporal × Environmental",
    avss:  "baseSeverity × (1 + EPSS) × sectorMultiplier × regulatoryWeight",
  },
];

// ─── Main component ───────────────────────────────────────────────────────────

export function AvssVsCvss({
  findings,
  sector,
}: {
  findings: Finding[];
  sector: Sector;
}) {
  const rows = useMemo(() => {
    return findings
      .filter((f) => (f.baseSeverity ?? f.baseline ?? 0) > 0)
      .map((f) => {
        const base  = f.baseSeverity ?? f.baseline ?? 0;
        const score = avss(f, sector);
        const delta = score - base;
        return { f, base, score, delta };
      })
      .sort((a, b) => b.delta - a.delta)
      .slice(0, 15);
  }, [findings, sector]);

  const avgBase  = rows.length ? rows.reduce((s, r) => s + r.base,  0) / rows.length : 0;
  const avgAvss  = rows.length ? rows.reduce((s, r) => s + r.score, 0) / rows.length : 0;
  const avgDelta = avgAvss - avgBase;

  const multiplier = SECTOR_MULTIPLIER[sector] ?? 1.0;

  return (
    <div className="space-y-6">

      {/* ── Headline stats ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Avg CVSS baseline", value: avgBase.toFixed(2),  color: "var(--muted-foreground)" },
          { label: "Avg AVSS score",    value: avgAvss.toFixed(2),  color: scoreColor(avgAvss) },
          { label: "Avg score lift",    value: `+${avgDelta.toFixed(2)}`, color: avgDelta > 0 ? "var(--sev-critical)" : "var(--sev-low)" },
        ].map((s) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="panel flex flex-col gap-1 rounded-xl px-4 py-3"
          >
            <span className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">{s.label}</span>
            <span className="font-mono text-2xl font-black" style={{ color: s.color }}>{s.value}</span>
          </motion.div>
        ))}
      </div>

      {/* ── Side-by-side per-finding table ── */}
      {rows.length > 0 && (
        <div className="panel overflow-hidden rounded-xl">
          <div className="border-b border-border px-4 py-3 flex items-center justify-between">
            <h2 className="text-sm font-medium">Finding-level score delta</h2>
            <span className="font-mono text-[10px] text-muted-foreground">
              {sector} · {multiplier}× sector multiplier
            </span>
          </div>

          {/* Column headers */}
          <div className="grid grid-cols-[1fr_90px_90px_64px] items-center gap-3 border-b border-border px-4 py-2">
            <span className="font-mono text-[9px] tracking-widest text-muted-foreground uppercase">Finding</span>
            <span className="font-mono text-[9px] tracking-widest text-muted-foreground uppercase text-right">CVSS base</span>
            <span className="font-mono text-[9px] tracking-widest text-muted-foreground uppercase text-right">AVSS</span>
            <span className="font-mono text-[9px] tracking-widest text-muted-foreground uppercase text-right">Δ</span>
          </div>

          <div className="divide-y divide-border">
            {rows.map(({ f, base, score, delta }, i) => {
              const bucket = severityBucket(score);
              return (
                <motion.div
                  key={f.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="grid grid-cols-[1fr_90px_90px_64px] items-center gap-3 px-4 py-2.5"
                >
                  {/* Title + bars */}
                  <div className="min-w-0 space-y-1">
                    <p className="truncate text-xs text-foreground">{f.title}</p>
                    <div className="grid grid-cols-2 gap-1">
                      <ScoreBar value={base}  color="var(--muted-foreground)" />
                      <ScoreBar value={score} color={BUCKET_COLOR[bucket]} />
                    </div>
                    <p className="font-mono text-[9px] text-muted-foreground truncate">
                      {f.filePath.split("/").pop()}:{f.lineNumber} · {f.source ?? "unknown"}
                    </p>
                  </div>

                  {/* CVSS baseline */}
                  <span className="text-right font-mono text-sm tabular-nums text-muted-foreground">
                    {base.toFixed(1)}
                  </span>

                  {/* AVSS */}
                  <span
                    className="text-right font-mono text-sm font-bold tabular-nums"
                    style={{ color: scoreColor(score) }}
                  >
                    {score.toFixed(1)}
                  </span>

                  {/* Delta */}
                  <div className="flex justify-end">
                    <DeltaBadge delta={delta} />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Formula comparison table ── */}
      <div className="panel overflow-hidden rounded-xl">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-medium">AVSS vs CVSS — methodology comparison</h2>
          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
            How sector-aware scoring differs from traditional CVSS
          </p>
        </div>

        {/* Header row */}
        <div className="grid grid-cols-[160px_1fr_1fr] gap-px bg-border">
          <div className="bg-panel/60 px-3 py-2 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">Aspect</div>
          <div className="bg-panel/60 px-3 py-2 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">CVSS v3.1</div>
          <div className="bg-panel/60 px-3 py-2 font-mono text-[10px] tracking-widest text-primary uppercase">AVSS</div>
        </div>

        <div className="divide-y divide-border">
          {FORMULA_ROWS.map((row, i) => (
            <motion.div
              key={row.aspect}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.05 }}
              className="grid grid-cols-[160px_1fr_1fr]"
            >
              <div className="px-3 py-3 font-mono text-[11px] font-medium text-muted-foreground">
                {row.aspect}
              </div>
              <div className="px-3 py-3 text-xs text-muted-foreground/80 border-l border-border">
                {row.cvss}
              </div>
              <div className="px-3 py-3 text-xs text-foreground border-l border-border bg-primary/[0.03]">
                {row.avss}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── AVSS formula callout ── */}
      <div
        className="rounded-xl border px-5 py-4 font-mono text-sm"
        style={{
          borderColor: "color-mix(in oklab, var(--primary) 30%, transparent)",
          background:  "color-mix(in oklab, var(--primary) 5%, transparent)",
        }}
      >
        <p className="text-[10px] tracking-widest text-primary uppercase mb-2">AVSS formula</p>
        <p className="text-foreground leading-relaxed">
          <span className="text-primary font-bold">AVSS</span>
          {" = baseSeverity × (1 + EPSS) × "}
          <span style={{ color: "var(--sev-medium)" }}>sectorMultiplier</span>
          {" × "}
          <span style={{ color: "var(--sev-high)" }}>regulatoryWeight</span>
          {" · capped at 10"}
        </p>
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-[10px] text-muted-foreground">
          <span><span className="text-foreground">baseSeverity</span> — scanner output (0–10)</span>
          <span><span className="text-foreground">EPSS</span> — exploitation probability from FIRST.org (0–1)</span>
          <span><span style={{ color: "var(--sev-medium)" }}>sectorMultiplier</span> — Healthcare 1.6 · Fintech 1.5 · E-com 1.3 · General 1.0</span>
          <span><span style={{ color: "var(--sev-high)" }}>regulatoryWeight</span> — PHI leak 1.8 · Card data 1.8 · Hardcoded secret 1.7 · Price manip 1.5</span>
        </div>
      </div>

    </div>
  );
}
