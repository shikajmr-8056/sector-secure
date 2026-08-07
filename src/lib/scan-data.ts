export type Sector = "healthcare" | "fintech" | "ecommerce" | "general";

export const SECTORS: { id: Sector; label: string }[] = [
  { id: "fintech", label: "Fintech" },
  { id: "healthcare", label: "Healthcare" },
  { id: "ecommerce", label: "E-commerce" },
  { id: "general", label: "General" },
];

export type Finding = {
  id: string;
  title: string;
  filePath: string;
  line: number;
  tool: string;
  severity: "critical" | "high" | "medium" | "low";
  baseline: number;
  epss: number;
  multipliers: Record<Sector, number>;
  evidence: string;
  citations: Record<Sector, string>;
  snippet: { n: number; code: string }[];
  diff: { sign: "+" | "-" | " "; code: string }[];
  fixNote: string;
};

export const FINDINGS: Finding[] = [
  {
    id: "f1",
    title: "Card number written to application log",
    filePath: "src/api/payments/charge.ts",
    line: 142,
    tool: "semgrep · sink-based",
    severity: "high",
    baseline: 5.3,
    epss: 0.11,
    multipliers: { fintech: 1.78, healthcare: 1.18, ecommerce: 1.62, general: 1.0 },
    evidence: "Luhn checksum passed on match — value reaches logger.info sink unredacted.",
    citations: {
      fintech: "PCI-DSS 3.4 — primary account numbers must be unreadable wherever stored.",
      healthcare: "DPDP Act — sensitive personal data written to persistent logs.",
      ecommerce: "PCI-DSS 3.4 — cardholder data retained in order-service logs.",
      general: "CWE-532 — insertion of sensitive information into log file.",
    },
    snippet: [
      { n: 140, code: "const card = req.body.cardNumber;" },
      { n: 141, code: "if (!validateLuhn(card)) return res.status(400).end();" },
      { n: 142, code: 'logger.info(`charging card ${card} for ${amount}`);' },
      { n: 143, code: "const charge = await gateway.charge({ card, amount });" },
    ],
    diff: [
      { sign: "-", code: 'logger.info(`charging card ${card} for ${amount}`);' },
      { sign: "+", code: 'logger.info(`charging card ${maskPan(card)} for ${amount}`);' },
    ],
    fixNote: "Mask all but the last four digits before the value reaches the logger sink.",
  },
  {
    id: "f2",
    title: "Patient record ID interpolated into SQL string",
    filePath: "src/db/records.ts",
    line: 87,
    tool: "semgrep · taint",
    severity: "critical",
    baseline: 7.4,
    epss: 0.43,
    multipliers: { fintech: 1.14, healthcare: 1.34, ecommerce: 1.1, general: 1.0 },
    evidence: "Request parameter flows to db.query() with no parameterization on 3 paths.",
    citations: {
      fintech: "CWE-89 — injection reachable from an authenticated ledger route.",
      healthcare: "HIPAA §164.312(a) — unauthorized access to electronic PHI.",
      ecommerce: "CWE-89 — injection on a customer-facing catalogue route.",
      general: "CWE-89 — improper neutralization of SQL elements.",
    },
    snippet: [
      { n: 85, code: "const id = req.params.recordId;" },
      { n: 86, code: "// TODO: move to query builder" },
      { n: 87, code: 'const rows = await db.query(`SELECT * FROM records WHERE id = ${id}`);' },
      { n: 88, code: "return rows[0];" },
    ],
    diff: [
      { sign: "-", code: 'await db.query(`SELECT * FROM records WHERE id = ${id}`);' },
      { sign: "+", code: 'await db.query("SELECT * FROM records WHERE id = $1", [id]);' },
    ],
    fixNote: "Use a parameterized query so the identifier is never concatenated into SQL.",
  },
  {
    id: "f3",
    title: "Live Stripe secret key committed to repo",
    filePath: ".env.production",
    line: 12,
    tool: "gitleaks",
    severity: "critical",
    baseline: 6.8,
    epss: 0.66,
    multipliers: { fintech: 1.45, healthcare: 1.12, ecommerce: 1.38, general: 1.0 },
    evidence: "Entropy 4.9, prefix sk_live_ — key present in 41 commits, never rotated.",
    citations: {
      fintech: "PCI-DSS 8.2 — shared payment credentials in version control.",
      healthcare: "CWE-798 — hard-coded credential in tracked configuration.",
      ecommerce: "PCI-DSS 8.2 — payment gateway credential exposure.",
      general: "CWE-798 — use of hard-coded credentials.",
    },
    snippet: [
      { n: 11, code: "NODE_ENV=production" },
      { n: 12, code: "STRIPE_SECRET_KEY=sk_live_51Nx••••••••••••••••••" },
      { n: 13, code: "SENTRY_DSN=https://…" },
    ],
    diff: [
      { sign: "-", code: "STRIPE_SECRET_KEY=sk_live_51Nx••••••••••" },
      { sign: "+", code: "STRIPE_SECRET_KEY=${env:STRIPE_SECRET_KEY}" },
    ],
    fixNote: "Rotate the key, then read it from the runtime secret store at boot.",
  },
  {
    id: "f4",
    title: "axios 1.6.2 — CVE-2024-28849 credential leak on redirect",
    filePath: "package.json",
    line: 34,
    tool: "osv.dev · EPSS 0.72",
    severity: "high",
    baseline: 6.1,
    epss: 0.72,
    multipliers: { fintech: 1.28, healthcare: 1.2, ecommerce: 1.24, general: 1.0 },
    evidence: "Dependency is reachable from 6 outbound request call sites in src/api.",
    citations: {
      fintech: "EPSS 0.72 — exploitation likely; ledger service makes signed outbound calls.",
      healthcare: "EPSS 0.72 — proxy credentials forwarded from PHI-handling service.",
      ecommerce: "EPSS 0.72 — checkout service forwards auth headers cross-host.",
      general: "CVE-2024-28849 — proxy authorization forwarded across redirects.",
    },
    snippet: [
      { n: 33, code: '"dependencies": {' },
      { n: 34, code: '  "axios": "1.6.2",' },
      { n: 35, code: '  "express": "4.19.2"' },
    ],
    diff: [
      { sign: "-", code: '"axios": "1.6.2"' },
      { sign: "+", code: '"axios": "1.7.4"' },
    ],
    fixNote: "Patched in 1.7.4; no breaking changes for the interceptor API in use.",
  },
  {
    id: "f5",
    title: "Session cookie missing SameSite and Secure",
    filePath: "src/server/session.ts",
    line: 23,
    tool: "semgrep · config",
    severity: "medium",
    baseline: 4.6,
    epss: 0.08,
    multipliers: { fintech: 1.32, healthcare: 1.16, ecommerce: 1.4, general: 1.0 },
    evidence: "Cookie is set on an authenticated route without transport or origin flags.",
    citations: {
      fintech: "CWE-1275 — cross-site request forgery against funds-transfer routes.",
      healthcare: "CWE-1275 — session fixation risk on PHI portal.",
      ecommerce: "CWE-1275 — cart and checkout endpoints accept cross-site requests.",
      general: "CWE-1275 — sensitive cookie with improper SameSite attribute.",
    },
    snippet: [
      { n: 22, code: "res.cookie('sid', token, {" },
      { n: 23, code: "  httpOnly: true," },
      { n: 24, code: "});" },
    ],
    diff: [
      { sign: " ", code: "  httpOnly: true," },
      { sign: "+", code: "  secure: true," },
      { sign: "+", code: "  sameSite: 'lax'," },
    ],
    fixNote: "Add Secure and SameSite=lax; both are safe for the current OAuth redirect flow.",
  },
  {
    id: "f6",
    title: "Stack trace returned to client on 500",
    filePath: "src/server/error-handler.ts",
    line: 18,
    tool: "semgrep · sink-based",
    severity: "medium",
    baseline: 3.9,
    epss: 0.05,
    multipliers: { fintech: 1.18, healthcare: 1.22, ecommerce: 1.1, general: 1.0 },
    evidence: "err.stack reaches res.json() on every unhandled route error.",
    citations: {
      fintech: "CWE-209 — internal path and query structure disclosed to clients.",
      healthcare: "CWE-209 — trace may include record identifiers from query context.",
      ecommerce: "CWE-209 — internal service topology disclosed in error payload.",
      general: "CWE-209 — generation of error message containing sensitive information.",
    },
    snippet: [
      { n: 17, code: "app.use((err, req, res, _next) => {" },
      { n: 18, code: "  res.status(500).json({ error: err.message, stack: err.stack });" },
      { n: 19, code: "});" },
    ],
    diff: [
      { sign: "-", code: "res.status(500).json({ error: err.message, stack: err.stack });" },
      { sign: "+", code: "res.status(500).json({ error: 'internal_error', ref: traceId });" },
    ],
    fixNote: "Return a correlation id and keep the trace in the server-side log only.",
  },
  {
    id: "f7",
    title: "Unbounded file upload written to disk",
    filePath: "src/api/uploads/index.ts",
    line: 56,
    tool: "semgrep · sink-based",
    severity: "low",
    baseline: 3.1,
    epss: 0.03,
    multipliers: { fintech: 1.06, healthcare: 1.24, ecommerce: 1.12, general: 1.0 },
    evidence: "No size limit or content-type allowlist before fs.writeFile sink.",
    citations: {
      fintech: "CWE-434 — unrestricted upload on a document-submission route.",
      healthcare: "CWE-434 — scan/report uploads accepted without type checks.",
      ecommerce: "CWE-434 — seller asset upload accepted without type checks.",
      general: "CWE-434 — unrestricted upload of file with dangerous type.",
    },
    snippet: [
      { n: 55, code: "const buf = await readAll(req);" },
      { n: 56, code: "await fs.writeFile(path.join(UPLOAD_DIR, req.query.name), buf);" },
      { n: 57, code: "res.status(201).end();" },
    ],
    diff: [
      { sign: "+", code: "assertAllowedType(req.headers['content-type']);" },
      { sign: "+", code: "assertMaxSize(buf, 8 * 1024 * 1024);" },
      { sign: " ", code: "await fs.writeFile(path.join(UPLOAD_DIR, safeName), buf);" },
    ],
    fixNote: "Enforce an 8 MB cap and an allowlist before the write sink is reached.",
  },
];

export function avss(f: Finding, sector: Sector): number {
  const epssWeight = 0.85 + f.epss * 0.35;
  return Math.min(10, Math.round(f.baseline * f.multipliers[sector] * epssWeight * 10) / 10);
}

export function scoreColor(score: number): string {
  if (score >= 8) return "var(--sev-critical)";
  if (score >= 5) return "var(--sev-medium)";
  return "var(--muted-foreground)";
}

export const SECTOR_CONFIDENCE: Record<Sector, number> = {
  fintech: 0.87,
  ecommerce: 0.41,
  healthcare: 0.19,
  general: 0.08,
};

export const SECTOR_EVIDENCE = [
  "route: /api/payments/charge",
  "field: cardNumber",
  "field: ledgerEntryId",
  "keyword: settlement ×14",
  "dep: stripe@14.2",
  "keyword: KYC ×6",
];

export type TreeNode = {
  path: string;
  name: string;
  depth: number;
  isDir: boolean;
};

export const FILE_TREE: TreeNode[] = [
  { path: "src", name: "src", depth: 0, isDir: true },
  { path: "src/api", name: "api", depth: 1, isDir: true },
  { path: "src/api/payments/charge.ts", name: "payments/charge.ts", depth: 2, isDir: false },
  { path: "src/api/uploads/index.ts", name: "uploads/index.ts", depth: 2, isDir: false },
  { path: "src/api/health.ts", name: "health.ts", depth: 2, isDir: false },
  { path: "src/db", name: "db", depth: 1, isDir: true },
  { path: "src/db/records.ts", name: "records.ts", depth: 2, isDir: false },
  { path: "src/db/pool.ts", name: "pool.ts", depth: 2, isDir: false },
  { path: "src/server", name: "server", depth: 1, isDir: true },
  { path: "src/server/session.ts", name: "session.ts", depth: 2, isDir: false },
  { path: "src/server/error-handler.ts", name: "error-handler.ts", depth: 2, isDir: false },
  { path: ".env.production", name: ".env.production", depth: 0, isDir: false },
  { path: "package.json", name: "package.json", depth: 0, isDir: false },
  { path: "README.md", name: "README.md", depth: 0, isDir: false },
];

export function maxScoreForPath(path: string, sector: Sector, applied: boolean): number {
  const matches = FINDINGS.filter((f) => f.filePath === path || f.filePath.startsWith(path + "/"));
  if (!matches.length) return 0;
  return Math.max(...matches.map((f) => (applied ? avss(f, sector) : f.baseline)));
}

export const SCAN_STAGES = [
  "Cloning repo…",
  "Running Semgrep…",
  "Checking for exposed secrets…",
  "Validating card-number matches…",
  "Cross-referencing CVEs…",
  "Weighting by EPSS…",
];
