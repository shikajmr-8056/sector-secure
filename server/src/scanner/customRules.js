const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Generates a deterministic ID based on finding attributes
 */
function generateFindingId(source, type, filePath, lineNumber, extra = '') {
  const hash = crypto.createHash('md5').update(`${source}:${type}:${filePath}:${lineNumber}:${extra}`).digest('hex').substring(0, 10);
  return `${source}-${hash}`;
}

/**
 * Validates a number string using the Luhn Algorithm (Mod 10).
 * Eliminates false positives for 16-digit strings (IDs, timestamps, serial numbers).
 */
function luhnCheck(cardNumberStr) {
  const sanitized = cardNumberStr.replace(/[\s-]/g, '');
  if (!/^\d{13,19}$/.test(sanitized)) return false;

  let sum = 0;
  let shouldDouble = false;
  for (let i = sanitized.length - 1; i >= 0; i--) {
    let digit = parseInt(sanitized.charAt(i), 10);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

/**
 * Runs custom sector pattern rules
 */
async function runCustomRules(targetDir) {
  const findings = [];
  const files = getAllFiles(targetDir);

  for (const filePath of files) {
    const ext = path.extname(filePath).toLowerCase();
    if (!['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.php', '.go', '.html'].includes(ext)) continue;

    const relPath = path.relative(targetDir, filePath).replace(/\\/g, '/');

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      scanHealthcarePHISink(lines, relPath, findings);
      scanFintechAPIKeys(lines, relPath, findings);
      scanFintechCardNumbers(lines, relPath, findings);
      scanFintechRawCVVPIN(lines, relPath, findings);
      scanEcommercePriceManipulation(lines, relPath, content, findings);

    } catch (err) {
      console.error(`[customRules] Error scanning ${relPath}:`, err.message);
    }
  }

  return findings;
}

function scanHealthcarePHISink(lines, relPath, findings) {
  const phiVarRegex = /\b(patient_id|medical_record|ssn|diagnosis|dob)\b/i;
  const sinkRegex = /\b(console\.log|print|logger\.\w+|fs\.writeFile|fs\.writeFileSync|open\s*\([^)]*['"]w['"]\))\s*\(/i;
  const encryptRegex = /\b(encrypt|crypto|cipher|hash|mask)\b/i;

  lines.forEach((line, idx) => {
    if (sinkRegex.test(line) && phiVarRegex.test(line)) {
      const startIdx = Math.max(0, idx - 5);
      const endIdx = Math.min(lines.length - 1, idx + 5);
      const scopeContext = lines.slice(startIdx, endIdx + 1).join('\n');

      if (!encryptRegex.test(scopeContext)) {
        const phiMatch = line.match(phiVarRegex);
        const variableName = phiMatch ? phiMatch[0] : 'PHI';
        const type = 'phi-log-leak';
        const lineNum = idx + 1;
        findings.push({
          id: generateFindingId('custom', type, relPath, lineNum, variableName),
          source: 'custom-rule',
          type: type,
          title: `Unencrypted Protected Health Information (PHI) Log Leak: ${variableName}`,
          description: `PHI variable '${variableName}' passed directly into logging/writing output sink without encryption or masking.`,
          filePath: relPath,
          lineNumber: lineNum,
          codeSnippet: line.trim(),
          baseSeverity: 9.0,
          cveId: null,
          epssScore: null,
          evidence: `PHI variable '${variableName}' passed to sink '${line.trim()}' without encrypt() in local scope`
        });
      }
    }
  });
}

function scanFintechAPIKeys(lines, relPath, findings) {
  const apiKeyRegex = /api[_-]?key\s*=\s*["']([A-Za-z0-9_\-]{20,})["']/i;
  const awsKeyRegex = /\b(AKIA[0-9A-Z]{16})\b/;

  lines.forEach((line, idx) => {
    if (apiKeyRegex.test(line) || awsKeyRegex.test(line)) {
      const matchText = line.trim();
      const type = 'hardcoded-secret';
      const lineNum = idx + 1;
      findings.push({
        id: generateFindingId('custom', type, relPath, lineNum),
        source: 'custom-rule',
        type: type,
        title: 'Hardcoded API Key / Cloud Credential in Code',
        description: 'Hardcoded API key or AWS Access Key detected in code literal.',
        filePath: relPath,
        lineNumber: lineNum,
        codeSnippet: matchText,
        baseSeverity: 8.8,
        cveId: null,
        epssScore: null,
        evidence: `Matched hardcoded secret pattern: '${matchText.substring(0, 40)}...'`
      });
    }
  });
}

function scanFintechCardNumbers(lines, relPath, findings) {
  const rawCardRegex = /\b(\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}|\d{13,19})\b/g;

  lines.forEach((line, idx) => {
    if (line.includes('//') && line.includes('http')) return;

    let match;
    rawCardRegex.lastIndex = 0;
    while ((match = rawCardRegex.exec(line)) !== null) {
      const candidate = match[0];
      const digitsOnly = candidate.replace(/[\s-]/g, '');

      if (luhnCheck(digitsOnly)) {
        const type = 'card-number-exposure';
        const lineNum = idx + 1;
        findings.push({
          id: generateFindingId('custom', type, relPath, lineNum, digitsOnly.slice(-4)),
          source: 'custom-rule',
          type: type,
          title: 'Exposed Valid Credit Card Number (Luhn Checksum Verified)',
          description: 'Hardcoded or exposed credit card number passed Luhn algorithm validation.',
          filePath: relPath,
          lineNumber: lineNum,
          codeSnippet: line.trim(),
          baseSeverity: 9.5,
          cveId: null,
          epssScore: null,
          evidence: `Luhn checksum validation PASSED for 16-digit sequence: ${candidate.substring(0, 4)}****${candidate.slice(-4)}`
        });
        break;
      }
    }
  });
}

function scanFintechRawCVVPIN(lines, relPath, findings) {
  const cvvLiteralRegex = /\b(cvv|cvv2|pin|card_pin)\s*[:=]\s*["']?\d{3,4}["']?\b/i;
  const rawCardAssignRegex = /\b(card_number|account_number)\s*[:=]\s*["']\d{13,19}["']/i;

  lines.forEach((line, idx) => {
    if (cvvLiteralRegex.test(line) || rawCardAssignRegex.test(line)) {
      const type = 'raw-cvv-pin-exposure';
      const lineNum = idx + 1;
      findings.push({
        id: generateFindingId('custom', type, relPath, lineNum),
        source: 'custom-rule',
        type: type,
        title: 'Raw CVV / Security PIN Hardcoded Assignment',
        description: 'CVV security code or PIN assigned a direct literal value in source code.',
        filePath: relPath,
        lineNumber: lineNum,
        codeSnippet: line.trim(),
        baseSeverity: 9.2,
        cveId: null,
        epssScore: null,
        evidence: `Direct literal assignment to security field: '${line.trim()}'`
      });
    }
  });
}

function scanEcommercePriceManipulation(lines, relPath, fullContent, findings) {
  const isFrontendPath = /client\/|public\/|src\/components\/|src\/pages\/|frontend\//i.test(relPath);

  lines.forEach((line, idx) => {
    if (isFrontendPath && /(total_price|discount|final_price|order_amount)\s*=/i.test(line)) {
      const type = 'price-manipulation';
      const lineNum = idx + 1;
      findings.push({
        id: generateFindingId('custom', type, relPath, lineNum, 'frontend'),
        source: 'custom-rule',
        type: type,
        title: 'Client-Side Price / Discount Calculation (Tamper Risk)',
        description: 'Order price or discount calculated directly in frontend code without server-side recalculation.',
        filePath: relPath,
        lineNumber: lineNum,
        codeSnippet: line.trim(),
        baseSeverity: 8.0,
        cveId: null,
        epssScore: null,
        evidence: `Frontend price assignment: '${line.trim()}' in client path '${relPath}'`
      });
    }

    if (/\/(checkout|payment|charge|pay)\b/i.test(line) && /app\.(post|put)|router\.(post|put)|def\s+pay|def\s+checkout/i.test(line)) {
      const startIdx = Math.max(0, idx);
      const endIdx = Math.min(lines.length - 1, idx + 25);
      const handlerBody = lines.slice(startIdx, endIdx + 1).join('\n');

      if (!/amount\s*>\s*0|amount\s*<=\s*0|price\s*>\s*0/i.test(handlerBody)) {
        const type = 'price-manipulation';
        const lineNum = idx + 1;
        findings.push({
          id: generateFindingId('custom', type, relPath, lineNum, 'backend'),
          source: 'custom-rule',
          type: type,
          title: 'Missing Price Validation in Backend Payment Handler',
          description: 'Payment route handler accepts transaction amount without enforcing amount > 0 check.',
          filePath: relPath,
          lineNumber: lineNum,
          codeSnippet: line.trim(),
          baseSeverity: 8.7,
          cveId: null,
          epssScore: null,
          evidence: `Backend payment handler '${line.trim()}' lacks 'amount > 0' validation check`
        });
      }
    }
  });
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

module.exports = { runCustomRules, luhnCheck, generateFindingId };
