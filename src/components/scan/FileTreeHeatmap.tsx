import { motion } from "motion/react";
import { FILE_TREE, maxScoreForPath, type Sector } from "@/lib/scan-data";

function tint(score: number) {
  if (score === 0) return { bg: "transparent", fg: "var(--muted-foreground)" };
  if (score >= 8)
    return { bg: "color-mix(in oklab, var(--sev-critical) 22%, transparent)", fg: "var(--sev-critical)" };
  if (score >= 5)
    return { bg: "color-mix(in oklab, var(--sev-medium) 18%, transparent)", fg: "var(--sev-medium)" };
  return { bg: "color-mix(in oklab, var(--muted-foreground) 14%, transparent)", fg: "var(--muted-foreground)" };
}

export function FileTreeHeatmap({
  sector,
  applied,
  selected,
  onSelect,
}: {
  sector: Sector;
  applied: boolean;
  selected: string | null;
  onSelect: (path: string) => void;
}) {
  return (
    <div className="panel rounded-xl p-3">
      <div className="flex items-center justify-between px-2 pb-2">
        <h2 className="text-sm font-medium">File tree</h2>
        <span className="font-mono text-[11px] text-muted-foreground">max AVSS</span>
      </div>
      <div className="space-y-0.5">
        {FILE_TREE.map((node) => {
          const score = maxScoreForPath(node.path, sector, applied);
          const c = tint(score);
          const active = selected === node.path;
          return (
            <motion.button
              key={node.path}
              onClick={() => !node.isDir && onSelect(node.path)}
              animate={{ backgroundColor: c.bg }}
              transition={{ duration: 0.7, ease: "easeInOut" }}
              className={`flex w-full items-center justify-between rounded px-2 py-1 text-left font-mono text-[11.5px] ${
                node.isDir ? "cursor-default text-muted-foreground" : "hover:brightness-125"
              } ${active ? "ring-1 ring-primary/50" : ""}`}
              style={{ paddingLeft: `${8 + node.depth * 12}px` }}
            >
              <span className={node.isDir ? "" : "text-foreground/90"}>
                {node.isDir ? "▾ " : ""}
                {node.name}
              </span>
              {score > 0 && !node.isDir && (
                <span style={{ color: c.fg }} className="tabular-nums">
                  {score.toFixed(1)}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
      <div className="mt-3 flex items-center gap-3 border-t border-border px-2 pt-3 font-mono text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <i className="inline-block h-2 w-2 rounded-[2px] bg-sev-critical" />
          8–10
        </span>
        <span className="flex items-center gap-1">
          <i className="inline-block h-2 w-2 rounded-[2px] bg-sev-medium" />
          5–7.9
        </span>
        <span className="flex items-center gap-1">
          <i className="inline-block h-2 w-2 rounded-[2px] bg-muted-foreground" />
          0–4.9
        </span>
      </div>
    </div>
  );
}
