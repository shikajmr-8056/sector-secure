import { useEffect, useRef, useState } from "react";
import { SCAN_STAGES } from "@/lib/scan-data";
import { apiPath } from "@/lib/api";

export function ScanProgress({
  repo,
  isScanning,
  findingsCount,
  scanId,
}: {
  repo: string;
  isScanning: boolean;
  findingsCount: number;
  /** scanId returned by POST /scan/sast — used to subscribe to real SSE progress */
  scanId?: string;
}) {
  const [liveStage, setLiveStage] = useState<string>("");
  const [stageIndex, setStageIndex] = useState(0);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // Close any existing SSE connection when scan resets
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }

    if (!isScanning || !scanId) {
      // Scan done or no scanId yet — show completed state
      setStageIndex(SCAN_STAGES.length);
      return;
    }

    // Reset for new scan
    setStageIndex(0);
    setLiveStage(SCAN_STAGES[0] ?? "");

    if (typeof EventSource === "undefined") return;
    const es = new EventSource(apiPath(`/scan/sast/progress/${scanId}`));
    esRef.current = es;

    es.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data) as { stage?: string; done?: boolean; error?: string };
        if (data.stage) {
          setLiveStage(data.stage);
          // Map stage string to an index so the progress bar advances correctly
          const idx = SCAN_STAGES.findIndex(
            (s) => s.toLowerCase().replace(/…/g, "").trim() ===
                   data.stage!.toLowerCase().replace(/\.\.\./g, "").replace(/…/g, "").trim()
          );
          if (idx >= 0) setStageIndex(idx);
        }
        if (data.done || data.error) {
          setStageIndex(SCAN_STAGES.length);
          es.close();
        }
      } catch (_) {}
    };

    es.onerror = () => {
      // SSE connection dropped (backend finished and closed it) — mark done
      setStageIndex(SCAN_STAGES.length);
      es.close();
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [scanId, isScanning]);

  const done = !isScanning;
  const effectiveIndex = done ? SCAN_STAGES.length : stageIndex;
  const pct = done ? 100 : Math.min(95, (effectiveIndex / SCAN_STAGES.length) * 100);

  // Label shown next to the progress bar
  const displayStage = done
    ? `Scan complete · ${findingsCount} finding${findingsCount !== 1 ? "s" : ""}`
    : liveStage || SCAN_STAGES[stageIndex] || "Initialising…";

  return (
    <div className="panel rounded-xl px-5 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-mono text-xs text-muted-foreground">
          <span className="text-primary">▸</span> {repo}
        </p>
        <p className="font-mono text-xs text-foreground">{displayStage}</p>
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
        {SCAN_STAGES.filter((s) => s !== "Scan complete.").map((s, i) => (
          <span
            key={s}
            className={
              done || i < effectiveIndex
                ? "text-primary/70"
                : i === effectiveIndex
                  ? "text-foreground"
                  : "text-muted-foreground/40"
            }
          >
            {done || i < effectiveIndex ? "✓ " : "· "}
            {s.replace(/…$/, "").replace(/\.$/, "")}
          </span>
        ))}
      </div>
    </div>
  );
}

