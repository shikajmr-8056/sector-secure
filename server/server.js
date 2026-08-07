const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { cloneRepo } = require('./src/scanner/gitCloner');
const { runSemgrep } = require('./src/scanner/semgrepRunner');
const { runGitleaks } = require('./src/scanner/gitleaksRunner');
const { runCustomRules } = require('./src/scanner/customRules');
const { runSCAScan } = require('./src/scanner/scaScanner');
const { extractRepoMetadata } = require('./src/scanner/extractor');
const { deduplicateAndCapFindings } = require('./src/scanner/deduplicator');
const { detectSector, scoreFindings } = require('./src/scanner/scoringEngine');

const app = express();
app.use(cors());
app.use(express.json());

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', engine: 'AVSS SAST Scanner Engine v1.0' });
});

// Primary Endpoint: POST /scan/sast
app.post('/scan/sast', async (req, res) => {
  const { repoUrl } = req.body;

  if (!repoUrl || typeof repoUrl !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid repoUrl in request body' });
  }

  let scanContext = null;

  try {
    console.log(`[SAST Engine] Starting scan for repository: ${repoUrl}`);
    scanContext = await cloneRepo(repoUrl);
    const { targetDir } = scanContext;

    let semgrepFindings = [];
    try {
      console.log(`[SAST Engine] Executing Semgrep...`);
      semgrepFindings = await runSemgrep(targetDir);
    } catch (e) {
      console.warn(`[SAST Engine] Semgrep skipped or not installed: ${e.message}`);
    }

    let gitleaksFindings = [];
    try {
      console.log(`[SAST Engine] Executing Gitleaks...`);
      gitleaksFindings = await runGitleaks(targetDir);
    } catch (e) {
      console.warn(`[SAST Engine] Gitleaks skipped or not installed: ${e.message}`);
    }

    console.log(`[SAST Engine] Executing Custom Sector Rules...`);
    const customFindings = await runCustomRules(targetDir);

    console.log(`[SAST Engine] Executing SCA / OSV.dev dependency scan...`);
    const scaFindings = await runSCAScan(targetDir);

    console.log(`[SAST Engine] Extracting routes and text samples...`);
    const { detectedRoutes, repoTextSample } = extractRepoMetadata(targetDir);

    // Merge all raw findings
    const rawAll = [
      ...semgrepFindings,
      ...gitleaksFindings,
      ...customFindings,
      ...scaFindings
    ];

    // Deduplicate and cap top 30 findings
    let findings = deduplicateAndCapFindings(rawAll);

    console.log(`[SAST Engine] Scan completed successfully. Found ${rawAll.length} raw findings -> ${findings.length} capped findings.`);

    return res.json({
      findings,
      repoTextSample,
      detectedRoutes
    });

  } catch (err) {
    console.error(`[SAST Engine] Scan failed for ${repoUrl}:`, err.message);
    return res.status(500).json({
      error: 'Scan execution failed',
      details: err.message
    });
  } finally {
    // ALWAYS clean up temporary cloned directory
    if (scanContext && typeof scanContext.cleanup === 'function') {
      scanContext.cleanup();
      console.log(`[SAST Engine] Temp folder cleaned up.`);
    }
  }
});

// Endpoint: POST /score (Person 2 - AVSS Formula & Sector Detection)
app.post('/score', (req, res) => {
  try {
    const { findings = [], repoTextSample = '', detectedRoutes = [], sector } = req.body;

    // Detect sector if not explicitly overridden by user
    const sectorDetection = detectSector(detectedRoutes, repoTextSample, findings);
    const targetSector = sector || sectorDetection.suggestedSector;

    // Calculate AVSS Scores & Citations
    const scoredFindings = scoreFindings(findings, targetSector);

    return res.json({
      suggestedSector: sectorDetection.suggestedSector,
      scores: sectorDetection.scores,
      matchedEvidence: sectorDetection.matchedEvidence,
      findings: scoredFindings,
    });
  } catch (err) {
    console.error('[SAST Engine] Scoring failed:', err.message);
    return res.status(500).json({ error: 'Scoring execution failed', details: err.message });
  }
});

// Endpoint: POST /suggest-fix (AI Patch Generation)
app.post('/suggest-fix', (req, res) => {
  const { finding } = req.body;
  
  if (!finding) {
    return res.status(400).json({ error: 'Missing finding' });
  }

  // Return formatted diff block & fix explanation
  return res.json({
    diff: [
      { sign: '-', code: finding.codeSnippet || 'Original vulnerable line' },
      { sign: '+', code: `// AVSS Patched: Sanitized or parameterized implementation\nsanitize(${finding.codeSnippet || 'vulnerableInput'});` }
    ],
    fixNote: finding.fixNote || 'Enforce strict input sanitization or parameterization before reaching the sink.'
  });
});

const PORT = process.env.PORT || 5000;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`================================================`);
    console.log(`AVSS SAST Scanner Engine listening on port ${PORT}`);
    console.log(`Endpoints: POST /scan/sast | POST /score | POST /suggest-fix`);
    console.log(`================================================`);
  });
}

module.exports = app;
