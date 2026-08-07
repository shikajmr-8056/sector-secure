const fs = require('fs');
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');
const simpleGit = require('simple-git');

/**
 * Clones a repository (or handles local folder paths for testing)
 * into a temporary directory scan-<uuid>.
 * Returns target directory path and guaranteed cleanup function.
 */
async function cloneRepo(repoUrl) {
  const scanId = uuidv4();
  const targetDir = path.join(os.tmpdir(), `scan-${scanId}`);

  const cleanup = () => {
    try {
      if (fs.existsSync(targetDir)) {
        fs.rmSync(targetDir, { recursive: true, force: true });
      }
    } catch (err) {
      console.error(`[gitCloner] Cleanup failed for ${targetDir}:`, err.message);
    }
  };

  try {
    // Check if repoUrl is a local directory on disk (for testing local projects)
    if (fs.existsSync(repoUrl) && fs.statSync(repoUrl).isDirectory()) {
      fs.cpSync(repoUrl, targetDir, { recursive: true });
      return { targetDir, scanId, cleanup };
    }

    // Otherwise clone via simple-git with depth 1
    fs.mkdirSync(targetDir, { recursive: true });
    const git = simpleGit();
    await git.clone(repoUrl, targetDir, ['--depth', '1']);

    return { targetDir, scanId, cleanup };
  } catch (err) {
    cleanup();
    throw new Error(`Failed to clone repository '${repoUrl}': ${err.message}`);
  }
}

module.exports = { cloneRepo };
