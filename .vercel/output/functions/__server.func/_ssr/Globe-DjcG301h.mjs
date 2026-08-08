import { i as __toESM } from "../_runtime.mjs";
import { a as Float32BufferAttribute, c as require_jsx_runtime, i as BufferGeometry, l as require_react, n as useFrame, o as Quaternion, s as Vector3, t as Canvas } from "../_libs/@react-three/fiber+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/Globe-DjcG301h.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var RADIUS = 1.6;
/** Coarse continental boxes (lat min/max, lon min/max) for a stylized land mask. */
var LAND_BOXES = [
	[
		50,
		71,
		-165,
		-62
	],
	[
		30,
		50,
		-125,
		-68
	],
	[
		24,
		32,
		-112,
		-80
	],
	[
		15,
		30,
		-106,
		-88
	],
	[
		8,
		18,
		-92,
		-77
	],
	[
		60,
		82,
		-55,
		-20
	],
	[
		0,
		12,
		-80,
		-60
	],
	[
		-20,
		0,
		-76,
		-35
	],
	[
		-35,
		-20,
		-72,
		-40
	],
	[
		-55,
		-35,
		-75,
		-58
	],
	[
		36,
		60,
		-10,
		30
	],
	[
		55,
		70,
		5,
		32
	],
	[
		10,
		35,
		-17,
		32
	],
	[
		-12,
		12,
		8,
		42
	],
	[
		-35,
		-12,
		12,
		38
	],
	[
		-25,
		-12,
		43,
		50
	],
	[
		40,
		72,
		30,
		180
	],
	[
		20,
		45,
		45,
		122
	],
	[
		8,
		30,
		68,
		90
	],
	[
		0,
		25,
		95,
		122
	],
	[
		-10,
		6,
		95,
		141
	],
	[
		30,
		45,
		129,
		146
	],
	[
		-38,
		-11,
		113,
		153
	],
	[
		-47,
		-34,
		166,
		179
	],
	[
		-84,
		-72,
		-180,
		180
	]
];
function isLand(lat, lon) {
	for (const [la0, la1, lo0, lo1] of LAND_BOXES) if (lat >= la0 && lat <= la1 && lon >= lo0 && lon <= lo1) return true;
	return false;
}
function toVec(lat, lon, r = RADIUS) {
	const phi = (90 - lat) * (Math.PI / 180);
	const theta = (lon + 180) * (Math.PI / 180);
	return new Vector3(-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
}
function LandDots() {
	const geometry = (0, import_react.useMemo)(() => {
		const pts = [];
		for (let lat = -88; lat <= 88; lat += 1.6) {
			const step = 1.6 / Math.max(.18, Math.cos(lat * Math.PI / 180));
			for (let lon = -180; lon <= 180; lon += step) {
				if (!isLand(lat, lon)) continue;
				const v = toVec(lat, lon, RADIUS * 1.004);
				pts.push(v.x, v.y, v.z);
			}
		}
		const g = new BufferGeometry();
		g.setAttribute("position", new Float32BufferAttribute(pts, 3));
		return g;
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("points", {
		geometry,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pointsMaterial", {
			size: .024,
			sizeAttenuation: true,
			color: "#b6ff3c",
			transparent: true,
			opacity: .6,
			blending: 2
		})
	});
}
function GraticuleLines() {
	const geometry = (0, import_react.useMemo)(() => {
		const seg = [];
		const push = (a, b) => {
			seg.push(a.x, a.y, a.z, b.x, b.y, b.z);
		};
		for (let lat = -80; lat <= 80; lat += 10) for (let lon = -180; lon < 180; lon += 4) push(toVec(lat, lon), toVec(lat, lon + 4));
		for (let lon = -180; lon < 180; lon += 10) for (let lat = -88; lat < 88; lat += 4) push(toVec(lat, lon), toVec(lat + 4, lon));
		const g = new BufferGeometry();
		g.setAttribute("position", new Float32BufferAttribute(seg, 3));
		return g;
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("lineSegments", {
		geometry,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("lineBasicMaterial", {
			color: "#b6ff3c",
			transparent: true,
			opacity: .15,
			depthWrite: false
		})
	});
}
var SCAN_SITES = [
	[37.77, -122.42],
	[51.5, -.12],
	[1.35, 103.82],
	[-33.86, 151.2],
	[19.07, 72.87],
	[50.11, 8.68],
	[-23.55, -46.63]
];
function ScanMarkers() {
	const group = (0, import_react.useRef)(null);
	useFrame(({ clock }) => {
		const t = clock.getElapsedTime();
		group.current?.children.forEach((child, i) => {
			const ring = child.children[1];
			if (!ring) return;
			const phase = (t * .55 + i * .37) % 1;
			const s = .6 + phase * 2.6;
			ring.scale.setScalar(s);
			const mat = ring.material;
			mat.opacity = .65 * (1 - phase);
		});
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("group", {
		ref: group,
		children: SCAN_SITES.map(([lat, lon], i) => {
			const pos = toVec(lat, lon, RADIUS * 1.01);
			const normal = pos.clone().normalize();
			const quat = new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), normal);
			return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("group", {
				position: pos,
				quaternion: quat,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circleGeometry", { args: [.018, 16] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshBasicMaterial", {
					color: "#b6ff3c",
					transparent: true,
					opacity: .6
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ringGeometry", { args: [
					.026,
					.034,
					32
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshBasicMaterial", {
					color: "#b6ff3c",
					transparent: true,
					opacity: .6,
					side: 2
				})] })]
			}, i);
		})
	});
}
function Earth() {
	const group = (0, import_react.useRef)(null);
	useFrame((_, delta) => {
		if (group.current) group.current.rotation.y += delta * .055;
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("group", {
		ref: group,
		rotation: [
			.32,
			0,
			.16
		],
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
				renderOrder: -1,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("sphereGeometry", { args: [
					RADIUS * .99,
					48,
					48
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshBasicMaterial", { color: "#000000" })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(GraticuleLines, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LandDots, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScanMarkers, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("sphereGeometry", { args: [
				RADIUS * 1.12,
				32,
				32
			] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshBasicMaterial", {
				color: "#b6ff3c",
				transparent: true,
				opacity: .04,
				side: 1,
				depthWrite: false
			})] })
		]
	});
}
function Globe() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Canvas, {
		camera: {
			position: [
				0,
				0,
				4.6
			],
			fov: 42
		},
		gl: {
			antialias: true,
			alpha: true
		},
		dpr: [1, 2],
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ambientLight", { intensity: .6 }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Earth, {})]
	});
}
//#endregion
export { Globe as default };
