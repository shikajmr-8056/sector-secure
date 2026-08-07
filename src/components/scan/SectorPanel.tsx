import { motion } from "motion/react";
import { SECTORS, type Sector } from "@/lib/scan-data";

export function SectorPanel({
  sector,
  onSector,
  confirmed,
  onConfirm,
  sectorConfidence,
  sectorEvidence,
}: {
  sector: Sector;
  onSector: (s: Sector) => void;
  confirmed: boolean;
  onConfirm: () => void;
  sectorConfidence: Record<Sector, number>;
  sectorEvidence: string[];
}) {
  return (
    <div className="panel rounded-xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-medium">Detected sector</h2>
          <span className="rounded border border-primary/40 px-2 py-0.5 font-mono text-[11px] text-primary">
            {SECTORS.find((s) => s.id === sector)?.label} · {Math.round((sectorConfidence[sector] || 0) * 100)}%
            confidence
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onConfirm}
            className="glow-accent rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
          >
            {confirmed ? "Sector applied" : "Confirm sector"}
          </button>
          <details className="relative">
            <summary className="cursor-pointer list-none rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground">
              Override
            </summary>
            <div className="panel absolute right-0 z-20 mt-2 w-44 rounded-md p-1">
              {SECTORS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => onSector(s.id)}
                  className={`block w-full rounded px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted ${
                    s.id === sector ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </details>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {sectorEvidence.map((e) => (
          <span
            key={e}
            className="rounded border border-border bg-muted/40 px-2 py-0.5 font-mono text-[11px] text-muted-foreground"
          >
            {e}
          </span>
        ))}
        {sectorEvidence.length === 0 && (
          <span className="text-xs text-muted-foreground italic">No specific evidence found.</span>
        )}
      </div>

      <div className="mt-5 space-y-2">
        {SECTORS.map((s) => {
          const v = sectorConfidence[s.id] || 0;
          const active = s.id === sector;
          return (
            <div key={s.id} className="flex items-center gap-3">
              <span
                className={`w-24 font-mono text-[11px] ${active ? "text-foreground" : "text-muted-foreground"}`}
              >
                {s.label}
              </span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <motion.div
                  className={active ? "h-full bg-primary" : "h-full bg-muted-foreground/40"}
                  initial={{ width: 0 }}
                  animate={{ width: `${v * 100}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
              </div>
              <span className="w-10 text-right font-mono text-[11px] text-muted-foreground">
                {v.toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
