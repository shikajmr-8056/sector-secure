const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
<<<<<<< HEAD
const { v4: uuidv4 } = require('uuid');

const GITLEAKS_TIMEOUT_MS = 30_000; // 30s cap

function generateFindingId(source, type, filePath, lineNumber, extra = '') {
  const hash = crypto
    .createHash('md5')
    .update(`${source}:${type}:${filePath}:${lineNumber}:${extra}`)
    .digest('hex')
    .substring(0, 10);
  return `${source}-${hash}`;
}

/**
 * Runs gitleaks detect against targetDir.
 * Uses a per-scan unique report path to avoid races in concurrent scans.
 */
async function runGitleaks(targetDir) {
  // Each scan gets its own report file — no race condition for concurrent scans
  const reportPath = path.join(os.tmpdir(), `gitleaks-${uuidv4().substring(0, 8)}.json`);

  try {
    execSync(
      `gitleaks detect --source "${targetDir}" --report-format json --report-path "${reportPath}" --no-git`,
      {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore'],
        timeout: GITLEAKS_TIMEOUT_MS
      }
    );

    // Exit code 0 means no leaks found — report may not exist or be empty
    return readGitleaksReport(reportPath, targetDir);
  } catch (err) {
    // Gitleaks exits with code 1 when leaks ARE found (not an error — it's by design)
    if (err.status === 1 || err.code === 1) {
      return readGitleaksReport(reportPath, targetDir);
    }

    // Binary missing, timeout, or other hard failure → fallback regex scanner
    if (err.code === 'ETIMEDOUT') {
      console.warn('[gitleaksRunner] Gitleaks timed out — falling back to pattern scanner');
    } else {
      console.warn('[gitleaksRunner] Gitleaks not available:', err.message);
    }
    return runFallbackGitleaks(targetDir);
  } finally {
    // Always clean up per-scan report file
    try {
      if (fs.existsSync(reportPath)) fs.rmSync(reportPath, { force: true });
    } catch (_) {}
  }
}

function readGitleaksReport(reportPath, targetDir) {
  if (!fs.existsSync(reportPath)) return [];

  try {
    const raw = fs.readFileSync(reportPath, 'utf-8').trim();
    if (!raw || raw === 'null') return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.map(item => {
      // item.File may be an absolute path or relative
      let relPath;
      try {
        relPath = path.relative(targetDir, item.File || targetDir).replace(/\\/g, '/');
      } catch (_) {
        relPath = item.File || 'unknown';
      }

      const lineNum = item.StartLine || 1;
      return {
        id: generateFindingId('gitleaks', 'hardcoded-secret', relPath, lineNum, item.RuleID),
        source: 'gitleaks',
        type: 'hardcoded-secret',
        title: `Hardcoded Secret Detected: ${item.Description || item.RuleID || 'Secret'}`,
        description: `Potential secret or credential leaked in code: ${item.RuleID || 'Hardcoded Credential'}`,
        filePath: relPath,
        lineNumber: lineNum,
        codeSnippet: maskSecretSnippet(item.Match || item.Secret || ''),
        baseSeverity: 8.5,
        cveId: null,
        epssScore: null,
        evidence: `Gitleaks rule match: ${item.RuleID || 'secret-detection'}`
      };
    });
  } catch (e) {
    console.error('[gitleaksRunner] Failed to parse gitleaks report:', e.message);
    return [];
  }
=======

function generateFindingId(source, type, filePath, lineNumber, extra = '') {
  const hash = crypto.createHash('md5').update(`${source}:${type}:${filePath}:${lineNumber}:${extra}`).digest('hex').substring(0, 10);
  return `${source}-${hash}`;
}

async function runGitleaks(targetDir) {
  const reportPath = path.join(os.tmpdir(), `gitleaks-temp.json`);

  try {
    execSync(`gitleaks detect --source "${targetDir}" --report-format json --report-path "${reportPath}"`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore']
    });

    if (fs.existsSync(reportPath)) {
      const raw = fs.readFileSync(reportPath, 'utf-8');
      const parsed = JSON.parse(raw);
      fs.rmSync(reportPath, { force: true });

      if (Array.isArray(parsed)) {
        return parsed.map(item => {
          const relPath = path.relative(targetDir, item.File || targetDir).replace(/\\/g, '/');
          const lineNum = item.StartLine || 1;
          return {
            id: generateFindingId('gitleaks', 'hardcoded-secret', relPath, lineNum, item.RuleID),
            source: 'gitleaks',
            type: 'hardcoded-secret',
            title: `Hardcoded Secret Detected: ${item.Description || item.RuleID || 'Secret'}`,
            description: `Potential secret or credential leaked in code: ${item.RuleID || 'Hardcoded Credential'}`,
            filePath: relPath,
            lineNumber: lineNum,
            codeSnippet: maskSecretSnippet(item.Match || item.Secret || ''),
            baseSeverity: 8.5,
            cveId: null,
            epssScore: null,
            evidence: `Gitleaks rule match: ${item.RuleID || 'secret-detection'}`
          };
        });
      }
    }
  } catch (err) {
    if (fs.existsSync(reportPath)) {
      try {
        fs.rmSync(reportPath, { force: true });
      } catch (e) {}
    }
  }

  return runFallbackGitleaks(targetDir);
>>>>>>> 86aa094 (feat: update UI components, styling, and add backend scanner service)
}

function maskSecretSnippet(text) {
  if (!text) return '';
<<<<<<< HEAD
  // Redact middle of the secret — show first 4 and last 4 chars only
  const s = text.substring(0, 60);
  if (s.length > 12) {
    return `${s.substring(0, 4)}${'*'.repeat(Math.min(s.length - 8, 20))}${s.slice(-4)}`;
  }
  return s;
}

// ---------------------------------------------------------------------------
// Fallback: pure-regex secret scanner when gitleaks binary is unavailable
// ---------------------------------------------------------------------------
=======
  if (text.length > 50) text = text.substring(0, 50);
  return text;
}

>>>>>>> 86aa094 (feat: update UI components, styling, and add backend scanner service)
function runFallbackGitleaks(targetDir) {
  const findings = [];
  const files = getAllFiles(targetDir);

  const secretPatterns = [
    {
      name: 'AWS Access Key ID',
      regex: /\b(AKIA[0-9A-Z]{16})\b/g,
      severity: 9.0
    },
    {
      name: 'Hardcoded API Key / Secret Token',
<<<<<<< HEAD
      regex: /(api[_-]?key|client[_-]?secret|auth[_-]?token|access[_-]?token|private[_-]?key|secret[_-]?key)\s*[:=]\s*["']([A-Za-z0-9_\-]{20,})["']/gi,
=======
      regex: /(api[_-]?key|client[_-]?secret|auth[_-]?token|access[_-]?token|private[_-]?key)\s*[:=]\s*["']([A-Za-z0-9_\-]{20,})["']/gi,
>>>>>>> 86aa094 (feat: update UI components, styling, and add backend scanner service)
      severity: 8.5
    },
    {
      name: 'RSA/EC Private Key Header',
      regex: /-----BEGIN\s+(RSA|EC|OPENSSH|DSA)?\s*PRIVATE\s+KEY-----/g,
      severity: 9.5
    },
    {
      name: 'JWT Hardcoded Token',
      regex: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
      severity: 7.5
<<<<<<< HEAD
    },
    {
      name: 'Generic Password Literal',
      regex: /(password|passwd|pwd)\s*[:=]\s*["']([^"']{8,})["']/gi,
      severity: 8.0
    },
    {
      name: 'Slack / GitHub / Stripe Token',
      regex: /\b(xox[baprs]-[0-9A-Za-z\-]{10,}|ghp_[A-Za-z0-9]{36}|sk_live_[A-Za-z0-9]{24,})\b/g,
      severity: 9.0
=======
>>>>>>> 86aa094 (feat: update UI components, styling, and add backend scanner service)
    }
  ];

  for (const filePath of files) {
    const relPath = path.relative(targetDir, filePath).replace(/\\/g, '/');
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, idx) => {
        for (const pat of secretPatterns) {
          pat.regex.lastIndex = 0;
          if (pat.regex.test(line)) {
            const lineNum = idx + 1;
            findings.push({
              id: generateFindingId('gitleaks', 'hardcoded-secret', relPath, lineNum, pat.name),
              source: 'gitleaks',
              type: 'hardcoded-secret',
              title: `Hardcoded Secret Detected: ${pat.name}`,
              description: `Found potential hardcoded ${pat.name} in repository file.`,
              filePath: relPath,
              lineNumber: lineNum,
<<<<<<< HEAD
              codeSnippet: maskSecretSnippet(line.trim()),
              baseSeverity: pat.severity,
              cveId: null,
              epssScore: null,
              evidence: `Fallback regex match for ${pat.name}`
=======
              codeSnippet: line.trim(),
              baseSeverity: pat.severity,
              cveId: null,
              epssScore: null,
              evidence: `Matched regex rule for ${pat.name}`
>>>>>>> 86aa094 (feat: update UI components, styling, and add backend scanner service)
            });
          }
        }
      });
<<<<<<< HEAD
    } catch (_) {}
=======
    } catch (e) {}
>>>>>>> 86aa094 (feat: update UI components, styling, and add backend scanner service)
  }

  return findings;
}

function getAllFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
<<<<<<< HEAD
    if (['node_modules', '.git', 'dist', 'build', 'vendor'].includes(file)) continue;
=======
    if (file === 'node_modules' || file === '.git' || file === 'dist' || file === 'build') continue;
>>>>>>> 86aa094 (feat: update UI components, styling, and add backend scanner service)
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getAllFiles(filePath, fileList);
    } else {
      fileList.push(filePath);
    }
  }
  return fileList;
}

module.exports = { runGitleaks };
