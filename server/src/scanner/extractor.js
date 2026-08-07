const fs = require('fs');
const path = require('path');

/**
 * Extracts API route paths, comments, and string literals from a cloned repo.
 * Returns:
 *   detectedRoutes  — array of unique API path strings (e.g. '/api/patients/:id')
 *   repoTextSample  — up to ~8 KB of README text + comments + string literals
 *                     used downstream by the sector detection engine
 */
function extractRepoMetadata(targetDir) {
  const detectedRoutes = new Set();
  const repoTextSampleParts = [];

  // 1. Read README files if present
  const readmeCandidates = ['README.md', 'readme.md', 'README.txt', 'README', 'CONTRIBUTING.md'];
  for (const rFile of readmeCandidates) {
    const fullPath = path.join(targetDir, rFile);
    if (fs.existsSync(fullPath)) {
      try {
        const text = fs.readFileSync(fullPath, 'utf-8');
        repoTextSampleParts.push(`--- ${rFile} ---\n${text.substring(0, 4000)}`);
      } catch (_) {}
    }
  }

  // 2. Walk source files
  const files = getAllFiles(targetDir);

  // Regexes for detecting route definitions across common frameworks
  const routeRegexes = [
    // Express / Fastify / Nest: app.get('/path'), router.post('/path')
    /(?:app|router|server)\.(?:get|post|put|delete|patch|use|all)\s*\(\s*["'`]([^"'`]+)["'`]/gi,
    // Flask / FastAPI Python: @app.route('/path'), @router.get('/path')
    /@(?:app|router|blueprint)\.(?:route|get|post|put|delete|patch)\s*\(\s*["']([^"']+)["']/gi,
    // Django / General path: path('api/v1/patients/', ...)
    /\bpath\s*\(\s*["']([^"']+)["']/gi,
    // Go Gin/Echo/Mux: r.GET("/path", ...), e.POST("/path", ...)
    /\b[a-zA-Z]+\.(?:GET|POST|PUT|DELETE|PATCH|Handle)\s*\(\s*["']([^"']+)["']/g
  ];

  // Regex to grab inline comments and block comments
  const commentRegex = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/|#[^\n]*)/g;

  // Regex to grab short string literals (4–60 chars) — avoids noise from long base64/URLs
  const stringLiteralRegex = /["'`]([A-Za-z][A-Za-z0-9 _\-]{3,58})["'`]/g;

  for (const filePath of files) {
    const ext = path.extname(filePath).toLowerCase();
    if (!['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.php', '.go', '.json', '.yaml', '.yml'].includes(ext)) continue;

    try {
      const content = fs.readFileSync(filePath, 'utf-8');

      // --- Route extraction ---
      for (const regex of routeRegexes) {
        regex.lastIndex = 0;
        let match;
        while ((match = regex.exec(content)) !== null) {
          if (match[1] && match[1].startsWith('/')) {
            detectedRoutes.add(match[1]);
          }
        }
      }

      const currentSampleSize = repoTextSampleParts.join(' ').length;

      // --- Comment extraction (code documentation carries strong sector signals) ---
      if (currentSampleSize < 8000) {
        const comments = content.match(commentRegex);
        if (comments) {
          repoTextSampleParts.push(comments.slice(0, 20).join('\n'));
        }
      }

      // --- String literal extraction (field names, labels, error messages) ---
      // Only pull from smaller files to avoid noise from minified/bundled assets
      if (currentSampleSize < 8000 && content.length < 50_000) {
        const literals = [];
        let m;
        stringLiteralRegex.lastIndex = 0;
        while ((m = stringLiteralRegex.exec(content)) !== null && literals.length < 30) {
          const lit = m[1].trim();
          // Keep only strings that look like domain words — not numbers or random hashes
          if (/[a-zA-Z]{3,}/.test(lit)) {
            literals.push(lit);
          }
        }
        if (literals.length > 0) {
          repoTextSampleParts.push(literals.join(' '));
        }
      }

    } catch (_) {}
  }

  // Also scan package.json description + keywords for sector signals
  const pkgPath = path.join(targetDir, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      const parts = [pkg.description || '', ...(pkg.keywords || [])].join(' ');
      if (parts.trim()) repoTextSampleParts.unshift(`--- package.json ---\n${parts}`);
    } catch (_) {}
  }

  const combinedTextSample = repoTextSampleParts.join('\n\n').substring(0, 8000);

  return {
    detectedRoutes: Array.from(detectedRoutes),
    repoTextSample: combinedTextSample || 'No text sample extracted.'
  };
}

function getAllFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (['node_modules', '.git', 'dist', 'build', 'vendor', '.next', '.nuxt'].includes(file)) continue;
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getAllFiles(filePath, fileList);
    } else {
      fileList.push(filePath);
    }
  }
  return fileList;
}

module.exports = { extractRepoMetadata };
