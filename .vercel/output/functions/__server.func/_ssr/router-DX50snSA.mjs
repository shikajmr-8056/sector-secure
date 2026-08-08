import { i as __toESM } from "../_runtime.mjs";
import { c as require_jsx_runtime, l as require_react } from "../_libs/@react-three/fiber+[...].mjs";
import { _ as Link, f as createRouter, g as createRootRouteWithContext, h as createFileRoute, l as Scripts, m as lazyRouteComponent, p as Outlet, u as HeadContent, y as useRouter } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as QueryClient } from "../_libs/tanstack__query-core.mjs";
import { t as QueryClientProvider } from "../_libs/tanstack__react-query.mjs";
import { t as clsx } from "../_libs/clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
import { n as stringType, t as objectType } from "../_libs/zod.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/router-DX50snSA.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var __defProp = Object.defineProperty;
var __exportAll = (all, no_symbols) => {
	let target = {};
	for (var name in all) __defProp(target, name, {
		get: all[name],
		enumerable: true
	});
	if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
	return target;
};
var styles_default = "/assets/styles-DttT7lye.css";
function reportLovableError(error, context = {}) {
	if (typeof window === "undefined") return;
	window.__lovableEvents?.captureException?.(error, {
		source: "react_error_boundary",
		route: window.location.pathname,
		...context
	}, {
		mechanism: "react_error_boundary",
		handled: false,
		severity: "error"
	});
	const message = error instanceof Response ? `Response ${error.status}${error.url ? ` at ${error.url}` : ""}` : error instanceof Error ? error.message : String(error);
	const stack = error instanceof Error ? error.stack : void 0;
	window.__lovableReportRuntimeError?.({
		message,
		...stack !== void 0 && { stack },
		filename: window.location.pathname
	});
}
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
/**
* CursorDitherTrail
*
* Renders a full-viewport canvas overlay that paints tiny dithered squares
* wherever the mouse moves, fading them out over `fadeDuration` ms.
*
* The canvas sits pointer-events-none at fixed position so it never blocks
* clicks on elements beneath it.
*
* SSR-safe: all browser APIs (canvas, requestAnimationFrame, mousemove)
* are accessed only inside useEffect, which never runs on the server.
*/
function CursorDitherTrail({ trailColor = "#b6ff3c", dotSize = 4, fadeDuration = 700, className }) {
	const canvasRef = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		const resize = () => {
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
		};
		resize();
		window.addEventListener("resize", resize);
		const hex = trailColor.replace("#", "");
		const bigint = parseInt(hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex, 16);
		const r = bigint >> 16 & 255;
		const g = bigint >> 8 & 255;
		const b = bigint & 255;
		const paint = (cx, cy) => {
			const x = Math.floor(cx / dotSize) * dotSize;
			const y = Math.floor(cy / dotSize) * dotSize;
			const bayer = [[0, 2], [3, 1]];
			const cellX = x / dotSize % 2;
			const threshold = (bayer[y / dotSize % 2 % 2]?.[cellX % 2] ?? 0) / 4;
			if (Math.random() > threshold) {
				ctx.globalCompositeOperation = "source-over";
				ctx.fillStyle = `rgba(${r},${g},${b},0.85)`;
				ctx.fillRect(x, y, dotSize, dotSize);
			}
		};
		let lastTime = performance.now();
		let rafId = 0;
		const fadeLoop = (now) => {
			const delta = now - lastTime;
			lastTime = now;
			const alpha = Math.min(1, delta / fadeDuration);
			ctx.globalCompositeOperation = "destination-out";
			ctx.fillStyle = `rgba(0,0,0,${alpha})`;
			ctx.fillRect(0, 0, canvas.width, canvas.height);
			ctx.globalCompositeOperation = "source-over";
			rafId = requestAnimationFrame(fadeLoop);
		};
		rafId = requestAnimationFrame(fadeLoop);
		const onMove = (e) => {
			paint(e.clientX, e.clientY);
			const spread = dotSize * 2;
			for (let i = 0; i < 2; i++) paint(e.clientX + (Math.random() - .5) * spread, e.clientY + (Math.random() - .5) * spread);
		};
		window.addEventListener("mousemove", onMove);
		return () => {
			cancelAnimationFrame(rafId);
			window.removeEventListener("mousemove", onMove);
			window.removeEventListener("resize", resize);
		};
	}, [
		trailColor,
		dotSize,
		fadeDuration
	]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("canvas", {
		ref: canvasRef,
		"aria-hidden": "true",
		className: cn("pointer-events-none fixed inset-0 z-[9999]", className)
	});
}
function NotFoundComponent() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex min-h-screen items-center justify-center bg-background px-4",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "max-w-md text-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-7xl font-bold text-foreground",
					children: "404"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "mt-4 text-xl font-semibold text-foreground",
					children: "Page not found"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-muted-foreground",
					children: "The page you're looking for doesn't exist or has been moved."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-6",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/",
						className: "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
						children: "Go home"
					})
				})
			]
		})
	});
}
function ErrorComponent({ error, reset }) {
	console.error(error);
	const router = useRouter();
	(0, import_react.useEffect)(() => {
		reportLovableError(error, { boundary: "tanstack_root_error_component" });
	}, [error]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex min-h-screen items-center justify-center bg-background px-4",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "max-w-md text-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-xl font-semibold tracking-tight text-foreground",
					children: "This page didn't load"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-muted-foreground",
					children: "Something went wrong on our end. You can try refreshing or head back home."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-6 flex flex-wrap justify-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => {
							router.invalidate();
							reset();
						},
						className: "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
						children: "Try again"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
						href: "/",
						className: "inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent",
						children: "Go home"
					})]
				})
			]
		})
	});
}
var Route$2 = createRootRouteWithContext()({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1"
			},
			{ title: "AVSS — AI Vulnerability Severity Score" },
			{
				name: "description",
				content: "Sector-aware vulnerability scoring with sink-based detection, EPSS weighting and regulatory context."
			},
			{
				property: "og:title",
				content: "AVSS — AI Vulnerability Severity Score"
			},
			{
				property: "og:description",
				content: "Sector-aware vulnerability scoring for your repository."
			},
			{
				property: "og:type",
				content: "website"
			},
			{
				name: "twitter:card",
				content: "summary_large_image"
			}
		],
		links: [
			{
				rel: "preconnect",
				href: "https://fonts.googleapis.com"
			},
			{
				rel: "preconnect",
				href: "https://fonts.gstatic.com",
				crossOrigin: "anonymous"
			},
			{
				rel: "stylesheet",
				href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
			},
			{
				rel: "stylesheet",
				href: styles_default
			},
			{
				rel: "icon",
				href: "/favicon.ico",
				type: "image/x-icon"
			}
		]
	}),
	shellComponent: RootShell,
	component: RootComponent,
	notFoundComponent: NotFoundComponent,
	errorComponent: ErrorComponent
});
function RootShell({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("html", {
		lang: "en",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("head", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeadContent, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("body", { children: [children, /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scripts, {})] })]
	});
}
function RootComponent() {
	const { queryClient } = Route$2.useRouteContext();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(QueryClientProvider, {
		client: queryClient,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CursorDitherTrail, {
			trailColor: "#b6ff3c",
			dotSize: 4,
			fadeDuration: 700
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {})]
	});
}
var $$splitComponentImporter$1 = () => import("./routes-CszYVROD.mjs");
var Route$1 = createFileRoute("/")({
	head: () => ({ meta: [
		{ title: "AVSS — Sector-aware vulnerability scoring for your repo" },
		{
			name: "description",
			content: "AVSS re-scores code findings with sink-based detection, EPSS weighting and sector multipliers, with plain-language regulatory context."
		},
		{
			property: "og:title",
			content: "AVSS — Sector-aware vulnerability scoring"
		},
		{
			property: "og:description",
			content: "Sink-based detection, EPSS-weighted scores and sector multipliers — scan a repo and see baseline vs AVSS side by side."
		},
		{
			property: "og:type",
			content: "website"
		},
		{
			name: "twitter:card",
			content: "summary_large_image"
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$1, "component")
});
var $$splitComponentImporter = () => import("./scan-BUQv_PVk.mjs");
var Route = createFileRoute("/scan")({
	validateSearch: objectType({
		repo: stringType().default(""),
		dastUrl: stringType().default("")
	}),
	head: () => ({ meta: [
		{ title: "Scan results — AVSS" },
		{
			name: "description",
			content: "Repository scan results with sector-weighted AVSS scores."
		},
		{
			property: "og:title",
			content: "Scan results — AVSS"
		},
		{
			property: "og:type",
			content: "website"
		},
		{
			name: "twitter:card",
			content: "summary_large_image"
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
var rootRouteChildren = {
	IndexRoute: Route$1.update({
		id: "/",
		path: "/",
		getParentRoute: () => Route$2
	}),
	ScanRoute: Route.update({
		id: "/scan",
		path: "/scan",
		getParentRoute: () => Route$2
	})
};
var routeTree = Route$2._addFileChildren(rootRouteChildren)._addFileTypes();
var router_exports = /* @__PURE__ */ __exportAll({ getRouter: () => getRouter });
var getRouter = () => {
	const queryClient = new QueryClient();
	return createRouter({
		routeTree,
		context: { queryClient },
		scrollRestoration: true,
		defaultPreloadStaleTime: 0
	});
};
//#endregion
export { Route as n, router_exports as t };
