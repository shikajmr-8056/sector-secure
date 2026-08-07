const https = require('https');
const http = require('http');
const { URL } = require('url');
const tls = require('tls');

/**
 * Runs a passive DAST surface scan against a target URL.
 * NO active exploitation — only reads response headers, TLS cert data,
 * cookie attributes and common misconfigurations.
 */
async function runDastScan(targetUrl) {
  // Normalise — always add https:// if protocol missing
  if (!/^https?:\/\//i.test(targetUrl)) {
    targetUrl = 'https://' + targetUrl;
  }

  const parsed = new URL(targetUrl);
  const stages = [];
  const checks = [];

  const addStage = (s) => stages.push({ ts: Date.now(), label: s });

  // ── 1. TLS / Certificate ────────────────────────────────────────────────────
  addStage('Checking TLS configuration...');
  const tlsResult = await checkTLS(parsed.hostname, parseInt(parsed.port) || 443);
  checks.push(...tlsResult);

  // ── 2. HTTP Headers ─────────────────────────────────────────────────────────
  addStage('Fetching security headers...');
  const { headers, statusCode, redirectChain, cookieStrings } = await fetchHeaders(targetUrl);
  const headerChecks = analyseHeaders(headers, statusCode, redirectChain);
  checks.push(...headerChecks);

  // ── 3. Cookie attributes ────────────────────────────────────────────────────
  addStage('Analysing cookie security attributes...');
  const cookieChecks = analyseCookies(cookieStrings);
  checks.push(...cookieChecks);

  // ── 4. Information leakage ──────────────────────────────────────────────────
  addStage('Checking for information leakage...');
  const leakChecks = analyseInfoLeakage(headers);
  checks.push(...leakChecks);

  // ── 5. Compute risk summary ─────────────────────────────────────────────────
  addStage('Computing risk summary...');
  const summary = computeSummary(checks);

  return { checks, summary, stages, targetUrl };
}

// ─────────────────────────────────────────────────────────────────────────────
// TLS CHECK
// ─────────────────────────────────────────────────────────────────────────────
function checkTLS(hostname, port) {
  return new Promise((resolve) => {
    const findings = [];
    const startTime = Date.now();

    const socket = tls.connect(
      { host: hostname, port, servername: hostname, rejectUnauthorized: false, timeout: 8000 },
      () => {
        const cert = socket.getPeerCertificate(true);
        const protocol = socket.getProtocol();
        const cipher = socket.getCipher();
        socket.destroy();

        const latencyMs = Date.now() - startTime;

        // Protocol version
        if (protocol === 'TLSv1' || protocol === 'TLSv1.1') {
          findings.push(finding({
            id: 'tls-outdated-version',
            category: 'TLS',
            name: 'Outdated TLS Protocol',
            result: 'fail',
            severity: 8.0,
            description: `Server negotiated ${protocol}, which is deprecated and vulnerable to POODLE/BEAST attacks.`,
            remediation: 'Disable TLS 1.0 and 1.1. Configure server to support TLS 1.2 minimum, prefer TLS 1.3.',
            evidence: `Negotiated protocol: ${protocol}`,
          }));
        } else {
          findings.push(finding({
            id: 'tls-version',
            category: 'TLS',
            name: 'TLS Protocol Version',
            result: 'pass',
            severity: 0,
            description: `Server supports ${protocol || 'modern TLS'}.`,
            remediation: null,
            evidence: `Negotiated: ${protocol || 'TLS 1.3'} · latency ${latencyMs}ms`,
          }));
        }

        // Certificate expiry
        if (cert && cert.valid_to) {
          const expiry = new Date(cert.valid_to);
          const daysLeft = Math.floor((expiry - Date.now()) / 86_400_000);
          if (daysLeft < 0) {
            findings.push(finding({
              id: 'tls-cert-expired',
              category: 'TLS',
              name: 'TLS Certificate Expired',
              result: 'fail',
              severity: 9.5,
              description: `Certificate expired ${Math.abs(daysLeft)} days ago.`,
              remediation: 'Renew the TLS certificate immediately. Use Let\'s Encrypt for automatic renewal.',
              evidence: `Expired: ${cert.valid_to}`,
            }));
          } else if (daysLeft < 14) {
            findings.push(finding({
              id: 'tls-cert-expiring-soon',
              category: 'TLS',
              name: 'TLS Certificate Expiring Soon',
              result: 'warn',
              severity: 6.5,
              description: `Certificate expires in ${daysLeft} days.`,
              remediation: 'Renew certificate. Enable ACME/Let\'s Encrypt auto-renewal.',
              evidence: `Expires: ${cert.valid_to} (${daysLeft} days)`,
            }));
          } else {
            findings.push(finding({
              id: 'tls-cert-valid',
              category: 'TLS',
              name: 'TLS Certificate Valid',
              result: 'pass',
              severity: 0,
              description: `Certificate valid for ${daysLeft} more days.`,
              remediation: null,
              evidence: `Subject: ${cert.subject?.CN || hostname} · expires ${cert.valid_to}`,
            }));
          }
        }

        // Weak cipher check
        if (cipher) {
          const weak = /RC4|DES|3DES|NULL|EXPORT|anon/i.test(cipher.name);
          if (weak) {
            findings.push(finding({
              id: 'tls-weak-cipher',
              category: 'TLS',
              name: 'Weak TLS Cipher Suite',
              result: 'fail',
              severity: 7.5,
              description: `Weak cipher suite negotiated: ${cipher.name}`,
              remediation: 'Disable RC4, DES, 3DES, NULL, EXPORT and anonymous cipher suites. Enable only AEAD ciphers.',
              evidence: `Cipher: ${cipher.name} · bits: ${cipher.secretKeySize || 'unknown'}`,
            }));
          }
        }

        resolve(findings);
      }
    );

    socket.on('error', (err) => {
      // Host unreachable or HTTP-only
      if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
        findings.push(finding({
          id: 'tls-not-available',
          category: 'TLS',
          name: 'HTTPS Not Available',
          result: 'fail',
          severity: 8.5,
          description: 'Target does not appear to support HTTPS on port 443.',
          remediation: 'Enable HTTPS. Obtain a TLS certificate via Let\'s Encrypt and redirect all HTTP traffic.',
          evidence: err.message,
        }));
      } else {
        findings.push(finding({
          id: 'tls-check-error',
          category: 'TLS',
          name: 'TLS Check',
          result: 'info',
          severity: 0,
          description: 'TLS check inconclusive (may be self-signed or internal host).',
          remediation: null,
          evidence: err.message,
        }));
      }
      resolve(findings);
    });

    socket.setTimeout(8000, () => {
      socket.destroy();
      resolve(findings);
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// HEADER FETCH
// ─────────────────────────────────────────────────────────────────────────────
function fetchHeaders(targetUrl, depth = 0) {
  return new Promise((resolve) => {
    const parsed = new URL(targetUrl);
    const isHttps = parsed.protocol === 'https:';
    const lib = isHttps ? https : http;
    const redirectChain = [];

    const req = lib.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || (isHttps ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method: 'GET',
        timeout: 10000,
        rejectUnauthorized: false,
        headers: {
          'User-Agent': 'AVSS-DAST-Scanner/1.1 (passive-check)',
          Accept: 'text/html,application/xhtml+xml,*/*',
        },
      },
      (res) => {
        const headers = res.headers;
        const statusCode = res.statusCode;
        const cookieStrings = [].concat(headers['set-cookie'] || []);

        // Follow one redirect
        if ((statusCode === 301 || statusCode === 302 || statusCode === 307 || statusCode === 308)
          && headers.location && depth < 3) {
          const next = new URL(headers.location, targetUrl).href;
          redirectChain.push({ from: targetUrl, to: next, status: statusCode });
          res.destroy();
          fetchHeaders(next, depth + 1).then((r) => {
            r.redirectChain = [...redirectChain, ...r.redirectChain];
            resolve(r);
          }).catch(() => resolve({ headers: {}, statusCode, redirectChain, cookieStrings: [] }));
          return;
        }

        res.destroy();
        resolve({ headers, statusCode, redirectChain, cookieStrings });
      }
    );

    req.on('error', () => resolve({ headers: {}, statusCode: 0, redirectChain, cookieStrings: [] }));
    req.on('timeout', () => { req.destroy(); resolve({ headers: {}, statusCode: 0, redirectChain, cookieStrings: [] }); });
    req.end();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// HEADER ANALYSIS
// ─────────────────────────────────────────────────────────────────────────────
function analyseHeaders(headers, statusCode, redirectChain) {
  const findings = [];
  const h = (name) => headers[name.toLowerCase()];

  // HSTS
  const hsts = h('strict-transport-security');
  if (!hsts) {
    findings.push(finding({
      id: 'header-hsts-missing',
      category: 'Headers',
      name: 'Strict-Transport-Security (HSTS)',
      result: 'fail',
      severity: 6.5,
      description: 'HSTS header is absent. Browsers won\'t enforce HTTPS-only connections, leaving users vulnerable to SSL stripping attacks.',
      remediation: 'Add: Strict-Transport-Security: max-age=63072000; includeSubDomains; preload',
      evidence: 'Header not present in response',
    }));
  } else {
    const maxAge = parseInt((hsts.match(/max-age=(\d+)/i) || [])[1] || '0');
    if (maxAge < 15_552_000) {
      findings.push(finding({
        id: 'header-hsts-short',
        category: 'Headers',
        name: 'HSTS max-age Too Short',
        result: 'warn',
        severity: 4.5,
        description: `HSTS max-age is only ${maxAge}s (< 6 months). Short lifetimes reduce protection.`,
        remediation: 'Set max-age=63072000 (2 years) with includeSubDomains and preload.',
        evidence: `Strict-Transport-Security: ${hsts}`,
      }));
    } else {
      findings.push(finding({
        id: 'header-hsts-ok',
        category: 'Headers',
        name: 'Strict-Transport-Security (HSTS)',
        result: 'pass',
        severity: 0,
        description: 'HSTS is configured correctly.',
        remediation: null,
        evidence: `Strict-Transport-Security: ${hsts}`,
      }));
    }
  }

  // CSP
  const csp = h('content-security-policy');
  if (!csp) {
    findings.push(finding({
      id: 'header-csp-missing',
      category: 'Headers',
      name: 'Content-Security-Policy',
      result: 'fail',
      severity: 6.0,
      description: 'No CSP header found. Without CSP, XSS attacks can load arbitrary scripts.',
      remediation: 'Add a Content-Security-Policy. Start with: default-src \'self\'; script-src \'self\'',
      evidence: 'Header not present in response',
    }));
  } else {
    const unsafe = /unsafe-inline|unsafe-eval|\*/i.test(csp);
    if (unsafe) {
      findings.push(finding({
        id: 'header-csp-weak',
        category: 'Headers',
        name: 'Weak Content-Security-Policy',
        result: 'warn',
        severity: 5.0,
        description: "CSP uses 'unsafe-inline', 'unsafe-eval', or wildcard (*) — significantly weakening XSS protection.",
        remediation: "Remove 'unsafe-inline' and 'unsafe-eval'. Use nonces or hashes for inline scripts.",
        evidence: `Content-Security-Policy: ${csp.substring(0, 120)}`,
      }));
    } else {
      findings.push(finding({
        id: 'header-csp-ok',
        category: 'Headers',
        name: 'Content-Security-Policy',
        result: 'pass',
        severity: 0,
        description: 'CSP is present without obvious unsafe directives.',
        remediation: null,
        evidence: `CSP: ${csp.substring(0, 80)}...`,
      }));
    }
  }

  // X-Frame-Options
  const xfo = h('x-frame-options');
  if (!xfo && !csp?.toLowerCase().includes('frame-ancestors')) {
    findings.push(finding({
      id: 'header-xfo-missing',
      category: 'Headers',
      name: 'X-Frame-Options / frame-ancestors',
      result: 'fail',
      severity: 5.5,
      description: 'No clickjacking protection. Page can be embedded in iframes on malicious sites.',
      remediation: 'Add: X-Frame-Options: DENY  or use CSP frame-ancestors \'none\'',
      evidence: 'Neither X-Frame-Options nor CSP frame-ancestors found',
    }));
  } else {
    findings.push(finding({
      id: 'header-xfo-ok',
      category: 'Headers',
      name: 'Clickjacking Protection',
      result: 'pass',
      severity: 0,
      description: 'Clickjacking protection is in place.',
      remediation: null,
      evidence: xfo ? `X-Frame-Options: ${xfo}` : 'CSP frame-ancestors directive present',
    }));
  }

  // X-Content-Type-Options
  const xcto = h('x-content-type-options');
  if (!xcto || xcto.toLowerCase() !== 'nosniff') {
    findings.push(finding({
      id: 'header-xcto-missing',
      category: 'Headers',
      name: 'X-Content-Type-Options',
      result: xcto ? 'warn' : 'fail',
      severity: 4.0,
      description: 'nosniff directive missing. Browsers may MIME-sniff responses, enabling content injection attacks.',
      remediation: 'Add: X-Content-Type-Options: nosniff',
      evidence: xcto ? `Current value: ${xcto}` : 'Header not present',
    }));
  } else {
    findings.push(finding({
      id: 'header-xcto-ok',
      category: 'Headers',
      name: 'X-Content-Type-Options',
      result: 'pass',
      severity: 0,
      description: 'nosniff is correctly set.',
      remediation: null,
      evidence: 'X-Content-Type-Options: nosniff',
    }));
  }

  // Referrer-Policy
  const rp = h('referrer-policy');
  if (!rp) {
    findings.push(finding({
      id: 'header-rp-missing',
      category: 'Headers',
      name: 'Referrer-Policy',
      result: 'warn',
      severity: 3.5,
      description: 'No Referrer-Policy set. URLs (potentially containing tokens/IDs) may be leaked in the Referer header.',
      remediation: 'Add: Referrer-Policy: strict-origin-when-cross-origin',
      evidence: 'Header not present in response',
    }));
  } else {
    findings.push(finding({
      id: 'header-rp-ok',
      category: 'Headers',
      name: 'Referrer-Policy',
      result: 'pass',
      severity: 0,
      description: 'Referrer-Policy is set.',
      remediation: null,
      evidence: `Referrer-Policy: ${rp}`,
    }));
  }

  // Permissions-Policy
  const pp = h('permissions-policy') || h('feature-policy');
  if (!pp) {
    findings.push(finding({
      id: 'header-pp-missing',
      category: 'Headers',
      name: 'Permissions-Policy',
      result: 'warn',
      severity: 3.0,
      description: 'No Permissions-Policy header. Browser features (camera, geolocation, microphone) are unrestricted.',
      remediation: 'Add: Permissions-Policy: camera=(), geolocation=(), microphone=()',
      evidence: 'Header not present in response',
    }));
  } else {
    findings.push(finding({
      id: 'header-pp-ok',
      category: 'Headers',
      name: 'Permissions-Policy',
      result: 'pass',
      severity: 0,
      description: 'Permissions-Policy is configured.',
      remediation: null,
      evidence: `Permissions-Policy: ${pp.substring(0, 60)}`,
    }));
  }

  // HTTP → HTTPS redirect
  const hasHttpsRedirect = redirectChain.some(
    (r) => r.from.startsWith('http://') && r.to.startsWith('https://')
  );
  if (redirectChain.length > 0 && !hasHttpsRedirect) {
    findings.push(finding({
      id: 'header-no-https-redirect',
      category: 'Headers',
      name: 'HTTP → HTTPS Redirect',
      result: 'warn',
      severity: 5.0,
      description: 'No HTTP-to-HTTPS redirect detected. Plain HTTP connections are not automatically upgraded.',
      remediation: 'Configure server to return 301/302 from http:// to https://.',
      evidence: `Redirect chain: ${redirectChain.map(r => r.status).join(' → ') || 'none'}`,
    }));
  }

  return findings;
}

// ─────────────────────────────────────────────────────────────────────────────
// COOKIE ANALYSIS
// ─────────────────────────────────────────────────────────────────────────────
function analyseCookies(cookieStrings) {
  if (!cookieStrings || cookieStrings.length === 0) {
    return [finding({
      id: 'cookie-none',
      category: 'Cookies',
      name: 'Cookie Analysis',
      result: 'info',
      severity: 0,
      description: 'No Set-Cookie headers observed in the initial response.',
      remediation: null,
      evidence: 'No cookies set on root path',
    })];
  }

  return cookieStrings.flatMap((cookieStr, idx) => {
    const findings = [];
    const namePart = cookieStr.split(';')[0];
    const cookieName = namePart.split('=')[0].trim();
    const lower = cookieStr.toLowerCase();

    const isSession = /sess|token|auth|jwt|sid/i.test(cookieName);

    if (!lower.includes('httponly')) {
      findings.push(finding({
        id: `cookie-no-httponly-${idx}`,
        category: 'Cookies',
        name: `Cookie Missing HttpOnly: ${cookieName}`,
        result: isSession ? 'fail' : 'warn',
        severity: isSession ? 7.5 : 4.5,
        description: `Cookie "${cookieName}" lacks HttpOnly flag. Accessible via JavaScript — XSS can steal it.`,
        remediation: `Set HttpOnly flag on ${cookieName}: Set-Cookie: ${cookieName}=...; HttpOnly; Secure; SameSite=Strict`,
        evidence: cookieStr.substring(0, 100),
      }));
    }

    if (!lower.includes('secure')) {
      findings.push(finding({
        id: `cookie-no-secure-${idx}`,
        category: 'Cookies',
        name: `Cookie Missing Secure Flag: ${cookieName}`,
        result: isSession ? 'fail' : 'warn',
        severity: isSession ? 7.0 : 4.0,
        description: `Cookie "${cookieName}" lacks Secure flag. Can be transmitted over plain HTTP.`,
        remediation: `Add Secure flag to ${cookieName}.`,
        evidence: cookieStr.substring(0, 100),
      }));
    }

    if (!lower.includes('samesite')) {
      findings.push(finding({
        id: `cookie-no-samesite-${idx}`,
        category: 'Cookies',
        name: `Cookie Missing SameSite: ${cookieName}`,
        result: 'warn',
        severity: 5.0,
        description: `Cookie "${cookieName}" has no SameSite attribute — vulnerable to CSRF attacks.`,
        remediation: `Add SameSite=Strict or SameSite=Lax to ${cookieName}.`,
        evidence: cookieStr.substring(0, 100),
      }));
    } else if (lower.includes('samesite=none') && !lower.includes('secure')) {
      findings.push(finding({
        id: `cookie-samesite-none-insecure-${idx}`,
        category: 'Cookies',
        name: `SameSite=None Without Secure: ${cookieName}`,
        result: 'fail',
        severity: 6.5,
        description: 'SameSite=None requires the Secure attribute. Chrome rejects this combination.',
        remediation: 'Add Secure flag when using SameSite=None.',
        evidence: cookieStr.substring(0, 100),
      }));
    }

    if (findings.length === 0) {
      findings.push(finding({
        id: `cookie-ok-${idx}`,
        category: 'Cookies',
        name: `Cookie Secure: ${cookieName}`,
        result: 'pass',
        severity: 0,
        description: `Cookie "${cookieName}" has all recommended security attributes.`,
        remediation: null,
        evidence: cookieStr.substring(0, 100),
      }));
    }

    return findings;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// INFORMATION LEAKAGE CHECKS
// ─────────────────────────────────────────────────────────────────────────────
function analyseInfoLeakage(headers) {
  const findings = [];
  const h = (name) => headers[name.toLowerCase()];

  // Server header
  const server = h('server');
  if (server) {
    const hasVersion = /\d+\.\d+/.test(server);
    findings.push(finding({
      id: 'info-server-header',
      category: 'Info Leakage',
      name: 'Server Header Fingerprinting',
      result: hasVersion ? 'fail' : 'warn',
      severity: hasVersion ? 4.5 : 2.5,
      description: hasVersion
        ? `Server header discloses software version: "${server}". Simplifies targeted exploit selection.`
        : `Server header present: "${server}". Consider removing to reduce fingerprinting.`,
      remediation: 'Set Server: to a generic value or remove it entirely via your web server config.',
      evidence: `Server: ${server}`,
    }));
  }

  // X-Powered-By
  const xpb = h('x-powered-by');
  if (xpb) {
    findings.push(finding({
      id: 'info-x-powered-by',
      category: 'Info Leakage',
      name: 'X-Powered-By Exposes Technology Stack',
      result: 'fail',
      severity: 4.0,
      description: `X-Powered-By header reveals: "${xpb}". This fingerprint helps attackers target known vulnerabilities.`,
      remediation: 'Remove X-Powered-By header. In Express: app.disable(\'x-powered-by\')',
      evidence: `X-Powered-By: ${xpb}`,
    }));
  }

  // Cache-Control on authenticated pages
  const cc = h('cache-control');
  if (!cc || (!cc.includes('no-store') && !cc.includes('private'))) {
    findings.push(finding({
      id: 'info-cache-control',
      category: 'Info Leakage',
      name: 'Cache-Control Not Restrictive',
      result: 'warn',
      severity: 3.0,
      description: 'Response may be cached by proxies or shared caches. Sensitive pages should use no-store.',
      remediation: 'Add: Cache-Control: no-store, no-cache, must-revalidate for authenticated pages.',
      evidence: cc ? `Cache-Control: ${cc}` : 'Cache-Control header absent',
    }));
  }

  return findings;
}

// ─────────────────────────────────────────────────────────────────────────────
// SUMMARY
// ─────────────────────────────────────────────────────────────────────────────
function computeSummary(checks) {
  const failed = checks.filter(c => c.result === 'fail');
  const warned = checks.filter(c => c.result === 'warn');
  const passed = checks.filter(c => c.result === 'pass');

  const overallScore = failed.length === 0 && warned.length === 0
    ? 'A+'
    : failed.length === 0
      ? 'B'
      : failed.some(c => c.severity >= 8)
        ? 'F'
        : failed.length >= 3
          ? 'D'
          : 'C';

  const avgSeverity = checks.length
    ? checks.reduce((s, c) => s + c.severity, 0) / checks.filter(c => c.severity > 0).length || 0
    : 0;

  // Category breakdown for radar chart
  const categories = ['TLS', 'Headers', 'Cookies', 'Info Leakage'];
  const categoryScores = {};
  for (const cat of categories) {
    const catChecks = checks.filter(c => c.category === cat && c.severity > 0);
    categoryScores[cat] = catChecks.length
      ? Math.min(10, catChecks.reduce((s, c) => s + c.severity, 0) / catChecks.length)
      : 0;
  }

  return {
    grade: overallScore,
    failCount: failed.length,
    warnCount: warned.length,
    passCount: passed.length,
    avgSeverity: Math.round(avgSeverity * 10) / 10,
    categoryScores,
    topFindings: [...failed, ...warned]
      .sort((a, b) => b.severity - a.severity)
      .slice(0, 3)
      .map(f => f.name),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER
// ─────────────────────────────────────────────────────────────────────────────
function finding({ id, category, name, result, severity, description, remediation, evidence }) {
  return { id, category, name, result, severity, description, remediation, evidence };
}

module.exports = { runDastScan };
