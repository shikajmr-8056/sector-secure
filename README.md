# Sector Secure

Part 1 — Landing page (3D, cyber-earth theme)

Design a dark, cinematic landing page for a cybersecurity product called AVSS (AI Vulnerability Severity Score). Centerpiece is a rotating 3D globe (use Three.js / react-three-fiber) rendered as a wireframe/glowing digital earth on a near-black background — continents as faint glowing landmasses, thin latitude/longitude mesh lines, small pulsing dots at a few locations representing live "scan activity," and slow ambient auto-rotation. This is the same visual family as glossy dark ops-dashboard sites — glowing cyan/electric-blue lines, translucent glassy panels, soft blur-glow only on accent elements, never on flat surfaces.

Landing page structure (top to bottom):

Nav bar: logo/wordmark "AVSS" left, links (Product / How it works / Docs), a "Scan a repo" primary CTA button right — glowing accent border, no gradient fill.

Hero section: globe centered or right-aligned, headline on the left in large sans-serif ("Vulnerability scoring that knows your sector"), one-line subhead, a repo-URL input + "Scan now" button directly in the hero — the product should feel usable from the first screen, not just marketing.

Below the fold — 3 short feature panels (glassy cards, thin border, no icons-as-illustration clichés): "Real sink-based detection" / "Sector-aware scoring (AVSS)" / "Explainable regulatory context" — one line each, no marketing fluff.

Small trust strip: logos/text row referencing what it scans against (Semgrep, Gitleaks, OSV.dev, EPSS) — plain text/monospace, not badges.

Footer: minimal, dark, small text links only.

Tone: confident but precise — avoid "AI-powered next-gen protection" language. Prefer specific claims (sink-based detection, EPSS-weighted, sector multipliers) over vague ones.

Part 2 — Post-scan dashboard (functional app view)

After the user submits a repo URL (from the hero input or nav CTA), transition to the functional dashboard — same dark cyber theme, but globe is gone; replaced by real scan UI:

Scan progress strip: live staged text ("Cloning repo…", "Running Semgrep…", "Checking for exposed secrets…", "Validating card-number matches…", "Cross-referencing CVEs…") with a thin animated glowing progress bar.

Sector detection panel: auto-suggested sector (Healthcare / Fintech / E-commerce / General) with confidence badge, evidence chips (route matches, field matches, keyword matches), a horizontal bar comparing all sector scores, "Confirm sector" (primary glow) + "Override" (ghost) buttons.

Split view — file-tree heatmap (left) + findings table (right):

File-tree heatmap: repo tree, each row tinted by max AVSS score (red 8–10, amber 5–7.9, dim gray 0–4.9). Click a file → scrolls findings to it.

Findings table: sortable rows — title, filePath:lineNumber in monospace, severity pill, and the flat baseline score (muted, struck-through) shown next to the live AVSS score (bold, colored) — always visible side by side, this pairing is the core proof point.

Expandable finding row (inline, not modal): syntax-highlighted code snippet, exact evidence text (e.g. "Luhn checksum passed on match"), plain-language regulatory citation (e.g. "DPDP Act — sensitive personal data in logs"), "Suggest fix" button revealing an AI-generated +/- diff with a one-line explanation.

Score-jump animation: on sector confirm, rows re-sort by AVSS score with a smooth staggered reorder, heatmap recolors in the same motion — the single most important interaction, prioritize this feeling fluid over any other polish.

DAST tab (secondary, visually distinct): different accent tone or a small "sandboxed demo apps only" badge, restricted to pre-approved demo URLs, passive header/cookie/TLS checks only — no "attack" language, no live exploitation UI.

Fallback state: failed live scan → clearly labeled "showing cached scan" banner, never a blank screen.

Color system: background near-black (#0A0E14 range), panel surfaces charcoal with 1px translucent border, primary accent electric cyan/blue, severity strictly on red→amber→green (never used decoratively elsewhere), muted gray-blue secondary text. Sans-serif for UI labels, monospace for file paths/code/scores/hashes.

Do not include: gamified badges, generic "hacker green terminal" clichés, decorative particle effects unrelated to the globe, or any visual implying live exploitation/attack capability beyond the sandboxed DAST tab.

Tech stack: React + Tailwind, react-three-fiber (or Three.js) for the globe, Framer Motion for the score-jump reorder animation.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/6ced1670-1802-4830-b78c-ec1c2ce60a69).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
