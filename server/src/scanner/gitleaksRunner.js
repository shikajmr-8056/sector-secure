const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

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
}

function maskSecretSnippet(text) {
  if (!text) return '';
  if (text.length > 50) text = text.substring(0, 50);
  return text;
}

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
      regex: /(api[_-]?key|client[_-]?secret|auth[_-]?token|access[_-]?token|private[_-]?key)\s*[:=]\s*["']([A-Za-z0-9_\-]{20,})["']/gi,
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
              codeSnippet: line.trim(),
              baseSeverity: pat.severity,
              cveId: null,
              epssScore: null,
              evidence: `Matched regex rule for ${pat.name}`
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

module.exports = { runGitleaks };
