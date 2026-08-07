const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

<<<<<<< HEAD
const SEMGREP_TIMEOUT_MS = 90_000; // 90s cap — prevents hanging on large repos

function generateFindingId(source, type, filePath, lineNumber, extra = '') {
  const hash = crypto
    .createHash('md5')
    .update(`${source}:${type}:${filePath}:${lineNumber}:${extra}`)
    .digest('hex')
    .substring(0, 10);
  return `${source}-${hash}`;
}

async function runSemgrep(targetDir, customRulesPath) {
  const findings = [];

  // Build command: always run --config=auto; also layer in custom YAML rules if present
  const configFlags = ['--config=auto'];
  if (customRulesPath && fs.existsSync(customRulesPath)) {
    configFlags.push(`--config="${customRulesPath}"`);
  }

  const cmd = `semgrep ${configFlags.join(' ')} --json "${targetDir}"`;

  try {
    const stdout = execSync(cmd, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
      maxBuffer: 20 * 1024 * 1024,
      timeout: SEMGREP_TIMEOUT_MS
=======
function generateFindingId(source, type, filePath, lineNumber, extra = '') {
  const hash = crypto.createHash('md5').update(`${source}:${type}:${filePath}:${lineNumber}:${extra}`).digest('hex').substring(0, 10);
  return `${source}-${hash}`;
}

async function runSemgrep(targetDir) {
  const findings = [];

  try {
    const stdout = execSync(`semgrep --config=auto --json "${targetDir}"`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
      maxBuffer: 10 * 1024 * 1024
>>>>>>> 86aa094 (feat: update UI components, styling, and add backend scanner service)
    });

    const parsed = JSON.parse(stdout);
    if (parsed.results && Array.isArray(parsed.results)) {
      for (const res of parsed.results) {
<<<<<<< HEAD
        // Semgrep severity can be 'ERROR', 'WARNING', 'INFO' — drop INFO to reduce noise
=======
>>>>>>> 86aa094 (feat: update UI components, styling, and add backend scanner service)
        const severityStr = (res.extra?.severity || 'WARNING').toUpperCase();
        if (severityStr === 'INFO') continue;

        const relPath = path.relative(targetDir, res.path).replace(/\\/g, '/');
<<<<<<< HEAD
        const baseSeverity = mapSeverityToScore(severityStr, res.extra?.metadata);
=======
        const baseSeverity = severityStr === 'ERROR' ? 8.5 : 6.0;
>>>>>>> 86aa094 (feat: update UI components, styling, and add backend scanner service)
        const type = mapSemgrepRuleToType(res.check_id || 'generic-sast');
        const lineNum = res.start?.line || 1;

        findings.push({
          id: generateFindingId('semgrep', type, relPath, lineNum, res.check_id),
          source: 'semgrep',
<<<<<<< HEAD
          type,
          title: res.extra?.message || res.check_id || 'SAST Vulnerability',
          description:
            res.extra?.metadata?.shortlink ||
            res.extra?.message ||
            'Semgrep detected potential security issue.',
          filePath: relPath,
          lineNumber: lineNum,
          codeSnippet: (res.extra?.lines || '').trim(),
          baseSeverity,
          cveId: res.extra?.metadata?.cve || null,
=======
          type: type,
          title: res.extra?.message || res.check_id || 'SAST Vulnerability',
          description: res.extra?.metadata?.shortlink || res.extra?.message || 'Semgrep detected potential security issue.',
          filePath: relPath,
          lineNumber: lineNum,
          codeSnippet: (res.extra?.lines || '').trim(),
          baseSeverity: baseSeverity,
          cveId: null,
>>>>>>> 86aa094 (feat: update UI components, styling, and add backend scanner service)
          epssScore: null,
          evidence: `Semgrep check: ${res.check_id} [${severityStr}]`
        });
      }

      return findings;
    }
  } catch (err) {
<<<<<<< HEAD
    if (err.code === 'ETIMEDOUT') {
      console.warn('[semgrepRunner] Semgrep timed out — falling back to pattern scanner');
    } else {
      console.warn('[semgrepRunner] Semgrep not available or errored:', err.message);
    }
=======
    // CLI fallback
>>>>>>> 86aa094 (feat: update UI components, styling, and add backend scanner service)
  }

  return runFallbackSemgrep(targetDir);
}

<<<<<<< HEAD
/**
 * Maps Semgrep severity string + optional CVSS metadata to a 0–10 numeric base score.
 */
function mapSeverityToScore(severityStr, metadata) {
  // Prefer CVSS score from metadata if present
  if (metadata?.cvss) {
    const n = parseFloat(metadata.cvss);
    if (!isNaN(n)) return Math.min(10, n);
  }
  switch (severityStr) {
    case 'ERROR':   return 8.5;
    case 'WARNING': return 6.0;
    default:        return 4.0;
  }
}

function mapSemgrepRuleToType(ruleId) {
  const lower = ruleId.toLowerCase();
  if (lower.includes('sql') || lower.includes('sqli'))              return 'sql-injection';
  if (lower.includes('xss') || lower.includes('html-inject'))       return 'cross-site-scripting';
  if (lower.includes('deserial') || lower.includes('eval') ||
      lower.includes('pickle') || lower.includes('unsafe-load'))    return 'insecure-deserialization';
  if (lower.includes('auth') || lower.includes('jwt') ||
      lower.includes('session') || lower.includes('csrf'))          return 'missing-authentication';
  if (lower.includes('path-traversal') || lower.includes('directory-traversal')) return 'path-traversal';
  if (lower.includes('ssrf'))                                        return 'ssrf';
  if (lower.includes('xxe'))                                         return 'xxe';
  if (lower.includes('command') || lower.includes('exec') ||
      lower.includes('shell'))                                       return 'command-injection';
  return 'generic-sast-finding';
}

// ---------------------------------------------------------------------------
// Fallback: pure-regex SAST scan when Semgrep binary is not available
// ---------------------------------------------------------------------------
=======
function mapSemgrepRuleToType(ruleId) {
  const lower = ruleId.toLowerCase();
  if (lower.includes('sql') || lower.includes('sqli')) return 'sql-injection';
  if (lower.includes('xss') || lower.includes('html')) return 'cross-site-scripting';
  if (lower.includes('deserial') || lower.includes('eval') || lower.includes('pickle')) return 'insecure-deserialization';
  if (lower.includes('auth') || lower.includes('jwt') || lower.includes('session')) return 'missing-authentication';
  return 'generic-sast-finding';
}

>>>>>>> 86aa094 (feat: update UI components, styling, and add backend scanner service)
function runFallbackSemgrep(targetDir) {
  const findings = [];
  const files = getAllFiles(targetDir);

  const patterns = [
    {
      type: 'sql-injection',
      title: 'Potential SQL Injection via Unsanitized Input',
      regex: /(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE)\s+.*?\+\s*(req\.(query|body|params)|user_input|param)/i,
      severity: 8.5,
      description: 'Raw SQL query constructed via string concatenation with HTTP request parameters.'
    },
    {
      type: 'cross-site-scripting',
      title: 'Potential Cross-Site Scripting (XSS)',
      regex: /(res\.send|res\.write|document\.write|dangerouslySetInnerHTML)\s*\(\s*.*?(req\.(query|body|params)|location\.href)/i,
      severity: 7.0,
      description: 'User input rendered directly into HTTP response without HTML sanitization.'
    },
    {
      type: 'insecure-deserialization',
      title: 'Insecure Deserialization / Dynamic Evaluation',
<<<<<<< HEAD
      regex: /\b(eval|serialize\.unserialize|pickle\.loads|yaml\.unsafe_load|unserialize)\s*\(/i,
=======
      regex: /\b(eval|serialize\.unserialize|pickle\.loads|yaml\.unsafe_load)\s*\(/i,
>>>>>>> 86aa094 (feat: update UI components, styling, and add backend scanner service)
      severity: 9.0,
      description: 'Execution of untrusted serialized payload or dynamic code string.'
    },
    {
      type: 'missing-authentication',
      title: 'Unauthenticated Sensitive Route Handler',
<<<<<<< HEAD
      regex: /app\.(post|put|delete)\s*\(\s*["']\/(admin|internal|delete|update|manage).*?["']\s*,\s*(async\s*)?\([^)]*\)\s*=>/i,
      severity: 7.5,
      description: 'Administrative or sensitive endpoint defined without authentication middleware.'
    },
    {
      type: 'command-injection',
      title: 'Potential Command Injection',
      regex: /(exec|execSync|spawn|spawnSync|system)\s*\(\s*.*?(req\.(query|body|params)|user_input)/i,
      severity: 9.5,
      description: 'Shell command constructed from user-controlled input — potential command injection.'
    },
    {
      type: 'path-traversal',
      title: 'Potential Path Traversal',
      regex: /fs\.(readFile|writeFile|readFileSync|writeFileSync|unlink|access)\s*\(\s*.*?(req\.(query|body|params)|user_input)/i,
      severity: 8.0,
      description: 'File path derived from user input — potential path traversal / local file inclusion.'
=======
      regex: /app\.(post|put|delete)\s*\(\s*["']\/(admin|internal|delete|update).*?["']\s*,\s*async\s*\([^\)]*\)\s*=>/i,
      severity: 7.5,
      description: 'Administrative or sensitive endpoint defined without authentication middleware.'
>>>>>>> 86aa094 (feat: update UI components, styling, and add backend scanner service)
    }
  ];

  for (const filePath of files) {
    const ext = path.extname(filePath).toLowerCase();
    if (!['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.php', '.go'].includes(ext)) continue;

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      const relPath = path.relative(targetDir, filePath).replace(/\\/g, '/');

      lines.forEach((line, idx) => {
        for (const pattern of patterns) {
          if (pattern.regex.test(line)) {
            const lineNum = idx + 1;
            findings.push({
              id: generateFindingId('semgrep', pattern.type, relPath, lineNum),
              source: 'semgrep',
              type: pattern.type,
              title: pattern.title,
              description: pattern.description,
              filePath: relPath,
              lineNumber: lineNum,
              codeSnippet: line.trim(),
              baseSeverity: pattern.severity,
              cveId: null,
              epssScore: null,
<<<<<<< HEAD
              evidence: `Fallback SAST pattern match: '${line.trim().substring(0, 60)}'`
=======
              evidence: `Generic SAST pattern match: '${line.trim()}'`
>>>>>>> 86aa094 (feat: update UI components, styling, and add backend scanner service)
            });
          }
        }
      });
<<<<<<< HEAD
    } catch (e) {
      // skip unreadable files
    }
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

module.exports = { runSemgrep };
