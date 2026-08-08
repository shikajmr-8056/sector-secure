import { i as __toESM } from "../_runtime.mjs";
import { c as require_jsx_runtime, l as require_react } from "../_libs/@react-three/fiber+[...].mjs";
import { _ as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as Route } from "./router-DX50snSA.mjs";
import { n as AnimatePresence } from "../_libs/framer-motion+[...].mjs";
import { t as motion } from "../_libs/motion.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/scan-BUQv_PVk.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var SECTORS = [
	{
		id: "fintech",
		label: "Fintech"
	},
	{
		id: "healthcare",
		label: "Healthcare"
	},
	{
		id: "ecommerce",
		label: "E-commerce"
	},
	{
		id: "general",
		label: "General"
	}
];
function avss(f, sector) {
	if (f.avssScore !== void 0) return f.avssScore;
	const epssWeight = .85 + (f.epssScore ?? f.epss ?? 0) * .35;
	const multiplier = f.multipliers?.[sector] ?? 1;
	return Math.min(10, Math.round((f.baseSeverity ?? f.baseline ?? 0) * multiplier * epssWeight * 10) / 10);
}
function scoreColor(score) {
	if (score >= 8) return "var(--sev-critical)";
	if (score >= 5) return "var(--sev-medium)";
	return "var(--muted-foreground)";
}
function buildFileTreeFromFindings(findings) {
	const tree = {};
	findings.forEach((f) => {
		if (!f.filePath) return;
		const parts = f.filePath.split("/");
		let currentPath = "";
		parts.forEach((part, index) => {
			currentPath = currentPath ? `${currentPath}/${part}` : part;
			const isDir = index < parts.length - 1;
			if (!tree[currentPath]) tree[currentPath] = {
				path: currentPath,
				name: part,
				depth: index,
				isDir
			};
			else if (isDir) {
				const existing = tree[currentPath];
				if (existing) existing.isDir = true;
			}
		});
	});
	return Object.values(tree).sort((a, b) => {
		if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
		return a.path.localeCompare(b.path);
	});
}
function maxScoreForPath(path, sector, applied, findings) {
	const matches = findings.filter((f) => f.filePath === path || f.filePath.startsWith(path + "/"));
	if (!matches.length) return 0;
	const scores = matches.map((f) => applied ? avss(f, sector) : f.baseSeverity ?? f.baseline ?? 0);
	return Math.max(0, ...scores);
}
var SCAN_STAGES = [
	"Cloning repository…",
	"Running Semgrep (general rules)…",
	"Checking for exposed secrets…",
	"Running custom sector-pattern rules…",
	"Validating card-number matches (Luhn)…",
	"Cross-referencing CVEs (OSV.dev + EPSS)…",
	"Extracting routes and repo metadata…",
	"Deduplicating and ranking findings…",
	"Scan complete."
];
var DAST_STAGES = [
	"Checking TLS configuration…",
	"Fetching security headers…",
	"Analysing cookie security…",
	"Checking for info leakage…",
	"Computing risk summary…"
];
function dastResultColor(result) {
	switch (result) {
		case "fail": return "var(--sev-critical)";
		case "warn": return "var(--sev-medium)";
		case "pass": return "var(--sev-low)";
		default: return "var(--muted-foreground)";
	}
}
function gradeColor(grade) {
	if (grade === "A+" || grade === "A") return "var(--sev-low)";
	if (grade === "B") return "var(--primary)";
	if (grade === "C") return "var(--sev-medium)";
	return "var(--sev-critical)";
}
function severityBucket(score) {
	if (score >= 8) return "critical";
	if (score >= 6) return "high";
	if (score >= 4) return "medium";
	return "low";
}
var BUCKET_COLOR = {
	critical: "var(--sev-critical)",
	high: "var(--sev-high)",
	medium: "var(--sev-medium)",
	low: "var(--sev-low)"
};
function computeStats(findings, sector, applied) {
	if (findings.length === 0) return {
		total: 0,
		critical: 0,
		high: 0,
		medium: 0,
		low: 0,
		topRiskFile: "—",
		topRiskScore: 0,
		avgEpss: 0,
		threatScore: 0,
		bySource: {},
		byType: {}
	};
	const scores = findings.map((f) => applied ? avss(f, sector) : f.baseSeverity ?? f.baseline ?? 0);
	const buckets = scores.map(severityBucket);
	const fileScores = {};
	findings.forEach((f, i) => {
		const s = scores[i] ?? 0;
		fileScores[f.filePath] = Math.max(fileScores[f.filePath] ?? 0, s);
	});
	const topEntry = Object.entries(fileScores).sort((a, b) => b[1] - a[1])[0];
	const epssValues = findings.map((f) => f.epssScore ?? f.epss ?? 0).filter((v) => v > 0);
	const avgEpss = epssValues.length ? epssValues.reduce((a, b) => a + b, 0) / epssValues.length : 0;
	const top5 = scores.sort((a, b) => b - a).slice(0, 5);
	const threatScore = Math.min(10, top5.reduce((a, b) => a + b, 0) / top5.length);
	const bySource = {};
	const byType = {};
	findings.forEach((f) => {
		const src = f.source ?? f.tool ?? "unknown";
		bySource[src] = (bySource[src] ?? 0) + 1;
		const t = f.type ?? "unknown";
		byType[t] = (byType[t] ?? 0) + 1;
	});
	return {
		total: findings.length,
		critical: buckets.filter((b) => b === "critical").length,
		high: buckets.filter((b) => b === "high").length,
		medium: buckets.filter((b) => b === "medium").length,
		low: buckets.filter((b) => b === "low").length,
		topRiskFile: topEntry?.[0] ?? "—",
		topRiskScore: topEntry?.[1] ?? 0,
		avgEpss: Math.round(avgEpss * 1e3) / 1e3,
		threatScore: Math.round(threatScore * 10) / 10,
		bySource,
		byType
	};
}
/** Groups findings by file path, returns entries sorted by max AVSS desc */
function groupByFile(findings, sector, applied) {
	const map = {};
	findings.forEach((f) => {
		(map[f.filePath] ??= []).push(f);
	});
	return Object.entries(map).map(([path, fs]) => ({
		path,
		count: fs.length,
		maxScore: Math.max(...fs.map((f) => applied ? avss(f, sector) : f.baseSeverity ?? f.baseline ?? 0)),
		findings: fs
	})).sort((a, b) => b.maxScore - a.maxScore);
}
/**
* Returns the base URL for the AVSS backend API.
*
* Resolution order:
*   1. VITE_API_URL env var  (set in Vercel dashboard or .env.local)
*   2. Same-origin /api      (if the backend is proxied through the same host)
*   3. http://localhost:5000 (local dev fallback only)
*
* In production on Vercel the frontend is static/SSR and the backend runs
* separately (Render / Railway / etc.).  Set VITE_API_URL in Vercel project
* settings → Environment Variables to point at your backend deployment URL.
*/
function getApiUrl() {
	const fromEnv = {
		"BASE_URL": "/",
		"DEV": false,
		"MODE": "production",
		"PROD": true,
		"SSR": true,
		"TSS_DEV_SERVER": "false",
		"TSS_DEV_SSR_STYLES_BASEPATH": "/",
		"TSS_DEV_SSR_STYLES_ENABLED": "true",
		"TSS_DISABLE_CSRF_MIDDLEWARE_WARNING": "false",
		"TSS_INLINE_CSS_ENABLED": "false",
		"TSS_ROUTER_BASEPATH": "",
		"TSS_SERVER_FN_BASE": "/_serverFn/"
	}["VITE_API_URL"];
	if (fromEnv && fromEnv.trim() !== "") return fromEnv.replace(/\/$/, "");
	return "http://localhost:5000";
}
function ScanProgress({ repo, isScanning, findingsCount, scanId }) {
	const [liveStage, setLiveStage] = (0, import_react.useState)("");
	const [stageIndex, setStageIndex] = (0, import_react.useState)(0);
	const esRef = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		if (esRef.current) {
			esRef.current.close();
			esRef.current = null;
		}
		if (!isScanning || !scanId) {
			setStageIndex(SCAN_STAGES.length);
			return;
		}
		setStageIndex(0);
		setLiveStage(SCAN_STAGES[0] ?? "");
		const API_URL = getApiUrl();
		if (typeof EventSource === "undefined") return;
		const es = new EventSource(`${API_URL}/scan/sast/progress/${scanId}`);
		esRef.current = es;
		es.onmessage = (evt) => {
			try {
				const data = JSON.parse(evt.data);
				if (data.stage) {
					setLiveStage(data.stage);
					const idx = SCAN_STAGES.findIndex((s) => s.toLowerCase().replace(/…/g, "").trim() === data.stage.toLowerCase().replace(/\.\.\./g, "").replace(/…/g, "").trim());
					if (idx >= 0) setStageIndex(idx);
				}
				if (data.done || data.error) {
					setStageIndex(SCAN_STAGES.length);
					es.close();
				}
			} catch (_) {}
		};
		es.onerror = () => {
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
	const pct = done ? 100 : Math.min(95, effectiveIndex / SCAN_STAGES.length * 100);
	const displayStage = done ? `Scan complete · ${findingsCount} finding${findingsCount !== 1 ? "s" : ""}` : liveStage || SCAN_STAGES[stageIndex] || "Initialising…";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "panel rounded-xl px-5 py-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-baseline justify-between gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "font-mono text-xs text-muted-foreground",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-primary",
							children: "▸"
						}),
						" ",
						repo
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-mono text-xs text-foreground",
					children: displayStage
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "relative mt-3 h-[3px] w-full overflow-hidden rounded-full bg-muted",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "h-full rounded-full bg-primary transition-[width] duration-500 ease-out",
					style: {
						width: `${pct}%`,
						boxShadow: "0 0 12px color-mix(in oklab, var(--primary) 70%, transparent)"
					}
				}), !done && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "scan-shimmer absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-transparent via-primary/60 to-transparent" })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px]",
				children: SCAN_STAGES.filter((s) => s !== "Scan complete.").map((s, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: done || i < effectiveIndex ? "text-primary/70" : i === effectiveIndex ? "text-foreground" : "text-muted-foreground/40",
					children: [done || i < effectiveIndex ? "✓ " : "· ", s.replace(/…$/, "").replace(/\.$/, "")]
				}, s))
			})
		]
	});
}
function SectorPanel({ sector, onSector, confirmed, onConfirm, sectorConfidence, sectorEvidence }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "panel rounded-xl p-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-center justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-sm font-medium",
						children: "Detected sector"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "rounded border border-primary/40 px-2 py-0.5 font-mono text-[11px] text-primary",
						children: [
							SECTORS.find((s) => s.id === sector)?.label,
							" · ",
							Math.round((sectorConfidence[sector] || 0) * 100),
							"% confidence"
						]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: onConfirm,
						className: "glow-accent rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20",
						children: confirmed ? "Sector applied" : "Confirm sector"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", {
						className: "relative",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("summary", {
							className: "cursor-pointer list-none rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground",
							children: "Override"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "panel absolute right-0 z-20 mt-2 w-44 rounded-md p-1",
							children: SECTORS.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => onSector(s.id),
								className: `block w-full rounded px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted ${s.id === sector ? "text-primary" : "text-muted-foreground"}`,
								children: s.label
							}, s.id))
						})]
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-4 flex flex-wrap gap-1.5",
				children: [sectorEvidence.map((e) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "rounded border border-border bg-muted/40 px-2 py-0.5 font-mono text-[11px] text-muted-foreground",
					children: e
				}, e)), sectorEvidence.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-xs text-muted-foreground italic",
					children: "No specific evidence found."
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-5 space-y-2",
				children: SECTORS.map((s) => {
					const v = sectorConfidence[s.id] || 0;
					const active = s.id === sector;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: `w-24 font-mono text-[11px] ${active ? "text-foreground" : "text-muted-foreground"}`,
								children: s.label
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "h-1.5 flex-1 overflow-hidden rounded-full bg-muted",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.div, {
									className: active ? "h-full bg-primary" : "h-full bg-muted-foreground/40",
									initial: { width: 0 },
									animate: { width: `${v * 100}%` },
									transition: {
										duration: .6,
										ease: "easeOut"
									}
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "w-10 text-right font-mono text-[11px] text-muted-foreground",
								children: v.toFixed(2)
							})
						]
					}, s.id);
				})
			})
		]
	});
}
function tint(score) {
	if (score === 0) return {
		bg: "transparent",
		fg: "var(--muted-foreground)"
	};
	if (score >= 8) return {
		bg: "color-mix(in oklab, var(--sev-critical) 22%, transparent)",
		fg: "var(--sev-critical)"
	};
	if (score >= 5) return {
		bg: "color-mix(in oklab, var(--sev-medium) 18%, transparent)",
		fg: "var(--sev-medium)"
	};
	return {
		bg: "color-mix(in oklab, var(--muted-foreground) 14%, transparent)",
		fg: "var(--muted-foreground)"
	};
}
function FileTreeHeatmap({ sector, applied, selected, onSelect, fileTree, findings }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "panel rounded-xl p-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between px-2 pb-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-sm font-medium",
					children: "File tree"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "font-mono text-[11px] text-muted-foreground",
					children: "max AVSS"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "space-y-0.5",
				children: fileTree.map((node) => {
					const score = maxScoreForPath(node.path, sector, applied, findings);
					const c = tint(score);
					const active = selected === node.path;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.button, {
						onClick: () => !node.isDir && onSelect(node.path),
						animate: { backgroundColor: c.bg },
						transition: {
							duration: .7,
							ease: "easeInOut"
						},
						className: `flex w-full items-center justify-between rounded px-2 py-1 text-left font-mono text-[11.5px] ${node.isDir ? "cursor-default text-muted-foreground" : "hover:brightness-125"} ${active ? "ring-1 ring-primary/50" : ""}`,
						style: { paddingLeft: `${8 + node.depth * 12}px` },
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: node.isDir ? "" : "text-foreground/90",
							children: [node.isDir ? "▾ " : "", node.name]
						}), score > 0 && !node.isDir && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							style: { color: c.fg },
							className: "tabular-nums",
							children: score.toFixed(1)
						})]
					}, node.path);
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-3 flex items-center gap-3 border-t border-border px-2 pt-3 font-mono text-[10px] text-muted-foreground",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "flex items-center gap-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { className: "inline-block h-2 w-2 rounded-[2px] bg-sev-critical" }), "8–10"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "flex items-center gap-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { className: "inline-block h-2 w-2 rounded-[2px] bg-sev-medium" }), "5–7.9"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "flex items-center gap-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { className: "inline-block h-2 w-2 rounded-[2px] bg-muted-foreground" }), "0–4.9"]
					})
				]
			})
		]
	});
}
function Code({ code }) {
	const parts = code.split(/(".*?"|'.*?'|`.*?`)/g);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: parts.map((p, i) => /^["'`]/.test(p) ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		style: { color: "var(--sev-low)" },
		children: p
	}, i) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: p.split(/\b(const|let|var|await|return|if|else|new|function|async|res|req|import|export|from)\b/g).map((w, j) => /^(const|let|var|await|return|if|else|new|function|async|import|export|from)$/.test(w) ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: "text-primary/80",
		children: w
	}, j) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: w }, j)) }, i)) });
}
function ExpandedRow({ f, sector }) {
	const [showFix, setShowFix] = (0, import_react.useState)(false);
	const [loadingFix, setLoadingFix] = (0, import_react.useState)(false);
	const [fixDiff, setFixDiff] = (0, import_react.useState)(f.diff);
	const [fixNote, setFixNote] = (0, import_react.useState)(f.fixNote);
	const handleSuggestFix = async () => {
		if (!showFix && !fixDiff) {
			setLoadingFix(true);
			setShowFix(true);
			try {
				const API_URL = {
					"BASE_URL": "/",
					"DEV": false,
					"MODE": "production",
					"PROD": true,
					"SSR": true,
					"TSS_DEV_SERVER": "false",
					"TSS_DEV_SSR_STYLES_BASEPATH": "/",
					"TSS_DEV_SSR_STYLES_ENABLED": "true",
					"TSS_DISABLE_CSRF_MIDDLEWARE_WARNING": "false",
					"TSS_INLINE_CSS_ENABLED": "false",
					"TSS_ROUTER_BASEPATH": "",
					"TSS_SERVER_FN_BASE": "/_serverFn/"
				}["VITE_API_URL"] || "http://localhost:5000";
				const res = await fetch(`${API_URL}/suggest-fix`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ finding: f })
				});
				if (res.ok) {
					const data = await res.json();
					setFixDiff(data.diff);
					setFixNote(data.fixNote);
				}
			} catch (e) {
				console.error("Failed to suggest fix", e);
			} finally {
				setLoadingFix(false);
			}
		} else setShowFix((s) => !s);
	};
	const score = avss(f, sector);
	const bucket = severityBucket(score);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "border-t border-border bg-background/40 px-4 py-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "grid gap-4 lg:grid-cols-[1.15fr_1fr]",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "overflow-hidden rounded-md border border-border bg-panel/60",
				children: f.snippet ? f.snippet.map((l) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: `flex gap-3 px-3 py-1 font-mono text-[11.5px] ${l.n === f.lineNumber ? "bg-sev-critical/10" : ""}`,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "w-8 shrink-0 text-right text-muted-foreground/60",
						children: l.n
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "whitespace-pre-wrap text-foreground/90",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Code, { code: l.code })
					})]
				}, l.n)) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "p-4 text-xs text-muted-foreground italic",
					children: "No code snippet available"
				})
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-md border border-border bg-panel/40 px-3 py-2 space-y-1",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "font-mono text-[10px] tracking-widest text-muted-foreground uppercase",
								children: "AVSS score breakdown"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-baseline gap-3",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-mono text-2xl font-black",
										style: { color: BUCKET_COLOR[bucket] },
										children: score.toFixed(1)
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-mono text-xs text-muted-foreground line-through",
										children: (f.baseSeverity ?? f.baseline ?? 0).toFixed(1)
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-mono text-[10px] text-muted-foreground",
										children: f.reason ?? ""
									})
								]
							}),
							f.epssScore != null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "font-mono text-[10px] text-muted-foreground",
								children: [
									"EPSS: ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-primary",
										children: f.epssScore.toFixed(4)
									}),
									f.cveId && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "ml-2",
										children: f.cveId
									})
								]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase",
						children: "Evidence"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-xs text-foreground",
						children: f.evidence ?? f.reason ?? "Identified by scanner"
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase",
						children: "Regulatory context"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-xs text-muted-foreground",
						children: f.citations?.[sector] ?? f.regulatoryTag ?? "No specific regulation cited."
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: handleSuggestFix,
						className: "glow-accent rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20",
						children: showFix ? "Hide fix" : "Suggest fix"
					})
				]
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AnimatePresence, {
			initial: false,
			children: showFix && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.div, {
				initial: {
					height: 0,
					opacity: 0
				},
				animate: {
					height: "auto",
					opacity: 1
				},
				exit: {
					height: 0,
					opacity: 0
				},
				className: "overflow-hidden",
				children: loadingFix ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-4 rounded-md border border-border bg-panel/60 p-4",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "animate-pulse text-xs text-muted-foreground",
						children: "Generating remediation patch…"
					})
				}) : fixDiff ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-4 overflow-hidden rounded-md border border-border bg-panel/60",
					children: fixDiff.map((d, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex gap-3 px-3 py-1 font-mono text-[11.5px]",
						style: { background: d.sign === "+" ? "color-mix(in oklab, var(--sev-low) 12%, transparent)" : d.sign === "-" ? "color-mix(in oklab, var(--sev-critical) 12%, transparent)" : "transparent" },
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "w-3 shrink-0",
							style: { color: d.sign === "+" ? "var(--sev-low)" : d.sign === "-" ? "var(--sev-critical)" : "var(--muted-foreground)" },
							children: d.sign
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "whitespace-pre-wrap text-foreground/90",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Code, { code: d.code })
						})]
					}, i))
				}), fixNote && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-xs text-muted-foreground",
					children: fixNote
				})] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-4 rounded-md border border-border bg-panel/60 p-4",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "italic text-xs text-muted-foreground",
						children: "No fix available."
					})
				})
			})
		})]
	});
}
function FilterChip({ label, count, active, color, onClick }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		onClick,
		className: `flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[10px] transition-all ${active ? "border-transparent text-background" : "border-border text-muted-foreground hover:text-foreground"}`,
		style: active ? {
			background: color ?? "var(--primary)",
			borderColor: color ?? "var(--primary)"
		} : {},
		children: [label, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: `rounded-full px-1 font-bold tabular-nums ${active ? "bg-background/20" : "bg-muted"}`,
			children: count
		})]
	});
}
function FindingsTable({ sector, applied, focusPath, findings }) {
	const [open, setOpen] = (0, import_react.useState)(null);
	const [filterSource, setFilterSource] = (0, import_react.useState)(null);
	const [filterType, setFilterType] = (0, import_react.useState)(null);
	const [copied, setCopied] = (0, import_react.useState)(false);
	const sources = (0, import_react.useMemo)(() => {
		const map = {};
		findings.forEach((f) => {
			const s = f.source ?? f.tool ?? "unknown";
			map[s] = (map[s] ?? 0) + 1;
		});
		return Object.entries(map).sort((a, b) => b[1] - a[1]);
	}, [findings]);
	const types = (0, import_react.useMemo)(() => {
		const map = {};
		findings.forEach((f) => {
			if (f.type) map[f.type] = (map[f.type] ?? 0) + 1;
		});
		return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8);
	}, [findings]);
	const rows = (0, import_react.useMemo)(() => {
		let filtered = findings;
		if (filterSource) filtered = filtered.filter((f) => (f.source ?? f.tool ?? "unknown") === filterSource);
		if (filterType) filtered = filtered.filter((f) => f.type === filterType);
		return [...filtered].sort((a, b) => applied ? avss(b, sector) - avss(a, sector) : (b.baseSeverity ?? b.baseline ?? 0) - (a.baseSeverity ?? a.baseline ?? 0));
	}, [
		sector,
		applied,
		findings,
		filterSource,
		filterType
	]);
	const handleExport = (0, import_react.useCallback)(() => {
		const payload = JSON.stringify(rows.map((f) => ({
			id: f.id,
			title: f.title,
			type: f.type,
			source: f.source,
			filePath: f.filePath,
			lineNumber: f.lineNumber,
			baseSeverity: f.baseSeverity ?? f.baseline,
			avssScore: f.avssScore ?? avss(f, sector),
			epssScore: f.epssScore,
			cveId: f.cveId,
			evidence: f.evidence,
			regulatoryTag: f.regulatoryTag
		})), null, 2);
		navigator.clipboard.writeText(payload).then(() => {
			setCopied(true);
			setTimeout(() => setCopied(false), 2e3);
		});
	}, [rows, sector]);
	const SOURCE_COLOR = {
		semgrep: "var(--primary)",
		gitleaks: "var(--sev-critical)",
		"custom-rule": "var(--sev-medium)",
		sca: "var(--sev-high)"
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "panel overflow-hidden rounded-xl",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between border-b border-border px-4 py-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
					className: "text-sm font-medium",
					children: ["Findings", (filterSource || filterType) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "ml-2 font-mono text-[10px] text-muted-foreground",
						children: [rows.length, " shown"]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "font-mono text-[11px] text-muted-foreground",
						children: [
							"baseline ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "line-through",
								children: "flat"
							}),
							" → AVSS ·",
							" ",
							applied ? "sector applied" : "unweighted"
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: handleExport,
						className: "rounded-md border border-border px-2.5 py-1 font-mono text-[10px] text-muted-foreground transition-colors hover:text-foreground",
						children: copied ? "✓ copied" : "export JSON"
					})]
				})]
			}),
			(sources.length > 1 || types.length > 1) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "border-b border-border px-4 py-2 space-y-1.5",
				children: [sources.length > 1 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-center gap-1.5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-mono text-[9px] tracking-widest text-muted-foreground uppercase w-12",
							children: "Scanner"
						}),
						filterSource && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FilterChip, {
							label: "All",
							count: findings.length,
							active: false,
							onClick: () => setFilterSource(null)
						}),
						sources.map(([src, count]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FilterChip, {
							label: src,
							count,
							active: filterSource === src,
							...SOURCE_COLOR[src] ? { color: SOURCE_COLOR[src] } : {},
							onClick: () => setFilterSource(filterSource === src ? null : src)
						}, src))
					]
				}), types.length > 1 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-center gap-1.5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-mono text-[9px] tracking-widest text-muted-foreground uppercase w-12",
							children: "Type"
						}),
						filterType && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FilterChip, {
							label: "All",
							count: findings.length,
							active: false,
							onClick: () => setFilterType(null)
						}),
						types.map(([type, count]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FilterChip, {
							label: type.replace(/-/g, " "),
							count,
							active: filterType === type,
							onClick: () => setFilterType(filterType === type ? null : type)
						}, type))
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "divide-y divide-border",
				children: [rows.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "px-4 py-8 text-center text-xs text-muted-foreground",
					children: "No findings match the selected filters."
				}), rows.map((f, i) => {
					const base = f.baseSeverity ?? f.baseline ?? 0;
					const live = applied ? avss(f, sector) : base;
					const isOpen = open === f.id;
					const focused = focusPath === f.filePath;
					const bucket = severityBucket(live);
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
						layout: true,
						transition: { layout: {
							type: "spring",
							stiffness: 260,
							damping: 30,
							delay: i * .03
						} },
						id: `finding-${f.id}`,
						className: focused ? "bg-primary/5" : "",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: () => setOpen(isOpen ? null : f.id),
							className: "flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-muted/40",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "w-4 shrink-0 font-mono text-[11px] text-muted-foreground",
									children: isOpen ? "−" : "+"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "h-8 w-0.5 shrink-0 rounded-full",
									style: { background: BUCKET_COLOR[bucket] }
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "min-w-0 flex-1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "truncate text-sm text-foreground",
										children: f.title
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "mt-0.5 truncate font-mono text-[11px] text-muted-foreground",
										children: [
											f.filePath,
											":",
											f.lineNumber,
											" ·",
											" ",
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												style: { color: SOURCE_COLOR[f.source ?? ""] ?? "var(--muted-foreground)" },
												children: f.source ?? f.tool ?? "unknown"
											}),
											f.cveId && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "ml-2 text-muted-foreground/60",
												children: f.cveId
											})
										]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "hidden shrink-0 rounded-full border px-2 py-0.5 font-mono text-[10px] sm:block",
									style: {
										color: BUCKET_COLOR[bucket],
										borderColor: BUCKET_COLOR[bucket]
									},
									children: bucket
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex shrink-0 items-baseline gap-2 font-mono tabular-nums",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-xs text-muted-foreground line-through",
										children: base.toFixed(1)
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.span, {
										initial: {
											opacity: .4,
											y: -3
										},
										animate: {
											opacity: 1,
											y: 0
										},
										className: "text-base font-bold",
										style: { color: scoreColor(live) },
										children: live.toFixed(1)
									}, `${live}`)]
								})
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AnimatePresence, {
							initial: false,
							children: isOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.div, {
								initial: {
									height: 0,
									opacity: 0
								},
								animate: {
									height: "auto",
									opacity: 1
								},
								exit: {
									height: 0,
									opacity: 0
								},
								className: "overflow-hidden",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExpandedRow, {
									f,
									sector
								})
							})
						})]
					}, f.id);
				})]
			})
		]
	});
}
function RadarChart({ scores }) {
	const cats = Object.keys(scores);
	const n = cats.length;
	if (n < 3) return null;
	const cx = 90;
	const cy = 90;
	const r = 70;
	const angleStep = 2 * Math.PI / n;
	const pt = (i, val) => {
		const a = angleStep * i - Math.PI / 2;
		const rv = val / 10 * r;
		return {
			x: cx + rv * Math.cos(a),
			y: cy + rv * Math.sin(a)
		};
	};
	const axis = (i) => {
		const a = angleStep * i - Math.PI / 2;
		return {
			x: cx + r * Math.cos(a),
			y: cy + r * Math.sin(a)
		};
	};
	const polygon = (vals) => vals.map((v, i) => {
		const p = pt(i, v);
		return `${p.x},${p.y}`;
	}).join(" ");
	const values = cats.map((c) => scores[c] || 0);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		viewBox: "0 0 180 180",
		className: "w-full max-w-[180px]",
		"aria-label": "Risk radar chart",
		children: [
			[
				2,
				4,
				6,
				8,
				10
			].map((lv) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("polygon", {
				points: polygon(cats.map(() => lv)),
				fill: "none",
				stroke: "var(--border)",
				strokeWidth: "0.5",
				opacity: "0.5"
			}, lv)),
			cats.map((_, i) => {
				const a = axis(i);
				return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
					x1: cx,
					y1: cy,
					x2: a.x,
					y2: a.y,
					stroke: "var(--border)",
					strokeWidth: "0.5",
					opacity: "0.5"
				}, i);
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.polygon, {
				initial: { points: polygon(cats.map(() => 0)) },
				animate: { points: polygon(values) },
				transition: {
					duration: .9,
					ease: "easeOut"
				},
				fill: "color-mix(in oklab, var(--sev-critical) 18%, transparent)",
				stroke: "var(--sev-critical)",
				strokeWidth: "1.5"
			}),
			cats.map((c, i) => {
				const a = axis(i);
				const dx = a.x < 85 ? -4 : a.x > 95 ? 4 : 0;
				const dy = a.y < 85 ? -6 : a.y > 95 ? 10 : 0;
				return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
					x: a.x + dx,
					y: a.y + dy,
					textAnchor: "middle",
					fontSize: "7",
					fill: "var(--muted-foreground)",
					children: c
				}, c);
			})
		]
	});
}
function SeverityBar({ value, max = 10 }) {
	const pct = Math.min(100, value / max * 100);
	const color = value >= 8 ? "var(--sev-critical)" : value >= 5 ? "var(--sev-medium)" : value > 0 ? "var(--primary)" : "var(--muted-foreground)";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "h-1.5 w-full overflow-hidden rounded-full bg-muted",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.div, {
			className: "h-full rounded-full",
			style: { backgroundColor: color },
			initial: { width: 0 },
			animate: { width: `${pct}%` },
			transition: {
				duration: .6,
				ease: "easeOut"
			}
		})
	});
}
function GradeBadge({ grade }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.div, {
		initial: {
			scale: .6,
			opacity: 0
		},
		animate: {
			scale: 1,
			opacity: 1
		},
		transition: {
			type: "spring",
			stiffness: 260,
			damping: 20
		},
		className: "flex h-16 w-16 items-center justify-center rounded-xl border-2 font-mono text-2xl font-black",
		style: {
			borderColor: gradeColor(grade),
			color: gradeColor(grade)
		},
		children: grade
	});
}
function ResultChip({ result }) {
	const label = {
		pass: "PASS",
		fail: "FAIL",
		warn: "WARN",
		info: "INFO"
	}[result];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: "shrink-0 rounded border px-2 py-0.5 font-mono text-[10px] font-bold uppercase",
		style: {
			color: dastResultColor(result),
			borderColor: dastResultColor(result)
		},
		children: label
	});
}
function AISuggestion({ check }) {
	const [open, setOpen] = (0, import_react.useState)(false);
	const [loading, setLoading] = (0, import_react.useState)(false);
	const [fix, setFix] = (0, import_react.useState)(null);
	const handleOpen = async () => {
		if (open) {
			setOpen(false);
			return;
		}
		setOpen(true);
		if (fix) return;
		setLoading(true);
		try {
			const API_URL = getApiUrl();
			const res = await fetch(`${API_URL}/suggest-fix`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ finding: {
					type: check.id,
					title: check.name,
					description: check.description,
					codeSnippet: check.remediation || "",
					fixNote: check.remediation || ""
				} })
			});
			if (res.ok) {
				const data = await res.json();
				setFix({
					steps: (check.remediation || "Follow security best practices.").split(". ").filter(Boolean),
					snippet: data.diff?.map((d) => `${d.sign} ${d.code}`).join("\n") || "",
					note: data.fixNote || check.remediation || ""
				});
			}
		} catch (_) {
			setFix({
				steps: ["Review the remediation guidance above."],
				snippet: "",
				note: check.remediation || ""
			});
		} finally {
			setLoading(false);
		}
	};
	if (!check.remediation) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mt-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			onClick: handleOpen,
			className: "rounded-md bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary hover:bg-primary/20 transition-colors",
			children: open ? "Hide fix" : "AI-suggested fix"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AnimatePresence, {
			initial: false,
			children: open && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.div, {
				initial: {
					height: 0,
					opacity: 0
				},
				animate: {
					height: "auto",
					opacity: 1
				},
				exit: {
					height: 0,
					opacity: 0
				},
				className: "overflow-hidden mt-2",
				children: loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs text-muted-foreground animate-pulse",
					children: "Generating remediation plan…"
				}) : fix ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-md border border-border bg-panel/60 p-3 space-y-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-mono text-[10px] tracking-widest text-muted-foreground uppercase",
							children: "Remediation steps"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
							className: "space-y-1 list-decimal list-inside",
							children: fix.steps.map((s, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
								className: "text-[11px] text-foreground/90",
								children: s
							}, i))
						}),
						fix.snippet && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
							className: "mt-2 overflow-x-auto rounded bg-background/60 p-2 font-mono text-[10px] text-foreground/80",
							children: fix.snippet
						})
					]
				}) : null
			})
		})]
	});
}
function CategoryHeatmap({ checks }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "grid grid-cols-2 gap-2 sm:grid-cols-4",
		children: [
			"TLS",
			"Headers",
			"Cookies",
			"Info Leakage"
		].map((cat) => {
			const catChecks = checks.filter((c) => c.category === cat);
			const failing = catChecks.filter((c) => c.result === "fail").length;
			const warning = catChecks.filter((c) => c.result === "warn").length;
			const maxSev = catChecks.reduce((m, c) => Math.max(m, c.severity), 0);
			const color = maxSev >= 8 ? "var(--sev-critical)" : maxSev >= 5 ? "var(--sev-medium)" : maxSev > 0 ? "var(--primary)" : "var(--muted-foreground)";
			return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
				initial: {
					opacity: 0,
					y: 8
				},
				animate: {
					opacity: 1,
					y: 0
				},
				transition: { delay: .1 },
				className: "rounded-lg border border-border p-3 flex flex-col gap-1.5",
				style: { borderColor: maxSev > 0 ? color : void 0 },
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-mono text-[10px] tracking-widest text-muted-foreground uppercase",
						children: cat
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-mono text-xl font-black",
						style: { color },
						children: maxSev > 0 ? maxSev.toFixed(1) : "—"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex gap-2 font-mono text-[10px]",
						children: [
							failing > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								style: { color: "var(--sev-critical)" },
								children: [failing, " fail"]
							}),
							warning > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								style: { color: "var(--sev-medium)" },
								children: [warning, " warn"]
							}),
							failing === 0 && warning === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-muted-foreground",
								children: "all clear"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SeverityBar, { value: maxSev })
				]
			}, cat);
		})
	});
}
function CheckRow({ check, index }) {
	const [expanded, setExpanded] = (0, import_react.useState)(false);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
		initial: {
			opacity: 0,
			x: -10
		},
		animate: {
			opacity: 1,
			x: 0
		},
		transition: { delay: index * .04 },
		className: "rounded-lg border border-border overflow-hidden",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
			onClick: () => setExpanded((e) => !e),
			className: "flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "w-4 shrink-0 font-mono text-[11px] text-muted-foreground",
					children: expanded ? "−" : "+"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "min-w-0 flex-1",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm font-medium text-foreground truncate",
						children: check.name
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-mono text-[10px] text-muted-foreground mt-0.5",
						children: check.category
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResultChip, { result: check.result }),
				check.severity > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "shrink-0 font-mono text-sm font-bold tabular-nums",
					style: { color: dastResultColor(check.result) },
					children: check.severity.toFixed(1)
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AnimatePresence, {
			initial: false,
			children: expanded && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.div, {
				initial: {
					height: 0,
					opacity: 0
				},
				animate: {
					height: "auto",
					opacity: 1
				},
				exit: {
					height: 0,
					opacity: 0
				},
				className: "overflow-hidden",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "border-t border-border px-4 py-4 bg-background/40 space-y-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs text-foreground/90",
							children: check.description
						}),
						check.evidence && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-mono text-[10px] tracking-widest text-muted-foreground uppercase mb-1",
							children: "Evidence"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
							className: "text-[11px] text-muted-foreground bg-panel/60 rounded px-2 py-1 block overflow-x-auto",
							children: check.evidence
						})] }),
						check.result !== "pass" && check.severity > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "font-mono text-[10px] tracking-widest text-muted-foreground uppercase mb-1",
								children: "Risk"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SeverityBar, { value: check.severity }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "font-mono text-[10px] text-muted-foreground mt-1 block",
								children: [
									"CVSS-like: ",
									check.severity.toFixed(1),
									" / 10"
								]
							})
						] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AISuggestion, { check })
					]
				})
			})
		})]
	});
}
function ScanningOverlay({ stage }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col items-center justify-center gap-4 py-16",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "relative h-12 w-12",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.div, {
					className: "absolute inset-0 rounded-full border-2 border-dast/30",
					animate: { rotate: 360 },
					transition: {
						duration: 1.2,
						repeat: Infinity,
						ease: "linear"
					}
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.div, {
					className: "absolute inset-0 rounded-full border-t-2 border-dast",
					animate: { rotate: 360 },
					transition: {
						duration: .8,
						repeat: Infinity,
						ease: "linear"
					}
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "font-mono text-sm text-dast",
				children: stage
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex gap-1.5 mt-2",
				children: DAST_STAGES.map((s, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.div, {
					className: "h-1 w-1 rounded-full bg-dast",
					animate: { opacity: [
						.2,
						1,
						.2
					] },
					transition: {
						duration: 1.2,
						repeat: Infinity,
						delay: i * .2
					}
				}, s))
			})
		]
	});
}
function UrlInput({ value, onChange, onScan, scanning }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
		onSubmit: (e) => {
			e.preventDefault();
			onScan();
		},
		className: "flex w-full items-center gap-2 rounded-none border border-dast/50 bg-panel/60 p-1.5 backdrop-blur-md",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "pl-2 font-mono text-xs text-muted-foreground",
				children: "https://"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				value,
				onChange: (e) => onChange(e.target.value),
				placeholder: "api.example.com or app.yoursite.com",
				"aria-label": "DAST target URL",
				disabled: scanning,
				className: "min-w-0 flex-1 bg-transparent font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground/60 disabled:opacity-50"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "submit",
				disabled: scanning || !value.trim(),
				className: "shrink-0 rounded-none bg-dast px-5 py-2 text-sm font-bold text-background hover:bg-dast/90 transition-colors disabled:opacity-40",
				children: scanning ? "Scanning…" : "Scan"
			})
		]
	});
}
function DastPanel({ initialUrl = "" }) {
	const [url, setUrl] = (0, import_react.useState)(initialUrl ?? "");
	const [scanning, setScanning] = (0, import_react.useState)(false);
	const [currentStage, setCurrentStage] = (0, import_react.useState)("");
	const [result, setResult] = (0, import_react.useState)(null);
	const [error, setError] = (0, import_react.useState)(null);
	const [activeCategory, setActiveCategory] = (0, import_react.useState)(null);
	const stageRef = (0, import_react.useRef)(0);
	const didAutoScan = (0, import_react.useRef)(false);
	(0, import_react.useEffect)(() => {
		if (initialUrl && !didAutoScan.current) {
			didAutoScan.current = true;
			runScan(initialUrl);
		}
	}, [initialUrl]);
	async function runScan(targetUrl) {
		const scanUrl = targetUrl || url;
		if (!scanUrl.trim()) return;
		setScanning(true);
		setError(null);
		setResult(null);
		stageRef.current = 0;
		const stageInterval = setInterval(() => {
			stageRef.current = (stageRef.current + 1) % DAST_STAGES.length;
			setCurrentStage(DAST_STAGES[stageRef.current] ?? "");
		}, 900);
		setCurrentStage(DAST_STAGES[0] ?? "");
		try {
			const API_URL = getApiUrl();
			const res = await fetch(`${API_URL}/scan/dast`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ targetUrl: scanUrl })
			});
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				throw new Error(body.error || `Server returned ${res.status}`);
			}
			const data = await res.json();
			setResult(data);
		} catch (err) {
			setError(err.message || "Scan failed");
		} finally {
			clearInterval(stageInterval);
			setScanning(false);
		}
	}
	const displayChecks = result ? activeCategory ? result.checks.filter((c) => c.category === activeCategory) : [...result.checks].sort((a, b) => {
		const order = {
			fail: 0,
			warn: 1,
			pass: 2,
			info: 3
		};
		return order[a.result] - order[b.result] || b.severity - a.severity;
	}) : [];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-xl border border-dast/30 bg-dast/[0.06] p-5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-center justify-between gap-3 mb-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-sm font-medium text-foreground",
						children: "Passive Surface Scan"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-xs text-muted-foreground",
						children: "Read-only header, cookie, TLS and information-leakage inspection. No active exploitation or data injection."
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "rounded border border-dast/50 px-2 py-0.5 font-mono text-[11px] text-dast",
						children: "passive · non-destructive"
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(UrlInput, {
					value: url,
					onChange: setUrl,
					onScan: () => runScan(),
					scanning
				})]
			}),
			error && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-lg border border-sev-critical/40 bg-sev-critical/10 px-4 py-3 text-xs text-sev-critical",
				children: ["Scan failed: ", error]
			}),
			scanning && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScanningOverlay, { stage: currentStage }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AnimatePresence, {
				mode: "wait",
				children: result && !scanning && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
					initial: {
						opacity: 0,
						y: 10
					},
					animate: {
						opacity: 1,
						y: 0
					},
					exit: { opacity: 0 },
					className: "space-y-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "rounded-xl border border-border bg-panel/60 p-5",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex flex-wrap items-center gap-6",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(GradeBadge, { grade: result.summary.grade }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex-1 space-y-1.5",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "font-mono text-[10px] tracking-widest text-muted-foreground uppercase",
												children: result.targetUrl
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex flex-wrap gap-4 font-mono text-xs",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
														style: { color: "var(--sev-critical)" },
														children: [result.summary.failCount, " failures"]
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
														style: { color: "var(--sev-medium)" },
														children: [result.summary.warnCount, " warnings"]
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
														style: { color: "var(--sev-low)" },
														children: [result.summary.passCount, " passed"]
													})
												]
											}),
											result.summary.topFindings.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
												className: "text-[11px] text-muted-foreground",
												children: ["Top issues: ", result.summary.topFindings.join(" · ")]
											})
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "shrink-0",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RadarChart, { scores: result.summary.categoryScores })
									})
								]
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "font-mono text-[10px] tracking-widest text-muted-foreground uppercase px-1",
								children: "Category risk heatmap"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CategoryHeatmap, { checks: result.checks })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-wrap gap-1.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								onClick: () => setActiveCategory(null),
								className: `rounded-md px-3 py-1 text-xs font-medium transition-colors ${!activeCategory ? "bg-dast/20 text-dast" : "text-muted-foreground hover:text-foreground"}`,
								children: [
									"All (",
									result.checks.length,
									")"
								]
							}), [
								"TLS",
								"Headers",
								"Cookies",
								"Info Leakage"
							].map((cat) => {
								const n = result.checks.filter((c) => c.category === cat).length;
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									onClick: () => setActiveCategory(cat === activeCategory ? null : cat),
									className: `rounded-md px-3 py-1 text-xs font-medium transition-colors ${activeCategory === cat ? "bg-dast/20 text-dast" : "text-muted-foreground hover:text-foreground"}`,
									children: [
										cat,
										" (",
										n,
										")"
									]
								}, cat);
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "space-y-2",
							children: displayChecks.map((check, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CheckRow, {
								check,
								index: i
							}, check.id))
						})
					]
				}, result.targetUrl)
			}),
			!scanning && !result && !error && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col items-center justify-center gap-3 py-16 text-center",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "rounded-full border border-dast/30 p-4",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", {
							className: "h-6 w-6 text-dast",
							fill: "none",
							stroke: "currentColor",
							viewBox: "0 0 24 24",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
								strokeLinecap: "round",
								strokeLinejoin: "round",
								strokeWidth: 1.5,
								d: "M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
							})
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted-foreground",
						children: "Enter a URL above to run a passive security surface scan"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-mono text-[11px] text-muted-foreground/60",
						children: "TLS · Headers · Cookies · Info Leakage"
					})
				]
			})
		]
	});
}
function Counter({ target, decimals = 0, duration = 900 }) {
	const [display, setDisplay] = (0, import_react.useState)(0);
	const frameRef = (0, import_react.useRef)(0);
	const startRef = (0, import_react.useRef)(0);
	(0, import_react.useEffect)(() => {
		if (typeof requestAnimationFrame === "undefined") {
			setDisplay(target);
			return;
		}
		cancelAnimationFrame(frameRef.current);
		startRef.current = performance.now();
		const tick = (now) => {
			const t = Math.min(1, (now - startRef.current) / duration);
			const eased = 1 - Math.pow(1 - t, 3);
			setDisplay(eased * target);
			if (t < 1) frameRef.current = requestAnimationFrame(tick);
		};
		frameRef.current = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(frameRef.current);
	}, [target, duration]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: display.toFixed(decimals) });
}
function StatCard({ label, value, color, sub, decimals = 0 }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
		initial: {
			opacity: 0,
			y: 6
		},
		animate: {
			opacity: 1,
			y: 0
		},
		transition: { duration: .4 },
		className: "flex flex-col gap-1 rounded-xl border border-border bg-panel/60 px-4 py-3 backdrop-blur-sm",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "font-mono text-[10px] tracking-widest text-muted-foreground uppercase",
				children: label
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "font-mono text-2xl font-black tabular-nums",
				style: { color: color ?? "var(--foreground)" },
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Counter, {
					target: value,
					decimals
				})
			}),
			sub && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "truncate font-mono text-[10px] text-muted-foreground",
				children: sub
			})
		]
	});
}
function SastSummary({ stats, applied }) {
	if (stats.total === 0) return null;
	const topFileName = stats.topRiskFile.split("/").pop() ?? stats.topRiskFile;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
					label: "Total findings",
					value: stats.total
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
					label: "Critical",
					value: stats.critical,
					...stats.critical > 0 ? { color: BUCKET_COLOR.critical } : {}
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
					label: "High",
					value: stats.high,
					...stats.high > 0 ? { color: BUCKET_COLOR.high } : {}
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
					label: "Medium",
					value: stats.medium,
					...stats.medium > 0 ? { color: BUCKET_COLOR.medium } : {}
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
					label: "Threat score",
					value: stats.threatScore,
					decimals: 1,
					color: scoreColor(stats.threatScore),
					sub: applied ? "sector-weighted" : "baseline"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
					label: "Avg EPSS",
					value: stats.avgEpss,
					decimals: 3,
					color: "var(--primary)",
					sub: "exploitation likelihood"
				})
			]
		}), stats.topRiskFile !== "—" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
			initial: {
				opacity: 0,
				x: -6
			},
			animate: {
				opacity: 1,
				x: 0
			},
			transition: { delay: .2 },
			className: "flex items-center gap-3 rounded-lg border px-4 py-2.5",
			style: {
				borderColor: `color-mix(in oklab, ${BUCKET_COLOR.critical} 35%, transparent)`,
				background: `color-mix(in oklab, ${BUCKET_COLOR.critical} 8%, transparent)`
			},
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "h-2 w-2 shrink-0 rounded-full",
					style: {
						background: BUCKET_COLOR.critical,
						boxShadow: `0 0 6px ${BUCKET_COLOR.critical}`
					}
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "font-mono text-xs text-muted-foreground",
					children: "Highest risk file"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "min-w-0 flex-1 truncate font-mono text-xs text-foreground",
					children: topFileName
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "shrink-0 font-mono text-xs font-bold",
					style: { color: scoreColor(stats.topRiskScore) },
					children: ["AVSS ", stats.topRiskScore.toFixed(1)]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "shrink-0 font-mono text-[10px] text-muted-foreground",
					children: stats.topRiskFile
				})
			]
		})]
	});
}
function tintFromScore(score) {
	if (score >= 8) return {
		bg: "color-mix(in oklab, var(--sev-critical) 28%, var(--panel))",
		border: "var(--sev-critical)",
		fg: "var(--sev-critical)"
	};
	if (score >= 6) return {
		bg: "color-mix(in oklab, var(--sev-high) 22%, var(--panel))",
		border: "var(--sev-high)",
		fg: "var(--sev-high)"
	};
	if (score >= 4) return {
		bg: "color-mix(in oklab, var(--sev-medium) 18%, var(--panel))",
		border: "var(--sev-medium)",
		fg: "var(--sev-medium)"
	};
	return {
		bg: "color-mix(in oklab, var(--muted-foreground) 10%, var(--panel))",
		border: "var(--border)",
		fg: "var(--muted-foreground)"
	};
}
function SeverityTreemap({ findings, sector, applied, onSelect }) {
	const [hovered, setHovered] = (0, import_react.useState)(null);
	const groups = (0, import_react.useMemo)(() => groupByFile(findings, sector, applied), [
		findings,
		sector,
		applied
	]);
	if (groups.length === 0) return null;
	Math.max(...groups.map((g) => g.count));
	const weighted = groups.map((g) => ({
		...g,
		weight: g.count * .5 + g.maxScore * .5
	}));
	const maxWeight = Math.max(...weighted.map((g) => g.weight));
	const blocks = weighted.map((g) => ({
		...g,
		pct: Math.max(6, g.weight / maxWeight * 100),
		name: g.path.split("/").pop() ?? g.path,
		dir: g.path.includes("/") ? g.path.split("/").slice(0, -1).join("/") : ""
	}));
	const hoveredBlock = hovered ? blocks.find((b) => b.path === hovered) : null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "panel rounded-xl p-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mb-3 flex items-center justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-sm font-medium",
					children: "Severity treemap"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-0.5 font-mono text-[10px] text-muted-foreground",
					children: [
						"Block size = finding count · color = max ",
						applied ? "AVSS" : "baseline",
						" score"
					]
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex items-center gap-3 font-mono text-[10px] text-muted-foreground",
					children: [
						{
							label: "≥8",
							color: "var(--sev-critical)"
						},
						{
							label: "≥6",
							color: "var(--sev-high)"
						},
						{
							label: "≥4",
							color: "var(--sev-medium)"
						},
						{
							label: "<4",
							color: "var(--muted-foreground)"
						}
					].map((l) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "flex items-center gap-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {
							className: "inline-block h-2 w-2 rounded-[2px]",
							style: { background: l.color }
						}), l.label]
					}, l.label))
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex flex-wrap gap-1.5",
				style: { minHeight: 120 },
				children: blocks.map((b, idx) => {
					const c = tintFromScore(b.maxScore);
					const isHovered = hovered === b.path;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.button, {
						layout: true,
						initial: {
							opacity: 0,
							scale: .85
						},
						animate: {
							opacity: 1,
							scale: 1
						},
						transition: {
							delay: idx * .025,
							type: "spring",
							stiffness: 300,
							damping: 24
						},
						onHoverStart: () => setHovered(b.path),
						onHoverEnd: () => setHovered(null),
						onClick: () => onSelect(b.path),
						className: "relative flex flex-col justify-between overflow-hidden rounded-md border p-2 text-left transition-all",
						style: {
							width: `${b.pct}%`,
							minWidth: 56,
							maxWidth: "48%",
							minHeight: 52 + Math.min(b.count, 6) * 6,
							background: c.bg,
							borderColor: isHovered ? c.fg : `color-mix(in oklab, ${c.border} 40%, transparent)`,
							boxShadow: isHovered ? `0 0 14px -4px ${c.fg}` : "none"
						},
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "truncate font-mono text-[10px] font-bold",
								style: { color: c.fg },
								children: b.name
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-1 flex items-end justify-between",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "font-mono text-[9px] text-muted-foreground",
									children: [
										b.count,
										" finding",
										b.count !== 1 ? "s" : ""
									]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-mono text-sm font-black tabular-nums",
									style: { color: c.fg },
									children: b.maxScore.toFixed(1)
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mt-1.5 flex h-1 w-full gap-px overflow-hidden rounded-full",
								children: b.findings.slice(0, 12).map((f, i) => {
									const s = applied ? f.avssScore ?? f.baseSeverity ?? 0 : f.baseSeverity ?? 0;
									return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "flex-1 rounded-full",
										style: { background: scoreColor(s) }
									}, i);
								})
							})
						]
					}, b.path);
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AnimatePresence, { children: hoveredBlock && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.div, {
				initial: {
					opacity: 0,
					y: 4
				},
				animate: {
					opacity: 1,
					y: 0
				},
				exit: { opacity: 0 },
				className: "mt-3 rounded-lg border border-border bg-panel/80 px-4 py-2.5 backdrop-blur-sm",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-center gap-x-6 gap-y-1 font-mono text-[11px]",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-foreground font-medium",
							children: hoveredBlock.path
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "text-muted-foreground",
							children: [hoveredBlock.count, " findings"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							style: { color: scoreColor(hoveredBlock.maxScore) },
							children: ["max ", hoveredBlock.maxScore.toFixed(1)]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "text-muted-foreground",
							children: ["types: ", [...new Set(hoveredBlock.findings.map((f) => f.type ?? "?"))].join(", ")]
						})
					]
				})
			}) })
		]
	});
}
function RankArrow({ delta }) {
	if (delta === 0) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: "font-mono text-[10px] text-muted-foreground",
		children: "—"
	});
	const up = delta < 0;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.span, {
		initial: {
			opacity: 0,
			y: up ? 4 : -4
		},
		animate: {
			opacity: 1,
			y: 0
		},
		className: "font-mono text-[10px] font-bold tabular-nums",
		style: { color: up ? "var(--sev-critical)" : "var(--sev-low)" },
		children: [
			up ? "▲" : "▼",
			" ",
			Math.abs(delta)
		]
	});
}
function RankedList({ title, subtitle, rows, scoreKey, accent }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col overflow-hidden rounded-xl border border-border bg-panel/60",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "border-b border-border px-4 py-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm font-medium text-foreground",
				children: title
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-0.5 font-mono text-[10px] text-muted-foreground",
				children: subtitle
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "divide-y divide-border overflow-y-auto",
			style: { maxHeight: 420 },
			children: rows.map(({ f, score, rank, rankDelta }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
				layout: true,
				transition: { layout: {
					type: "spring",
					stiffness: 280,
					damping: 28
				} },
				className: "flex items-center gap-3 px-4 py-2.5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "w-5 shrink-0 font-mono text-[11px] text-muted-foreground tabular-nums",
						children: rank + 1
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "min-w-0 flex-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "truncate text-xs text-foreground",
							children: f.title
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "truncate font-mono text-[10px] text-muted-foreground",
							children: [
								f.filePath.split("/").pop(),
								":",
								f.lineNumber
							]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RankArrow, { delta: rankDelta }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.span, {
						initial: {
							opacity: .4,
							scale: .9
						},
						animate: {
							opacity: 1,
							scale: 1
						},
						className: "shrink-0 font-mono text-sm font-black tabular-nums",
						style: { color: scoreKey === "avss" ? accent : scoreColor(score) },
						children: score.toFixed(1)
					}, score)
				]
			}, f.id))
		})]
	});
}
function BeforeAfterPanel({ findings, sector }) {
	const { baseRows, avssRows } = (0, import_react.useMemo)(() => {
		const base = [...findings].sort((a, b) => (b.baseSeverity ?? b.baseline ?? 0) - (a.baseSeverity ?? a.baseline ?? 0)).map((f, rank) => ({
			f,
			score: f.baseSeverity ?? f.baseline ?? 0,
			rank
		}));
		const avssRanked = [...findings].sort((a, b) => avss(b, sector) - avss(a, sector)).map((f, rank) => ({
			f,
			score: avss(f, sector),
			rank
		}));
		const baseRankMap = {};
		base.forEach(({ f, rank }) => {
			baseRankMap[f.id] = rank;
		});
		const avssRows = avssRanked.map(({ f, score, rank }) => ({
			f,
			score,
			rank,
			rankDelta: (baseRankMap[f.id] ?? rank) - rank
		}));
		const avssRankMap = {};
		avssRanked.forEach(({ f, rank }) => {
			avssRankMap[f.id] = rank;
		});
		return {
			baseRows: base.map(({ f, score, rank }) => ({
				f,
				score,
				rank,
				rankDelta: rank - (avssRankMap[f.id] ?? rank)
			})),
			avssRows
		};
	}, [findings, sector]);
	if (findings.length === 0) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "panel rounded-xl p-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mb-4 flex items-center justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-sm font-medium",
					children: "Before / After — AVSS reranking"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-0.5 font-mono text-[10px] text-muted-foreground",
					children: "Left: flat baseline severity · Right: sector-weighted AVSS score · arrows show rank movement"
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "rounded border px-2 py-0.5 font-mono text-[10px]",
					style: {
						borderColor: "var(--primary)",
						color: "var(--primary)"
					},
					children: sector
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-3 lg:grid-cols-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RankedList, {
					title: "Flat CVSS baseline",
					subtitle: "Unweighted baseSeverity order",
					rows: baseRows.slice(0, 15),
					scoreKey: "base",
					accent: "var(--muted-foreground)"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RankedList, {
					title: "AVSS sector-weighted",
					subtitle: `Multiplier applied · sector: ${sector}`,
					rows: avssRows.slice(0, 15),
					scoreKey: "avss",
					accent: "var(--primary)"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-3 font-mono text-[10px] text-muted-foreground",
				children: "▲ = moved up in risk priority after sector weighting · ▼ = moved down"
			})
		]
	});
}
var SOURCE_META = {
	semgrep: {
		label: "Semgrep",
		color: "var(--primary)",
		desc: "SAST — generic rules (SQLi, XSS, eval, path traversal…)"
	},
	gitleaks: {
		label: "Gitleaks",
		color: "var(--sev-critical)",
		desc: "Secret detection — API keys, AWS creds, JWT tokens, private keys"
	},
	"custom-rule": {
		label: "Custom rules",
		color: "var(--sev-medium)",
		desc: "Sector-pattern engine — PHI sinks, Luhn card, CVV/PIN, price-manip"
	},
	sca: {
		label: "SCA / OSV.dev",
		color: "var(--sev-high)",
		desc: "Dependency vulnerabilities with EPSS scores from FIRST.org"
	},
	unknown: {
		label: "Other",
		color: "var(--muted-foreground)",
		desc: "Unclassified findings"
	}
};
var TYPE_META = {
	"phi-log-leak": "var(--sev-critical)",
	"card-number-exposure": "var(--sev-critical)",
	"hardcoded-secret": "var(--sev-critical)",
	"raw-cvv-pin-exposure": "var(--sev-critical)",
	"price-manipulation": "var(--sev-high)",
	"sql-injection": "var(--sev-high)",
	"command-injection": "var(--sev-high)",
	"insecure-deserialization": "var(--sev-high)",
	"cross-site-scripting": "var(--sev-medium)",
	"missing-authentication": "var(--sev-medium)",
	"path-traversal": "var(--sev-medium)",
	"vulnerable-dependency": "var(--sev-medium)",
	"generic-sast-finding": "var(--muted-foreground)"
};
function HBar({ label, count, total, color, desc, pct }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-1",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between font-mono text-[11px]",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-foreground",
					children: label
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "text-muted-foreground tabular-nums",
					children: [
						count,
						" ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "text-muted-foreground/50",
							children: ["/ ", total]
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "h-2 w-full overflow-hidden rounded-full bg-muted",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.div, {
					className: "h-full rounded-full",
					style: { backgroundColor: color },
					initial: { width: 0 },
					animate: { width: `${pct}%` },
					transition: {
						duration: .65,
						ease: "easeOut"
					}
				})
			}),
			desc && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "font-mono text-[9px] text-muted-foreground/70",
				children: desc
			})
		]
	});
}
function SourceBreakdown({ stats }) {
	const [view, setView] = (0, import_react.useState)("source");
	const { sourceRows, typeRows } = (0, import_react.useMemo)(() => {
		const total = stats.total || 1;
		return {
			sourceRows: Object.entries(stats.bySource).sort((a, b) => b[1] - a[1]).map(([src, count]) => {
				const meta = SOURCE_META[src] ?? SOURCE_META["unknown"];
				return {
					key: src,
					label: meta.label,
					color: meta.color,
					desc: meta.desc,
					count,
					pct: count / total * 100
				};
			}),
			typeRows: Object.entries(stats.byType).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([type, count]) => ({
				key: type,
				label: type.replace(/-/g, " "),
				color: TYPE_META[type] ?? "var(--muted-foreground)",
				count,
				pct: count / total * 100
			}))
		};
	}, [stats]);
	if (stats.total === 0) return null;
	const rows = view === "source" ? sourceRows : typeRows;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "panel rounded-xl p-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mb-4 flex items-center justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-sm font-medium",
					children: "Findings breakdown"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex gap-1",
					children: ["source", "type"].map((v) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => setView(v),
						className: `rounded-md px-3 py-1 font-mono text-[10px] uppercase tracking-widest transition-colors ${view === v ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`,
						children: v === "source" ? "By scanner" : "By type"
					}, v))
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "space-y-3",
				children: rows.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HBar, {
					label: r.label,
					count: r.count,
					total: stats.total,
					color: r.color,
					desc: "desc" in r ? r.desc : void 0,
					pct: r.pct
				}, r.key))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-4 flex flex-wrap gap-3",
				children: sourceRows.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {
							className: "inline-block h-2 w-2 rounded-full shrink-0",
							style: { background: r.color }
						}),
						r.label,
						" (",
						Math.round(r.pct),
						"%)"
					]
				}, r.key))
			})
		]
	});
}
var SECTOR_MULTIPLIER = {
	healthcare: 1.6,
	fintech: 1.5,
	ecommerce: 1.3,
	general: 1
};
function ScoreBar({ value, max = 10, color }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "h-1.5 w-full overflow-hidden rounded-full bg-muted",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.div, {
			className: "h-full rounded-full",
			style: { backgroundColor: color },
			initial: { width: 0 },
			animate: { width: `${value / max * 100}%` },
			transition: {
				duration: .55,
				ease: "easeOut"
			}
		})
	});
}
function DeltaBadge({ delta }) {
	if (Math.abs(delta) < .05) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: "font-mono text-[10px] text-muted-foreground",
		children: "="
	});
	const up = delta > 0;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.span, {
		initial: {
			opacity: 0,
			x: up ? -4 : 4
		},
		animate: {
			opacity: 1,
			x: 0
		},
		className: "font-mono text-[10px] font-bold",
		style: { color: up ? "var(--sev-critical)" : "var(--sev-low)" },
		children: [up ? "+" : "", delta.toFixed(1)]
	});
}
var FORMULA_ROWS = [
	{
		aspect: "Base score source",
		cvss: "CVSS v3.1 AV/AC/PR/UI/S/C/I/A vector",
		avss: "Scanner baseSeverity (Semgrep / Gitleaks / OSV)"
	},
	{
		aspect: "Exploitation likelihood",
		cvss: "Not included — static formula only",
		avss: "EPSS score from FIRST.org multiplied into weight"
	},
	{
		aspect: "Industry context",
		cvss: "Sector-agnostic — same score for all industries",
		avss: "Sector multiplier: Healthcare 1.6×, Fintech 1.5×, E-commerce 1.3×"
	},
	{
		aspect: "Regulatory mapping",
		cvss: "None built-in",
		avss: "Automatic citation: DPDP Act, PCI-DSS, RBI 2026, HIPAA §164.312"
	},
	{
		aspect: "Finding type weighting",
		cvss: "Uniform across finding types",
		avss: "Regulatory weight 1.5–1.8× for PHI leaks, card data, credentials"
	},
	{
		aspect: "Score cap",
		cvss: "10.0",
		avss: "10.0 (capped)"
	},
	{
		aspect: "Formula",
		cvss: "Base × Temporal × Environmental",
		avss: "baseSeverity × (1 + EPSS) × sectorMultiplier × regulatoryWeight"
	}
];
function AvssVsCvss({ findings, sector }) {
	const rows = (0, import_react.useMemo)(() => {
		return findings.filter((f) => (f.baseSeverity ?? f.baseline ?? 0) > 0).map((f) => {
			const base = f.baseSeverity ?? f.baseline ?? 0;
			const score = avss(f, sector);
			return {
				f,
				base,
				score,
				delta: score - base
			};
		}).sort((a, b) => b.delta - a.delta).slice(0, 15);
	}, [findings, sector]);
	const avgBase = rows.length ? rows.reduce((s, r) => s + r.base, 0) / rows.length : 0;
	const avgAvss = rows.length ? rows.reduce((s, r) => s + r.score, 0) / rows.length : 0;
	const avgDelta = avgAvss - avgBase;
	const multiplier = SECTOR_MULTIPLIER[sector] ?? 1;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid grid-cols-3 gap-3",
				children: [
					{
						label: "Avg CVSS baseline",
						value: avgBase.toFixed(2),
						color: "var(--muted-foreground)"
					},
					{
						label: "Avg AVSS score",
						value: avgAvss.toFixed(2),
						color: scoreColor(avgAvss)
					},
					{
						label: "Avg score lift",
						value: `+${avgDelta.toFixed(2)}`,
						color: avgDelta > 0 ? "var(--sev-critical)" : "var(--sev-low)"
					}
				].map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
					initial: {
						opacity: 0,
						y: 8
					},
					animate: {
						opacity: 1,
						y: 0
					},
					className: "panel flex flex-col gap-1 rounded-xl px-4 py-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-mono text-[10px] tracking-widest text-muted-foreground uppercase",
						children: s.label
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-mono text-2xl font-black",
						style: { color: s.color },
						children: s.value
					})]
				}, s.label))
			}),
			rows.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "panel overflow-hidden rounded-xl",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "border-b border-border px-4 py-3 flex items-center justify-between",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "text-sm font-medium",
							children: "Finding-level score delta"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "font-mono text-[10px] text-muted-foreground",
							children: [
								sector,
								" · ",
								multiplier,
								"× sector multiplier"
							]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid grid-cols-[1fr_90px_90px_64px] items-center gap-3 border-b border-border px-4 py-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-mono text-[9px] tracking-widest text-muted-foreground uppercase",
								children: "Finding"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-mono text-[9px] tracking-widest text-muted-foreground uppercase text-right",
								children: "CVSS base"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-mono text-[9px] tracking-widest text-muted-foreground uppercase text-right",
								children: "AVSS"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-mono text-[9px] tracking-widest text-muted-foreground uppercase text-right",
								children: "Δ"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "divide-y divide-border",
						children: rows.map(({ f, base, score, delta }, i) => {
							const bucket = severityBucket(score);
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
								initial: {
									opacity: 0,
									x: -8
								},
								animate: {
									opacity: 1,
									x: 0
								},
								transition: { delay: i * .03 },
								className: "grid grid-cols-[1fr_90px_90px_64px] items-center gap-3 px-4 py-2.5",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "min-w-0 space-y-1",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "truncate text-xs text-foreground",
												children: f.title
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "grid grid-cols-2 gap-1",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScoreBar, {
													value: base,
													color: "var(--muted-foreground)"
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScoreBar, {
													value: score,
													color: BUCKET_COLOR[bucket]
												})]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
												className: "font-mono text-[9px] text-muted-foreground truncate",
												children: [
													f.filePath.split("/").pop(),
													":",
													f.lineNumber,
													" · ",
													f.source ?? "unknown"
												]
											})
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-right font-mono text-sm tabular-nums text-muted-foreground",
										children: base.toFixed(1)
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-right font-mono text-sm font-bold tabular-nums",
										style: { color: scoreColor(score) },
										children: score.toFixed(1)
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "flex justify-end",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DeltaBadge, { delta })
									})
								]
							}, f.id);
						})
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "panel overflow-hidden rounded-xl",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "border-b border-border px-4 py-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "text-sm font-medium",
							children: "AVSS vs CVSS — methodology comparison"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-0.5 font-mono text-[10px] text-muted-foreground",
							children: "How sector-aware scoring differs from traditional CVSS"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid grid-cols-[160px_1fr_1fr] gap-px bg-border",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "bg-panel/60 px-3 py-2 font-mono text-[10px] tracking-widest text-muted-foreground uppercase",
								children: "Aspect"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "bg-panel/60 px-3 py-2 font-mono text-[10px] tracking-widest text-muted-foreground uppercase",
								children: "CVSS v3.1"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "bg-panel/60 px-3 py-2 font-mono text-[10px] tracking-widest text-primary uppercase",
								children: "AVSS"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "divide-y divide-border",
						children: FORMULA_ROWS.map((row, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
							initial: { opacity: 0 },
							animate: { opacity: 1 },
							transition: { delay: i * .05 },
							className: "grid grid-cols-[160px_1fr_1fr]",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "px-3 py-3 font-mono text-[11px] font-medium text-muted-foreground",
									children: row.aspect
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "px-3 py-3 text-xs text-muted-foreground/80 border-l border-border",
									children: row.cvss
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "px-3 py-3 text-xs text-foreground border-l border-border bg-primary/[0.03]",
									children: row.avss
								})
							]
						}, row.aspect))
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-xl border px-5 py-4 font-mono text-sm",
				style: {
					borderColor: "color-mix(in oklab, var(--primary) 30%, transparent)",
					background: "color-mix(in oklab, var(--primary) 5%, transparent)"
				},
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-[10px] tracking-widest text-primary uppercase mb-2",
						children: "AVSS formula"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-foreground leading-relaxed",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-primary font-bold",
								children: "AVSS"
							}),
							" = baseSeverity × (1 + EPSS) × ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								style: { color: "var(--sev-medium)" },
								children: "sectorMultiplier"
							}),
							" × ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								style: { color: "var(--sev-high)" },
								children: "regulatoryWeight"
							}),
							" · capped at 10"
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-3 flex flex-wrap gap-x-6 gap-y-1 text-[10px] text-muted-foreground",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-foreground",
								children: "baseSeverity"
							}), " — scanner output (0–10)"] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-foreground",
								children: "EPSS"
							}), " — exploitation probability from FIRST.org (0–1)"] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								style: { color: "var(--sev-medium)" },
								children: "sectorMultiplier"
							}), " — Healthcare 1.6 · Fintech 1.5 · E-com 1.3 · General 1.0"] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								style: { color: "var(--sev-high)" },
								children: "regulatoryWeight"
							}), " — PHI leak 1.8 · Card data 1.8 · Hardcoded secret 1.7 · Price manip 1.5"] })
						]
					})
				]
			})
		]
	});
}
function ScanDashboard() {
	const { repo, dastUrl } = Route.useSearch();
	const initialTab = dastUrl && !repo ? "dast" : "static";
	const [scanning, setScanning] = (0, import_react.useState)(true);
	const [sector, setSector] = (0, import_react.useState)("fintech");
	const [applied, setApplied] = (0, import_react.useState)(false);
	const [focusPath, setFocusPath] = (0, import_react.useState)(null);
	const [tab, setTab] = (0, import_react.useState)(initialTab);
	const [subTab, setSubTab] = (0, import_react.useState)("overview");
	const [findings, setFindings] = (0, import_react.useState)([]);
	const [fileTree, setFileTree] = (0, import_react.useState)([]);
	const [sectorConfidence, setSectorConfidence] = (0, import_react.useState)({
		fintech: 0,
		healthcare: 0,
		ecommerce: 0,
		general: 1
	});
	const [sectorEvidence, setSectorEvidence] = (0, import_react.useState)([]);
	const [scanError, setScanError] = (0, import_react.useState)(null);
	const [scanId, setScanId] = (0, import_react.useState)(void 0);
	const shouldRunSast = !!repo && !(dastUrl && !repo);
	const stats = (0, import_react.useMemo)(() => computeStats(findings, sector, applied), [
		findings,
		sector,
		applied
	]);
	(0, import_react.useEffect)(() => {
		if (!shouldRunSast) {
			setScanning(false);
			return;
		}
		let isMounted = true;
		async function runScan() {
			try {
				setScanning(true);
				setScanError(null);
				const API_URL = getApiUrl();
				const sastRes = await fetch(`${API_URL}/scan/sast`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ repoUrl: repo })
				});
				if (!sastRes.ok) throw new Error("SAST scan failed");
				const sastData = await sastRes.json();
				if (sastData.scanId) setScanId(sastData.scanId);
				const parsedFindings = (sastData.findings || []).map((f) => {
					if (f.codeSnippet && !f.snippet) {
						const lines = f.codeSnippet.split("\n");
						const startLine = Math.max(1, (f.lineNumber || 1) - Math.floor(lines.length / 2));
						f.snippet = lines.map((l, i) => ({
							n: startLine + i,
							code: l
						}));
					}
					return f;
				});
				if (!isMounted) return;
				const scoreRes = await fetch(`${API_URL}/score`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						findings: parsedFindings,
						repoTextSample: sastData.repoTextSample || "",
						detectedRoutes: sastData.detectedRoutes || []
					})
				});
				if (!scoreRes.ok) throw new Error("Scoring failed");
				const scoreData = await scoreRes.json();
				if (!isMounted) return;
				const finalFindings = scoreData.findings || parsedFindings;
				setFindings(finalFindings);
				setFileTree(buildFileTreeFromFindings(finalFindings));
				setSector(scoreData.suggestedSector || "general");
				setSectorConfidence(scoreData.scores || {
					fintech: 0,
					healthcare: 0,
					ecommerce: 0,
					general: 1
				});
				setSectorEvidence(scoreData.matchedEvidence || []);
			} catch (err) {
				if (isMounted) setScanError(err.message || "An error occurred");
			} finally {
				if (isMounted) setScanning(false);
			}
		}
		runScan();
		return () => {
			isMounted = false;
		};
	}, [repo, shouldRunSast]);
	const handleSectorChange = async (newSector) => {
		setSector(newSector);
		setApplied(false);
		try {
			const API_URL = getApiUrl();
			const res = await fetch(`${API_URL}/score`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					findings,
					sector: newSector
				})
			});
			if (res.ok) {
				const data = await res.json();
				if (data.findings) setFindings(data.findings);
			}
		} catch (e) {
			console.error("Re-scoring failed", e);
		}
	};
	const selectFile = (path) => {
		setFocusPath(path);
		setSubTab("overview");
		const f = findings.find((x) => x.filePath === path);
		if (f) document.getElementById(`finding-${f.id}`)?.scrollIntoView({
			behavior: "smooth",
			block: "center"
		});
	};
	const SUB_TABS = [
		{
			id: "overview",
			label: "Overview"
		},
		{
			id: "heatmap",
			label: "Heatmap",
			...findings.length > 0 ? { badge: findings.length } : {}
		},
		{
			id: "compare",
			label: "Before / After"
		},
		{
			id: "breakdown",
			label: "Breakdown"
		},
		{
			id: "avss-vs-cvss",
			label: "AVSS vs CVSS"
		}
	];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-screen bg-background",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("header", {
			className: "sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-6",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/",
						className: "font-mono text-sm font-bold tracking-[0.22em]",
						children: "AVSS"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "hidden gap-1 md:flex",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => setTab("static"),
							className: `rounded-md px-3 py-1.5 text-xs transition-colors ${tab === "static" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`,
							children: "Static analysis"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => setTab("dast"),
							className: `rounded-md px-3 py-1.5 text-xs transition-colors ${tab === "dast" ? "bg-dast/15 text-dast" : "text-muted-foreground hover:text-foreground"}`,
							children: "DAST"
						})]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/",
					className: "rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground",
					children: "New scan"
				})]
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
			className: "mx-auto max-w-7xl space-y-4 px-6 py-6",
			children: [scanError && tab === "static" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "rounded-lg border border-sev-critical/40 bg-sev-critical/10 px-4 py-2.5 text-xs text-sev-critical",
				children: scanError
			}), tab === "dast" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DastPanel, { initialUrl: dastUrl || "" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
				repo ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScanProgress, {
					repo,
					isScanning: scanning,
					findingsCount: findings.length,
					...scanId ? { scanId } : {}
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "rounded-lg border border-border bg-panel/60 px-4 py-2.5 text-xs text-muted-foreground",
					children: "No repository selected. Go back and enter a repository URL."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectorPanel, {
					sector,
					onSector: handleSectorChange,
					confirmed: applied,
					onConfirm: () => setApplied(true),
					sectorConfidence,
					sectorEvidence
				}),
				!scanning && findings.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SastSummary, {
					stats,
					applied
				}),
				!scanning && findings.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex gap-1 border-b border-border pb-0 pt-1",
					children: SUB_TABS.map((st) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: () => setSubTab(st.id),
						className: `flex items-center gap-1.5 rounded-t-md px-4 py-2 text-xs transition-colors ${subTab === st.id ? "border border-b-background border-border bg-panel/60 text-foreground" : "text-muted-foreground hover:text-foreground"}`,
						children: [st.label, st.badge != null && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "rounded-full bg-primary/10 px-1.5 py-0.5 font-mono text-[9px] text-primary",
							children: st.badge
						})]
					}, st.id))
				}),
				(subTab === "overview" || scanning || findings.length === 0) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: scanning ? "pointer-events-none opacity-50" : "",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid gap-4 lg:grid-cols-[280px_1fr]",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileTreeHeatmap, {
							sector,
							applied,
							selected: focusPath,
							onSelect: selectFile,
							fileTree,
							findings
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FindingsTable, {
							sector,
							applied,
							focusPath,
							findings
						})]
					})
				}),
				subTab === "heatmap" && !scanning && findings.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SeverityTreemap, {
						findings,
						sector,
						applied,
						onSelect: selectFile
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid gap-4 lg:grid-cols-[280px_1fr]",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileTreeHeatmap, {
							sector,
							applied,
							selected: focusPath,
							onSelect: selectFile,
							fileTree,
							findings
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FindingsTable, {
							sector,
							applied,
							focusPath,
							findings
						})]
					})]
				}),
				subTab === "compare" && !scanning && findings.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BeforeAfterPanel, {
					findings,
					sector
				}),
				subTab === "breakdown" && !scanning && findings.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SourceBreakdown, { stats }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FindingsTable, {
						sector,
						applied,
						focusPath,
						findings
					})]
				}),
				subTab === "avss-vs-cvss" && !scanning && findings.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AvssVsCvss, {
					findings,
					sector
				})
			] })]
		})]
	});
}
//#endregion
export { ScanDashboard as component };
