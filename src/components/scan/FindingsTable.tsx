import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { FINDINGS, avss, scoreColor, type Finding, type Sector } from "@/lib/scan-data";

const SEV_COLOR: Record<Finding["severity"], string> = {
  critical: "var(--sev-critical)",
  high: "var(--sev-high)",
  medium: "var(--sev-medium)",
  low: "var(--sev-low)",
};

function Code({ code }: { code: string }) {
  const parts = code.split(/(".*?"|'.*?'|`.*?`)/g);
  return (
    <>
      {parts.map((p, i) =>
        /^["'`]/.test(p) ? (
          <span key={i} style={{ color: "var(--sev-low)" }}>
            {p}
          </span>
        ) : (
          <span key={i}>
            {p.split(/\b(const|await|return|if|new|function|async|res|req)\b/g).map((w, j) =>
              /^(const|await|return|if|new|function|async)$/.test(w) ? (
                <span key={j} className="text-primary/80">
                  {w}
                </span>
              ) : (
                <span key={j}>{w}</span>
              ),
            )}
          </span>
        ),
      )}
    </>
  );
}

function ExpandedRow({ f, sector }: { f: Finding; sector: Sector }) {
  const [showFix, setShowFix] = useState(false);
  return (
    <div className="border-t border-border bg-background/40 px-4 py-4">
      <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
        <div className="overflow-hidden rounded-md border border-border bg-panel/60">
          {f.snippet.map((l) => (
            <div
              key={l.n}
              className={`flex gap-3 px-3 py-1 font-mono text-[11.5px] ${
                l.n === f.line ? "bg-sev-critical/10" : ""
              }`}
            >
              <span className="w-8 shrink-0 text-right text-muted-foreground/60">{l.n}</span>
              <span className="whitespace-pre-wrap text-foreground/90">
                <Code code={l.code} />
              </span>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <div>
            <p className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
              Evidence
            </p>
            <p className="mt-1 text-xs text-foreground">{f.evidence}</p>
          </div>
          <div>
            <p className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
              Regulatory context
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{f.citations[sector]}</p>
          </div>
          <button
            onClick={() => setShowFix((s) => !s)}
            className="glow-accent rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
          >
            {showFix ? "Hide fix" : "Suggest fix"}
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {showFix && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-4 overflow-hidden rounded-md border border-border bg-panel/60">
              {f.diff.map((d, i) => (
                <div
                  key={i}
                  className="flex gap-3 px-3 py-1 font-mono text-[11.5px]"
                  style={{
                    background:
                      d.sign === "+"
                        ? "color-mix(in oklab, var(--sev-low) 12%, transparent)"
                        : d.sign === "-"
                          ? "color-mix(in oklab, var(--sev-critical) 12%, transparent)"
                          : "transparent",
                  }}
                >
                  <span
                    className="w-3 shrink-0"
                    style={{
                      color:
                        d.sign === "+"
                          ? "var(--sev-low)"
                          : d.sign === "-"
                            ? "var(--sev-critical)"
                            : "var(--muted-foreground)",
                    }}
                  >
                    {d.sign}
                  </span>
                  <span className="whitespace-pre-wrap text-foreground/90">
                    <Code code={d.code} />
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{f.fixNote}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function FindingsTable({
  sector,
  applied,
  focusPath,
}: {
  sector: Sector;
  applied: boolean;
  focusPath: string | null;
}) {
  const [open, setOpen] = useState<string | null>("f1");

  const rows = useMemo(() => {
    return [...FINDINGS].sort((a, b) =>
      applied ? avss(b, sector) - avss(a, sector) : b.baseline - a.baseline,
    );
  }, [sector, applied]);

  return (
    <div className="panel overflow-hidden rounded-xl">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-medium">Findings</h2>
        <span className="font-mono text-[11px] text-muted-foreground">
          baseline <span className="line-through">flat</span> → AVSS ·{" "}
          {applied ? "sector applied" : "unweighted"}
        </span>
      </div>

      <div className="divide-y divide-border">
        {rows.map((f, i) => {
          const live = applied ? avss(f, sector) : f.baseline;
          const isOpen = open === f.id;
          const focused = focusPath === f.filePath;
          return (
            <motion.div
              key={f.id}
              layout
              transition={{
                layout: { type: "spring", stiffness: 260, damping: 30, delay: i * 0.045 },
              }}
              id={`finding-${f.id}`}
              className={focused ? "bg-primary/5" : ""}
            >
              <button
                onClick={() => setOpen(isOpen ? null : f.id)}
                className="flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-muted/40"
              >
                <span className="w-4 shrink-0 font-mono text-[11px] text-muted-foreground">
                  {isOpen ? "−" : "+"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">{f.title}</p>
                  <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                    {f.filePath}:{f.line} · {f.tool}
                  </p>
                </div>
                <span
                  className="hidden shrink-0 rounded-full border px-2 py-0.5 font-mono text-[10px] sm:block"
                  style={{ color: SEV_COLOR[f.severity], borderColor: SEV_COLOR[f.severity] }}
                >
                  {f.severity}
                </span>
                <div className="flex shrink-0 items-baseline gap-2 font-mono tabular-nums">
                  <span className="text-xs text-muted-foreground line-through">
                    {f.baseline.toFixed(1)}
                  </span>
                  <motion.span
                    key={`${live}`}
                    initial={{ opacity: 0.4, y: -3 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-base font-bold"
                    style={{ color: scoreColor(live) }}
                  >
                    {live.toFixed(1)}
                  </motion.span>
                </div>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <ExpandedRow f={f} sector={sector} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
