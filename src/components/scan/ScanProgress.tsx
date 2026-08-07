import { useEffect, useState } from "react";
import { SCAN_STAGES } from "@/lib/scan-data";

export function ScanProgress({
  repo,
  isScanning,
  findingsCount,
}: {
  repo: string;
  isScanning: boolean;
  findingsCount: number;
}) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (!isScanning) {
      setStage(SCAN_STAGES.length);
      return;
    }
    if (stage >= SCAN_STAGES.length - 1) {
      return;
    }
    const t = setTimeout(() => setStage((s) => s + 1), 750);
    return () => clearTimeout(t);
  }, [stage, isScanning]);

  const done = !isScanning;
  const pct = done ? 100 : Math.min(95, (stage / SCAN_STAGES.length) * 100);

  return (
    <div className="panel rounded-xl px-5 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-mono text-xs text-muted-foreground">
          <span className="text-primary">▸</span> {repo}
        </p>
        <p className="font-mono text-xs text-foreground">
          {done ? `Scan complete · ${findingsCount} findings` : SCAN_STAGES[stage] || "Wrapping up…"}
        </p>
      </div>
      <div className="relative mt-3 h-[3px] w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
          style={{
            width: `${pct}%`,
            boxShadow: "0 0 12px color-mix(in oklab, var(--primary) 70%, transparent)",
          }}
        />
        {!done && (
          <div className="scan-shimmer absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px]">
        {SCAN_STAGES.map((s, i) => (
          <span
            key={s}
            className={
              done || i < stage
                ? "text-primary/70"
                : i === stage
                  ? "text-foreground"
                  : "text-muted-foreground/40"
            }
          >
            {done || i < stage ? "✓ " : "· "}
            {s.replace("…", "")}
          </span>
        ))}
      </div>
    </div>
  );
}
