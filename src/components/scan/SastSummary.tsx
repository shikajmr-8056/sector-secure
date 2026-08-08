import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { type ScanStats, type Sector, BUCKET_COLOR, scoreColor } from "@/lib/scan-data";

// Animated counter that ticks up to target value
function Counter({ target, decimals = 0, duration = 900 }: { target: number; decimals?: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const frameRef = useRef<number>(0);
  const startRef = useRef<number>(0);

  useEffect(() => {
    // requestAnimationFrame is browser-only — skip during SSR
    if (typeof requestAnimationFrame === "undefined") {
      setDisplay(target);
      return;
    }
    cancelAnimationFrame(frameRef.current);
    startRef.current = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - startRef.current) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(eased * target);
      if (t < 1) frameRef.current = requestAnimationFrame(tick);
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
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col gap-1 rounded-xl border border-border bg-panel/60 px-4 py-3 backdrop-blur-sm"
    >
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
