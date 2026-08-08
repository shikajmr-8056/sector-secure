/**
 * Returns the base URL for the AVSS backend API.
 *
 * Resolution order:
 *   1. VITE_API_URL env var   — set in Vercel dashboard for production
 *   2. /api proxy             — Vite dev server proxies /api → localhost:5000
 *                               (works when backend runs alongside `npm run dev`)
 *
 * Local dev: just run `npm run dev` (frontend) + `node server/server.js` (backend).
 * No .env file needed — the Vite proxy handles it automatically.
 *
 * Production (Vercel): set VITE_API_URL = https://your-backend.onrender.com
 * in Vercel → Project → Settings → Environment Variables.
 */
export function getApiUrl(): string {
  const fromEnv = (import.meta.env as Record<string, string | undefined>)["VITE_API_URL"];
  if (fromEnv && fromEnv.trim() !== "") return fromEnv.replace(/\/$/, "");

  // In dev the Vite proxy rewrites /api → http://localhost:5000
  // so we use an empty base (same-origin) with /api prefix
  if (import.meta.env.DEV) return "";

  // Production fallback — should not be reached if VITE_API_URL is set
  return "";
}

/**
 * Builds a full API endpoint path.
 * In dev: "/api/scan/sast" → proxied to "http://localhost:5000/scan/sast"
 * In prod: "https://backend.example.com/scan/sast"
 */
export function apiPath(path: string): string {
  const base = getApiUrl();
  const normalPath = path.startsWith("/") ? path : `/${path}`;
  if (base === "") {
    // Dev proxy mode — prefix with /api
    return `/api${normalPath}`;
  }
  return `${base}${normalPath}`;
}
