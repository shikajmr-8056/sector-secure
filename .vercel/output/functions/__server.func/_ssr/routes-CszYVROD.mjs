import { i as __toESM } from "../_runtime.mjs";
import { c as require_jsx_runtime, l as require_react } from "../_libs/@react-three/fiber+[...].mjs";
import { _ as Link, v as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-CszYVROD.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var Globe = (0, import_react.lazy)(() => import("./Globe-DjcG301h.mjs"));
function ScanInput({ size = "lg" }) {
	const navigate = useNavigate();
	const [mode, setMode] = (0, import_react.useState)("sast");
	const [value, setValue] = (0, import_react.useState)("");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: `flex flex-col gap-2 ${size === "lg" ? "max-w-xl" : "w-full"}`,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex gap-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: () => {
					setMode("sast");
					setValue("");
				},
				className: `px-3 py-1 font-mono text-xs font-bold uppercase transition-colors border ${mode === "sast" ? "border-primary bg-primary/10 text-primary" : "border-border bg-panel/40 text-muted-foreground hover:text-foreground"}`,
				children: "SAST (Repo)"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: () => {
					setMode("dast");
					setValue("");
				},
				className: `px-3 py-1 font-mono text-xs font-bold uppercase transition-colors border ${mode === "dast" ? "border-dast bg-dast/15 text-dast" : "border-border bg-panel/40 text-muted-foreground hover:text-foreground"}`,
				children: "DAST (URL)"
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
			onSubmit: (e) => {
				e.preventDefault();
				if (mode === "dast") navigate({
					to: "/scan",
					search: {
						repo: "",
						dastUrl: value || "example.com"
					}
				});
				else navigate({
					to: "/scan",
					search: {
						repo: value,
						dastUrl: ""
					}
				});
			},
			className: "flex w-full items-center gap-2 rounded-none border border-border bg-panel/60 p-1.5 backdrop-blur-md",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "pl-2 font-mono text-xs text-muted-foreground",
					children: "https://"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					value,
					onChange: (e) => setValue(e.target.value),
					placeholder: mode === "sast" ? "github.com/org/repo" : "api.example.com or app.internal",
					"aria-label": mode === "sast" ? "Repository URL" : "DAST Target URL",
					className: "min-w-0 flex-1 bg-transparent font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "submit",
					className: `shrink-0 rounded-none px-5 py-2 text-sm font-bold transition-colors ${mode === "dast" ? "bg-dast text-background hover:bg-dast/90" : "bg-primary text-primary-foreground hover:bg-primary/90"}`,
					children: mode === "dast" ? "Scan DAST" : "Scan now"
				})
			]
		})]
	});
}
function Landing() {
	const [mounted, setMounted] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => setMounted(true), []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "relative min-h-screen overflow-hidden bg-background",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "grid-backdrop pointer-events-none absolute inset-0 opacity-40" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-8",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-mono text-xl font-black tracking-[0.25em] text-foreground",
						children: "AVSS"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("nav", {
						className: "hidden gap-6 text-sm text-muted-foreground md:flex",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
								className: "transition-colors hover:text-foreground",
								href: "#product",
								children: "Product"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
								className: "transition-colors hover:text-foreground",
								href: "#how",
								children: "How it works"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
								className: "transition-colors hover:text-foreground",
								href: "#how",
								children: "Docs"
							})
						]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/scan",
						className: "rounded-none border border-primary px-4 py-2 text-sm font-bold text-primary transition-colors hover:bg-primary/10",
						children: "Scan a repo"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/scan",
						search: {
							repo: "",
							dastUrl: "example.com"
						},
						className: "rounded-none border border-dast bg-dast/10 px-4 py-2 text-sm font-bold text-dast transition-colors hover:bg-dast/20",
						children: "Scan URL (DAST)"
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
				className: "relative z-10",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: "mx-auto grid max-w-6xl items-center gap-10 px-6 pt-10 pb-20 lg:grid-cols-[1.05fr_1fr] lg:pt-16",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "z-20",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "font-mono text-xs font-bold tracking-[0.2em] text-primary uppercase",
									children: "AI Vulnerability Severity Score"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
									className: "mt-5 text-5xl leading-[0.95] font-black tracking-tighter text-balance sm:text-6xl lg:text-7xl",
									children: "Vulnerability scoring that knows your sector"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-5 max-w-lg text-base text-muted-foreground",
									children: "Sink-based detection, EPSS-weighted likelihood and sector multipliers — every finding shows its flat baseline next to its AVSS score."
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "mt-8",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScanInput, {})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-3 font-mono text-xs text-muted-foreground",
									children: "Read-only clone · no code retained after scoring"
								})
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "relative aspect-square w-full",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "pointer-events-none absolute top-10 -left-10 z-10 flex flex-col gap-1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "font-mono text-[10px] text-muted-foreground tracking-widest",
										children: [
											"PIPELINE ",
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-primary",
												children: "SAST"
											}),
											" / ",
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-foreground",
												children: "DAST"
											})
										]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex h-0.5 w-32 gap-0.5",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-full w-1/3 bg-primary" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-full w-2/3 bg-muted" })]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "pointer-events-none absolute top-20 -right-12 z-10 flex flex-col items-end gap-1 text-right",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "font-mono text-[10px] text-muted-foreground tracking-widest",
											children: [
												"SECTOR DETECTION / ",
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "text-foreground",
													children: "3"
												}),
												" \xA0 WEIGHTED"
											]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "font-mono text-[10px] text-muted-foreground tracking-widest mt-2",
											children: "AVSS — FORMULA SCORING"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "flex h-0.5 w-24 justify-end",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-full w-1/2 bg-primary" })
										})
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "pointer-events-none absolute top-1/2 -right-16 z-10 -translate-y-1/2 flex flex-col gap-2",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "font-mono text-[10px] text-muted-foreground tracking-wider",
											children: ["EPSS ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-primary",
												children: "FIRST.org"
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "font-mono text-[10px] text-muted-foreground tracking-wider",
											children: ["CVE ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-foreground",
												children: "OSV.dev"
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "font-mono text-[10px] text-muted-foreground tracking-wider",
											children: ["SECRETS ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-primary",
												children: "Gitleaks"
											})]
										})
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "pointer-events-none absolute -bottom-6 -right-4 z-10 flex items-end gap-6",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex gap-4 font-mono text-[10px] tracking-widest text-muted-foreground",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "border-b border-primary text-primary pb-1",
												children: "SCAN"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "pb-1",
												children: "SCORE"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "pb-1",
												children: "EXPLAIN"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "pb-1",
												children: "FIX"
											})
										]
									})
								}),
								mounted && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react.Suspense, {
									fallback: null,
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Globe, {})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "pointer-events-none absolute bottom-2 left-2 font-mono text-[11px] text-muted-foreground",
									children: "Semgrep · Gitleaks · OSV.dev · EPSS"
								})
							]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
						id: "product",
						className: "mx-auto max-w-6xl px-6 pb-32 pt-10",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex flex-col gap-12",
							children: [
								{
									title: "Real sink-based detection",
									body: "Findings are reported only when tainted input reaches a dangerous sink on a reachable path."
								},
								{
									title: "Sector-aware scoring (AVSS)",
									body: "Baseline severity is multiplied by sector weight and EPSS likelihood, not re-labelled by hand."
								},
								{
									title: "Explainable regulatory context",
									body: "Each score cites the specific clause it maps to — PCI-DSS, HIPAA, DPDP — in plain language."
								},
								{
									title: "Explainable, not a black box",
									body: "See exactly why a score moved up or down with transparent attribution."
								}
							].map((c, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex flex-col md:flex-row md:items-center gap-4 md:gap-8",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "font-mono text-4xl lg:text-5xl font-black text-primary",
									children: ["0", i + 1]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex flex-col",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
										className: "text-lg font-bold text-foreground",
										children: c.title
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "mt-1 text-base text-muted-foreground",
										children: c.body
									})]
								})]
							}, c.title))
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
						id: "how",
						className: "mx-auto max-w-6xl px-6 pb-24",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-wrap items-center gap-x-8 gap-y-3 border-y border-border py-5 font-mono text-xs text-muted-foreground",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-muted-foreground/60",
									children: "scans against"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Semgrep" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Gitleaks" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "OSV.dev" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "EPSS" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-muted-foreground/60",
									children: "· sector multipliers applied last"
								})
							]
						})
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("footer", {
				className: "relative z-10 border-t border-border",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-xs text-muted-foreground",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-mono tracking-[0.2em]",
						children: "AVSS"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex gap-6",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
								className: "hover:text-foreground",
								href: "#product",
								children: "Product"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
								className: "hover:text-foreground",
								href: "#how",
								children: "Docs"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
								className: "hover:text-foreground",
								href: "#how",
								children: "Changelog"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
								className: "hover:text-foreground",
								href: "#how",
								children: "Security"
							})
						]
					})]
				})
			})
		]
	});
}
//#endregion
export { Landing as component };
