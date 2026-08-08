/**
 * suggestFix.js
 * AI-powered (Gemini 2.5 Flash Lite) remediation engine.
 * Falls back to a static remediation database when no API key is set.
 */
const axios = require('axios');

// ─── static remediation database ─────────────────────────────────────────────
function buildStatic(finding) {
  const type      = (finding.type || '').toLowerCase();
  const snippet   = (finding.codeSnippet || '').trim();
  const avssScore = finding.avssScore ?? finding.baseSeverity ?? 5;
  const cveId     = finding.cveId || 'CVE advisory';
  const epss      = finding.epssScore;
  const title     = finding.title || type;
  const evidence  = finding.evidence || '';

  const DB = {
    'phi-log-leak': {
      analysis: 'Protected Health Information (PHI) — patient identifiers, diagnoses, or SSNs — is passed to a logging or file-write sink in plaintext. Any log aggregator, developer, or attacker with log access reads sensitive patient data directly.',
      criticality: `AVSS ${avssScore}/10. Under India's DPDP Act §8 and HIPAA §164.312(a), unencrypted PHI in logs is a notifiable data breach. HIPAA fines reach $1.9M/year; DPDP penalties reach ₹250 crore.`,
      consequences: ['Patient records readable by anyone with log access','Mandatory breach notification to regulators','HIPAA/DPDP fines and potential criminal liability','Loss of healthcare data processing certification'],
      diff: [
        { sign: '-', code: snippet || 'console.log("patient:", patient_id, diagnosis);' },
        { sign: '+', code: 'const masked = maskPHI(patient_id); // last 4 chars only' },
        { sign: '+', code: 'logger.info("Patient accessed", { id: masked });' },
      ],
      fixNote: 'Mask or encrypt PHI before any log/write sink. HIPAA §164.312(a), DPDP Act §8.',
      postFixScore: Math.max(0.5, avssScore * 0.15),
    },
    'card-number-exposure': {
      analysis: 'A raw Primary Account Number (PAN) that passed Luhn checksum validation is hardcoded or logged in source code. PANs in git history are permanent — deletion does not remove them from past commits.',
      criticality: `AVSS ${avssScore}/10. PCI-DSS Requirement 3.4 explicitly prohibits storing unprotected PANs. Violators face fines of $5,000–$100,000/month and loss of card processing rights.`,
      consequences: ['Card fraud using the exposed PAN immediately','PCI-DSS de-certification — merchant loses card acceptance','Card network fines up to $100,000/month','Mandatory forensic audit costing $50k–$200k'],
      diff: [
        { sign: '-', code: snippet || 'const card_number = "4532015112830366";' },
        { sign: '+', code: 'const token = await paymentGateway.tokenize(rawCardInput);' },
        { sign: '+', code: '// Store token only — never the PAN. PCI-DSS Req 3.4.' },
      ],
      fixNote: 'Tokenise PANs at point of entry. Never store or hardcode raw card numbers. PCI-DSS Req 3.4.',
      postFixScore: Math.max(0.5, avssScore * 0.10),
    },
  };

  // second half in a separate structure to stay under 50 lines per write
  const DB2 = {
    'hardcoded-secret': {
      analysis: 'An API key or cloud credential is hardcoded in source code. Once committed to any git repo — even private — it is in history forever and accessible to every contributor and CI pipeline.',
      criticality: `AVSS ${avssScore}/10. Hardcoded secrets are the #1 cause of cloud breaches. An AKIA AWS key grants full account access. Violates RBI 2026 Cybersecurity Directions and PCI-DSS §6.3.`,
      consequences: ['Cloud account takeover — full resource access','Data exfiltration of all databases and storage','Cryptomining charges — attacker spins up GPU instances','Supply-chain attack if repo is public or forked'],
      diff: [
        { sign: '-', code: snippet || 'const api_key = "AKIA1234567890123456";' },
        { sign: '+', code: 'const api_key = process.env.API_KEY;' },
        { sign: '+', code: 'if (!api_key) throw new Error("API_KEY env var is not set");' },
      ],
      fixNote: 'Rotate exposed key immediately. Use env vars or a secrets manager. RBI 2026 / PCI-DSS §6.3.',
      postFixScore: Math.max(0.5, avssScore * 0.12),
    },
    'raw-cvv-pin-exposure': {
      analysis: 'A CVV security code or PIN is assigned a literal numeric value in source code. CVV codes are single-use security features — their security model breaks the moment they are stored anywhere.',
      criticality: `AVSS ${avssScore}/10. PCI-DSS Requirement 3.2.1 absolutely prohibits storing CVV post-authorisation. This is an automatic PCI audit failure with no exceptions.`,
      consequences: ['Card-not-present fraud using the exposed CVV','Immediate PCI-DSS audit failure','Card network merchant de-listing','Criminal liability under computer fraud statutes'],
      diff: [
        { sign: '-', code: snippet || 'const cvv = "123";' },
        { sign: '+', code: '// NEVER store CVV — pass transiently to payment processor' },
        { sign: '+', code: 'const result = await gateway.auth({ pan: token, cvv: req.body.cvv });' },
      ],
      fixNote: 'CVV must never be stored. Transmit once to processor over TLS, then discard. PCI-DSS Req 3.2.1.',
      postFixScore: Math.max(0.5, avssScore * 0.10),
    },
    'price-manipulation': {
      analysis: 'Price/discount values are calculated in client-side JavaScript. Any user can open DevTools, modify the total to ₹0 or negative, and submit checkout — the server has no independent validation.',
      criticality: `AVSS ${avssScore}/10. Direct revenue loss. Automated bots scan e-commerce sites for client-side price controls and exploit them within hours of deployment at scale.`,
      consequences: ['Customers purchasing goods for ₹0 or negative amounts','Automated bot exploitation causing thousands of fraudulent orders','Payment processor chargebacks and fees','Inventory depletion without revenue'],
      diff: [
        { sign: '-', code: snippet || 'total_price = price * items.length; // client-side' },
        { sign: '+', code: 'const { total } = await api.post("/checkout/calculate", { items });' },
        { sign: '+', code: 'if (total <= 0) return res.status(400).json({ error: "Invalid total" });' },
      ],
      fixNote: 'Server must independently compute and validate total. amount > 0 is mandatory. CWE-602.',
      postFixScore: Math.max(0.5, avssScore * 0.20),
    },
    'sql-injection': {
      analysis: 'User-controlled input is concatenated into a SQL query string. Attackers inject SQL syntax to read any table, bypass authentication, delete records, or execute OS commands.',
      criticality: `AVSS ${avssScore}/10. SQL injection is OWASP Top 10 #3. A single exploitable endpoint exposes the entire database and potentially the host OS via database function calls.`,
      consequences: ['Full database dump — all users, PII, passwords exposed','Authentication bypass — login as any user including admin','Data destruction via DROP TABLE or bulk UPDATE','Remote code execution via DB system functions'],
      diff: [
        { sign: '-', code: snippet || 'db.query("SELECT * FROM users WHERE id = " + req.params.id);' },
        { sign: '+', code: 'db.query("SELECT * FROM users WHERE id = $1", [req.params.id]);' },
      ],
      fixNote: 'Use parameterised queries exclusively. Never concatenate user input into SQL. CWE-89.',
      postFixScore: Math.max(0.5, avssScore * 0.08),
    },
    'cross-site-scripting': {
      analysis: 'User-supplied data is rendered into HTML without encoding. An attacker injects JavaScript that executes in victims\' browsers, silently stealing sessions or exfiltrating data.',
      criticality: `AVSS ${avssScore}/10. Stored XSS is OWASP Top 10 A3. One stored payload executes for every user who views the affected page — effectively a server-hosted trojan.`,
      consequences: ['Session hijacking — attacker steals all authentication cookies','Credential harvesting via injected fake login overlays','Crypto miners injected into user browsers','Self-propagating XSS worm if payload is stored'],
      diff: [
        { sign: '-', code: snippet || 'res.send("<p>" + req.query.name + "</p>");' },
        { sign: '+', code: 'const safe = escapeHtml(req.query.name);' },
        { sign: '+', code: 'res.send(`<p>${safe}</p>`);' },
      ],
      fixNote: 'HTML-encode all user input. Prefer template engines with auto-escape. Add CSP. CWE-79.',
      postFixScore: Math.max(0.5, avssScore * 0.12),
    },
    'insecure-deserialization': {
      analysis: 'Untrusted data is passed to eval() or an unsafe deserialisation function. An attacker crafts a payload that executes arbitrary JavaScript or system commands when deserialised.',
      criticality: `AVSS ${avssScore}/10. Remote Code Execution — the highest-severity class. A single exploitable eval() gives full server control with no further exploitation needed.`,
      consequences: ['Full server takeover — arbitrary commands as the app user','Exfiltration of all files and env vars including secrets','Persistent backdoor / reverse shell installation','Lateral movement to internal databases and services'],
      diff: [
        { sign: '-', code: snippet || 'const obj = eval(req.body.payload);' },
        { sign: '+', code: 'const obj = JSON.parse(req.body.payload);' },
        { sign: '+', code: 'schema.parse(obj); // validate with zod / joi' },
      ],
      fixNote: 'Never eval() user input. Use JSON.parse + schema validation. CWE-502.',
      postFixScore: Math.max(0.5, avssScore * 0.08),
    },
    'missing-authentication': {
      analysis: 'A sensitive or admin endpoint is reachable without any authentication check. Any unauthenticated HTTP request can trigger privileged or destructive operations.',
      criticality: `AVSS ${avssScore}/10. Unauthenticated admin endpoints are indexed by Shodan within minutes of deployment and targeted by automated scanners continuously.`,
      consequences: ['Unauthorised data deletion or modification by anyone','Admin account takeover without credentials','Automated bot abuse at internet scale','Regulatory violation for endpoints handling personal data'],
      diff: [
        { sign: '-', code: snippet || 'app.delete("/admin/users/:id", handler);' },
        { sign: '+', code: 'app.delete("/admin/users/:id", requireAuth, requireRole("admin"), handler);' },
      ],
      fixNote: 'All sensitive routes need authentication + authorisation middleware. CWE-306.',
      postFixScore: Math.max(0.5, avssScore * 0.10),
    },
    'command-injection': {
      analysis: 'User-controlled input is passed to a shell command execution function. Attackers append shell metacharacters to break out of the intended command and run arbitrary OS commands.',
      criticality: `AVSS ${avssScore}/10. Command injection equals Remote Code Execution on the host OS. The attacker gains the same access as the app service account — typically full server control.`,
      consequences: ['Full server compromise — read/write/execute anything','Exfiltration of environment variables including all secrets','Ransomware or cryptominer installation','Pivot to internal network from the compromised host'],
      diff: [
        { sign: '-', code: snippet || 'exec("convert " + req.body.filename + " out.png");' },
        { sign: '+', code: 'execFile("convert", [sanitizeFilename(req.body.filename), "out.png"]);' },
      ],
      fixNote: 'Use execFile() with argument array, never exec() with string interpolation. CWE-78.',
      postFixScore: Math.max(0.5, avssScore * 0.08),
    },
    'vulnerable-dependency': {
      analysis: `A dependency (${cveId}) has a known public exploit. EPSS score: ${epss != null ? (epss * 100).toFixed(1) + '%' : 'see OSV.dev'} probability of exploitation within 30 days.`,
      criticality: `AVSS ${avssScore}/10. Supply-chain attacks via vulnerable dependencies caused 62% of breaches in 2025. Automated scanners actively probe for this CVE.`,
      consequences: ['Known exploit code publicly available for this CVE','Automated scanners will find and exploit this within days','Full compromise if the vulnerable code path is reachable','All applications using this dependency are at risk'],
      diff: [
        { sign: '-', code: snippet || '"dependency": "^vulnerable.version"' },
        { sign: '+', code: '# Run: npm audit fix' },
        { sign: '+', code: '# Or: npm install package@patched-version' },
      ],
      fixNote: `Update to the patched version from the ${cveId} advisory. Add npm audit to CI.`,
      postFixScore: Math.max(0.5, avssScore * 0.25),
    },
  };

  const merged = { ...DB, ...DB2 };
  for (const [key, val] of Object.entries(merged)) {
    if (type === key || type.includes(key)) return val;
  }

  // Generic fallback
  return {
    analysis: `${title} — ${evidence || 'This pattern was flagged by the AVSS scanner as a security issue at this location.'}`,
    criticality: `AVSS score ${avssScore.toFixed(1)}/10. This finding requires review and remediation to reduce attack surface.`,
    consequences: ['Potential security breach if exploited','Regulatory exposure depending on data sensitivity','Reputation damage in case of incident','Attack surface increase for future exploits'],
    diff: [
      { sign: '-', code: snippet || '// vulnerable code pattern' },
      { sign: '+', code: `// Fix: ${title}` },
      { sign: '+', code: `// Reference: ${evidence.substring(0, 60) || 'See scanner evidence'}` },
    ],
    fixNote: 'Apply input validation and principle of least privilege at all trust boundaries.',
    postFixScore: Math.max(0.5, avssScore * 0.30),
  };
}

// ─── Gemini AI enrichment ─────────────────────────────────────────────────────
async function callGemini(finding, staticData) {
  const key = process.env.GEMINI_API_KEY;
  if (!key || !key.trim()) return null;

  const snippet   = (finding.codeSnippet || '').trim();
  const avssScore = finding.avssScore ?? finding.baseSeverity ?? 5;
  const type      = (finding.type || '').toLowerCase();
  const title     = finding.title || type;
  const evidence  = finding.evidence || '';
  const filePath  = finding.filePath || '';

  const prompt = `You are a senior application security engineer writing a developer-facing security report.

Finding:
- Type: ${type}
- Title: ${title}
- File: ${filePath}${finding.lineNumber ? ':' + finding.lineNumber : ''}
- AVSS Score: ${avssScore}/10
- Evidence: ${evidence}
- Code snippet:
\`\`\`
${snippet || '(no snippet available)'}
\`\`\`

Respond with valid JSON only (no markdown, no code fences):
{
  "analysis": "<2-3 sentences: what this vulnerability is technically and how it works>",
  "criticality": "<1-2 sentences: why critical — cite regulation name, actual attack impact, or real score>",
  "consequences": ["<max 12 words>", "<max 12 words>", "<max 12 words>", "<max 12 words>"],
  "removedCode": "<the exact vulnerable line(s) from snippet to remove>",
  "fixCode": ["<fixed line 1>", "<fixed line 2>", "<fixed line 3>"],
  "fixNote": "<one sentence: what the fix does and which standard it satisfies>",
  "postFixScoreEstimate": <number 0-10>
}`;

  const r = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${key}`,
    {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.25, maxOutputTokens: 700, responseMimeType: 'application/json' },
    },
    { timeout: 14000 }
  );

  const raw = r.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const p   = JSON.parse(raw);

  const removed  = (p.removedCode || snippet || '// original').split('\n').filter(Boolean);
  const added    = (Array.isArray(p.fixCode) ? p.fixCode : []).slice(0, 5).filter(Boolean);
  const diff     = [...removed.map(l => ({ sign: '-', code: l })), ...added.map(l => ({ sign: '+', code: l }))];
  const postFix  = Math.min(10, Math.max(0, Number(p.postFixScoreEstimate) || staticData.postFixScore));

  return {
    analysis:     p.analysis     || staticData.analysis,
    criticality:  p.criticality  || staticData.criticality,
    consequences: Array.isArray(p.consequences) ? p.consequences.slice(0, 4) : staticData.consequences,
    diff:         diff.length > 0 ? diff : staticData.diff,
    fixNote:      p.fixNote       || staticData.fixNote,
    postFixScore: Math.round(postFix * 10) / 10,
    aiPowered:    true,
  };
}

// ─── Main export ──────────────────────────────────────────────────────────────
async function suggestFix(finding) {
  const avssScore  = finding.avssScore ?? finding.baseSeverity ?? 5;
  const staticData = buildStatic(finding);

  // Try Gemini
  try {
    const ai = await callGemini(finding, staticData);
    if (ai) {
      ai.scoreReduction = Math.round(Math.max(0, avssScore - ai.postFixScore) * 10) / 10;
      return ai;
    }
  } catch (err) {
    console.warn('[suggest-fix] Gemini failed, using static fallback:', err.message);
  }

  // Static fallback
  const postFix   = Math.round(staticData.postFixScore * 10) / 10;
  return {
    ...staticData,
    postFixScore:   postFix,
    scoreReduction: Math.round(Math.max(0, avssScore - postFix) * 10) / 10,
    aiPowered:      false,
  };
}

module.exports = { suggestFix };
