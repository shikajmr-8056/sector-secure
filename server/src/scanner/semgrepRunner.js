const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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
    });

    const parsed = JSON.parse(stdout);
    if (parsed.results && Array.isArray(parsed.results)) {
      for (const res of parsed.results) {
        const severityStr = (res.extra?.severity || 'WARNING').toUpperCase();
        if (severityStr === 'INFO') continue;

        const relPath = path.relative(targetDir, res.path).replace(/\\/g, '/');
        const baseSeverity = severityStr === 'ERROR' ? 8.5 : 6.0;
        const type = mapSemgrepRuleToType(res.check_id || 'generic-sast');
        const lineNum = res.start?.line || 1;

        findings.push({
          id: generateFindingId('semgrep', type, relPath, lineNum, res.check_id),
          source: 'semgrep',
          type: type,
          title: res.extra?.message || res.check_id || 'SAST Vulnerability',
          description: res.extra?.metadata?.shortlink || res.extra?.message || 'Semgrep detected potential security issue.',
          filePath: relPath,
          lineNumber: lineNum,
          codeSnippet: (res.extra?.lines || '').trim(),
          baseSeverity: baseSeverity,
          cveId: null,
          epssScore: null,
          evidence: `Semgrep check: ${res.check_id} [${severityStr}]`
        });
      }

      return findings;
    }
  } catch (err) {
    // CLI fallback
  }

  return runFallbackSemgrep(targetDir);
}

function mapSemgrepRuleToType(ruleId) {
  const lower = ruleId.toLowerCase();
  if (lower.includes('sql') || lower.includes('sqli')) return 'sql-injection';
  if (lower.includes('xss') || lower.includes('html')) return 'cross-site-scripting';
  if (lower.includes('deserial') || lower.includes('eval') || lower.includes('pickle')) return 'insecure-deserialization';
  if (lower.includes('auth') || lower.includes('jwt') || lower.includes('session')) return 'missing-authentication';
  return 'generic-sast-finding';
}

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
      regex: /\b(eval|serialize\.unserialize|pickle\.loads|yaml\.unsafe_load)\s*\(/i,
      severity: 9.0,
      description: 'Execution of untrusted serialized payload or dynamic code string.'
    },
    {
      type: 'missing-authentication',
      title: 'Unauthenticated Sensitive Route Handler',
      regex: /app\.(post|put|delete)\s*\(\s*["']\/(admin|internal|delete|update).*?["']\s*,\s*async\s*\([^\)]*\)\s*=>/i,
      severity: 7.5,
      description: 'Administrative or sensitive endpoint defined without authentication middleware.'
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
              evidence: `Generic SAST pattern match: '${line.trim()}'`
            });
          }
        }
      });
    } catch (e) {}
  }

  return findings;
}

function getAllFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file === 'node_modules' || file === '.git' || file === 'dist' || file === 'build') continue;
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
