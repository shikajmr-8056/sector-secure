const fs = require('fs');
const path = require('path');

/**
 * Extracts API route paths and aggregates repo text sample for downstream sector detection
 */
function extractRepoMetadata(targetDir) {
  const detectedRoutes = new Set();
  let repoTextSampleParts = [];

  // 1. Read README files if present
  const readmeFiles = ['README.md', 'readme.md', 'README.txt', 'README'];
  for (const rFile of readmeFiles) {
    const fullPath = path.join(targetDir, rFile);
    if (fs.existsSync(fullPath)) {
      try {
        const text = fs.readFileSync(fullPath, 'utf-8');
        repoTextSampleParts.push(`--- README ---\n${text.substring(0, 3000)}`);
      } catch (e) {}
    }
  }

  // 2. Walk source files for routes, comments, and string literals
  const files = getAllFiles(targetDir);

  const routeRegexes = [
    // Express / Fastify / Nest: app.get('/path'), router.post('/path')
    /(?:app|router|server)\.(?:get|post|put|delete|patch|use)\s*\(\s*["']([^"']+)["']/gi,
    // Flask / FastAPI: @app.route('/path'), @router.get('/path')
    /@(?:app|router)\.(?:route|get|post|put|delete)\s*\(\s*["']([^"']+)["']/gi,
    // Django / General path: path('api/v1/patients/', ...)
    /path\s*\(\s*["']([^"']+)["']/gi
  ];

  const commentRegex = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/|#[^\n]*)/g;

  for (const filePath of files) {
    const ext = path.extname(filePath).toLowerCase();
    if (!['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.php', '.go', '.json'].includes(ext)) continue;

    try {
      const content = fs.readFileSync(filePath, 'utf-8');

      // Extract routes
      for (const regex of routeRegexes) {
        regex.lastIndex = 0;
        let match;
        while ((match = regex.exec(content)) !== null) {
          if (match[1] && match[1].startsWith('/')) {
            detectedRoutes.add(match[1]);
          }
        }
      }

      // Collect comments and keywords for text sample
      const comments = content.match(commentRegex);
      if (comments && repoTextSampleParts.join(' ').length < 10000) {
        repoTextSampleParts.push(comments.slice(0, 15).join('\n'));
      }

    } catch (e) {}
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

module.exports = { extractRepoMetadata };
