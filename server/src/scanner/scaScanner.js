const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

/**
 * Parses package manifests (package.json, requirements.txt),
 * queries OSV.dev batch API for CVEs, and fetches EPSS scores from FIRST.
 */
async function runSCAScan(targetDir) {
  const findings = [];
  const dependenciesToQuery = []; // { package: name, version: ver, file: relPath, snippet: line }

  // 1. Check package.json
  const pkgPath = path.join(targetDir, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const raw = fs.readFileSync(pkgPath, 'utf-8');
      const pkgJson = JSON.parse(raw);
      const allDeps = { ...(pkgJson.dependencies || {}), ...(pkgJson.devDependencies || {}) };

      for (const [name, rawVersion] of Object.entries(allDeps)) {
        const cleanVersion = rawVersion.replace(/[\^~>=<]/g, '');
        if (/^\d+\.\d+/.test(cleanVersion)) {
          dependenciesToQuery.push({
            ecosystem: 'npm',
            name,
            version: cleanVersion,
            filePath: 'package.json',
            codeSnippet: `"${name}": "${rawVersion}"`
          });
        }
      }
    } catch (e) {
      console.error('[scaScanner] Failed to parse package.json:', e.message);
    }
  }

  // 2. Check requirements.txt
  const reqPath = path.join(targetDir, 'requirements.txt');
  if (fs.existsSync(reqPath)) {
    try {
      const raw = fs.readFileSync(reqPath, 'utf-8');
      const lines = raw.split('\n');
      lines.forEach(line => {
        const match = line.match(/^([A-Za-z0-9_\-\.]+)\s*==\s*([0-9\.]+)/);
        if (match) {
          dependenciesToQuery.push({
            ecosystem: 'PyPI',
            name: match[1],
            version: match[2],
            filePath: 'requirements.txt',
            codeSnippet: line.trim()
          });
        }
      });
    } catch (e) {
      console.error('[scaScanner] Failed to parse requirements.txt:', e.message);
    }
  }

  if (dependenciesToQuery.length === 0) return findings;

  // 3. Query OSV.dev Batch Endpoint (https://api.osv.dev/v1/querybatch)
  try {
    const queries = dependenciesToQuery.map(dep => ({
      package: { name: dep.name, ecosystem: dep.ecosystem },
      version: dep.version
    }));

    const osvRes = await axios.post('https://api.osv.dev/v1/querybatch', { queries }, { timeout: 6000 });
    const osvResults = osvRes.data?.results || [];

    const cvesToFetchEPSS = new Set();
    const rawFindings = [];

    osvResults.forEach((res, index) => {
      const dep = dependenciesToQuery[index];
      if (res.vulns && Array.isArray(res.vulns)) {
        for (const vuln of res.vulns) {
          let cveId = null;
          if (vuln.aliases) {
            cveId = vuln.aliases.find(a => a.startsWith('CVE-')) || null;
          }
          if (!cveId && vuln.id && vuln.id.startsWith('CVE-')) {
            cveId = vuln.id;
          }

          if (cveId) cvesToFetchEPSS.add(cveId);

          const summary = vuln.summary || vuln.details || 'Vulnerable dependency version detected.';
          const cvssScore = extractCVSSScore(vuln) || 7.5;

          rawFindings.push({
            id: `sca-${uuidv4().substring(0, 8)}`,
            source: 'sca',
            type: 'vulnerable-dependency',
            title: `Vulnerable Dependency: ${dep.name}@${dep.version} (${cveId || vuln.id})`,
            description: summary.length > 200 ? summary.substring(0, 200) + '...' : summary,
            filePath: dep.filePath,
            lineNumber: 1,
            codeSnippet: dep.codeSnippet,
            baseSeverity: cvssScore,
            cveId: cveId,
            epssScore: null, // Populated in next step
            evidence: `OSV.dev DB vulnerability match: ${vuln.id}`
          });
        }
      }
    });

    // 4. Batch query FIRST EPSS API for scores if CVEs exist
    if (cvesToFetchEPSS.size > 0) {
      const cveList = Array.from(cvesToFetchEPSS).join(',');
      try {
        const epssRes = await axios.get(`https://api.first.org/data/v1/epss?cve=${cveList}`, { timeout: 4000 });
        const epssData = epssRes.data?.data || [];

        const epssMap = {};
        epssData.forEach(item => {
          epssMap[item.cve] = parseFloat(item.epss);
        });

        rawFindings.forEach(f => {
          if (f.cveId && epssMap[f.cveId] !== undefined) {
            f.epssScore = epssMap[f.cveId];
            f.evidence += ` | FIRST EPSS score: ${f.epssScore}`;
          }
        });
      } catch (epssErr) {
        console.error('[scaScanner] FIRST EPSS query failed:', epssErr.message);
      }
    }

    return rawFindings;

  } catch (osvErr) {
    console.error('[scaScanner] OSV batch query error:', osvErr.message);
    return findings;
  }
}

function extractCVSSScore(vuln) {
  if (!vuln.severity || !Array.isArray(vuln.severity)) return null;
  for (const s of vuln.severity) {
    if (s.score) {
      const match = s.score.match(/CVSS:3\.[01]\/.*\/S:[U C]\/C:[H L N]\/I:[H L N]\/A:[H L N]/);
      // Fallback simple extract if score string contains CVSS
      const numMatch = s.score.match(/\b([0-9]\.[0-9])\b/);
      if (numMatch) return parseFloat(numMatch[1]);
    }
  }
  return null;
}

module.exports = { runSCAScan };
