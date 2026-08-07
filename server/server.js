const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { cloneRepo } = require('./src/scanner/gitCloner');
const { runSemgrep } = require('./src/scanner/semgrepRunner');
const { runGitleaks } = require('./src/scanner/gitleaksRunner');
const { runCustomRules } = require('./src/scanner/customRules');
const { runSCAScan } = require('./src/scanner/scaScanner');
const { extractRepoMetadata } = require('./src/scanner/extractor');
const { deduplicateAndCapFindings } = require('./src/scanner/deduplicator');
const { detectSector, scoreFindings } = require('./src/scanner/scoringEngine');
const { runDastScan } = require('./src/scanner/dastScanner');

// Path to custom Semgrep YAML rules bundled with the engine
const CUSTOM_SEMGREP_RULES = path.join(
  __dirname,
  'src',
  'scanner',
  'semgrep-rules',
  'sector-patterns.yaml'
);

const app = express();
app.use(cors());
app.use(express.json());

// ─────────────────────────────────────────────────────────────────────────────
// In-memory progress store  { scanId → { stage, done, error, result } }
// Each entry is cleaned up 5 minutes after the scan completes.
// ─────────────────────────────────────────────────────────────────────────────
const scanProgress = new Map();

const STAGES = [
  'Cloning repository...',
  'Running Semgrep (general rules)...',
  'Checking for exposed secrets...',
  'Running custom sector-pattern rules...',
  'Validating card-number matches (Luhn)...',
  'Cross-referencing CVEs (OSV.dev + EPSS)...',
  'Extracting routes and repo metadata...',
  'Deduplicating and ranking findings...',
  'Scan complete.'
];

function setStage(scanId, stage, extra = {}) {
  const entry = scanProgress.get(scanId);
  if (!entry) return;
  Object.assign(entry, { stage, ...extra, updatedAt: Date.now() });
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /health
// ─────────────────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', engine: 'AVSS SAST Scanner Engine v1.1' });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /scan/sast/progress/:scanId  — Server-Sent Events stream
//
// The frontend connects here immediately after POST /scan/sast returns a scanId.
// Events are { stage, done, error }.
// ─────────────────────────────────────────────────────────────────────────────
app.get('/scan/sast/progress/:scanId', (req, res) => {
  const { scanId } = req.params;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // If scan doesn't exist at all, send a terminal error immediately
  if (!scanProgress.has(scanId)) {
    send({ error: 'Unknown scanId', done: true });
    return res.end();
  }

  // Poll every 250ms and push the latest stage to the client
  const interval = setInterval(() => {
    const entry = scanProgress.get(scanId);
    if (!entry) {
      send({ error: 'Scan entry evicted', done: true });
      clearInterval(interval);
      return res.end();
    }

    send({
      stage: entry.stage,
      done: !!entry.done,
      error: entry.error || null
    });

    if (entry.done || entry.error) {
      clearInterval(interval);
      res.end();
    }
  }, 250);

  // Client disconnected — stop polling
  req.on('close', () => clearInterval(interval));
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /scan/sast
//
// Body: { repoUrl: string, sector?: 'healthcare' | 'fintech' | 'ecommerce' }
//
// Returns immediately with { scanId } then starts the scan asynchronously.
// Progress can be followed via GET /scan/sast/progress/:scanId.
// Final results are also returned in the response once the scan completes
// (the SSE stream is for live UI updates; the POST response has the full result).
//
// Note: because the POST awaits all scan steps, it stays open until done.
// The SSE endpoint is the parallel channel for incremental UI progress.
// ─────────────────────────────────────────────────────────────────────────────
app.post('/scan/sast', async (req, res) => {
  const { repoUrl, sector: sectorOverride } = req.body;

  if (!repoUrl || typeof repoUrl !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid repoUrl in request body' });
  }

  // Initialise progress entry *before* starting work so the SSE endpoint can
  // find it immediately after the client receives the scanId.
  const scanId = require('crypto').randomUUID
    ? require('crypto').randomUUID()
    : require('uuid').v4();

  scanProgress.set(scanId, { stage: STAGES[0], done: false, error: null });

  // Schedule cleanup 5 min after scan ends
  const scheduleCleanup = () =>
    setTimeout(() => scanProgress.delete(scanId), 5 * 60 * 1000);

  let scanContext = null;

  try {
    console.log(`[SAST Engine] [${scanId}] Starting scan for: ${repoUrl}`);

    // ── Stage 1: Clone ──────────────────────────────────────────────────────
    setStage(scanId, STAGES[0]);
    scanContext = await cloneRepo(repoUrl);
    const { targetDir } = scanContext;

    // ── Stage 2: Semgrep ────────────────────────────────────────────────────
    setStage(scanId, STAGES[1]);
    let semgrepFindings = [];
    try {
      console.log(`[SAST Engine] [${scanId}] Running Semgrep...`);
      semgrepFindings = await runSemgrep(targetDir, CUSTOM_SEMGREP_RULES);
    } catch (e) {
      console.warn(`[SAST Engine] [${scanId}] Semgrep skipped:`, e.message);
    }

    // ── Stage 3: Gitleaks ───────────────────────────────────────────────────
    setStage(scanId, STAGES[2]);
    let gitleaksFindings = [];
    try {
      console.log(`[SAST Engine] [${scanId}] Running Gitleaks...`);
      gitleaksFindings = await runGitleaks(targetDir);
    } catch (e) {
      console.warn(`[SAST Engine] [${scanId}] Gitleaks skipped:`, e.message);
    }

    // ── Stage 4 + 5: Custom rules (includes Luhn validation) ────────────────
    setStage(scanId, STAGES[3]);
    console.log(`[SAST Engine] [${scanId}] Running custom sector rules...`);
    const customFindings = await runCustomRules(targetDir);
    // Announce the Luhn-specific sub-step so the UI can surface it
    setStage(scanId, STAGES[4]);

    // ── Stage 6: SCA / CVE ──────────────────────────────────────────────────
    setStage(scanId, STAGES[5]);
    console.log(`[SAST Engine] [${scanId}] Running SCA / OSV.dev + EPSS...`);
    const scaFindings = await runSCAScan(targetDir);

    // ── Stage 7: Route + text extraction ────────────────────────────────────
    setStage(scanId, STAGES[6]);
    console.log(`[SAST Engine] [${scanId}] Extracting routes and repo metadata...`);
    const { detectedRoutes, repoTextSample } = extractRepoMetadata(targetDir);

    // ── Stage 8: Deduplicate + cap ──────────────────────────────────────────
    setStage(scanId, STAGES[7]);
    const rawAll = [
      ...semgrepFindings,
      ...gitleaksFindings,
      ...customFindings,
      ...scaFindings
    ];
    const findings = deduplicateAndCapFindings(rawAll);

    console.log(
      `[SAST Engine] [${scanId}] Done. ${rawAll.length} raw → ${findings.length} capped findings.`
    );

    // Mark complete in progress store
    setStage(scanId, STAGES[8], { done: true });
    scheduleCleanup();

    return res.json({
      scanId,
      findings,
      repoTextSample,
      detectedRoutes
    });

  } catch (err) {
    console.error(`[SAST Engine] [${scanId}] Scan failed:`, err.message);
    setStage(scanId, `Error: ${err.message}`, { done: true, error: err.message });
    scheduleCleanup();

    return res.status(500).json({
      scanId,
      error: 'Scan execution failed',
      details: err.message
    });
  } finally {
    if (scanContext && typeof scanContext.cleanup === 'function') {
      scanContext.cleanup();
      console.log(`[SAST Engine] [${scanId}] Temp folder cleaned up.`);
    }
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /score  — AVSS Formula & Sector Detection  (Person 2)
// ─────────────────────────────────────────────────────────────────────────────
app.post('/score', (req, res) => {
  try {
    const {
      findings = [],
      repoTextSample = '',
      detectedRoutes = [],
      sector
    } = req.body;

    const sectorDetection = detectSector(detectedRoutes, repoTextSample, findings);
    const targetSector = sector || sectorDetection.suggestedSector;

    const scoredFindings = scoreFindings(findings, targetSector);

    return res.json({
      suggestedSector: sectorDetection.suggestedSector,
      scores: sectorDetection.scores,
      matchedEvidence: sectorDetection.matchedEvidence,
      findings: scoredFindings
    });
  } catch (err) {
    console.error('[SAST Engine] Scoring failed:', err.message);
    return res.status(500).json({ error: 'Scoring execution failed', details: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /scan/dast
//
// Body: { targetUrl: string }
// Runs passive header/TLS/cookie/info-leakage checks against the target.
// NO active exploitation — read-only, non-destructive.
// ─────────────────────────────────────────────────────────────────────────────
app.post('/scan/dast', async (req, res) => {
  const { targetUrl } = req.body;

  if (!targetUrl || typeof targetUrl !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid targetUrl in request body' });
  }

  // Basic safety: reject obviously internal/loopback addresses
  const blocked = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/i;
  const cleaned = targetUrl.replace(/^https?:\/\//i, '');
  if (blocked.test(cleaned)) {
    return res.status(400).json({ error: 'Scanning internal/loopback addresses is not permitted.' });
  }

  try {
    console.log(`[DAST Engine] Starting scan for: ${targetUrl}`);
    const result = await runDastScan(targetUrl);
    console.log(`[DAST Engine] Done. ${result.checks.length} checks, grade ${result.summary.grade}`);
    return res.json(result);
  } catch (err) {
    console.error(`[DAST Engine] Scan failed:`, err.message);
    return res.status(500).json({ error: 'DAST scan failed', details: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /suggest-fix  — Type-aware remediation engine
// Generates a real, context-specific diff and fix note based on finding.type.
// ─────────────────────────────────────────────────────────────────────────────
app.post('/suggest-fix', (req, res) => {
  const { finding } = req.body;

  if (!finding) {
    return res.status(400).json({ error: 'Missing finding' });
  }

  const type = (finding.type || '').toLowerCase();
  const snippet = (finding.codeSnippet || '').trim();
  const filePath = finding.filePath || '';

  // ── Type-specific remediation database ──────────────────────────────────
  const remediations = {
    'phi-log-leak': {
      diff: [
        { sign: '-', code: snippet || 'console.log("patient:", patient_id, diagnosis);' },
        { sign: '+', code: '// Encrypt PHI before any logging or writing' },
        { sign: '+', code: 'const masked = maskPHI(patient_id); // show only last 4 chars' },
        { sign: '+', code: 'logger.info("Patient accessed", { id: masked });' },
      ],
      fixNote: `PHI variables must never reach logging sinks in plaintext. Mask or encrypt before logging. Relevant under India's DPDP Act §8 and HIPAA §164.312(a).`
    },
    'card-number-exposure': {
      diff: [
        { sign: '-', code: snippet || 'const card_number = "4532015112830366";' },
        { sign: '+', code: '// Never store or log raw PANs — tokenise at point of entry' },
        { sign: '+', code: 'const token = await paymentGateway.tokenize(rawCardInput);' },
        { sign: '+', code: '// Store token, never the PAN. PCI-DSS Req 3.4.' },
      ],
      fixNote: 'Primary Account Numbers (PANs) must be tokenised via a PCI-DSS compliant vault. Raw card data must not exist in application code or logs.'
    },
    'hardcoded-secret': {
      diff: [
        { sign: '-', code: snippet || 'const api_key = "AKIA1234567890123456";' },
        { sign: '+', code: '// Load credentials from environment — never hard-code' },
        { sign: '+', code: 'const api_key = process.env.API_KEY;' },
        { sign: '+', code: 'if (!api_key) throw new Error("API_KEY env var not set");' },
      ],
      fixNote: 'Rotate the exposed credential immediately. Store secrets in environment variables, a secrets manager (AWS Secrets Manager, HashiCorp Vault), or a CI/CD secret store — never in source code.'
    },
    'raw-cvv-pin-exposure': {
      diff: [
        { sign: '-', code: snippet || 'const cvv = "123";' },
        { sign: '+', code: '// CVV must NEVER be stored or hard-coded (PCI-DSS Req 3.2)' },
        { sign: '+', code: '// Accept CVV only transiently for authorisation, then discard' },
        { sign: '+', code: 'const authResult = await gateway.authorise({ pan: token, cvv: req.body.cvv });' },
        { sign: '+', code: '// cvv is never stored after this point' },
      ],
      fixNote: 'CVV/CVC2 values must not be stored after authorisation. Transmit directly to payment processor over TLS and discard. PCI-DSS Req 3.2.1 prohibits storage post-auth.'
    },
    'price-manipulation': {
      diff: [
        { sign: '-', code: snippet || 'total_price = price * items.length;  // client-side' },
        { sign: '+', code: '// Price must be computed server-side only' },
        { sign: '+', code: '// Frontend: send item IDs and quantities, NOT prices' },
        { sign: '+', code: 'const order = { items: [{ sku: item.sku, qty: item.qty }] };' },
        { sign: '+', code: '// Server recalculates and validates: amount > 0' },
        { sign: '+', code: 'if (serverAmount <= 0) return res.status(400).json({ error: "Invalid amount" });' },
      ],
      fixNote: 'Client-side price calculations can be tampered. Send only item IDs/quantities to the server; the server must independently compute the total and enforce amount > 0 before charging.'
    },
    'sql-injection': {
      diff: [
        { sign: '-', code: snippet || 'db.query("SELECT * FROM users WHERE id = " + req.params.id);' },
        { sign: '+', code: '// Use parameterised queries — never string-concatenate user input' },
        { sign: '+', code: 'db.query("SELECT * FROM users WHERE id = $1", [req.params.id]);' },
      ],
      fixNote: 'Parameterised queries (prepared statements) eliminate SQL injection by separating code from data. Never build SQL strings by concatenating request parameters.'
    },
    'cross-site-scripting': {
      diff: [
        { sign: '-', code: snippet || 'res.send("<div>" + req.query.name + "</div>");' },
        { sign: '+', code: '// Escape all user input before rendering in HTML context' },
        { sign: '+', code: 'const safe = escapeHtml(req.query.name);' },
        { sign: '+', code: 'res.send(`<div>${safe}</div>`);' },
      ],
      fixNote: 'HTML-encode all user-controlled values before inserting into HTML. Use a template engine with auto-escaping (e.g. Handlebars, Nunjucks). Add Content-Security-Policy to the response.'
    },
    'insecure-deserialization': {
      diff: [
        { sign: '-', code: snippet || 'const obj = eval(req.body.data);' },
        { sign: '+', code: '// Never eval() user input. Use JSON.parse with schema validation.' },
        { sign: '+', code: 'const obj = JSON.parse(req.body.data);' },
        { sign: '+', code: 'validateSchema(obj); // e.g. with zod or joi' },
      ],
      fixNote: 'Avoid eval() and unsafe deserialisation methods. Parse with JSON.parse and validate the resulting object against a strict schema before use.'
    },
    'missing-authentication': {
      diff: [
        { sign: '-', code: snippet || 'app.post("/admin/delete", async (req, res) => {' },
        { sign: '+', code: '// Add authentication middleware before the route handler' },
        { sign: '+', code: 'app.post("/admin/delete", requireAuth, requireRole("admin"), async (req, res) => {' },
        { sign: '+', code: '  // handler logic...' },
        { sign: '+', code: '});' },
      ],
      fixNote: 'All sensitive and admin endpoints must verify a valid session/JWT before processing. Apply authentication and authorisation middleware consistently.'
    },
    'command-injection': {
      diff: [
        { sign: '-', code: snippet || 'exec("ls " + req.query.dir, callback);' },
        { sign: '+', code: '// Never pass user input to shell commands' },
        { sign: '+', code: '// Use built-in APIs (fs, path) instead of shell execution' },
        { sign: '+', code: 'const safePath = path.resolve("/safe/base", path.basename(req.query.dir));' },
        { sign: '+', code: 'fs.readdir(safePath, callback);' },
      ],
      fixNote: 'Avoid spawning shell commands with user-controlled input. Use Node.js built-in APIs. If exec is unavoidable, use execFile() with an explicit argument array, never string interpolation.'
    },
    'vulnerable-dependency': {
      diff: [
        { sign: '-', code: snippet || `"${finding.filePath?.includes('requirements') ? 'package' : 'package'}": "vulnerable-version"` },
        { sign: '+', code: `// Run: npm audit fix   (or: pip install --upgrade ${snippet.split('@')[0] || 'package'})` },
        { sign: '+', code: `// Pin to the patched version listed in the CVE advisory` },
      ],
      fixNote: `Update to the patched version referenced in ${finding.cveId || 'the CVE advisory'}. Run \`npm audit\` / \`pip-audit\` in CI to catch future regressions. EPSS score: ${finding.epssScore != null ? finding.epssScore.toFixed(3) : 'N/A'}.`
    }
  };

  // Find the best matching remediation
  let matched = null;
  for (const [key, val] of Object.entries(remediations)) {
    if (type.includes(key) || type === key) {
      matched = val;
      break;
    }
  }

  // Fallback: generic but meaningful guidance based on source tool
  if (!matched) {
    const source = (finding.source || '').toLowerCase();
    matched = {
      diff: [
        { sign: '-', code: snippet || '// vulnerable code pattern' },
        { sign: '+', code: `// Remediate: ${finding.title || 'Review finding and apply secure coding pattern'}` },
        { sign: '+', code: `// File: ${filePath}${finding.lineNumber ? `:${finding.lineNumber}` : ''}` },
      ],
      fixNote: finding.evidence
        ? `Triggered by: ${finding.evidence}. Review the flagged code and apply the principle of least privilege and input validation.`
        : 'Review the flagged code pattern. Apply input validation, output encoding, and principle of least privilege as appropriate for this finding type.'
    };
  }

  return res.json({ diff: matched.diff, fixNote: matched.fixNote });
});

// ─────────────────────────────────────────────────────────────────────────────
// Start server
// ─────────────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`================================================`);
    console.log(` AVSS SAST Scanner Engine  — port ${PORT}`);
    console.log(` POST /scan/sast`);
    console.log(` GET  /scan/sast/progress/:scanId  (SSE)`);
    console.log(` POST /scan/dast`);
    console.log(` POST /score`);
    console.log(` POST /suggest-fix`);
    console.log(`================================================`);
  });
}

module.exports = app;
