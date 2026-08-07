import { useMemo } from "react";
import { motion } from "motion/react";
import { avss, scoreColor, type Finding, type Sector } from "@/lib/scan-data";

function RankArrow({ delta }: { delta: number }) {
  if (delta === 0) return <span className="font-mono text-[10px] text-muted-foreground">—</span>;
  const up = delta < 0; // lower rank index = moved up in danger
  return (
    <motion.span
      initial={{ opacity: 0, y: up ? 4 : -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="font-mono text-[10px] font-bold tabular-nums"
      style={{ color: up ? "var(--sev-critical)" : "var(--sev-low)" }}
    >
      {up ? "▲" : "▼"} {Math.abs(delta)}
    </motion.span>
  );
}

function RankedList({
  title,
  subtitle,
  rows,
  scoreKey,
  accent,
}: {
  title: string;
  subtitle: string;
  rows: Array<{ f: Finding; score: number; rank: number; rankDelta: number }>;
  scoreKey: "base" | "avss";
  accent: string;
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-panel/60">
      <div className="border-b border-border px-4 py-3">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{subtitle}</p>
      </div>
      <div className="divide-y divide-border overflow-y-auto" style={{ maxHeight: 420 }}>
        {rows.map(({ f, score, rank, rankDelta }) => (
          <motion.div
            key={f.id}
            layout
            transition={{ layout: { type: "spring", stiffness: 280, damping: 28 } }}
            className="flex items-center gap-3 px-4 py-2.5"
          >
            <span className="w-5 shrink-0 font-mono text-[11px] text-muted-foreground tabular-nums">
              {rank + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-foreground">{f.title}</p>
              <p className="truncate font-mono text-[10px] text-muted-foreground">
                {f.filePath.split("/").pop()}:{f.lineNumber}
              </p>
            </div>
            <RankArrow delta={rankDelta} />
            <motion.span
              key={score}
              initial={{ opacity: 0.4, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="shrink-0 font-mono text-sm font-black tabular-nums"
              style={{ color: scoreKey === "avss" ? accent : scoreColor(score) }}
            >
              {score.toFixed(1)}
            </motion.span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export function BeforeAfterPanel({
  findings,
  sector,
}: {
  findings: Finding[];
  sector: Sector;
}) {
  const { baseRows, avssRows } = useMemo(() => {
    const base = [...findings]
      .sort((a, b) => (b.baseSeverity ?? b.baseline ?? 0) - (a.baseSeverity ?? a.baseline ?? 0))
      .map((f, rank) => ({ f, score: f.baseSeverity ?? f.baseline ?? 0, rank }));

    const avssRanked = [...findings]
      .sort((a, b) => avss(b, sector) - avss(a, sector))
      .map((f, rank) => ({ f, score: avss(f, sector), rank }));

    // Cross-reference: for each finding in the avss list, find its base rank
    const baseRankMap: Record<string, number> = {};
    base.forEach(({ f, rank }) => { baseRankMap[f.id] = rank; });

    const avssRows = avssRanked.map(({ f, score, rank }) => ({
      f,
      score,
      rank,
      rankDelta: (baseRankMap[f.id] ?? rank) - rank,
    }));

    // For base list, find avss rank
    const avssRankMap: Record<string, number> = {};
    avssRanked.forEach(({ f, rank }) => { avssRankMap[f.id] = rank; });

    const baseRows = base.map(({ f, score, rank }) => ({
      f,
      score,
      rank,
      rankDelta: rank - (avssRankMap[f.id] ?? rank),
    }));

    return { baseRows, avssRows };
  }, [findings, sector]);

  if (findings.length === 0) return null;

  return (
    <div className="panel rounded-xl p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium">Before / After — AVSS reranking</h2>
          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
            Left: flat baseline severity · Right: sector-weighted AVSS score · arrows show rank movement
          </p>
        </div>
        <span
          className="rounded border px-2 py-0.5 font-mono text-[10px]"
          style={{ borderColor: "var(--primary)", color: "var(--primary)" }}
        >
          {sector}
        </span>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <RankedList
          title="Flat CVSS baseline"
          subtitle="Unweighted baseSeverity order"
          rows={baseRows.slice(0, 15)}
          scoreKey="base"
          accent="var(--muted-foreground)"
        />
        <RankedList
          title="AVSS sector-weighted"
          subtitle={`Multiplier applied · sector: ${sector}`}
          rows={avssRows.slice(0, 15)}
          scoreKey="avss"
          accent="var(--primary)"
        />
      </div>
      <p className="mt-3 font-mono text-[10px] text-muted-foreground">
        ▲ = moved up in risk priority after sector weighting · ▼ = moved down
      </p>
    </div>
  );
}
