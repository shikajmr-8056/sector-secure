import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { groupByFile, scoreColor, type Finding, type Sector } from "@/lib/scan-data";

function tintFromScore(score: number) {
  if (score >= 8) return { bg: "color-mix(in oklab, var(--sev-critical) 28%, var(--panel))", border: "var(--sev-critical)", fg: "var(--sev-critical)" };
  if (score >= 6) return { bg: "color-mix(in oklab, var(--sev-high) 22%, var(--panel))", border: "var(--sev-high)", fg: "var(--sev-high)" };
  if (score >= 4) return { bg: "color-mix(in oklab, var(--sev-medium) 18%, var(--panel))", border: "var(--sev-medium)", fg: "var(--sev-medium)" };
  return { bg: "color-mix(in oklab, var(--muted-foreground) 10%, var(--panel))", border: "var(--border)", fg: "var(--muted-foreground)" };
}

export function SeverityTreemap({
  findings,
  sector,
  applied,
  onSelect,
}: {
  findings: Finding[];
  sector: Sector;
  applied: boolean;
  onSelect: (path: string) => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  const groups = useMemo(() => groupByFile(findings, sector, applied), [findings, sector, applied]);

  if (groups.length === 0) return null;

  const maxCount = Math.max(...groups.map((g) => g.count));

  // Compute a "weight" for each block — mix of count and score so big+dangerous files are largest
  const weighted = groups.map((g) => ({
    ...g,
    weight: g.count * 0.5 + g.maxScore * 0.5,
  }));
  const maxWeight = Math.max(...weighted.map((g) => g.weight));

  // Convert weights into % widths for a simple flex-wrap treemap approximation
  const blocks = weighted.map((g) => ({
    ...g,
    pct: Math.max(6, (g.weight / maxWeight) * 100),
    name: g.path.split("/").pop() ?? g.path,
    dir: g.path.includes("/") ? g.path.split("/").slice(0, -1).join("/") : "",
  }));

  const hoveredBlock = hovered ? blocks.find((b) => b.path === hovered) : null;

  return (
    <div className="panel rounded-xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium">Severity treemap</h2>
          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
            Block size = finding count · color = max {applied ? "AVSS" : "baseline"} score
          </p>
        </div>
        <div className="flex items-center gap-3 font-mono text-[10px] text-muted-foreground">
          {[
            { label: "≥8", color: "var(--sev-critical)" },
            { label: "≥6", color: "var(--sev-high)" },
            { label: "≥4", color: "var(--sev-medium)" },
            { label: "<4", color: "var(--muted-foreground)" },
          ].map((l) => (
            <span key={l.label} className="flex items-center gap-1">
              <i className="inline-block h-2 w-2 rounded-[2px]" style={{ background: l.color }} />
              {l.label}
            </span>
          ))}
        </div>
      </div>

      {/* Treemap blocks */}
      <div className="flex flex-wrap gap-1.5" style={{ minHeight: 120 }}>
        {blocks.map((b, idx) => {
          const c = tintFromScore(b.maxScore);
          const isHovered = hovered === b.path;
          return (
            <motion.button
              key={b.path}
              layout
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.025, type: "spring", stiffness: 300, damping: 24 }}
              onHoverStart={() => setHovered(b.path)}
              onHoverEnd={() => setHovered(null)}
              onClick={() => onSelect(b.path)}
              className="relative flex flex-col justify-between overflow-hidden rounded-md border p-2 text-left transition-all"
              style={{
                width: `${b.pct}%`,
                minWidth: 56,
                maxWidth: "48%",
                minHeight: 52 + Math.min(b.count, 6) * 6,
                background: c.bg,
                borderColor: isHovered
                  ? c.fg
                  : `color-mix(in oklab, ${c.border} 40%, transparent)`,
                boxShadow: isHovered ? `0 0 14px -4px ${c.fg}` : "none",
              }}
            >
              <span
                className="truncate font-mono text-[10px] font-bold"
                style={{ color: c.fg }}
              >
                {b.name}
              </span>
              <div className="mt-1 flex items-end justify-between">
                <span className="font-mono text-[9px] text-muted-foreground">
                  {b.count} finding{b.count !== 1 ? "s" : ""}
                </span>
                <span className="font-mono text-sm font-black tabular-nums" style={{ color: c.fg }}>
                  {b.maxScore.toFixed(1)}
                </span>
              </div>
              {/* Mini severity bars at bottom */}
              <div className="mt-1.5 flex h-1 w-full gap-px overflow-hidden rounded-full">
                {b.findings.slice(0, 12).map((f, i) => {
                  const s = applied ? (f.avssScore ?? f.baseSeverity ?? 0) : (f.baseSeverity ?? 0);
                  return (
                    <div
                      key={i}
                      className="flex-1 rounded-full"
                      style={{ background: scoreColor(s) }}
                    />
                  );
                })}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Hover tooltip */}
      <AnimatePresence>
        {hoveredBlock && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-3 rounded-lg border border-border bg-panel/80 px-4 py-2.5 backdrop-blur-sm"
          >
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 font-mono text-[11px]">
              <span className="text-foreground font-medium">{hoveredBlock.path}</span>
              <span className="text-muted-foreground">{hoveredBlock.count} findings</span>
              <span style={{ color: scoreColor(hoveredBlock.maxScore) }}>
                max {hoveredBlock.maxScore.toFixed(1)}
              </span>
              <span className="text-muted-foreground">
                types: {[...new Set(hoveredBlock.findings.map((f) => f.type ?? "?"))].join(", ")}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
