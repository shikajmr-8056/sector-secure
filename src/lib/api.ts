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
export function getApiUrl(): string {
  // During SSR import.meta.env is available but window is not — safe to read
  const fromEnv = (import.meta.env as Record<string, string | undefined>)["VITE_API_URL"];
  if (fromEnv && fromEnv.trim() !== "") return fromEnv.replace(/\/$/, "");
  return "http://localhost:5000";
}
